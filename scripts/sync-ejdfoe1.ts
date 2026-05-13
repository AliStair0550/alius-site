// ============================================================
// Sync script: EJDFOE1 (Formue i fast ejendom — ejendomsværdi)
//
// Run with: npx tsx scripts/sync-ejdfoe1.ts
//
// Syncs average market value (markedsværdi) per municipality per year.
// Two passes: EJENTYP=A (enfamiliehuse) → dst-ejdfoe1-huse
//             EJENTYP=B (ejerlejligheder) → dst-ejdfoe1-lejl
// Filter: VAERDI=100 (markedsværdi), ENHED=120 (gennemsnit Kr.)
// ============================================================

import { PrismaClient } from "@prisma/client";
import { getTableMetadata, getTableData, type DSTFilter } from "../src/lib/dst";
import { classifyAreaCode } from "../src/lib/areas";

const prisma = new PrismaClient();
const TABLE_ID = "EJDFOE1";

async function syncPropertyType(
  ejentypCode: string,
  ejentypLabel: string,
  sourceSlug: string,
  sourceName: string
) {
  console.log(`\nSyncing ${ejentypLabel} (${ejentypCode}) → ${sourceSlug}`);

  const metadata = await getTableMetadata(TABLE_ID);

  const source = await prisma.dataSource.upsert({
    where: { slug: sourceSlug },
    create: {
      slug: sourceSlug,
      provider: "Danmarks Statistik",
      tableId: TABLE_ID,
      name: sourceName,
      description: `Gennemsnitlig markedsværdi af ${ejentypLabel.toLowerCase()} per kommune. ${metadata.description}`,
      sourceUrl: `https://www.statistikbanken.dk/${TABLE_ID}`,
      license: "CC 4.0 BY",
      updateFrequency: "YEARLY",
      lastUpdatedAtSource: new Date(metadata.updated),
    },
    update: {
      name: sourceName,
      lastUpdatedAtSource: new Date(metadata.updated),
    },
  });

  const fetchLog = await prisma.fetchLog.create({
    data: { sourceId: source.id },
  });

  try {
    const filters: DSTFilter[] = [
      { code: "Tid", values: ["*"] },
      { code: "BOPKOM", values: ["*"] },
      { code: "VAERDI", values: ["100"] },   // Markedsværdi
      { code: "ENHED", values: ["120"] },    // Gennemsnit (Kr.)
      { code: "EJENTYP", values: [ejentypCode] },
    ];

    const datapoints = await getTableData(TABLE_ID, filters);
    console.log(`  Received ${datapoints.length} datapoints`);

    // Build area label map from metadata
    const bopkomVar = metadata.variables.find(v => v.code === "BOPKOM")!;
    const areaLabels: Record<string, string> = {};
    for (const v of bopkomVar.values) {
      areaLabels[v.code] = v.label;
    }

    let inserted = 0, updated = 0, skipped = 0;

    for (const dp of datapoints) {
      const period = dp.period;
      if (!period) { skipped++; continue; }

      const areaCode = dp.dimensions["BOPKOM"];
      if (!areaCode) { skipped++; continue; }

      if (dp.value === null) { skipped++; continue; }

      const periodDate = new Date(Date.UTC(parseInt(period), 0, 1));
      const areaName = areaLabels[areaCode] ?? areaCode;
      const areaType = classifyAreaCode(areaCode);

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
              periodDate,
              periodType: "YEAR",
              areaCode,
              areaName,
              areaType,
              value: dp.value,
              status: dp.status,
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

    console.log(`  Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}`);

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
  console.log(`Syncing ${TABLE_ID} — ejendomsværdi per kommune\n`);
  const metadata = await getTableMetadata(TABLE_ID);
  console.log(`DST: ${metadata.text} — opdateret ${metadata.updated}`);

  await syncPropertyType(
    "A",
    "Enfamiliehuse",
    "dst-ejdfoe1-huse",
    "Ejendomsværdi: Enfamiliehuse (gennemsnit per kommune)"
  );

  await syncPropertyType(
    "B",
    "Ejerlejligheder",
    "dst-ejdfoe1-lejl",
    "Ejendomsværdi: Ejerlejligheder (gennemsnit per kommune)"
  );

  console.log("\nSync complete.");
}

main()
  .catch((e) => { console.error("Fatal:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
