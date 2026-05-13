// npx tsx scripts/debug-ejdfoe1.ts
// Verify EJDFOE1 data quality for select kommuner
import { getTableMetadata, getTableData, type DSTFilter } from "../src/lib/dst";

async function main() {
  const m = await getTableMetadata("EJDFOE1");
  console.log(m.text, "— opdateret:", m.updated);

  const tidVar = m.variables.find(v => v.code === "Tid")!;
  console.log("\nÅrstal:", tidVar.values.map(v => v.code).join(", "));

  // Sample: last 3 years, 5 kommuner, enfamiliehuse, gennemsnit markedsværdi
  const lastYears = tidVar.values.slice(-3).map(v => v.code);
  const sampleKommuner = ["101", "751", "420", "147", "461"]; // Kbh, Aarhus, Odense, Frederiksberg, Odense..

  const filters: DSTFilter[] = [
    { code: "Tid", values: lastYears },
    { code: "BOPKOM", values: sampleKommuner },
    { code: "VAERDI", values: ["100"] },     // Markedsværdi
    { code: "ENHED", values: ["120"] },       // Gennemsnit (Kr.)
    { code: "EJENTYP", values: ["A", "B"] }, // Enfamiliehuse + Ejerlejligheder
  ];

  console.log("\nFilters:", JSON.stringify(filters));
  const data = await getTableData("EJDFOE1", filters);
  console.log(`\nModtog ${data.length} datapunkter`);
  console.log("\nSample:");
  for (const dp of data) {
    console.log(
      `  ${dp.period} | BOPKOM=${dp.dimensions["BOPKOM"]} | EJENTYP=${dp.dimensions["EJENTYP"]} | ${dp.value?.toLocaleString("da-DK")} kr.`
    );
  }

  // Show all BOPKOM values to verify they include all 98 kommuner
  const bopkomVar = m.variables.find(v => v.code === "BOPKOM")!;
  console.log("\nAlle BOPKOM-koder (104 total):");
  console.log(bopkomVar.values.map(v => `${v.code}:${v.label}`).slice(0, 20).join(", "), "...");

  // Count kommune-level codes (3 digit, 101-999 range)
  const kommuneCodes = bopkomVar.values.filter(v => {
    const n = parseInt(v.code);
    return n >= 100 && n <= 999 && !v.code.startsWith("0");
  });
  console.log(`\nKommune-koder: ${kommuneCodes.length}`);
}

main().catch(console.error);
