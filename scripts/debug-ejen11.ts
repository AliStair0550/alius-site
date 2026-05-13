// npx tsx scripts/debug-ejen11.ts
import { getTableMetadata, getTableData, type DSTFilter } from "../src/lib/dst";

async function main() {
  console.log("Fetching EJEN11 metadata...\n");
  const meta = await getTableMetadata("EJEN11");

  console.log(`Table: ${meta.text}`);
  console.log(`Updated: ${meta.updated}`);
  console.log(`Description: ${meta.description}\n`);

  console.log("Dimensioner:");
  for (const v of meta.variables) {
    console.log(`\n  ${v.code}: ${v.label} (${v.values.length} værdier)`);
    for (const val of v.values.slice(0, 20)) {
      console.log(`    ${val.code}: ${val.label}`);
    }
    if (v.values.length > 20) {
      console.log(`    ... (${v.values.length - 20} flere)`);
    }
  }

  // Fetch a small sample to see actual data structure
  console.log("\n\nFetching sample data (last 2 periods, national)...");
  const tidVar = meta.variables.find((v) => v.code.toUpperCase() === "TID");
  const areaVar = meta.variables.find((v) =>
    v.code.toUpperCase().includes("OMRA") || v.code.toUpperCase() === "OMRÅDE"
  );

  if (!tidVar || !areaVar) {
    console.log("Could not find Tid or Område dimension");
    return;
  }

  const lastPeriods = tidVar.values.slice(-2).map((v) => v.code);
  const filters: DSTFilter[] = [
    { code: tidVar.code, values: lastPeriods },
    { code: areaVar.code, values: [areaVar.values[0].code] },
    ...meta.variables
      .filter((v) => v.code.toUpperCase() !== "TID" && v.code !== areaVar.code)
      .map((v) => ({ code: v.code, values: [v.values[0].code] })),
  ];

  console.log("Filters:", JSON.stringify(filters, null, 2));

  const data = await getTableData("EJEN11", filters);
  console.log(`\nSample datapoints (${data.length}):`);
  for (const dp of data) {
    console.log(`  period=${dp.period}, value=${dp.value}, dims=${JSON.stringify(dp.dimensions)}`);
  }
}

main().catch(console.error);
