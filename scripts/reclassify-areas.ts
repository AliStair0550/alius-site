// ============================================================
// Reclassify existing datapoints
//
// Run with: npx tsx scripts/reclassify-areas.ts
//
// After updating classifyAreaCode() to filter out "Udlandet" and other
// non-municipality areas, we need to reclassify existing rows in the DB.
// ============================================================

import { PrismaClient } from "@prisma/client";
import { classifyAreaCode } from "../src/lib/areas";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Reclassifying areas in existing datapoints...\n");

  const allDatapoints = await prisma.dataPoint.findMany({
    select: {
      id: true,
      areaCode: true,
      areaName: true,
      areaType: true,
    },
  });

  console.log(`📊 Loaded ${allDatapoints.length} datapoints to check`);

  let updated = 0;
  const typeChanges: Record<string, number> = {};

  for (const dp of allDatapoints) {
    const newType = classifyAreaCode(dp.areaCode);
    if (newType !== dp.areaType) {
      const key = `${dp.areaType} → ${newType}`;
      typeChanges[key] = (typeChanges[key] ?? 0) + 1;
      await prisma.dataPoint.update({
        where: { id: dp.id },
        data: { areaType: newType },
      });
      updated++;
    }
  }

  console.log(`\n✅ Updated ${updated} datapoints\n`);
  console.log("Changes by type transition:");
  for (const [key, count] of Object.entries(typeChanges)) {
    console.log(`  ${key}: ${count}`);
  }

  // Show what's now classified as OTHER for transparency
  const others = await prisma.dataPoint.findMany({
    where: { areaType: "OTHER" },
    distinct: ["areaCode"],
    select: { areaCode: true, areaName: true },
  });
  if (others.length > 0) {
    console.log("\nNow classified as OTHER (will be excluded from analysis):");
    for (const o of others) {
      console.log(`  ${o.areaCode}: ${o.areaName}`);
    }
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
