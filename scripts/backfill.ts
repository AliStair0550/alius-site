// ============================================================
// Backfill af fase 1-serier
//
// Run with:
//   set -a && . ./.env.local && set +a
//   npx tsx scripts/backfill.ts [serie-id ...]
//
// KØRES LOKALT. Ikke som endpoint. Kørslen henter hele historikken fra
// hver kilde og kan tage mange minutter; elprisen alene er 27 år
// timedata der skal sideindlæses og aggregeres.
//
// Henter så langt tilbage kilden tillader. Ingen afkortning til ti år.
// Vi kan altid vælge et kortere vindue til beregning, men vi kan ikke
// hente historik der aldrig blev gemt.
// ============================================================

import { PrismaClient } from "@prisma/client";
import { withDbRetry } from "../src/lib/db";
import { SERIES } from "../config/series";
import { DstAdapter } from "../src/lib/adapters/dst";
import { EdsAdapter } from "../src/lib/adapters/eds";
import { EurostatAdapter } from "../src/lib/adapters/eurostat";
import type { SeriesDef, SourceAdapter } from "../src/lib/adapters/types";
import { writeObservations } from "../src/lib/pulse-observations";
import { defaultRankable } from "../src/lib/pulse-series";

const prisma = new PrismaClient();

const ADAPTERS: Record<SeriesDef["source"], SourceAdapter> = {
  DST: new DstAdapter(),
  EDS: new EdsAdapter(),
  EUROSTAT: new EurostatAdapter(),
};

async function upsertSeries(def: SeriesDef) {
  // Standarden følger lag og status. Config kan overskrive den, men
  // aldrig i retning af mere rangering: en CLOSED eller STRUCTURAL serie
  // kan ikke gøres rangerbar ved et uheld.
  const auto = defaultRankable(def.layer, "ACTIVE");
  const rankable = def.rankable ?? auto.rankable;
  const rankableReason = def.rankable === false
    ? def.rankableReason ?? "Manuelt fravalgt."
    : auto.reason;

  const data = {
    nameDa: def.nameDa,
    source: def.source,
    sourceRef: def.sourceRef,
    unit: def.unit,
    frequency: def.frequency,
    expectedLagDays: def.expectedLagDays,
    revisionPolicy: def.revisionPolicy,
    attribution: def.attribution,
    layer: def.layer,
    status: "ACTIVE" as const,
    rankable,
    rankableReason,
    meta: { zTransform: def.zTransform },
  };
  await prisma.series.upsert({
    where: { id: def.id },
    create: { id: def.id, ...data },
    update: data,
  });
}

async function main() {
  const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const defs = only.length ? SERIES.filter((s) => only.includes(s.id)) : SERIES;

  if (defs.length === 0) {
    console.error("Ingen serier matchede. Kendte id'er:");
    for (const s of SERIES) console.error(`  ${s.id}`);
    process.exit(1);
  }

  console.log(`Backfill af ${defs.length} serier. Hele historikken, ingen afkortning.\n`);

  // Neon skalerer til nul ved inaktivitet. En EDS-kørsel venter fire
  // minutter mellem sider, så forbindelsen er kold hver gang der skal
  // skrives. Uden opvågning fejler kørslen på en forbigående blip efter
  // timers arbejde.
  await withDbRetry(() => prisma.$queryRaw`SELECT 1`);

  const failures: Array<{ id: string; error: string }> = [];
  let totalInserted = 0;
  let totalRevised = 0;

  for (const def of defs) {
    const started = new Date();
    const run = await prisma.ingestRun.create({
      data: {
        seriesId: null, // serien kan mangle hvis upsert fejler
        sourceSlug: def.id,
        startedAt: started,
        status: "ERROR", // pessimistisk indtil andet er bevist
      },
    });

    console.log(`[${def.id}]`);
    console.log(`   ${def.nameDa}`);
    console.log(`   ${def.source} ${def.sourceRef} -> ${def.unit}, ${def.layer}`);

    try {
      await upsertSeries(def);
      const adapter = ADAPTERS[def.source];

      // Genoptagelse: kilder der er rate-limitet kan ikke nå hele
      // historikken i én kørsel. Vi starter efter det nyeste døgn der
      // allerede står i basen, og skriver undervejs.
      const newest = await prisma.observation.findFirst({
        where: { seriesId: def.id, isCurrent: true },
        orderBy: { period: "desc" },
        select: { period: true },
      });
      const resumeFrom = def.source === "EDS" ? newest?.period ?? null : null;
      if (resumeFrom) {
        console.log(`   genoptager efter ${resumeFrom.toISOString().slice(0, 10)}`);
      }

      let streamed = 0;
      const points = await adapter.fetchSeries(def, {
        resumeFrom,
        onBatch: async (batch) => {
          const r = await withDbRetry(() => writeObservations(prisma, def.id, batch, started));
          streamed += r.inserted;
        },
      });
      if (streamed > 0) console.log(`   skrevet undervejs: ${streamed} observationer`);

      const withValue = points.filter((p) => p.value !== null);
      const first = withValue[0]?.period;
      const last = withValue[withValue.length - 1]?.period;
      const years =
        first && last
          ? ((last.getTime() - first.getTime()) / (365.25 * 86_400_000)).toFixed(1)
          : "0";

      const w = await withDbRetry(() => writeObservations(prisma, def.id, points, started));
      totalInserted += w.inserted;
      totalRevised += w.revised;

      console.log(
        `   ${points.length} observationer, ${first?.toISOString().slice(0, 10)} .. ` +
          `${last?.toISOString().slice(0, 10)} (${years} år)`
      );
      console.log(
        `   indsat ${w.inserted}, revideret ${w.revised}, uændret ${w.unchanged}`
      );
      for (const lr of w.largeRevisions.slice(0, 5)) {
        console.log(
          `   REVISION >5%: ${lr.period} ${lr.from} -> ${lr.to} (${lr.pct.toFixed(1)}%)`
        );
      }

      await prisma.ingestRun.update({
        where: { id: run.id },
        data: {
          seriesId: def.id,
          finishedAt: new Date(),
          status: w.inserted + w.revised > 0 ? "OK" : "NO_NEW_DATA",
          rowsWritten: w.inserted,
          rowsRevised: w.revised,
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`   FEJL: ${msg}`);
      failures.push({ id: def.id, error: msg });
      await prisma.ingestRun.update({
        where: { id: run.id },
        data: { finishedAt: new Date(), status: "ERROR", errorMessage: msg },
      });
    }
    console.log("");
  }

  console.log("=".repeat(70));
  console.log(`Indsat i alt: ${totalInserted}   revideret: ${totalRevised}`);
  if (failures.length > 0) {
    console.log(`\n${failures.length} serier fejlede:`);
    for (const f of failures) console.log(`  ${f.id}: ${f.error.slice(0, 140)}`);
    process.exitCode = 1;
  } else {
    console.log("Alle serier hentet uden fejl.");
  }
}

main()
  .catch((e) => { console.error("Fatal:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
