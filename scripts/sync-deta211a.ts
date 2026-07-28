// ============================================================
// Sync script: DETA211A (Detailomsætningsindeks)
//
// Run with: npx tsx scripts/sync-deta211a.ts
//
// Syncs monthly retail sales index for G47 (total) and key subcategories.
// areaCode = branch code (G47 etc.), areaType = NATIONAL.
// ============================================================

import { PrismaClient } from "@prisma/client";
import { getTableMetadata, getTableData, type DSTFilter } from "../src/lib/dst";
import { writeDataPoints, type PendingPoint } from "../src/lib/pulse-batch";

import { kraevSkriveret } from "./write-guard";
const prisma = new PrismaClient();
const TABLE_ID = "DETA211A";
const SOURCE_SLUG = "dst-deta211a";

// Kun totalen. De seks underbrancher der stod her tidligere ("471",
// "472", "474", "475", "477", "479") var DB07-koder. DETA211A's
// branchedimension hedder BRANCHEDB25UDVALG og bruger DB25-koder på
// seks cifre (471110, 471120, 472100_472700 ...), så de seks blev
// filtreret bort af availableCodes-tjekket uden at nogen opdagede det.
//
// De blev aldrig vist: /pulse/forbrug læser kun areaCode "G47".
//
// Skal underbrancher tilbage, er DETA212A den rigtige tabel. Den har
// ni rene aggregater (G47001 til G47009), sæsonkorrigering via
// INDEKSTYPE, og publicerer en måned foran DETA211A.
const SYNC_BRANCHES = ["G47"];

async function main() {
  kraevSkriveret("sync-deta211a.ts");
  console.log(`Syncing ${TABLE_ID} — detailomsætningsindeks\n`);

  const metadata = await getTableMetadata(TABLE_ID);
  console.log(`DST: ${metadata.text} — opdateret ${metadata.updated}`);

  const source = await prisma.dataSource.upsert({
    where: { slug: SOURCE_SLUG },
    create: {
      slug: SOURCE_SLUG,
      provider: "Danmarks Statistik",
      tableId: TABLE_ID,
      name: "Detailomsætningsindeks",
      description: `Månedligt indeks for detailomsætning i Danmark (base 100). ${metadata.description}`,
      sourceUrl: `https://www.statistikbanken.dk/${TABLE_ID}`,
      license: "CC 4.0 BY",
      updateFrequency: "MONTHLY",
      lastUpdatedAtSource: new Date(metadata.updated),
    },
    update: {
      lastUpdatedAtSource: new Date(metadata.updated),
    },
  });

  const fetchLog = await prisma.fetchLog.create({
    data: { sourceId: source.id },
  });

  try {
    const brancheVar = metadata.variables.find(v => v.code === "BRANCHEDB25UDVALG")!;
    const branchLabels: Record<string, string> = {};
    for (const v of brancheVar.values) {
      branchLabels[v.code] = v.label;
    }

    // En konfigureret kode der ikke findes hos kilden må ikke forsvinde
    // lydløst. Det var præcis sådan seks DB07-koder blev kasseret her i
    // månedsvis uden en linje i loggen, og det er samme fejlfamilie som
    // continue-on-error: noget blev droppet uden at nogen fik besked.
    const availableCodes = new Set(brancheVar.values.map(v => v.code));
    const branchesToSync = SYNC_BRANCHES.filter(b => availableCodes.has(b));
    const dropped = SYNC_BRANCHES.filter(b => !availableCodes.has(b));
    if (dropped.length > 0) {
      throw new Error(
        `Disse konfigurerede branchekoder findes ikke i ${TABLE_ID}: ${dropped.join(", ")}. ` +
          `Dimensionen ${brancheVar.code} har ${brancheVar.values.length} værdier. ` +
          `DST har sandsynligvis omlagt klassifikationen. Ret SYNC_BRANCHES frem for at lade koderne falde bort.`
      );
    }
    console.log(`Syncing branches: ${branchesToSync.join(", ")}`);

    const filters: DSTFilter[] = [
      { code: "BRANCHEDB25UDVALG", values: branchesToSync },
      { code: "Tid", values: ["*"] },
    ];

    const datapoints = await getTableData(TABLE_ID, filters);
    console.log(`Received ${datapoints.length} datapoints`);

    let skipped = 0;
    const pending: PendingPoint[] = [];

    for (const dp of datapoints) {
      const period = dp.period;
      if (!period) { skipped++; continue; }

      const branchCode = dp.dimensions["BRANCHEDB25UDVALG"];
      if (!branchCode) { skipped++; continue; }

      if (dp.value === null) { skipped++; continue; }

      pending.push({
        period,
        periodDate: dp.periodDate,
        periodType: "MONTH",
        areaCode: branchCode,
        areaType: "NATIONAL",
        areaName: branchLabels[branchCode] ?? branchCode,
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

    console.log(
      `Inserted: ${inserted}, Updated: ${updated}, Unchanged: ${unchanged}, Skipped: ${skipped}`
    );

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

    console.log("\nSync complete.");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown";
    console.error(`Sync failed: ${message}`);
    await prisma.fetchLog.update({
      where: { id: fetchLog.id },
      data: { completedAt: new Date(), success: false, error: message },
    });
    throw err;
  }
}

main()
  .catch((e) => { console.error("Fatal:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
