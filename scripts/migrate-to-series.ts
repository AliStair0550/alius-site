// ============================================================
// Engangsscript: DataPoint -> series / observations
//                FetchLog  -> ingest_runs
//
// Run with: npx tsx scripts/migrate-to-series.ts [--force]
//
// Additivt. Rører ikke DataPoint, Signal, DataSource eller FetchLog.
// Kan køres igen med --force, som tømmer de nye tabeller først.
//
// Reglerne der styrer oversættelsen:
//
//   area_code er udelukkende geografi. "DK" for nationale serier.
//   Alt andet (branche, spørgsmålsnummer, enhedskode) er en del af
//   seriens identitet og bliver til separate serier.
//
//   retrieved_at sættes til DataPoint.updatedAt. Det er det tætteste
//   vi kommer på et hentetidspunkt for data der er skrevet under den
//   gamle model. Alle rækker får is_current = true, fordi den gamle
//   model kun havde én vintage.
// ============================================================

import { PrismaClient, Prisma } from "@prisma/client";

import { kraevSkriveret } from "./write-guard";
const prisma = new PrismaClient();
const FORCE = process.argv.includes("--force");

import { CONFIG, enhedFor, type SourceConfig } from "./legacy-mapping";

const CHUNK = 1000;

function chunk<T>(xs: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
}

/** Normaliser periodeDato til ren UTC-midnat, så DATE-kolonnen ikke skrider. */
function toPeriodDate(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function main() {
  kraevSkriveret("migrate-to-series.ts");
  console.log("Migrerer DataPoint -> series/observations\n");

  const existing = await prisma.series.count();
  if (existing > 0) {
    if (!FORCE) {
      console.error(
        `series indeholder allerede ${existing} rækker. Kør med --force for at tømme og migrere igen.`
      );
      process.exit(1);
    }
    console.log(`Tømmer ${existing} eksisterende serier og deres observationer...`);
    await prisma.ingestRun.deleteMany({});
    await prisma.observation.deleteMany({});
    await prisma.series.deleteMany({});
  }

  const totalBefore = await prisma.dataPoint.count();
  console.log(`DataPoint rækker at flytte: ${totalBefore}\n`);

  const seriesRows: Prisma.SeriesCreateManyInput[] = [];
  const obsRows: Prisma.ObservationCreateManyInput[] = [];
  const perSource: Array<{ slug: string; series: number; obs: number; areas: number }> = [];
  const unmapped: string[] = [];

  for (const cfg of CONFIG) {
    const source = await prisma.dataSource.findUnique({ where: { slug: cfg.slug } });
    if (!source) {
      unmapped.push(`${cfg.slug}: findes ikke i DataSource`);
      continue;
    }

    const rows = await prisma.dataPoint.findMany({
      where: { sourceId: source.id },
      select: {
        period: true,
        periodDate: true,
        areaCode: true,
        areaName: true,
        value: true,
        dimensions: true,
        updatedAt: true,
      },
    });

    const attribution = `Danmarks Statistik, tabel ${source.tableId}. ${source.license ?? "CC 4.0 BY"}`;
    const seenSeries = new Set<string>();
    const areaCodes = new Set<string>();
    let obsCount = 0;

    for (const r of rows) {
      let seriesId: string;
      let seriesName: string;
      let areaCode: string;
      let legacyArea: string | null = null;

      if (cfg.area.kind === "geo") {
        seriesId = cfg.seriesBase;
        seriesName = cfg.nameDa;
        areaCode = r.areaCode ?? "DK";
      } else if (cfg.area.kind === "single") {
        seriesId = cfg.seriesBase;
        seriesName = cfg.nameDa;
        areaCode = "DK";
      } else if (cfg.area.kind === "areaCodeIsIdentity") {
        const code = r.areaCode;
        if (!code) { unmapped.push(`${cfg.slug}: række uden areaCode (${r.period})`); continue; }
        seriesId = `${cfg.seriesBase}.${cfg.area.suffix(code)}`;
        seriesName = `${cfg.nameDa}: ${cfg.area.label(code, r.areaName)}`;
        areaCode = "DK";
        legacyArea = code;
      } else {
        const dims = r.dimensions as Record<string, string> | null;
        const code = dims?.[cfg.area.dimKey];
        if (!code) { unmapped.push(`${cfg.slug}: række uden ${cfg.area.dimKey} (${r.period})`); continue; }
        seriesId = `${cfg.seriesBase}.${cfg.area.suffix(code)}`;
        seriesName = `${cfg.nameDa}: ${dims?.[cfg.area.labelKey] ?? code}`;
        areaCode = "DK";
        legacyArea = code;
      }

      if (!seenSeries.has(seriesId)) {
        seenSeries.add(seriesId);
        seriesRows.push({
          id: seriesId,
          nameDa: seriesName,
          source: "DST",
          sourceRef: source.tableId,
          unit: enhedFor(cfg, legacyArea),
          frequency: cfg.frequency,
          expectedLagDays: cfg.expectedLagDays,
          revisionPolicy: cfg.revisionPolicy,
          attribution,
          layer: cfg.layer,
          status: cfg.status,
          breakAt: cfg.breakAt ? new Date(cfg.breakAt) : null,
          breakReason: cfg.breakReason ?? null,
          legacySourceSlug: cfg.slug,
          legacyAreaCode: legacyArea,
        });
      }

      areaCodes.add(areaCode);
      obsRows.push({
        seriesId,
        areaCode,
        period: toPeriodDate(r.periodDate),
        value: r.value === null ? null : new Prisma.Decimal(r.value),
        retrievedAt: r.updatedAt,
        isCurrent: true,
      });
      obsCount++;
    }

    perSource.push({
      slug: cfg.slug,
      series: seenSeries.size,
      obs: obsCount,
      areas: areaCodes.size,
    });
    console.log(
      `  ${cfg.slug.padEnd(20)} ${String(seenSeries.size).padStart(3)} serier, ` +
        `${String(obsCount).padStart(6)} observationer, ${String(areaCodes.size).padStart(3)} area_codes  [${cfg.layer}${cfg.status === "CLOSED" ? ", CLOSED" : ""}]`
    );
  }

  console.log(`\nSkriver ${seriesRows.length} serier...`);
  for (const b of chunk(seriesRows, CHUNK)) {
    await prisma.series.createMany({ data: b, skipDuplicates: true });
  }

  console.log(`Skriver ${obsRows.length} observationer...`);
  let written = 0;
  for (const b of chunk(obsRows, CHUNK)) {
    const res = await prisma.observation.createMany({ data: b, skipDuplicates: true });
    written += res.count;
  }
  console.log(`  ${written} skrevet (${obsRows.length - written} sprunget over som dubletter)`);

  // ---- FetchLog -> ingest_runs ----
  console.log(`\nMigrerer FetchLog -> ingest_runs...`);
  const logs = await prisma.fetchLog.findMany({
    include: { source: { select: { slug: true } } },
    orderBy: { createdAt: "asc" },
  });
  const runRows: Prisma.IngestRunCreateManyInput[] = logs.map((l) => {
    let status: "OK" | "NO_NEW_DATA" | "ERROR" | "ABORTED";
    if (!l.completedAt) status = "ABORTED";
    else if (!l.success) status = "ERROR";
    else if (l.inserted + l.updated > 0) status = "OK";
    else status = "NO_NEW_DATA";
    return {
      // Bevidst null: historiske kørsler var på kilde-niveau, før serier
      // fandtes. source_slug bærer sporbarheden.
      seriesId: null,
      sourceSlug: l.source.slug,
      startedAt: l.createdAt,
      finishedAt: l.completedAt,
      status,
      rowsWritten: l.inserted,
      rowsRevised: l.updated,
      errorMessage: l.error,
    };
  });
  for (const b of chunk(runRows, CHUNK)) {
    await prisma.ingestRun.createMany({ data: b });
  }
  const byStatus = runRows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status as string] = (acc[r.status as string] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`  ${runRows.length} kørsler: ${Object.entries(byStatus).map(([k, v]) => `${k}=${v}`).join(", ")}`);

  if (unmapped.length > 0) {
    console.log(`\nRækker uden mapping (${unmapped.length}):`);
    for (const u of unmapped.slice(0, 20)) console.log(`  ${u}`);
    if (unmapped.length > 20) console.log(`  ... +${unmapped.length - 20} flere`);
  }

  console.log("\n=== Opsummering per kilde ===");
  console.log(`${"kilde".padEnd(20)} ${"serier".padStart(7)} ${"obs".padStart(7)} ${"areas".padStart(6)}`);
  for (const p of perSource) {
    console.log(`${p.slug.padEnd(20)} ${String(p.series).padStart(7)} ${String(p.obs).padStart(7)} ${String(p.areas).padStart(6)}`);
  }
  console.log(
    `${"I ALT".padEnd(20)} ${String(perSource.reduce((a, p) => a + p.series, 0)).padStart(7)} ` +
      `${String(perSource.reduce((a, p) => a + p.obs, 0)).padStart(7)}`
  );
  console.log("\nMigration færdig. DataPoint og Signal er urørt.");
}

main()
  .catch((e) => { console.error("Fatal:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
