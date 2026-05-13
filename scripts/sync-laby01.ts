// ============================================================
// Sync script: LABY01 (Befolkningstilvækst pr. 1.000 indbyggere)
//
// Run with: npx tsx scripts/sync-laby01.ts
//
// Syncs annual population growth rates per municipality:
//   B04 = Fødselsoverskud (births - deaths per 1000)
//   B07 = Nettotilflyttede (net internal migration per 1000)
//   B10 = Nettoindvandrede (net immigration per 1000)
//   B11 = Befolkningstilvækst (total growth per 1000)
//
// Each BEVÆGELSE type → separate DataSource to preserve uniqueness.
// ============================================================

import { PrismaClient } from "@prisma/client";
import { getTableMetadata, getTableData, type DSTFilter } from "../src/lib/dst";
import { classifyAreaCode } from "../src/lib/areas";

const prisma = new PrismaClient();
const TABLE_ID = "LABY01";

const SOURCES = [
  { slug: "dst-laby01-b04", bevCode: "B04", name: "Fødselsoverskud per 1.000 indbyggere" },
  { slug: "dst-laby01-b07", bevCode: "B07", name: "Nettotilflyttede per 1.000 indbyggere" },
  { slug: "dst-laby01-b10", bevCode: "B10", name: "Nettoindvandrede per 1.000 indbyggere" },
  { slug: "dst-laby01-b11", bevCode: "B11", name: "Befolkningstilvækst per 1.000 indbyggere" },
];

async function syncBevægelse(
  bevCode: string,
  sourceSlug: string,
  sourceName: string,
  metadata: Awaited<ReturnType<typeof getTableMetadata>>,
  areaLabels: Record<string, string>
) {
  console.log(`\nSyncing ${bevCode} → ${sourceSlug}`);

  const source = await prisma.dataSource.upsert({
    where: { slug: sourceSlug },
    create: {
      slug: sourceSlug,
      provider: "Danmarks Statistik",
      tableId: TABLE_ID,
      name: sourceName,
      description: `${sourceName} for alle 98 kommuner. Kilde: ${metadata.description}`,
      sourceUrl: `https://www.statistikbanken.dk/${TABLE_ID}`,
      license: "CC 4.0 BY",
      updateFrequency: "YEARLY",
      lastUpdatedAtSource: new Date(metadata.updated),
    },
    update: {
      lastUpdatedAtSource: new Date(metadata.updated),
    },
  });

  const fetchLog = await prisma.fetchLog.create({ data: { sourceId: source.id } });

  try {
    const filters: DSTFilter[] = [
      { code: "KOMGRP", values: ["*"] },
      { code: "BEVÆGELSE", values: [bevCode] },
      { code: "Tid", values: ["*"] },
    ];

    const datapoints = await getTableData(TABLE_ID, filters);

    let inserted = 0, updated = 0, skipped = 0;

    for (const dp of datapoints) {
      if (!dp.period || dp.value === null) { skipped++; continue; }

      const areaCode = dp.dimensions["KOMGRP"];
      if (!areaCode) { skipped++; continue; }

      const areaType = classifyAreaCode(areaCode);
      const areaName = areaLabels[areaCode] ?? areaCode;

      // Annual period → periodDate
      const year = parseInt(dp.period);
      if (isNaN(year)) { skipped++; continue; }
      const periodDate = new Date(Date.UTC(year, 0, 1));

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
              periodDate,
              periodType: "YEAR",
              areaCode,
              areaName,
              areaType,
              value: dp.value,
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

    console.log(`  Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}`);

    await prisma.fetchLog.update({
      where: { id: fetchLog.id },
      data: { completedAt: new Date(), success: true, rowsAffected: inserted + updated,
        notes: `Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}` },
    });
    await prisma.dataSource.update({ where: { id: source.id }, data: { lastFetchedAt: new Date() } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown";
    console.error(`  Sync failed: ${message}`);
    await prisma.fetchLog.update({
      where: { id: fetchLog.id },
      data: { completedAt: new Date(), success: false, error: message },
    });
    throw err;
  }
}

async function main() {
  console.log(`Syncing ${TABLE_ID} — befolkningstilvækst per kommune\n`);

  const metadata = await getTableMetadata(TABLE_ID);
  console.log(`DST: ${metadata.text} — opdateret ${metadata.updated}`);

  const komgrpVar = metadata.variables.find(v => v.code === "KOMGRP")!;
  const areaLabels: Record<string, string> = {};
  for (const v of komgrpVar.values) areaLabels[v.code] = v.label;

  for (const { slug, bevCode, name } of SOURCES) {
    await syncBevægelse(bevCode, slug, name, metadata, areaLabels);
  }

  console.log("\nSync complete.");
}

main()
  .catch((e) => { console.error("Fatal:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
