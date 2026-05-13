// ============================================================
// Generate signals from LABY01 B11 (total population growth) data
//
// Run with: npx tsx scripts/generate-laby01-signals.ts
// ============================================================

import { PrismaClient, Prisma } from "@prisma/client";
import { generateLaby01Signals } from "../src/lib/signals/laby01-detectors";
import type { DataPoint } from "../src/lib/signals/types";

const prisma = new PrismaClient();
// B11 = total population growth (births−deaths + net migration)
const SOURCE_SLUG = "dst-laby01-b11";

async function main() {
  console.log("🧠 Generating signals for LABY01-B11 (befolkningstilvækst)...\n");

  const source = await prisma.dataSource.findUnique({ where: { slug: SOURCE_SLUG } });
  if (!source) {
    console.error(`❌ Source ${SOURCE_SLUG} not found. Run sync-laby01.ts first.`);
    process.exit(1);
  }

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

  const signals = generateLaby01Signals(points);

  console.log(`\n📡 Generated ${signals.length} signals:\n`);
  for (const s of signals) {
    const icon = s.direction === "up" ? "⬆" : s.direction === "down" ? "⬇" : "—";
    const sev = s.severity === "important" ? "[!]" : "   ";
    console.log(`${sev} ${icon} ${s.headline}`);
  }

  await prisma.$transaction([
    prisma.signal.deleteMany({ where: { sourceId: source.id } }),
    prisma.signal.createMany({
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
    }),
  ]);

  console.log(`\n✅ Persisted ${signals.length} signals`);
}

main()
  .catch((e) => {
    console.error("Fatal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
