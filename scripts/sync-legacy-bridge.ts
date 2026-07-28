// ============================================================
// Bro fra den gamle model til series og observations
//
// KØRES I GITHUB ACTIONS. Skriveværnet nægter lokalt.
//
// HVORFOR DEN FINDES
//
// De fire dashboards læser nu series og observations. Men ni af de
// serier de viser, kommer stadig fra de gamle sync-scripts, som skriver
// til DataPoint. Uden broen ville dashboardene fryse den dag DST
// publicerer næste måned: DataPoint ville få tallet, observations ikke,
// og siden ville vise en måned der bliver ældre og ældre uden at noget
// fejlede.
//
// Det er præcis den fejlklasse CLAUDE.md kalder tabt information. Et
// dashboard der står stille ligner et dashboard hvor der ikke er sket
// noget.
//
// Broen er MIDLERTIDIG. Den rigtige løsning er at de ni serier hentes
// direkte fra kilden ind i observations, som config/series.ts allerede
// gør for femogtyve andre. Det kræver at DST-adapteren kan hente en
// geografisk dimension, og det er ikke bygget endnu.
//
// HVORFOR IKKE BARE KØRE migrate-to-series IGEN
//
// Den skriver med createMany og skipDuplicates og sætter is_current =
// true på alt. Køres den to gange efter en revision, står der to
// gældende rækker for samme periode, og siden ville vise begge. Broen
// går gennem writeObservations, som pensionerer den gamle række og
// logger revisionen.
// ============================================================

import { PrismaClient, Prisma } from "@prisma/client";
import { withDbRetry } from "../src/lib/db";
import { writeObservations } from "../src/lib/pulse-observations";
import { CONFIG, mapRaekke, enhedFor } from "./legacy-mapping";
import { kraevSkriveret } from "./write-guard";
import { tilbageblikDage } from "../src/lib/pulse-incremental";
import type { FetchedPoint } from "../src/lib/adapters/types";

const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry");

/**
 * Hvor langt tilbage der kigges i DataPoint.
 *
 * Samme politik som det inkrementelle job, så de to ikke kan blive
 * uenige om hvad "et vindue" er. Et fast vindue frem for "siden sidst",
 * så en revision af en gammel periode kommer med.
 *
 * Det koster ingenting at kigge bredt her: DataPoint ligger i vores egen
 * base, ikke hos DST.
 */
function vindueDage(cfg: (typeof CONFIG)[number]): number {
  return tilbageblikDage(cfg.frequency, cfg.revisionPolicy);
}

function toPeriodDate(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

type Udfald =
  | { slags: "skrevet"; serier: number; indsat: number; revideret: number }
  | { slags: "intet_nyt"; serier: number }
  | { slags: "ingen_kilde" }
  | { slags: "ingen_raekker" }
  | { slags: "toerloeb"; serier: number; punkter: number };

async function broenFor(cfg: (typeof CONFIG)[number], nu: Date): Promise<Udfald> {
  const source = await prisma.dataSource.findUnique({ where: { slug: cfg.slug } });
  // Kilden findes ikke i den gamle model. Ikke det samme som at den
  // ikke har nye tal.
  if (!source) return { slags: "ingen_kilde" };

  const fra = new Date(nu.getTime() - vindueDage(cfg) * 86_400_000);
  const rows = await prisma.dataPoint.findMany({
    where: { sourceId: source.id, periodDate: { gte: fra } },
    select: {
      period: true,
      periodDate: true,
      areaCode: true,
      areaName: true,
      value: true,
      dimensions: true,
    },
  });

  if (rows.length === 0) return { slags: "ingen_raekker" };

  const perSerie = new Map<string, FetchedPoint[]>();
  const umappede: string[] = [];

  for (const r of rows) {
    const m = mapRaekke(cfg, r);
    if (!m) {
      umappede.push(`${r.period} areaCode=${r.areaCode ?? "-"}`);
      continue;
    }
    const liste = perSerie.get(m.seriesId) ?? [];
    liste.push({
      period: toPeriodDate(r.periodDate),
      areaCode: m.areaCode,
      value: r.value,
    });
    perSerie.set(m.seriesId, liste);
  }

  // En række der ikke kan mappes er en serie der mangler et tal.
  // Den skal siges, ikke tælles som nul.
  if (umappede.length > 0) {
    throw new Error(
      `${cfg.slug}: ${umappede.length} rækker kunne ikke mappes til en serie, ` +
        `fx ${umappede.slice(0, 3).join("; ")}. Mapningen i legacy-mapping.ts ` +
        `passer ikke længere til det kilden leverer.`
    );
  }

  if (DRY) {
    return {
      slags: "toerloeb",
      serier: perSerie.size,
      punkter: [...perSerie.values()].reduce((n, l) => n + l.length, 0),
    };
  }

  let indsat = 0;
  let revideret = 0;

  for (const [seriesId, punkter] of perSerie) {
    // Serien skal findes. Broen opretter ikke serier; det gør
    // migrate-to-series. En manglende serie er en mapning der er
    // kommet ud af trit, ikke noget der skal repareres i stilhed.
    const findes = await prisma.series.findUnique({
      where: { id: seriesId },
      select: { id: true, unit: true, attribution: true, legacyAreaCode: true },
    });
    if (!findes) {
      throw new Error(
        `${cfg.slug}: serien "${seriesId}" findes ikke i basen. ` +
          `Kør migrate-to-series for kilden først.`
      );
    }

    // Enheden holdes i takt med mapningen.
    //
    // migrate-to-series er et engangsscript og kan ikke køres igen, så
    // en rettet enhed ville ellers aldrig nå frem til basen. Enheden er
    // ikke kosmetik: den afgør om tallet vises som "1,90 procent" eller
    // som "1,9", og et tal uden enhed kan citeres forkert.
    //
    // KUN enheden. rankable ejes af korrelationsgruppen, og navn og lag
    // er redaktionelle beslutninger der ikke skal overskrives af en
    // hentning.
    const forventetEnhed = enhedFor(cfg, findes.legacyAreaCode);
    const forventetAttribution = `Danmarks Statistik, tabel ${source.tableId}`;
    const retter: { unit?: string; attribution?: string } = {};
    if (findes.unit !== forventetEnhed) retter.unit = forventetEnhed;
    if (findes.attribution !== forventetAttribution) {
      retter.attribution = forventetAttribution;
    }
    if (Object.keys(retter).length > 0) {
      console.log(
        `      ${seriesId}: ${Object.entries(retter)
          .map(([k, v]) => `${k} -> "${v}"`)
          .join(", ")}`
      );
      await prisma.series.update({ where: { id: seriesId }, data: retter });
    }

    const r = await withDbRetry(() => writeObservations(prisma, seriesId, punkter, nu));
    indsat += r.inserted;
    revideret += r.revised;

    for (const lr of r.largeRevisions) {
      console.log(
        `      STOR REVISION ${seriesId} ${lr.period}: ${lr.from} -> ${lr.to} ` +
          `(${lr.pct.toFixed(1)} procent)`
      );
    }
  }

  return indsat + revideret > 0
    ? { slags: "skrevet", serier: perSerie.size, indsat, revideret }
    : { slags: "intet_nyt", serier: perSerie.size };
}

async function main() {
  if (!DRY) kraevSkriveret("sync-legacy-bridge.ts");

  const nu = new Date();
  console.log(
    `${DRY ? "TØRLØB. " : ""}Bro fra den gamle model, ${CONFIG.length} kilder, ` +
      `vindue per frekvens, ${nu.toISOString()}\n`
  );

  await withDbRetry(() => prisma.$queryRaw`SELECT 1`);

  const fejl: Array<{ slug: string; besked: string }> = [];
  let nogetSkrevet = false;

  for (const cfg of CONFIG) {
    let u: Udfald;
    try {
      u = await broenFor(cfg, nu);
    } catch (e) {
      fejl.push({ slug: cfg.slug, besked: (e as Error).message });
      console.log(`  ${cfg.slug.padEnd(20)} FEJL: ${(e as Error).message}`);
      continue;
    }

    switch (u.slags) {
      case "skrevet":
        nogetSkrevet = true;
        console.log(
          `  ${cfg.slug.padEnd(20)} ${u.serier} serier, ${u.indsat} nye, ${u.revideret} revideret`
        );
        break;
      case "intet_nyt":
        console.log(`  ${cfg.slug.padEnd(20)} ${u.serier} serier, intet nyt`);
        break;
      case "toerloeb":
        console.log(
          `  ${cfg.slug.padEnd(20)} ${u.serier} serier, ${u.punkter} punkter. Ikke sammenlignet.`
        );
        break;
      case "ingen_kilde":
        console.log(`  ${cfg.slug.padEnd(20)} kilden findes ikke i den gamle model`);
        break;
      case "ingen_raekker":
        console.log(
          `  ${cfg.slug.padEnd(20)} ingen rækker i vinduet på ${vindueDage(cfg)} dage`
        );
        break;
    }
  }

  console.log("\n" + "=".repeat(64));
  if (fejl.length > 0) {
    console.log(`FEJL (${fejl.length}):`);
    for (const f of fejl) console.log(`  ${f.slug}: ${f.besked}`);
    process.exitCode = 1;
  } else {
    console.log(nogetSkrevet ? "Broen skrev nye tal." : "Broen fandt intet nyt.");
  }
}

main()
  .catch((e) => {
    console.error("Fatal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
