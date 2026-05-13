// ============================================================
// Sync script: DETA211A (Detailomsætningsindeks)
//
// Run with: npx tsx scripts/sync-deta211a.ts
//
// Syncs monthly retail sales index for G47 (total) and key subcategories.
// areaCode = branch code (G47 etc.), areaType = NATIONAL.
// ============================================================

import { PrismaClient } from "@prisma/client";
import { getTableMetadata, getTableData, type DSTFilter } from "../src/lib/dst";

const prisma = new PrismaClient();
const TABLE_ID = "DETA211A";
const SOURCE_SLUG = "dst-deta211a";

// Key branches to sync: total + food + clothing + furniture + electronics + online
const SYNC_BRANCHES = ["G47", "471", "472", "474", "475", "477", "479"];

async function main() {
  console.log(`Syncing ${TABLE_ID} — detailomsætningsindeks\n`);

  const metadata = await getTableMetadata(TABLE_ID);
  console.log(`DST: ${metadata.text} — opdateret ${metadata.updated}`);

  const source = await prisma.dataSource.upsert({
    where: { slug: SOURCE_SLUG },
    create: {
      slug: SOURCE_SLUG,
      provider: "Danmarks Statistik",
      tableId: TABLE_ID,
      name: "Detailomsætningsindeks",
      description: `Månedligt indeks for detailomsætning i Danmark (base 100). ${metadata.description}`,
      sourceUrl: `https://www.statistikbanken.dk/${TABLE_ID}`,
      license: "CC 4.0 BY",
      updateFrequency: "MONTHLY",
      lastUpdatedAtSource: new Date(metadata.updated),
    },
    update: {
      lastUpdatedAtSource: new Date(metadata.updated),
    },
  });

  const fetchLog = await prisma.fetchLog.create({
    data: { sourceId: source.id },
  });

  try {
    const brancheVar = metadata.variables.find(v => v.code === "BRANCHEDB25UDVALG")!;
    const branchLabels: Record<string, string> = {};
    for (const v of brancheVar.values) {
      branchLabels[v.code] = v.label;
    }

    // Only sync branches that exist in metadata
    const availableCodes = new Set(brancheVar.values.map(v => v.code));
    const branchesToSync = SYNC_BRANCHES.filter(b => availableCodes.has(b));
    console.log(`Syncing branches: ${branchesToSync.join(", ")}`);

    const filters: DSTFilter[] = [
      { code: "BRANCHEDB25UDVALG", values: branchesToSync },
      { code: "Tid", values: ["*"] },
    ];

    const datapoints = await getTableData(TABLE_ID, filters);
    console.log(`Received ${datapoints.length} datapoints`);

    let inserted = 0, updated = 0, skipped = 0;

    for (const dp of datapoints) {
      const period = dp.period;
      if (!period) { skipped++; continue; }

      const branchCode = dp.dimensions["BRANCHEDB25UDVALG"];
      if (!branchCode) { skipped++; continue; }

      if (dp.value === null) { skipped++; continue; }

      const areaCode = branchCode;
      const areaName = branchLabels[branchCode] ?? branchCode;

      try {
        const existing = await prisma.dataPoint.findFirst({
          where: { sourceId: source.id, period, areaCode },
        });

        if (existing) {
          if (existing.value !== dp.value) {
            await prisma.dataPoint.update({
              where: { id: existing.id },
              data: { value: dp.value },
            });
            updated++;
          }
        } else {
          await prisma.dataPoint.create({
            data: {
              sourceId: source.id,
              period,
              periodDate: dp.periodDate,
              periodType: "MONTH",
              areaCode,
              areaName,
              areaType: "NATIONAL",
              value: dp.value,
              status: dp.status,
            },
          });
          inserted++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown";
        console.error(`  Failed ${period}/${branchCode}: ${msg}`);
        skipped++;
      }
    }

    console.log(`Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}`);

    await prisma.fetchLog.update({
      where: { id: fetchLog.id },
      data: {
        completedAt: new Date(),
        success: true,
        rowsAffected: inserted + updated,
        notes: `Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}`,
      },
    });

    await prisma.dataSource.update({
      where: { id: source.id },
      data: { lastFetchedAt: new Date() },
    });

    console.log("\nSync complete.");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown";
    console.error(`Sync failed: ${message}`);
    await prisma.fetchLog.update({
      where: { id: fetchLog.id },
      data: { completedAt: new Date(), success: false, error: message },
    });
    throw err;
  }
}

main()
  .catch((e) => { console.error("Fatal:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
