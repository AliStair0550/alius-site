// ============================================================
// Sync script: KONK3 (Erklærede konkurser efter nøgletal)
//
// Run with: npx tsx scripts/sync-konk3.ts
//
// KONK3 contains monthly declared bankruptcies (seasonally adjusted).
// Only syncs the seasonal "aktive virksomheder" series to stay within
// the unique(sourceId, period, areaCode) constraint.
//
// Idempotent — running it multiple times only writes new datapoints.
// ============================================================

import { PrismaClient } from "@prisma/client";
import { getTableMetadata, getTableData, type DSTFilter } from "../src/lib/dst";

const prisma = new PrismaClient();

const TABLE_ID = "KONK3";
const SOURCE_SLUG = "dst-konk3";

function parsePeriodToDate(period: string): Date | null {
  const monthly = period.match(/^(\d{4})M(\d{2})$/);
  if (monthly) {
    return new Date(
      Date.UTC(parseInt(monthly[1]), parseInt(monthly[2]) - 1, 1)
    );
  }
  const quarterly = period.match(/^(\d{4})K(\d)$/);
  if (quarterly) {
    return new Date(
      Date.UTC(
        parseInt(quarterly[1]),
        (parseInt(quarterly[2]) - 1) * 3,
        1
      )
    );
  }
  const yearly = period.match(/^(\d{4})$/);
  if (yearly) {
    return new Date(Date.UTC(parseInt(yearly[1]), 0, 1));
  }
  return null;
}

function parsePeriodType(period: string): "MONTH" | "QUARTER" | "YEAR" | "WEEK" {
  if (period.includes("M")) return "MONTH";
  if (period.includes("K") || period.includes("Q")) return "QUARTER";
  if (period.includes("W")) return "WEEK";
  return "YEAR";
}

async function main() {
  console.log(`🔄 Syncing ${TABLE_ID} from Danmarks Statistik...\n`);

  const metadata = await getTableMetadata(TABLE_ID);
  console.log(`📊 Table: ${metadata.label}`);
  console.log(`🕒 Last updated at DST: ${metadata.lastUpdated}\n`);

  console.log(`📋 Dimensioner:`);
  for (const v of metadata.variables) {
    console.log(`   - ${v.code}: ${v.label} (${v.values.length} værdier)`);
  }
  console.log("");

  const source = await prisma.dataSource.upsert({
    where: { slug: SOURCE_SLUG },
    create: {
      slug: SOURCE_SLUG,
      provider: "Danmarks Statistik",
      tableId: TABLE_ID,
      name: metadata.label,
      description: metadata.description,
      sourceUrl: `https://www.statistikbanken.dk/${TABLE_ID}`,
      license: "CC 4.0 BY",
      updateFrequency: "MONTHLY",
      lastUpdatedAtSource: new Date(metadata.lastUpdated),
    },
    update: {
      name: metadata.label,
      description: metadata.description,
      lastUpdatedAtSource: new Date(metadata.lastUpdated),
    },
  });

  const fetchLog = await prisma.fetchLog.create({
    data: { sourceId: source.id },
  });

  try {
    const tidVariable = metadata.variables.find(
      (v) => v.code.toUpperCase() === "TID"
    );
    const nøgletalVariable = metadata.variables.find(
      (v) =>
        v.code.toUpperCase().includes("NOEGLETAL") ||
        v.code.toUpperCase().includes("NØGLETAL") ||
        v.code.toUpperCase().includes("BNOGLE") ||
        v.code.toUpperCase().includes("BNØGLE") ||
        v.code.toUpperCase() === "INDIKATOR"
    );

    if (nøgletalVariable) {
      console.log(`\n📋 ${nøgletalVariable.code} værdier:`);
      for (const v of nøgletalVariable.values) {
        console.log(`   - ${v.code}: ${v.label}`);
      }
      console.log("");
    }
    const sæsonVariable = metadata.variables.find(
      (v) =>
        v.code.toUpperCase() === "SAESON" ||
        v.code.toUpperCase().includes("SAESON")
    );

    if (!tidVariable) throw new Error("Could not find Tid dimension");

    // Filter to "aktive virksomheder" nøgletal
    let nøgletalFilter: string[] = ["*"];
    if (nøgletalVariable) {
      const aktive = nøgletalVariable.values.find((v) =>
        v.label.toLowerCase().includes("aktive")
      );
      if (aktive) {
        nøgletalFilter = [aktive.code];
        console.log(`✓ Filter: nøgletal = "${aktive.label}" (${aktive.code})`);
      } else {
        console.log(`⚠️ Could not find "aktive virksomheder" — syncing all nøgletal`);
      }
    }

    // Filter to seasonal only (avoids unique constraint on national-level data)
    let sæsonFilter: string[] = ["*"];
    if (sæsonVariable) {
      const seasonal = sæsonVariable.values.find((v) => {
        const t = v.label.toLowerCase();
        return (
          (t.includes("sæsonkorrigeret") || t.includes("saeson")) &&
          !t.includes("ikke") &&
          !t.includes("faktisk")
        );
      });
      if (seasonal) {
        sæsonFilter = [seasonal.code];
        console.log(`✓ Filter: sæson = "${seasonal.label}" (${seasonal.code})`);
      }
    }

    const filters: DSTFilter[] = [
      { code: tidVariable.code, values: ["*"] },
      ...(nøgletalVariable
        ? [{ code: nøgletalVariable.code, values: nøgletalFilter }]
        : []),
      ...(sæsonVariable
        ? [{ code: sæsonVariable.code, values: sæsonFilter }]
        : []),
    ];

    console.log(`🔍 Filters:`, JSON.stringify(filters));

    const datapoints = await getTableData(TABLE_ID, filters);
    console.log(`✓ Received ${datapoints.length} datapoints from DST\n`);

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const dp of datapoints) {
      const period = dp.period;
      if (!period) {
        skipped++;
        continue;
      }

      const periodDate = parsePeriodToDate(period);
      if (!periodDate) {
        skipped++;
        continue;
      }

      const extraDimensions: Record<string, string> = {
        ...(dp.dimensions as Record<string, string>),
      };

      try {
        const existing = await prisma.dataPoint.findFirst({
          where: {
            sourceId: source.id,
            period,
            areaCode: null,
          },
        });

        if (existing) {
          if (existing.value !== dp.value) {
            await prisma.dataPoint.update({
              where: { id: existing.id },
              data: { value: dp.value, status: dp.status },
            });
            updated++;
          } else {
            skipped++;
          }
        } else {
          await prisma.dataPoint.create({
            data: {
              sourceId: source.id,
              period,
              periodDate,
              periodType: parsePeriodType(period),
              areaCode: null,
              areaName: null,
              areaType: "NATIONAL",
              value: dp.value,
              status: dp.status,
              dimensions:
                Object.keys(extraDimensions).length > 0
                  ? extraDimensions
                  : undefined,
            },
          });
          inserted++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown";
        console.error(`  ✗ Failed datapoint ${period}: ${msg}`);
        skipped++;
      }
    }

    console.log(`📥 Inserted: ${inserted}`);
    console.log(`🔄 Updated: ${updated}`);
    console.log(`⏭️ Skipped: ${skipped}`);

    await prisma.fetchLog.update({
      where: { id: fetchLog.id },
      data: {
        completedAt: new Date(),
        success: true,
        rowsAffected: inserted + updated,
        inserted,
        updated,
        skipped,
        notes: `Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}`,
      },
    });

    await prisma.dataSource.update({
      where: { id: source.id },
      data: { lastFetchedAt: new Date() },
    });

    console.log(`\n✅ Sync complete`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`\n❌ Sync failed: ${message}`);

    await prisma.fetchLog.update({
      where: { id: fetchLog.id },
      data: {
        completedAt: new Date(),
        success: false,
        error: message,
      },
    });

    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error("Fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
