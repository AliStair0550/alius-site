// ============================================================
// Generate signals from current unemployment data
//
// Run with: npx tsx scripts/generate-signals.ts
//
// Reads all DataPoint rows for AUS08, runs all signal detectors,
// and replaces the current set of published signals.
// ============================================================

import { PrismaClient, Prisma } from "@prisma/client";
import { generateAllSignals, type DataPoint } from "../src/lib/signals/detectors";

const prisma = new PrismaClient();

const SOURCE_SLUG = "dst-aus08";

async function main() {
  console.log("🧠 Generating signals for AUS08...\n");

  const source = await prisma.dataSource.findUnique({
    where: { slug: SOURCE_SLUG },
  });
  if (!source) {
    console.error(`❌ Source ${SOURCE_SLUG} not found. Run sync first.`);
    process.exit(1);
  }

  // Load all datapoints for this source
  const rows = await prisma.dataPoint.findMany({
    where: { sourceId: source.id },
    select: {
      period: true,
      periodDate: true,
      areaCode: true,
      areaName: true,
      areaType: true,
      value: true,
    },
    orderBy: { periodDate: "asc" },
  });

  console.log(`📊 Loaded ${rows.length} datapoints`);

  const points: DataPoint[] = rows
    .filter((r) => r.areaType !== "OTHER")
    .map((r) => ({
      period: r.period,
      periodDate: r.periodDate,
      areaCode: r.areaCode,
      areaName: r.areaName,
      areaType: r.areaType as "NATIONAL" | "REGION" | "LANDSDEL" | "KOMMUNE",
      value: r.value,
    }));

  // Run all detectors
  const signals = generateAllSignals(points);

  console.log(`\n📡 Generated ${signals.length} signals:\n`);
  for (const s of signals) {
    const icon =
      s.direction === "up" ? "⬆" : s.direction === "down" ? "⬇" : "—";
    const sevTag =
      s.severity === "important" ? "[!]" : s.severity === "note" ? "   " : "   ";
    console.log(`${sevTag} ${icon} ${s.headline}`);
  }

  // Clear existing signals for this source
  await prisma.signal.deleteMany({
    where: { sourceId: source.id },
  });

  // Persist new signals
  // We need to translate our string types to the Prisma enum values
  const created = await prisma.signal.createMany({
    data: signals.map((s) => ({
      sourceId: source.id,
      type: s.type.toUpperCase() as
        | "TOP_MOVER"
        | "RECORD"
        | "STREAK"
        | "COMPARISON"
        | "TURNING_POINT"
        | "OUTLIER",
      direction:
        s.direction === "up"
          ? "UP"
          : s.direction === "down"
          ? "DOWN"
          : s.direction === "stable"
          ? "STABLE"
          : null,
      severity: s.severity,
      headline: s.headline,
      body: s.body,
      period: s.period,
      magnitude: s.magnitude,
      areaCode: s.areaCode,
      areaName: s.areaName,
      evidence: s.evidence as Prisma.InputJsonValue | undefined,
    })),
  });

  console.log(`\n✅ Persisted ${created.count} signals`);
}

main()
  .catch((e) => {
    console.error("Fatal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
