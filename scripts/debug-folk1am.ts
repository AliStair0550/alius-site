// ============================================================
// Debug FOLK1AM (Befolkning den 1. i måneden, månedlig)
//
// Run with: npx tsx scripts/debug-folk1am.ts
// ============================================================

import { getTableMetadata } from "../src/lib/dst";

async function main() {
  console.log("📋 Fetching FOLK1AM metadata...\n");

  try {
    const metadata = await getTableMetadata("FOLK1AM");

    console.log(`Table: ${metadata.text}`);
    console.log(`Updated: ${metadata.updated}\n`);

    for (const variable of metadata.variables) {
      console.log(`Dimension: ${variable.code} (${variable.label})`);
      console.log(`  ${variable.values.length} values total`);
      // Show first 10 and last 5 to keep output manageable
      const preview = variable.values.length > 20
        ? [...variable.values.slice(0, 10), { code: "...", label: `(${variable.values.length - 15} more)` }, ...variable.values.slice(-5)]
        : variable.values;
      for (const v of preview) {
        console.log(`    ${v.code}: ${v.label}`);
      }
      console.log("");
    }
  } catch (err) {
    console.error("Failed:", err);
    console.log("\nTrying alternative table FOLK1A...");
    try {
      const meta2 = await getTableMetadata("FOLK1A");
      console.log(`Table: ${meta2.text}`);
      console.log(`Updated: ${meta2.updated}\n`);
      for (const variable of meta2.variables) {
        console.log(`Dimension: ${variable.code} (${variable.label})`);
        console.log(`  ${variable.values.length} values`);
      }
    } catch (err2) {
      console.error("Also failed:", err2);
    }
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
