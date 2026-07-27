// ============================================================
// Sync script: KONK25 (Erklærede konkurser efter branche DB25)
//
// Run with: npx tsx scripts/sync-konk25.ts
//
// AFLØSER FOR KONK4.
//
// DST lukkede KONK4 den 7. januar 2026. Tabellen står i registret med
// active: false og latestPeriod: 2025M12. Afløseren er KONK25, som har
// samme dimensioner (branche, virksomhedstype, tid) og samme historik
// tilbage til 2009M01, men bruger DB25-brancheklassifikationen i stedet
// for DB07.
//
// KONK4 beholdes urørt som lukket historisk serie. Den er markeret
// retired i DataSource.meta, så stale-alarmen ikke bliver ved med at
// klage over en tabel der aldrig opdateres igen.
//
// Brancheomlægningen er ikke en ren omdøbning. Se DB07_TO_DB25 nedenfor.
// ============================================================

import { PrismaClient } from "@prisma/client";
import { getTableMetadata, getTableData, type DSTFilter } from "../src/lib/dst";
import {
  writeDataPoints,
  dimensionKey,
  type PendingPoint,
} from "../src/lib/pulse-batch";

const prisma = new PrismaClient();
const TABLE_ID = "KONK25";
const SOURCE_SLUG = "dst-konk25";
const RETIRED_SLUG = "dst-konk4";

/**
 * Oversættelse fra KONK4's DB07-grupper til KONK25's DB25-koder.
 *
 * 17 af KONK4's 20 grupper har en entydig efterfølger. Tre har ikke,
 * og de er udeladt frem for at blive tvunget ind i en nabokategori:
 *
 *   "000" Konkurser i alt      KONK25 har ingen totalkode. Totalen
 *                              findes i KONK3, som allerede er kilden
 *                              til hovedtallet på /pulse/konkurser.
 *   "G01" Handel med biler     DB25 har ingen G45. Bilhandel er
 *                              fordelt ud på andre koder.
 *   "11"  Uoplyst aktivitet    Ingen tilsvarende restkategori i DB25.
 *
 * Bemærk at niveauerne overlapper, præcis som de gjorde i KONK4:
 * GHI indeholder G, H og I, og I indeholder I55 og I56. Det er bevaret,
 * fordi /pulse/konkurser viser dem som separate rækker og altid har
 * gjort det.
 */
const DB07_TO_DB25: Array<{ db25: string; wasDb07: string; note?: string }> = [
  { db25: "A", wasDb07: "1" },      // Landbrug, skovbrug og fiskeri
  { db25: "BCDE", wasDb07: "2" },   // Industri, forsyning og råstofindvinding
  { db25: "F", wasDb07: "3" },      // Byggeri og anlæg
  { db25: "GHI", wasDb07: "4" },    // Handel, transport, overnatning, restauranter
  { db25: "G", wasDb07: "G" },      // Engroshandel og detailhandel
  { db25: "G46", wasDb07: "G02" },  // Engroshandel
  { db25: "G47", wasDb07: "G03" },  // Detailhandel
  { db25: "H", wasDb07: "H" },      // Transport
  { db25: "I", wasDb07: "I" },      // Overnatning og restauranter
  { db25: "I55", wasDb07: "101" },  // Overnatningsfaciliteter
  { db25: "I56", wasDb07: "102" },  // Servering
  { db25: "JK", wasDb07: "5" },     // IT og medier
  { db25: "L", wasDb07: "6" },      // Finansiering og forsikring
  { db25: "M", wasDb07: "7" },      // Ejendomme
  { db25: "NO", wasDb07: "8" },     // Rådgivning og forretningsservice
  { db25: "PQR", wasDb07: "9" },    // Offentlig forvaltning, undervisning, sundhed
  { db25: "STUV", wasDb07: "10" },  // Kultur, fritid og anden service
];

async function main() {
  console.log(`Syncing ${TABLE_ID} — erklærede konkurser efter branche (DB25)\n`);

  const metadata = await getTableMetadata(TABLE_ID);
  console.log(`DST: ${metadata.text} — opdateret ${metadata.updated}`);

  const brancheVar = metadata.variables.find((v) => v.code === "BRANCHE25");
  const virkVar = metadata.variables.find((v) => v.code === "VIRKTYP1");
  if (!brancheVar) throw new Error("BRANCHE25 findes ikke i KONK25");
  if (!virkVar) throw new Error("VIRKTYP1 findes ikke i KONK25");

  const brancheLabels: Record<string, string> = {};
  for (const v of brancheVar.values) brancheLabels[v.code] = v.label;

  // Verificér at hver kode i kortet faktisk findes. Hvis DST omlægger
  // igen, skal det fejle højlydt, ikke give en halv serie.
  const missing = DB07_TO_DB25.filter((m) => !brancheLabels[m.db25]);
  if (missing.length > 0) {
    throw new Error(
      `Disse DB25-koder findes ikke længere i ${TABLE_ID}: ` +
        missing.map((m) => m.db25).join(", ") +
        `. Brancheklassifikationen er ændret igen og DB07_TO_DB25 skal opdateres.`
    );
  }

  // Samme afgrænsning som KONK4 brugte: konkurser i aktive virksomheder.
  const aktive = virkVar.values.find((v) =>
    v.label.toLowerCase().includes("aktive")
  );
  if (!aktive) throw new Error("Kunne ikke finde 'aktive virksomheder' i VIRKTYP1");
  console.log(`Filter virksomhedstype: "${aktive.label}" (${aktive.code})`);
  console.log(`Brancher: ${DB07_TO_DB25.length} DB25-grupper\n`);

  const source = await prisma.dataSource.upsert({
    where: { slug: SOURCE_SLUG },
    create: {
      slug: SOURCE_SLUG,
      provider: "Danmarks Statistik",
      tableId: TABLE_ID,
      name: "Erklærede konkurser efter branche (KONK25)",
      description:
        `Månedlige konkurser i aktive virksomheder fordelt på DB25-hovedbrancher. ` +
        `Afløser KONK4, som DST lukkede 7. januar 2026. ${metadata.description}`,
      sourceUrl: `https://www.statistikbanken.dk/${TABLE_ID}`,
      license: "CC 4.0 BY",
      updateFrequency: "MONTHLY",
      lastUpdatedAtSource: new Date(metadata.updated),
      meta: { replaces: RETIRED_SLUG, classification: "DB25" },
    },
    update: {
      lastUpdatedAtSource: new Date(metadata.updated),
      meta: { replaces: RETIRED_SLUG, classification: "DB25" },
    },
  });

  const fetchLog = await prisma.fetchLog.create({ data: { sourceId: source.id } });

  try {
    const filters: DSTFilter[] = [
      { code: "BRANCHE25", values: DB07_TO_DB25.map((m) => m.db25) },
      { code: "VIRKTYP1", values: [aktive.code] },
      { code: "Tid", values: ["*"] },
    ];

    const datapoints = await getTableData(TABLE_ID, filters);
    console.log(`Received ${datapoints.length} datapoints`);

    let skipped = 0;
    const pending: PendingPoint[] = [];

    for (const dp of datapoints) {
      if (!dp.period) { skipped++; continue; }

      const brancheCode = dp.dimensions["BRANCHE25"];
      if (!brancheCode) { skipped++; continue; }

      const monthly = dp.period.match(/^(\d{4})M(\d{2})$/);
      if (!monthly) { skipped++; continue; }

      // Samme dimensionsnøgler som KONK4 brugte, så aggregateBranches
      // på /pulse/konkurser virker uændret.
      const dims: Record<string, string> = {
        BRANCHE_CODE: brancheCode,
        BRANCHE_LABEL: brancheLabels[brancheCode] ?? brancheCode,
        VIRKTYPE_CODE: aktive.code,
        VIRKTYPE_LABEL: aktive.label,
      };
      const wasDb07 = DB07_TO_DB25.find((m) => m.db25 === brancheCode)?.wasDb07;
      if (wasDb07) dims.WAS_DB07_CODE = wasDb07;

      pending.push({
        period: dp.period,
        periodDate: new Date(
          Date.UTC(parseInt(monthly[1], 10), parseInt(monthly[2], 10) - 1, 1)
        ),
        periodType: "MONTH",
        areaCode: null,
        areaType: "NATIONAL",
        areaName: null,
        value: dp.value,
        status: dp.status,
        dimensions: dims,
      });
    }

    const { inserted, updated, unchanged, duplicates } = await writeDataPoints(
      prisma,
      source.id,
      pending,
      dimensionKey("BRANCHE_CODE", "VIRKTYPE_CODE")
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

    // Markér forgængeren som lukket, så stale-alarmen holder op med at
    // klage. Gøres her frem for i en migration, fordi det er en
    // observation om DST's registre, ikke en skemaændring.
    const retired = await prisma.dataSource.findUnique({
      where: { slug: RETIRED_SLUG },
    });
    if (retired) {
      await prisma.dataSource.update({
        where: { id: retired.id },
        data: {
          meta: {
            retired: true,
            retiredAtSource: "2026-01-07",
            finalPeriod: "2025M12",
            successor: SOURCE_SLUG,
            reason:
              "DST satte KONK4 til active: false. Afløst af KONK25 med DB25-klassifikation.",
          },
        },
      });
      console.log(`Markerede ${RETIRED_SLUG} som lukket (afløst af ${SOURCE_SLUG})`);
    }

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
