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

const prisma = new PrismaClient();
const FORCE = process.argv.includes("--force");

type Layer = "LEADING" | "COST" | "CAPITAL" | "EXTERNAL" | "REALISED" | "STRUCTURAL";
type Freq = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
type Revision = "NONE" | "MINOR" | "MAJOR";
type Status = "ACTIVE" | "CLOSED";

/** Hvordan areaCode i den gamle model skal forstås. */
type AreaRule =
  /** areaCode er geografi -> én serie, areaCode bæres over på observationen */
  | { kind: "geo" }
  /** areaCode er ikke geografi -> én serie per areaCode, observation får "DK" */
  | { kind: "areaCodeIsIdentity"; label: (code: string, name: string | null) => string; suffix: (code: string) => string }
  /** identitet ligger i dimensions-JSON -> én serie per nøgle, observation får "DK" */
  | { kind: "dimensionIsIdentity"; dimKey: string; labelKey: string; suffix: (code: string) => string }
  /** national enkeltserie */
  | { kind: "single" };

type SourceConfig = {
  slug: string;
  seriesBase: string;
  nameDa: string;
  unit: string;
  frequency: Freq;
  layer: Layer;
  revisionPolicy: Revision;
  expectedLagDays: number;
  status: Status;
  breakAt?: string | null;
  breakReason?: string | null;
  area: AreaRule;
};

const CONFIG: SourceConfig[] = [
  // ---- REALISED: det der allerede er sket ----
  {
    slug: "dst-aus08",
    seriesBase: "dst.ledighed.sasonkorrigeret",
    nameDa: "Fuldtidsledige, sæsonkorrigeret",
    unit: "pct",
    frequency: "MONTHLY",
    layer: "REALISED",
    revisionPolicy: "MINOR", // sæsonkorrektion genberegnes
    expectedLagDays: 35,
    status: "ACTIVE",
    area: { kind: "geo" },
  },
  {
    slug: "dst-konk3",
    seriesBase: "dst.konkurs.total",
    nameDa: "Erklærede konkurser i alt, sæsonkorrigeret",
    unit: "antal",
    frequency: "MONTHLY",
    layer: "REALISED",
    revisionPolicy: "MINOR",
    expectedLagDays: 12,
    status: "ACTIVE",
    area: { kind: "single" },
  },
  {
    slug: "dst-konk25",
    seriesBase: "dst.konkurs.branche",
    nameDa: "Erklærede konkurser i aktive virksomheder",
    unit: "antal",
    frequency: "MONTHLY",
    layer: "REALISED",
    revisionPolicy: "MINOR",
    expectedLagDays: 12,
    status: "ACTIVE",
    // Ingen break_at. KONK25 er DB25 i hele sin længde tilbage til
    // 2009M01, fordi DST har tilbageregnet historikken. Se rapportens
    // afsnit 9.6.
    area: {
      kind: "dimensionIsIdentity",
      dimKey: "BRANCHE_CODE",
      labelKey: "BRANCHE_LABEL",
      suffix: (c) => c.toLowerCase(),
    },
  },
  {
    slug: "dst-konk4",
    seriesBase: "dst.konkurs.branche.db07",
    nameDa: "Erklærede konkurser i aktive virksomheder (DB07, lukket)",
    unit: "antal",
    frequency: "MONTHLY",
    layer: "REALISED",
    revisionPolicy: "MINOR",
    expectedLagDays: 12,
    // DST lukkede KONK4 7. januar 2026. Bevares i fuld længde, men
    // CLOSED holder den ude af ranglisten permanent.
    status: "CLOSED",
    area: {
      kind: "dimensionIsIdentity",
      dimKey: "BRANCHE_CODE",
      labelKey: "BRANCHE_LABEL",
      suffix: (c) => c.toLowerCase(),
    },
  },
  {
    slug: "dst-deta211a",
    seriesBase: "dst.detail.omsaetning",
    nameDa: "Detailomsætningsindeks",
    unit: "indeks",
    frequency: "MONTHLY",
    layer: "REALISED",
    revisionPolicy: "MINOR",
    expectedLagDays: 62,
    status: "ACTIVE",
    area: {
      kind: "areaCodeIsIdentity",
      label: (_c, n) => n ?? "Detailhandel",
      suffix: (c) => c.toLowerCase(),
    },
  },

  // ---- LEADING: handl nu ----
  {
    slug: "dst-forv1",
    seriesBase: "dst.forbrug.forventning",
    nameDa: "Forbrugerforventninger",
    unit: "nettotal",
    frequency: "MONTHLY",
    layer: "LEADING",
    revisionPolicy: "NONE",
    expectedLagDays: 5,
    status: "ACTIVE",
    area: {
      kind: "areaCodeIsIdentity",
      label: (c, n) => n ?? c,
      suffix: (c) => c.toLowerCase(),
    },
  },
  {
    slug: "dst-bygv33",
    seriesBase: "dst.byg.paabegyndt",
    nameDa: "Påbegyndte boliger",
    unit: "antal",
    frequency: "QUARTERLY",
    layer: "LEADING",
    revisionPolicy: "MAJOR", // efterindberetninger til BBR
    expectedLagDays: 70,
    status: "ACTIVE",
    area: { kind: "geo" },
  },

  // ---- COST ----
  {
    slug: "dst-pris01",
    seriesBase: "dst.pris.forbruger",
    nameDa: "Forbrugerprisindeks",
    unit: "indeks",
    frequency: "MONTHLY",
    layer: "COST",
    revisionPolicy: "NONE",
    expectedLagDays: 12,
    status: "ACTIVE",
    area: {
      kind: "areaCodeIsIdentity",
      label: (_c, n) => n ?? "Forbrugerprisindeks",
      suffix: (c) => (c === "100" ? "indeks" : "aarsaendring"),
    },
  },

  // ---- STRUCTURAL: ingenting i dette kvartal ----
  {
    slug: "dst-folk1am",
    seriesBase: "dst.befolkning.antal",
    nameDa: "Befolkningstal",
    unit: "antal",
    frequency: "MONTHLY",
    layer: "STRUCTURAL",
    revisionPolicy: "NONE",
    expectedLagDays: 14,
    status: "ACTIVE",
    area: { kind: "geo" },
  },
  {
    slug: "dst-indkp101",
    seriesBase: "dst.indkomst.disponibel",
    nameDa: "Disponibel indkomst, gennemsnit",
    unit: "dkk",
    frequency: "YEARLY",
    layer: "STRUCTURAL",
    revisionPolicy: "MINOR",
    expectedLagDays: 380,
    status: "ACTIVE",
    area: { kind: "geo" },
  },
  {
    slug: "dst-ejdfoe1-huse",
    seriesBase: "dst.ejendom.markedsvaerdi.enfamiliehuse",
    nameDa: "Markedsværdi, enfamiliehuse, gennemsnit",
    unit: "dkk",
    frequency: "YEARLY",
    layer: "STRUCTURAL",
    revisionPolicy: "MINOR",
    expectedLagDays: 500,
    status: "ACTIVE",
    area: { kind: "geo" },
  },
  {
    slug: "dst-ejdfoe1-lejl",
    seriesBase: "dst.ejendom.markedsvaerdi.ejerlejligheder",
    nameDa: "Markedsværdi, ejerlejligheder, gennemsnit",
    unit: "dkk",
    frequency: "YEARLY",
    layer: "STRUCTURAL",
    revisionPolicy: "MINOR",
    expectedLagDays: 500,
    status: "ACTIVE",
    area: { kind: "geo" },
  },
  {
    slug: "dst-laby01-b04",
    seriesBase: "dst.demografi.foedselsoverskud",
    nameDa: "Fødselsoverskud per 1.000 indbyggere",
    unit: "per_1000",
    frequency: "YEARLY",
    layer: "STRUCTURAL",
    revisionPolicy: "NONE",
    expectedLagDays: 60,
    status: "ACTIVE",
    area: { kind: "geo" },
  },
  {
    slug: "dst-laby01-b07",
    seriesBase: "dst.demografi.nettotilflytning",
    nameDa: "Nettotilflyttede per 1.000 indbyggere",
    unit: "per_1000",
    frequency: "YEARLY",
    layer: "STRUCTURAL",
    revisionPolicy: "NONE",
    expectedLagDays: 60,
    status: "ACTIVE",
    area: { kind: "geo" },
  },
  {
    slug: "dst-laby01-b10",
    seriesBase: "dst.demografi.nettoindvandring",
    nameDa: "Nettoindvandrede per 1.000 indbyggere",
    unit: "per_1000",
    frequency: "YEARLY",
    layer: "STRUCTURAL",
    revisionPolicy: "NONE",
    expectedLagDays: 60,
    status: "ACTIVE",
    area: { kind: "geo" },
  },
  {
    slug: "dst-laby01-b11",
    seriesBase: "dst.demografi.befolkningstilvaekst",
    nameDa: "Befolkningstilvækst per 1.000 indbyggere",
    unit: "per_1000",
    frequency: "YEARLY",
    layer: "STRUCTURAL",
    revisionPolicy: "NONE",
    expectedLagDays: 60,
    status: "ACTIVE",
    area: { kind: "geo" },
  },
];

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
          unit: cfg.unit,
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
