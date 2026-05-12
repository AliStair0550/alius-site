// ============================================================
// Sync script: AUS08 (Fuldtidsledige efter område, sæsonkorrigering)
//
// Run with: npx tsx scripts/sync-aus08.ts
//
// AUS08 includes both national AND kommune-level unemployment data,
// monthly, seasonally adjusted. This is the table we'll build the
// Pulse dashboard around.
//
// Idempotent — running it multiple times only writes new datapoints.
// ============================================================

import { PrismaClient } from "@prisma/client";
import { getTableMetadata, getTableData, type DSTVariable } from "../src/lib/dst";
import { classifyAreaCode } from "../src/lib/areas";

const prisma = new PrismaClient();

const TABLE_ID = "AUS08";
const SOURCE_SLUG = "dst-aus08";

// ============================================================
// Helpers
// ============================================================

// Normalize strings for robust comparison (strips ÆØÅ → ASCII)
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa");
}

// Find a dimension variable by any of the given candidate IDs (case/ÆØÅ-insensitive)
function findVariable(variables: DSTVariable[], ...candidates: string[]): DSTVariable | undefined {
  const ns = candidates.map(norm);
  return variables.find((v) => ns.some((n) => norm(v.code) === n || norm(v.code).includes(n)));
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log(`🔄 Syncing ${TABLE_ID} from Danmarks Statistik...\n`);

  const metadata = await getTableMetadata(TABLE_ID);
  console.log(`📊 Table: ${metadata.label} (${TABLE_ID})`);
  console.log(`🕒 Last updated at DST: ${metadata.lastUpdated}\n`);

  // Print all dimensions so we can debug dimension names if anything changes
  console.log("📋 Dimensioner:");
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
      name: metadata.label,
      description: metadata.description || null,
      sourceUrl: `https://www.statistikbanken.dk/${TABLE_ID}`,
      license: "CC 4.0 BY",
      updateFrequency: "MONTHLY",
      lastUpdatedAtSource: new Date(metadata.lastUpdated),
    },
    update: {
      name: metadata.label,
      description: metadata.description || null,
      lastUpdatedAtSource: new Date(metadata.lastUpdated),
    },
  });

  // Create the fetch log at the start so we have an audit trail even if we crash
  const fetchLog = await prisma.fetchLog.create({
    data: { sourceId: source.id },
  });

  try {
    // ─── Find dimensions ───────────────────────────────────────
    const tidVar = findVariable(metadata.variables, "Tid", "TID");
    const omradeVar = findVariable(metadata.variables, "OMRÅDE", "OMRADE", "omraade");
    const saesonfakVar = findVariable(metadata.variables, "SAESONFAK", "saesonfak", "saeson");

    if (!tidVar) {
      throw new Error(
        `Could not find Tid dimension. Available: ${metadata.variables.map((v) => v.code).join(", ")}`
      );
    }
    if (!saesonfakVar) {
      throw new Error(
        `Could not find seasonal dimension. Available: ${metadata.variables.map((v) => v.code).join(", ")}`
      );
    }

    // ─── Find the seasonal adjustment value ───────────────────
    // Looks for the value whose label contains "sæsonkorrigeret" but not "ikke"
    const seasonalValue = saesonfakVar.values.find((v) => {
      const t = v.label.toLowerCase();
      return (t.includes("sæsonkorrigeret") || t.includes("saeson")) && !t.includes("ikke");
    });

    if (!seasonalValue) {
      console.log(`Available ${saesonfakVar.code} values:`, saesonfakVar.values);
      throw new Error(`Could not find seasonally-adjusted value in ${saesonfakVar.code}`);
    }
    console.log(`✓ Using seasonal value: ${seasonalValue.label} (${seasonalValue.code})\n`);

    // ─── Build filters ─────────────────────────────────────────
    const filters = [
      { code: tidVar.code, values: ["*"] },
      { code: saesonfakVar.code, values: [seasonalValue.code] },
      ...(omradeVar ? [{ code: omradeVar.code, values: ["*"] }] : []),
    ];
    console.log(
      "🔍 Filters:",
      JSON.stringify(filters.reduce<Record<string, string[]>>((a, f) => ({ ...a, [f.code]: f.values }), {}))
    );

    // ─── Fetch data ────────────────────────────────────────────
    const datapoints = await getTableData(TABLE_ID, filters);
    console.log(`✓ Received ${datapoints.length} datapoints from DST\n`);

    // Build area name lookup: code → label
    const areaNameMap = new Map<string, string>();
    if (omradeVar) {
      for (const v of omradeVar.values) {
        areaNameMap.set(v.code, v.label);
      }
    }

    // ─── Upsert datapoints ─────────────────────────────────────
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    // Load all existing keys for this source in one query (avoids N+1 lookups)
    const existingRows = await prisma.dataPoint.findMany({
      where: { sourceId: source.id },
      select: { id: true, period: true, areaCode: true, value: true },
    });
    const existingMap = new Map<string, { id: string; value: number | null }>();
    for (const row of existingRows) {
      existingMap.set(`${row.period}::${row.areaCode ?? ""}`, { id: row.id, value: row.value });
    }

    type InsertRow = {
      sourceId: string; period: string; periodDate: Date; periodType: "MONTH" | "QUARTER" | "YEAR" | "WEEK";
      areaCode: string | null; areaType: "NATIONAL" | "REGION" | "LANDSDEL" | "KOMMUNE" | "OTHER"; areaName: string | null;
      value: number | null; status: string | null; dimensions?: Record<string, string>;
    };
    const toInsert: InsertRow[] = [];
    const toUpdate: { id: string; value: number | null; status: string | null }[] = [];

    for (const dp of datapoints) {
      // dp.period is already extracted by the DST client (not in dp.dimensions)
      const period = dp.period;
      if (!period) { skipped++; continue; }

      const areaCode = omradeVar ? (dp.dimensions[omradeVar.code] ?? null) : null;
      const areaName = areaCode ? (areaNameMap.get(areaCode) ?? null) : null;
      const areaType = classifyAreaCode(areaCode);

      const periodType = period.includes("M")
        ? ("MONTH" as const)
        : period.includes("K") || period.includes("Q")
        ? ("QUARTER" as const)
        : ("YEAR" as const);

      // Extra dimensions: everything except time and area
      const extraDims: Record<string, string> = {};
      for (const [key, val] of Object.entries(dp.dimensions)) {
        if (key !== omradeVar?.code) extraDims[key] = val;
      }

      const mapKey = `${period}::${areaCode ?? ""}`;
      const existing = existingMap.get(mapKey);

      if (!existing) {
        toInsert.push({
          sourceId: source.id,
          period,
          periodDate: dp.periodDate,
          periodType,
          areaCode,
          areaType,
          areaName,
          value: dp.value,
          status: dp.status ?? null,
          dimensions: Object.keys(extraDims).length > 0 ? extraDims : undefined,
        });
      } else if (existing.value !== dp.value) {
        toUpdate.push({ id: existing.id, value: dp.value, status: dp.status ?? null });
      } else {
        skipped++;
      }
    }

    // Batch insert
    if (toInsert.length > 0) {
      await prisma.dataPoint.createMany({ data: toInsert, skipDuplicates: true });
      inserted = toInsert.length;
    }

    // Individual updates (rare after first run)
    for (const u of toUpdate) {
      await prisma.dataPoint.update({
        where: { id: u.id },
        data: { value: u.value, status: u.status },
      });
      updated++;
    }

    console.log(`📥 Inserted: ${inserted}`);
    console.log(`🔄 Updated: ${updated}`);
    console.log(`⏭️  Skipped: ${skipped}`);

    await prisma.fetchLog.update({
      where: { id: fetchLog.id },
      data: {
        completedAt: new Date(),
        success: true,
        inserted,
        updated,
        skipped,
        rowsAffected: inserted + updated,
        lastUpdatedAtSource: new Date(metadata.lastUpdated),
        notes: `Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}`,
      },
    });

    await prisma.dataSource.update({
      where: { id: source.id },
      data: { lastFetchedAt: new Date() },
    });

    console.log("\n✅ Sync complete");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
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
  .finally(() => prisma.$disconnect());
