// ============================================================
// Debug INDKP* tables to find the right one for kommune income
//
// Run with: npx tsx scripts/debug-indkp.ts
//
// Tries several candidate tables since DST has restructured this area.
// ============================================================

import { getTableMetadata } from "../src/lib/dst";

const CANDIDATES = ["INDKP107", "INDKP104", "INDKP101", "INDKP201"];

async function main() {
  for (const tableId of CANDIDATES) {
    console.log(`\n========== Trying ${tableId} ==========`);
    try {
      const metadata = await getTableMetadata(tableId);
      console.log(`Table: ${metadata.text}`);
      console.log(`Updated: ${metadata.updated}\n`);

      for (const variable of metadata.variables) {
        console.log(`Dimension: ${variable.code} (${variable.label})`);
        console.log(`  ${variable.values.length} values`);
        // Show small dimensions in full, large ones abbreviated
        if (variable.values.length <= 15) {
          for (const v of variable.values) {
            console.log(`    ${v.code}: ${v.label}`);
          }
        } else {
          for (const v of variable.values.slice(0, 8)) {
            console.log(`    ${v.code}: ${v.label}`);
          }
          console.log(`    ... ${variable.values.length - 8} more`);
        }
        console.log("");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      console.log(`  ❌ ${msg}`);
    }
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
