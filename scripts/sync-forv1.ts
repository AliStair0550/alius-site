// ============================================================
// Sync script: FORV1 (Forbrugerforventninger — nettotal)
//
// Run with: npx tsx scripts/sync-forv1.ts
//
// Syncs all 13 consumer confidence indicators as monthly time series.
// areaCode = indicator code (F1–F13), areaType = NATIONAL.
// ============================================================

import { PrismaClient } from "@prisma/client";
import { getTableMetadata, getTableData, type DSTFilter } from "../src/lib/dst";

const prisma = new PrismaClient();
const TABLE_ID = "FORV1";
const SOURCE_SLUG = "dst-forv1";

async function main() {
  console.log(`Syncing ${TABLE_ID} — forbrugerforventninger\n`);

  const metadata = await getTableMetadata(TABLE_ID);
  console.log(`DST: ${metadata.text} — opdateret ${metadata.updated}`);

  const source = await prisma.dataSource.upsert({
    where: { slug: SOURCE_SLUG },
    create: {
      slug: SOURCE_SLUG,
      provider: "Danmarks Statistik",
      tableId: TABLE_ID,
      name: "Forbrugerforventninger (nettotal)",
      description: `Månedlig forbrugertillidsindikator og sub-indikatorer (nettotal). ${metadata.description}`,
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
    const indikatorVar = metadata.variables.find(v => v.code === "INDIKATOR")!;
    const indicatorLabels: Record<string, string> = {};
    for (const v of indikatorVar.values) {
      indicatorLabels[v.code] = v.label;
    }

    const filters: DSTFilter[] = [
      { code: "INDIKATOR", values: ["*"] },
      { code: "Tid", values: ["*"] },
    ];

    const datapoints = await getTableData(TABLE_ID, filters);
    console.log(`Received ${datapoints.length} datapoints`);

    let inserted = 0, updated = 0, skipped = 0;

    for (const dp of datapoints) {
      const period = dp.period;
      if (!period) { skipped++; continue; }

      const indicatorCode = dp.dimensions["INDIKATOR"];
      if (!indicatorCode) { skipped++; continue; }

      if (dp.value === null) { skipped++; continue; }

      const areaCode = indicatorCode;
      const areaName = indicatorLabels[indicatorCode] ?? indicatorCode;

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
        console.error(`  Failed ${period}/${indicatorCode}: ${msg}`);
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
