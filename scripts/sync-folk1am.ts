// ============================================================
// Sync script: FOLK1AM (Befolkningen den 1. i måneden)
//
// Run with: npx tsx scripts/sync-folk1am.ts
//
// Stores total population per municipality per month.
// Filter: KøN=TOT (all genders), ALDER=IALT (all ages), OMRÅDE=*
// One row per area per month — no unique constraint issues.
// ============================================================

import { PrismaClient } from "@prisma/client";
import { getTableMetadata, getTableData, type DSTFilter } from "../src/lib/dst";
import { classifyAreaCode } from "../src/lib/areas";
import { writeDataPoints, type PendingPoint } from "../src/lib/pulse-batch";

import { kraevSkriveret } from "./write-guard";
const prisma = new PrismaClient();

const TABLE_ID = "FOLK1AM";
const SOURCE_SLUG = "dst-folk1am";

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
  return null;
}

async function main() {
  kraevSkriveret("sync-folk1am.ts");
  console.log(`Syncing ${TABLE_ID} from Danmarks Statistik...\n`);

  const metadata = await getTableMetadata(TABLE_ID);
  console.log(`Table: ${metadata.text}`);
  console.log(`Last updated at DST: ${metadata.updated}\n`);

  console.log("Dimensioner:");
  for (const v of metadata.variables) {
    console.log(`  - ${v.code}: ${v.label} (${v.values.length} vaerdier)`);
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
    const omraadeVariable = metadata.variables.find((v) => {
      const c = v.code.toUpperCase();
      return c === "OMRÅDE" || c === "OMRADE" || v.label.toLowerCase().includes("område");
    });
    const konVariable = metadata.variables.find((v) => {
      const c = v.code.toUpperCase();
      return c === "KøN" || c === "KON" || c === "KØN";
    });
    const alderVariable = metadata.variables.find((v) =>
      v.code.toUpperCase() === "ALDER"
    );

    if (!tidVariable) throw new Error("Could not find Tid dimension");
    if (!omraadeVariable) {
      console.log("Available dimensions:", metadata.variables.map((v) => v.code));
      throw new Error("Could not find OMRÅDE dimension");
    }

    // Build area label map
    const areaLabels: Record<string, string> = {};
    for (const v of omraadeVariable.values) {
      areaLabels[v.code] = v.label;
    }

    // Filter to total gender and total age
    const totKon = konVariable?.values.find((v) =>
      v.code.toUpperCase() === "TOT" || v.label.toLowerCase() === "i alt"
    );
    const ialtAlder = alderVariable?.values.find((v) =>
      v.code.toUpperCase() === "IALT" || v.label.toLowerCase().includes("i alt")
    );

    if (konVariable && totKon) {
      console.log(`Filter KøN: "${totKon.label}" (${totKon.code})`);
    }
    if (alderVariable && ialtAlder) {
      console.log(`Filter ALDER: "${ialtAlder.label}" (${ialtAlder.code})`);
    }

    const filters: DSTFilter[] = [
      { code: tidVariable.code, values: ["*"] },
      { code: omraadeVariable.code, values: ["*"] },
    ];
    if (konVariable && totKon) {
      filters.push({ code: konVariable.code, values: [totKon.code] });
    }
    if (alderVariable && ialtAlder) {
      filters.push({ code: alderVariable.code, values: [ialtAlder.code] });
    }

    console.log(`\nFilters: ${JSON.stringify(filters)}`);

    const datapoints = await getTableData(TABLE_ID, filters);
    console.log(`Received ${datapoints.length} datapoints from DST\n`);

    let skipped = 0;
    const pending: PendingPoint[] = [];

    for (const dp of datapoints) {
      const period = dp.period;
      if (!period) { skipped++; continue; }

      const periodDate = parsePeriodToDate(period);
      if (!periodDate) { skipped++; continue; }

      const areaCode = omraadeVariable ? dp.dimensions[omraadeVariable.code] : null;
      if (!areaCode) { skipped++; continue; }

      pending.push({
        period,
        periodDate,
        periodType: parsePeriodType(period),
        areaCode,
        areaType: classifyAreaCode(areaCode),
        areaName: areaLabels[areaCode] ?? areaCode,
        value: dp.value,
        status: dp.status,
      });
    }

    const { inserted, updated, unchanged, duplicates } = await writeDataPoints(
      prisma,
      source.id,
      pending
    );
    skipped += duplicates;

    console.log(`Inserted:  ${inserted}`);
    console.log(`Updated:   ${updated}`);
    console.log(`Unchanged: ${unchanged}`);
    console.log(`Skipped:   ${skipped}`);

    await prisma.fetchLog.update({
      where: { id: fetchLog.id },
      data: {
        completedAt: new Date(),
        success: true,
        inserted,
        updated,
        skipped,
        rowsAffected: inserted + updated,
        notes: `Inserted: ${inserted}, Updated: ${updated}, Unchanged: ${unchanged}, Skipped: ${skipped}`,
      },
    });

    await prisma.dataSource.update({
      where: { id: source.id },
      data: { lastFetchedAt: new Date() },
    });

    console.log(`\nSync complete`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`\nSync failed: ${message}`);

    await prisma.fetchLog.update({
      where: { id: fetchLog.id },
      data: { completedAt: new Date(), success: false, error: message },
    });

    process.exit(1);
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
