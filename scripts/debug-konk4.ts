// ============================================================
// Debug script: list all dimensions in KONK4
//
// Run with: npx tsx scripts/debug-konk4.ts
//
// This shows us the exact dimension names and values so we know
// what we're working with before writing the sync logic.
// ============================================================

import { getTableMetadata } from "../src/lib/dst";

async function main() {
  console.log("📋 Fetching KONK4 metadata...\n");

  const metadata = await getTableMetadata("KONK4");

  console.log(`Table: ${metadata.text}`);
  console.log(`Updated: ${metadata.updated}\n`);

  for (const variable of metadata.variables) {
    console.log(`Dimension: ${variable.code} (${variable.label})`);
    console.log(`  ${variable.values.length} values:`);
    for (const v of variable.values) {
      console.log(`    ${v.code}: ${v.label}`);
    }
    console.log("");
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
