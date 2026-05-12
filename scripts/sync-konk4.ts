// ============================================================
// Sync script: KONK4 (Erklærede konkurser efter branche og virksomhedstype)
//
// Run with: npx tsx scripts/sync-konk4.ts
//
// KONK4 has dimensions: branche, virksomhedstype, Tid
// We capture all active company bankruptcies, broken down by industry.
//
// Storage strategy:
// - areaCode: null (no geographical breakdown in KONK4)
// - dimensions JSON: { BRANCHE_CODE, BRANCHE_LABEL, VIRKTYPE_CODE, VIRKTYPE_LABEL }
//
// Idempotent — running it multiple times only writes new datapoints.
// ============================================================

import { PrismaClient } from "@prisma/client";
import { getTableMetadata, getTableData, type DSTFilter } from "../src/lib/dst";

const prisma = new PrismaClient();

const TABLE_ID = "KONK4";
const SOURCE_SLUG = "dst-konk4";

function parsePeriodType(period: string): "MONTH" | "QUARTER" | "YEAR" | "WEEK" {
  if (period.includes("M")) return "MONTH";
  if (period.includes("K") || period.includes("Q")) return "QUARTER";
  if (period.includes("W")) return "WEEK";
  return "YEAR";
}

function parsePeriodToDate(period: string): Date | null {
  const monthly = period.match(/^(\d{4})M(\d{2})$/);
  if (monthly) {
    return new Date(Date.UTC(parseInt(monthly[1]), parseInt(monthly[2]) - 1, 1));
  }
  const quarterly = period.match(/^(\d{4})K(\d)$/);
  if (quarterly) {
    return new Date(Date.UTC(parseInt(quarterly[1]), (parseInt(quarterly[2]) - 1) * 3, 1));
  }
  const yearly = period.match(/^(\d{4})$/);
  if (yearly) {
    return new Date(Date.UTC(parseInt(yearly[1]), 0, 1));
  }
  return null;
}

async function main() {
  console.log(`🔄 Syncing ${TABLE_ID} from Danmarks Statistik...\n`);

  const metadata = await getTableMetadata(TABLE_ID);
  console.log(`📊 Table: ${metadata.text}`);
  console.log(`🕒 Last updated at DST: ${metadata.updated}\n`);

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
      name: metadata.text,
      description: metadata.description,
      sourceUrl: `https://www.statistikbanken.dk/${TABLE_ID}`,
      license: "CC 4.0 BY",
      updateFrequency: "MONTHLY",
      lastUpdatedAtSource: new Date(metadata.updated),
    },
    update: {
      name: metadata.text,
      description: metadata.description,
      lastUpdatedAtSource: new Date(metadata.updated),
    },
  });

  const fetchLog = await prisma.fetchLog.create({
    data: { sourceId: source.id },
  });

  try {
    const tidVariable = metadata.variables.find(
      (v) => v.code.toUpperCase() === "TID"
    );

    // Find branche dimension — typically called BRANCHE7, BRANCHE10A, DB07 or similar
    const brancheVariable = metadata.variables.find((v) => {
      const id = v.code.toUpperCase();
      const text = v.label.toLowerCase();
      return id.includes("BRANCHE") || id.includes("DB07") || id.includes("DB25") || text.includes("branche");
    });

    // Find virksomhedstype (active/null companies)
    const virkVariable = metadata.variables.find((v) => {
      const id = v.code.toUpperCase();
      const text = v.label.toLowerCase();
      return (
        id.includes("VIRK") ||
        text.includes("virksomhedstype") ||
        text.includes("virksomhed")
      );
    });

    if (!tidVariable) throw new Error("Could not find Tid dimension");
    if (!brancheVariable) {
      console.log("Available dimensions:", metadata.variables.map((v) => v.code));
      throw new Error("Could not find Branche dimension");
    }

    // Print all branche values
    console.log("📊 Available BRANCHE values:");
    for (const v of brancheVariable.values) {
      console.log(`   ${v.code}: ${v.label}`);
    }
    console.log("");

    if (virkVariable) {
      console.log(`📊 Available ${virkVariable.code} values:`);
      for (const v of virkVariable.values) {
        console.log(`   ${v.code}: ${v.label}`);
      }
      console.log("");
    }

    // Filter for virksomhedstype: we want active companies
    // (matches by label — looks for "aktive" in label)
    let virkFilter: string[] = ["*"];
    if (virkVariable) {
      const aktive = virkVariable.values.find((v) =>
        v.label.toLowerCase().includes("aktive")
      );
      if (aktive) {
        virkFilter = [aktive.code];
        console.log(`✓ Filter virksomhedstype: "${aktive.label}" (${aktive.code})\n`);
      } else {
        console.log(`⚠️ Could not find "aktive" — taking all virksomhedstyper\n`);
      }
    }

    // Build filters
    const filters: DSTFilter[] = [
      { code: tidVariable.code, values: ["*"] },
      { code: brancheVariable.code, values: ["*"] },
    ];
    if (virkVariable) {
      filters.push({ code: virkVariable.code, values: virkFilter });
    }

    console.log(`🔍 Filters:`, JSON.stringify(filters));

    const datapoints = await getTableData(TABLE_ID, filters);
    console.log(`✓ Received ${datapoints.length} datapoints from DST\n`);

    // Build label maps
    const brancheLabels: Record<string, string> = {};
    for (const v of brancheVariable.values) {
      brancheLabels[v.code] = v.label;
    }
    const virkLabels: Record<string, string> = {};
    if (virkVariable) {
      for (const v of virkVariable.values) {
        virkLabels[v.code] = v.label;
      }
    }

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

      const brancheCode = dp.dimensions[brancheVariable.code];
      const brancheLabel = brancheLabels[brancheCode] ?? brancheCode;

      const virkCode = virkVariable ? dp.dimensions[virkVariable.code] : null;
      const virkLabel = virkCode ? virkLabels[virkCode] ?? virkCode : null;

      const extraDimensions: Record<string, string> = {
        BRANCHE_CODE: brancheCode,
        BRANCHE_LABEL: brancheLabel,
      };
      if (virkCode) extraDimensions.VIRKTYPE_CODE = virkCode;
      if (virkLabel) extraDimensions.VIRKTYPE_LABEL = virkLabel;

      try {
        const existing = await prisma.dataPoint.findFirst({
          where: {
            sourceId: source.id,
            period,
            areaCode: null,
            dimensions: { equals: extraDimensions },
          },
        });

        if (existing) {
          if (existing.value !== dp.value) {
            await prisma.dataPoint.update({
              where: { id: existing.id },
              data: { value: dp.value, status: dp.status },
            });
            updated++;
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
              dimensions: extraDimensions,
            },
          });
          inserted++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown";
        console.error(`  ✗ Failed datapoint ${period}/${brancheCode}: ${msg}`);
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
