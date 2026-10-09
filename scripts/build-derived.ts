// ============================================================
// Beregn afledte serier
//
// Kører dagligt i sync-series.yml, efter hentningen. Skriveværnet
// nægter at køre den mod produktion uden for Actions.
//
//   npx tsx scripts/build-derived.ts [--dry] [serie-id ...]
//
// Læser gældende observationer for to serier, beregner den tredje og
// skriver den append-only som alt andet. Henter intet udefra.
//
// Køres efter backfill og efter hver sync, fordi en afledt serie er
// forældet i samme øjeblik en af dens kilder får nye tal.
// ============================================================

import { PrismaClient } from "@prisma/client";
import { withDbRetry } from "../src/lib/db";
import { DERIVED, type DerivedDef } from "../config/derived";
import { writeObservations } from "../src/lib/pulse-observations";
import { defaultRankable } from "../src/lib/pulse-series";
import { beregnAfledt, type Raekke } from "../src/lib/derived";

import { kraevSkriveret } from "./write-guard";
const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry");

async function loadCurrent(seriesId: string): Promise<Raekke[]> {
  const rows = await prisma.observation.findMany({
    where: { seriesId, isCurrent: true, value: { not: null } },
    select: { areaCode: true, period: true, value: true },
  });
  return rows.map((r) => ({ areaCode: r.areaCode, period: r.period, value: Number(r.value) }));
}

async function build(def: DerivedDef) {
  console.log(`[${def.id}]`);
  console.log(`   ${def.nameDa}`);
  console.log(`   ${def.kind}: ${def.a} ${def.kind === "ratio" ? "/" : "-"} ${def.b}`);

  // En afledt serie må ikke stiltiende blive tom fordi en kilde mangler.
  for (const dep of [def.a, def.b]) {
    const exists = await prisma.series.findUnique({ where: { id: dep }, select: { status: true } });
    if (!exists) throw new Error(`kilden "${dep}" findes ikke i series`);
    if (exists.status === "CLOSED") {
      throw new Error(
        `kilden "${dep}" er CLOSED. En afledt serie må ikke bygge videre på ` +
          `en lukket serie uden at nogen har taget stilling.`
      );
    }
  }

  const [a, b] = await Promise.all([loadCurrent(def.a), loadCurrent(def.b)]);
  if (a.length === 0) throw new Error(`"${def.a}" har ingen gældende observationer`);
  if (b.length === 0) throw new Error(`"${def.b}" har ingen gældende observationer`);

  // Omregning og værn mod forkert størrelsesorden. Kaster før skrivning.
  const { points, udenModpart, nulINaevneren } = beregnAfledt(def, a, b);

  console.log(
    `   ${a.length} + ${b.length} observationer -> ${points.length} beregnede` +
      (udenModpart ? `, ${udenModpart} uden modpart` : "") +
      (nulINaevneren ? `, ${nulINaevneren} med nul i nævneren` : "")
  );

  if (points.length === 0) {
    throw new Error(
      `ingen perioder er fælles for "${def.a}" og "${def.b}". ` +
        `Frekvens eller periodejustering passer ikke.`
    );
  }

  if (DRY) {
    const sidste = points[points.length - 1];
    console.log(
      `   TØRLØB, intet skrevet. Seneste: ${sidste.period.toISOString().slice(0, 10)} = ${sidste.value}`
    );
    return;
  }

  const auto = defaultRankable(def.layer, "ACTIVE");
  const rankable = def.rankable ?? auto.rankable;

  await prisma.series.upsert({
    where: { id: def.id },
    create: {
      id: def.id,
      nameDa: def.nameDa,
      source: "DERIVED",
      sourceRef: `${def.a} ${def.kind === "ratio" ? "/" : "-"} ${def.b}`,
      unit: def.unit,
      frequency: def.frequency,
      expectedLagDays: def.expectedLagDays,
      revisionPolicy: "MINOR",
      attribution: def.attribution,
      layer: def.layer,
      status: "ACTIVE",
      rankable,
      rankableReason: def.rankable === false ? def.rankableReason ?? "Manuelt fravalgt." : auto.reason,
      meta: { zTransform: def.zTransform, derivedFrom: [def.a, def.b], kind: def.kind },
    },
    update: {
      nameDa: def.nameDa,
      sourceRef: `${def.a} ${def.kind === "ratio" ? "/" : "-"} ${def.b}`,
      unit: def.unit,
      expectedLagDays: def.expectedLagDays,
      attribution: def.attribution,
      layer: def.layer,
      rankable,
      rankableReason: def.rankable === false ? def.rankableReason ?? "Manuelt fravalgt." : auto.reason,
      meta: { zTransform: def.zTransform, derivedFrom: [def.a, def.b], kind: def.kind },
    },
  });

  const w = await withDbRetry(() => writeObservations(prisma, def.id, points));
  console.log(
    `   indsat ${w.inserted}, revideret ${w.revised}, uændret ${w.unchanged}`
  );
  const first = points[0].period.toISOString().slice(0, 10);
  const last = points[points.length - 1].period.toISOString().slice(0, 10);
  const years = (
    (points[points.length - 1].period.getTime() - points[0].period.getTime()) /
    (365.25 * 86_400_000)
  ).toFixed(1);
  console.log(`   ${first} .. ${last} (${years} år)`);
}

async function main() {
  if (!DRY) kraevSkriveret("build-derived.ts");
  const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const defs = only.length ? DERIVED.filter((d) => only.includes(d.id)) : DERIVED;
  if (defs.length === 0) {
    console.error("Ingen afledte serier matchede. Kendte:");
    for (const d of DERIVED) console.error(`  ${d.id}`);
    process.exit(1);
  }

  await withDbRetry(() => prisma.$queryRaw`SELECT 1`);
  console.log(`Bygger ${defs.length} afledte serier.\n`);

  const failures: string[] = [];
  for (const def of defs) {
    try {
      await build(def);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`   FEJL: ${msg}`);
      failures.push(`${def.id}: ${msg}`);
    }
    console.log("");
  }

  if (failures.length) {
    console.log(`${failures.length} fejlede:`);
    for (const f of failures) console.log(`  ${f}`);
    process.exitCode = 1;
  } else {
    console.log(DRY ? "Tørløb slut. Intet skrevet." : "Alle afledte serier bygget.");
  }
}

main()
  .catch((e) => { console.error("Fatal:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
