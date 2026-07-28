// ============================================================
// Tildel korrelationsgrupper og håndhæv reglen
//
// Run with:
//   set -a && . ./.env.local && set +a
//   npx tsx scripts/set-rank-groups.ts [--dry]
//
// Regel: højst én serie i en korrelationsgruppe må være rankable.
// Se datakatalogets afsnit 1.
//
// Grupperne er defineret her frem for i config/series.ts, fordi de går
// på tværs af kilder og omfatter serier fra migrationen der aldrig har
// været i config.
// ============================================================

import { PrismaClient } from "@prisma/client";
import { withDbRetry } from "../src/lib/db";

import { kraevSkriveret } from "./write-guard";
const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry");

type Group = {
  name: string;
  /** Serien der bærer gruppen på ranglisten. */
  winner: string;
  /** Match på præcis id eller præfiks. */
  members: Array<{ id?: string; prefix?: string }>;
  why: string;
};

const GROUPS: Group[] = [
  {
    name: "valuta",
    winner: "dst.valuta.effektiv",
    members: [{ prefix: "dst.valuta." }],
    why: "Fire korrelerede valutapar er fire chancer for et tilfælde. Den effektive kurs er ét træk og besvarer spørgsmålet om konkurrenceevne.",
  },
  {
    name: "detailomsaetning",
    winner: "derived.detail.maengde",
    members: [{ id: "dst.detail.omsaetning.g47" }, { id: "derived.detail.maengde" }],
    why: "Værdiindekset er mellemregningen. Mængdeindekset svarer på om der blev solgt mere.",
  },
  {
    name: "forbrugertillid",
    winner: "dst.forbrug.forventning.f1",
    members: [{ prefix: "dst.forbrug.forventning." }],
    why: "F2 til F5 og F10 er komponenter i F1. Den sammensatte indikator dækker flest læsere; delspørgsmålene er kontekst på forbrug-dashboardet.",
  },
  {
    name: "forbrugerpriser",
    winner: "dst.pris.forbruger.aarsaendring",
    members: [{ prefix: "dst.pris.forbruger." }],
    why: "Indeksniveauet er mellemregningen, og med yoy-transformation beregner det samme tal som årsændringen. COICOP-grupperne er komponenter i totalen. Årsændringen er det tal en direktør citerer.",
  },
  {
    name: "konkurser",
    winner: "dst.konkurs.total",
    members: [{ prefix: "dst.konkurs." }],
    why: "Brancheserierne bevæger sig med totalen. Rammer flere brancher samtidig, er bredden historien, ikke den enkelte branche.",
  },
];

function matches(id: string, g: Group): boolean {
  return g.members.some((m) => (m.id ? id === m.id : id.startsWith(m.prefix!)));
}

async function main() {
  if (!DRY) kraevSkriveret("set-rank-groups.ts");
  await withDbRetry(() => prisma.$queryRaw`SELECT 1`);
  const all = await prisma.series.findMany({
    select: { id: true, rankable: true, rankGroup: true, status: true, layer: true },
    orderBy: { id: "asc" },
  });

  console.log(DRY ? "TØRLØB. Skriver intet.\n" : "Tildeler korrelationsgrupper.\n");

  for (const g of GROUPS) {
    const members = all.filter((s) => matches(s.id, g));
    if (members.length === 0) {
      console.log(`[${g.name}] INGEN medlemmer fundet. Gruppen er forkert defineret.`);
      process.exitCode = 1;
      continue;
    }
    const winner = members.find((s) => s.id === g.winner);
    if (!winner) {
      console.log(`[${g.name}] vinderen "${g.winner}" findes ikke blandt medlemmerne.`);
      process.exitCode = 1;
      continue;
    }

    let flipped = 0;
    for (const m of members) {
      const shouldRank = m.id === g.winner && m.status !== "CLOSED" && m.layer !== "STRUCTURAL";
      const reason = shouldRank
        ? null
        : m.status === "CLOSED"
          ? "Lukket serie. Opdateres aldrig igen."
          : `Korreleret med ${g.winner}. ${g.why}`;
      if (m.rankable !== shouldRank || m.rankGroup !== g.name) flipped++;
      if (!DRY) {
        await prisma.series.update({
          where: { id: m.id },
          data: { rankGroup: g.name, rankable: shouldRank, rankableReason: reason },
        });
      }
    }
    console.log(
      `[${g.name}] ${members.length} medlemmer, vinder ${g.winner}, ${flipped} ændret`
    );
  }

  // Håndhævelse. En gruppe med to rangerbare er en fejl, ikke en advarsel.
  const after = await prisma.series.findMany({
    where: { rankGroup: { not: null } },
    select: { id: true, rankGroup: true, rankable: true },
  });
  const byGroup = new Map<string, string[]>();
  for (const s of after.filter((x) => x.rankable)) {
    const k = s.rankGroup!;
    byGroup.set(k, [...(byGroup.get(k) ?? []), s.id]);
  }
  const violations = [...byGroup.entries()].filter(([, ids]) => ids.length > 1);

  console.log(`\nGrupper: ${new Set(after.map((s) => s.rankGroup)).size}`);
  console.log(`Serier i en gruppe: ${after.length}`);
  console.log(`Rangerbare i grupper: ${[...byGroup.values()].flat().length}`);
  if (violations.length) {
    console.log(`\nOVERTRÆDELSER (${violations.length}):`);
    for (const [g, ids] of violations) console.log(`  ${g}: ${ids.join(", ")}`);
    process.exitCode = 1;
  } else {
    console.log("Ingen gruppe har mere end én rangerbar serie.");
  }
}

main()
  .catch((e) => { console.error("Fatal:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
