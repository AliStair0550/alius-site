// npx tsx scripts/debug-housing.ts
import { getTableMetadata, getTableData, type DSTFilter } from "../src/lib/dst";

async function main() {
  // EJDFOE1 has municipalities — check what it measures
  console.log("=== EJDFOE1 ===");
  const m = await getTableMetadata("EJDFOE1");
  console.log(m.text, "| Updated:", m.updated);
  for (const v of m.variables) {
    console.log(`\n${v.code}: ${v.label} (${v.values.length})`);
    v.values.slice(0, 6).forEach(val => console.log(`  ${val.code}: ${val.label}`));
    if (v.values.length > 6) console.log(`  ... +${v.values.length - 6} mere`);
  }

  // Search all DST tables for housing price tables
  console.log("\n\n=== Alle boligpris-tabeller ===");
  const res = await fetch("https://api.statbank.dk/v1/tables?lang=da&format=JSON");
  const all = (await res.json()) as Array<{ id: string; text: string }>;
  const hits = all.filter(t => {
    const txt = (t.text ?? "").toLowerCase();
    return (
      (txt.includes("pris") && (txt.includes("ejend") || txt.includes("bolig") || txt.includes("hus") || txt.includes("handler") || txt.includes("salg"))) ||
      (txt.includes("handelspris") || txt.includes("salgspris") || txt.includes("boligkøb"))
    );
  });
  for (const t of hits) {
    console.log(t.id + ": " + t.text);
  }
}

main().catch(console.error);
