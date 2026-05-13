// ============================================================
// Sync script: PRIS01 (Forbrugerprisindeks)
//
// Run with: npx tsx scripts/sync-pris01.ts
//
// Syncs total CPI as both index (ENHED=100) and YoY % change (ENHED=300).
// areaCode = ENHED code ("100" = indeks, "300" = år/år pct.)
// ============================================================

import { PrismaClient } from "@prisma/client";
import { getTableMetadata, getTableData, type DSTFilter } from "../src/lib/dst";

const prisma = new PrismaClient();
const TABLE_ID = "PRIS01";
const SOURCE_SLUG = "dst-pris01";

async function main() {
  console.log(`Syncing ${TABLE_ID} — forbrugerprisindeks\n`);

  const metadata = await getTableMetadata(TABLE_ID);
  console.log(`DST: ${metadata.text} — opdateret ${metadata.updated}`);

  const source = await prisma.dataSource.upsert({
    where: { slug: SOURCE_SLUG },
    create: {
      slug: SOURCE_SLUG,
      provider: "Danmarks Statistik",
      tableId: TABLE_ID,
      name: "Forbrugerprisindeks (total)",
      description: `Månedlig inflation og prisindeks for Danmark i alt. ${metadata.description}`,
      sourceUrl: `https://www.statistikbanken.dk/${TABLE_ID}`,
      license: "CC 4.0 BY",
      updateFrequency: "MONTHLY",
      lastUpdatedAtSource: new Date(metadata.updated),
    },
    update: {
      lastUpdatedAtSource: new Date(metadata.updated),
    },
  });

  const fetchLog = await prisma.fetchLog.create({ data: { sourceId: source.id } });

  try {
    const filters: DSTFilter[] = [
      { code: "VAREGR", values: ["000000"] }, // Total CPI
      { code: "ENHED", values: ["100", "300"] }, // Index + YoY %
      { code: "Tid", values: ["*"] },
    ];

    const datapoints = await getTableData(TABLE_ID, filters);
    console.log(`Received ${datapoints.length} datapoints`);

    let inserted = 0, updated = 0, skipped = 0;

    for (const dp of datapoints) {
      if (!dp.period || dp.value === null) { skipped++; continue; }

      const enhed = dp.dimensions["ENHED"];
      if (!enhed) { skipped++; continue; }

      // areaCode encodes the unit: "100"=index, "300"=årsændring pct.
      const areaCode = enhed;
      const areaName = enhed === "100" ? "Indeks" : "Ændring år/år (pct.)";

      try {
        const existing = await prisma.dataPoint.findFirst({
          where: { sourceId: source.id, period: dp.period, areaCode },
        });
        if (existing) {
          if (existing.value !== dp.value) {
            await prisma.dataPoint.update({ where: { id: existing.id }, data: { value: dp.value } });
            updated++;
          }
        } else {
          await prisma.dataPoint.create({
            data: {
              sourceId: source.id,
              period: dp.period,
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
        console.error(`  Failed ${dp.period}/${areaCode}: ${msg}`);
        skipped++;
      }
    }

    console.log(`Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}`);

    await prisma.fetchLog.update({
      where: { id: fetchLog.id },
      data: { completedAt: new Date(), success: true, rowsAffected: inserted + updated,
        notes: `Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}` },
    });
    await prisma.dataSource.update({ where: { id: source.id }, data: { lastFetchedAt: new Date() } });
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
