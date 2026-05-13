// ============================================================
// Sync script: BYGV33 (Boliger i det samlede boligbyggeri)
//
// Run with: npx tsx scripts/sync-bygv33.ts
//
// Syncs quarterly count of newly started residential dwellings per
// municipality. Aggregates across property type (ANVEND) and owner
// type (BYGHERRE) so each row = total starts for that kommune + quarter.
// ============================================================

import { PrismaClient } from "@prisma/client";
import { getTableMetadata, getTableData, type DSTFilter } from "../src/lib/dst";
import { classifyAreaCode } from "../src/lib/areas";

const prisma = new PrismaClient();
const TABLE_ID = "BYGV33";
const SOURCE_SLUG = "dst-bygv33";

// Residential types only (excludes farm buildings, institutions, etc.)
const RESIDENTIAL_ANVEND = ["120", "130", "140", "150", "190"];
const ALL_BYGHERRE = ["10+30+40+90", "20", "41", "SK", "UOPL"];

async function main() {
  console.log(`Syncing ${TABLE_ID} — nyopstartede boliger per kommune\n`);

  const metadata = await getTableMetadata(TABLE_ID);
  console.log(`DST: ${metadata.text} — opdateret ${metadata.updated}`);

  // Build area label map
  const omrVar = metadata.variables.find(v => v.code === "OMRÅDE")!;
  const areaLabels: Record<string, string> = {};
  for (const v of omrVar.values) areaLabels[v.code] = v.label;

  const source = await prisma.dataSource.upsert({
    where: { slug: SOURCE_SLUG },
    create: {
      slug: SOURCE_SLUG,
      provider: "Danmarks Statistik",
      tableId: TABLE_ID,
      name: "Nyopstartede boliger per kommune (BYGV33)",
      description: `Kvartalsvise nyopstartede boliger (parcelhuse, rækkehuse, etageboliger m.fl.) per kommune. ${metadata.description}`,
      sourceUrl: `https://www.statistikbanken.dk/${TABLE_ID}`,
      license: "CC 4.0 BY",
      updateFrequency: "QUARTERLY",
      lastUpdatedAtSource: new Date(metadata.updated),
    },
    update: {
      lastUpdatedAtSource: new Date(metadata.updated),
    },
  });

  const fetchLog = await prisma.fetchLog.create({ data: { sourceId: source.id } });

  try {
    // Fetch one ANVEND type at a time to stay under DST's 1M-cell limit
    // 116 OMRÅDE × 1 BYGFASE × 1 ANVEND × 5 BYGHERRE × 81 Tid ≈ 47K cells each
    const allDatapoints = [];
    for (const anvend of RESIDENTIAL_ANVEND) {
      const filters: DSTFilter[] = [
        { code: "OMRÅDE", values: ["*"] },
        { code: "BYGFASE", values: ["2"] }, // Påbegyndt
        { code: "ANVEND", values: [anvend] },
        { code: "BYGHERRE", values: ALL_BYGHERRE },
        { code: "Tid", values: ["*"] },
      ];
      const batch = await getTableData(TABLE_ID, filters);
      console.log(`  ANVEND=${anvend}: ${batch.length} datapoints`);
      allDatapoints.push(...batch);
    }
    const datapoints = allDatapoints;
    console.log(`Received ${datapoints.length} raw datapoints total`);

    // Aggregate: sum across ANVEND + BYGHERRE for each (OMRÅDE, period)
    const totals = new Map<string, number>();
    for (const dp of datapoints) {
      if (!dp.period || dp.value === null) continue;
      const areaCode = dp.dimensions["OMRÅDE"];
      if (!areaCode) continue;
      const key = `${areaCode}||${dp.period}`;
      totals.set(key, (totals.get(key) ?? 0) + dp.value);
    }

    console.log(`Aggregated to ${totals.size} kommune×kvartal combinations`);

    let inserted = 0, updated = 0, skipped = 0;

    for (const [key, total] of totals) {
      const [areaCode, period] = key.split("||");
      const areaType = classifyAreaCode(areaCode);
      const areaName = areaLabels[areaCode] ?? areaCode;

      // Parse quarter period → periodDate (first day of quarter)
      const qMatch = period.match(/^(\d{4})K(\d)$/);
      if (!qMatch) { skipped++; continue; }
      const month = (parseInt(qMatch[2]) - 1) * 3 + 1;
      const periodDate = new Date(Date.UTC(parseInt(qMatch[1]), month - 1, 1));

      try {
        const existing = await prisma.dataPoint.findFirst({
          where: { sourceId: source.id, period, areaCode },
        });
        if (existing) {
          if (existing.value !== total) {
            await prisma.dataPoint.update({ where: { id: existing.id }, data: { value: total } });
            updated++;
          }
        } else {
          await prisma.dataPoint.create({
            data: {
              sourceId: source.id,
              period,
              periodDate,
              periodType: "QUARTER",
              areaCode,
              areaName,
              areaType,
              value: total,
            },
          });
          inserted++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown";
        console.error(`  Failed ${period}/${areaCode}: ${msg}`);
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
