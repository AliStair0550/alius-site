// ============================================================
// Sync script: INDKP101 (Personindkomster — kommuneniveau)
//
// Run with: npx tsx scripts/sync-indkp101.ts
//
// Stores average disposable income per person per municipality per year.
// Filter: KOEN=MOK (all genders), ENHED=116 (avg per person, kr),
//         INDKOMSTTYPE=100 (disponibel indkomst), OMRÅDE=*
// Annual data — one row per area per year.
// ============================================================

import { PrismaClient } from "@prisma/client";
import { getTableMetadata, getTableData, type DSTFilter } from "../src/lib/dst";
import { classifyAreaCode } from "../src/lib/areas";

const prisma = new PrismaClient();

const TABLE_ID = "INDKP101";
const SOURCE_SLUG = "dst-indkp101";

function parsePeriodToDate(period: string): Date | null {
  const yearly = period.match(/^(\d{4})$/);
  if (yearly) {
    return new Date(Date.UTC(parseInt(yearly[1]), 0, 1));
  }
  return null;
}

async function main() {
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
      updateFrequency: "YEARLY",
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
    const koenVariable = metadata.variables.find((v) => {
      const c = v.code.toUpperCase();
      return c === "KOEN" || c === "KøN" || c === "KØN";
    });
    const enhedVariable = metadata.variables.find((v) =>
      v.code.toUpperCase() === "ENHED"
    );
    const indkomstVariable = metadata.variables.find((v) =>
      v.code.toUpperCase() === "INDKOMSTTYPE"
    );

    if (!tidVariable) throw new Error("Could not find Tid dimension");
    if (!omraadeVariable) {
      console.log("Available dimensions:", metadata.variables.map((v) => v.code));
      throw new Error("Could not find OMRÅDE dimension");
    }
    if (!enhedVariable) throw new Error("Could not find ENHED dimension");
    if (!indkomstVariable) throw new Error("Could not find INDKOMSTTYPE dimension");

    // Build area label map
    const areaLabels: Record<string, string> = {};
    for (const v of omraadeVariable.values) {
      areaLabels[v.code] = v.label;
    }

    // Find specific filter values
    const mokKoen = koenVariable?.values.find((v) =>
      v.code === "MOK" || v.label.toLowerCase().includes("i alt")
    );
    const avgPerPerson = enhedVariable.values.find((v) => v.code === "116");
    const disponibel = indkomstVariable.values.find((v) => v.code === "100");

    if (!avgPerPerson) throw new Error("Could not find ENHED=116 (avg per person)");
    if (!disponibel) throw new Error("Could not find INDKOMSTTYPE=100 (disponibel indkomst)");

    console.log(`Filter ENHED: "${avgPerPerson.label}" (${avgPerPerson.code})`);
    console.log(`Filter INDKOMSTTYPE: "${disponibel.label}" (${disponibel.code})`);
    if (koenVariable && mokKoen) {
      console.log(`Filter KOEN: "${mokKoen.label}" (${mokKoen.code})`);
    }

    const filters: DSTFilter[] = [
      { code: tidVariable.code, values: ["*"] },
      { code: omraadeVariable.code, values: ["*"] },
      { code: enhedVariable.code, values: [avgPerPerson.code] },
      { code: indkomstVariable.code, values: [disponibel.code] },
    ];
    if (koenVariable && mokKoen) {
      filters.push({ code: koenVariable.code, values: [mokKoen.code] });
    }

    console.log(`\nFilters: ${JSON.stringify(filters)}`);

    const datapoints = await getTableData(TABLE_ID, filters);
    console.log(`Received ${datapoints.length} datapoints from DST\n`);

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const dp of datapoints) {
      const period = dp.period;
      if (!period) { skipped++; continue; }

      const periodDate = parsePeriodToDate(period);
      if (!periodDate) { skipped++; continue; }

      const areaCode = omraadeVariable ? dp.dimensions[omraadeVariable.code] : null;
      if (!areaCode) { skipped++; continue; }

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
        console.error(`  Failed datapoint ${period}/${areaCode}: ${msg}`);
        skipped++;
      }
    }

    console.log(`Inserted: ${inserted}`);
    console.log(`Updated:  ${updated}`);
    console.log(`Skipped:  ${skipped}`);

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
