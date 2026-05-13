// npx tsx scripts/debug-ejen77.ts
import { getTableMetadata, getTableData, type DSTFilter } from "../src/lib/dst";

async function main() {
  // Check EJEN77 (quarterly)
  console.log("=== EJEN77 (kvartalsvis) ===");
  const m77 = await getTableMetadata("EJEN77");
  const area77 = m77.variables.find(v => v.code === "OMRÅDE");
  console.log("OMRÅDE:");
  area77?.values.forEach(v => console.log(" ", v.code, ":", v.label));
  const b77 = m77.variables.find(v => v.code === "BNØGLE");
  console.log("\nBNØGLE:");
  b77?.values.forEach(v => console.log(" ", v.code, ":", v.label));
  const e77 = m77.variables.find(v => v.code === "EJENDOMSKATE");
  console.log("\nEJENDOMSKATE (first 10):");
  e77?.values.slice(0, 10).forEach(v => console.log(" ", v.code, ":", v.label));

  // Try to find the right table — search for tables with 98+ geo values
  console.log("\n\n=== Søger tabel med kommuneniveau boligpriser ===");

  const candidates = [
    "EJDFOE1",   // Formue i fast ejendom
    "EJENPRISER",
    "BOLIGPRIS",
    "BOLPRIS",
    "EJD10",
    "EJD20",
    "BOLI1",
    "BOLSAL",
    "EJENSAL",
  ];
  for (const t of candidates) {
    try {
      const m = await getTableMetadata(t);
      const hasMany = m.variables.some(v => v.values.length >= 50);
      if (hasMany) {
        console.log(t + " [STOR GEO]: " + m.text);
        m.variables.filter(v => v.values.length >= 50).forEach(v =>
          console.log("  " + v.code + " (" + v.values.length + "): " + v.values.slice(0, 3).map(v2 => v2.label).join(", ") + "...")
        );
      } else {
        console.log(t + ": " + m.text + " | dims: " + m.variables.map(v => v.code + "(" + v.values.length + ")").join(", "));
      }
    } catch {
      console.log(t + ": not found");
    }
  }

  // Sample actual data from EJEN77 — what does it measure?
  console.log("\n\n=== EJEN77 sample data ===");
  const tidVar = m77.variables.find(v => v.code.toUpperCase() === "TID")!;
  const lastPeriod = tidVar.values[tidVar.values.length - 1].code;
  const filters: DSTFilter[] = [
    { code: "Tid", values: [lastPeriod] },
    { code: "OMRÅDE", values: [area77!.values[0].code] },
    { code: "EJENDOMSKATE", values: ["110"] },  // all residential
    { code: "BNØGLE", values: [b77!.values[0].code] },
    { code: "OVERDRAG", values: [m77.variables.find(v => v.code === "OVERDRAG")!.values[0].code] },
  ];
  try {
    const data = await getTableData("EJEN77", filters);
    console.log("Sample:", JSON.stringify(data[0]));
  } catch(e) {
    console.log("Error fetching sample:", e instanceof Error ? e.message : e);
  }
}

main().catch(console.error);
