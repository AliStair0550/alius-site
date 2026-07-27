// ============================================================
// Verificér de kilder de fire eksisterende dashboards læser fra
//
// Run with:
//   set -a && . ./.env.local && set +a
//   npx tsx scripts/verify-legacy-sources.ts
//
// SKRIVER INTET.
//
// De fire dashboards på /pulse/konkurser, /pulse/forbrug,
// /pulse/ledighed og /pulse/kommuner læser stadig DataSource og
// DataPoint. Ranglisten bygges på series og observations, men indtil
// de fire er skrevet om, er det her laget besøgende ser.
//
// Scriptet sammenligner tre ting per kilde, og holder dem adskilt,
// fordi de tre er tre forskellige tilstande:
//
//   1. Hvad DST har publiceret (tabellens nyeste periode)
//   2. Hvad vi har hentet (nyeste periode i DataPoint)
//   3. Om tabellen overhovedet er aktiv hos DST
//
// "Vi er bagud" og "kilden har ikke publiceret nyere" ser ens ud i
// databasen og er ikke det samme. Kun den første er en fejl hos os.
// ============================================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Hvilke kilder hvert dashboard faktisk læser. Aflæst i page.tsx. */
const DASHBOARD_SOURCES: Record<string, string[]> = {
  "/pulse/konkurser": ["dst-konk3", "dst-konk25"],
  "/pulse/forbrug": ["dst-forv1", "dst-deta211a", "dst-pris01"],
  "/pulse/ledighed": ["dst-aus08"],
  "/pulse/kommuner": ["dst-aus08", "dst-folk1am", "dst-indkp101", "dst-ejdfoe1-huse"],
};

type TableInfo = {
  active: boolean | null;
  updated: string | null;
  latestPeriod: string | null;
};

async function tableInfo(tableId: string): Promise<TableInfo | { error: string }> {
  const url = `https://api.statbank.dk/v1/tableinfo/${tableId}?format=JSON&lang=da`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch (e) {
    // Netværksfejl er ikke "tabellen findes ikke". Rapportér den som sig selv.
    return { error: `netværksfejl: ${(e as Error).message}` };
  }
  if (!res.ok) return { error: `DST svarede ${res.status}` };

  const d = (await res.json()) as {
    active?: boolean;
    updated?: string;
    variables?: Array<{ time?: boolean; values: Array<{ id: string }> }>;
  };
  const timeVar = d.variables?.find((v) => v.time);
  const vals = timeVar?.values ?? [];
  return {
    active: d.active ?? null,
    updated: d.updated ?? null,
    latestPeriod: vals.length ? vals[vals.length - 1].id : null,
  };
}

/** Sorterbar nøgle for DST-perioder. 2026M04, 2026K1, 2026. */
function periodKey(p: string): string {
  const m = p.match(/^(\d{4})M(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}`;
  const q = p.match(/^(\d{4})K(\d)$/);
  if (q) return `${q[1]}-${String(Number(q[2]) * 3).padStart(2, "0")}`;
  if (/^\d{4}$/.test(p)) return `${p}-12`;
  return p;
}

async function main() {
  const slugs = [...new Set(Object.values(DASHBOARD_SOURCES).flat())].sort();
  const sources = await prisma.dataSource.findMany({ where: { slug: { in: slugs } } });

  const missing = slugs.filter((s) => !sources.some((x) => x.slug === s));
  if (missing.length) {
    console.log(`KILDER DER IKKE FINDES I DATABASEN: ${missing.join(", ")}`);
    process.exitCode = 1;
  }

  const rows: Array<{
    slug: string;
    tableId: string;
    hos_dst: string;
    hos_os: string;
    tilstand: string;
  }> = [];

  for (const s of sources) {
    const info = await tableInfo(s.tableId);
    const last = await prisma.dataPoint.findFirst({
      where: { sourceId: s.id, value: { not: null } },
      orderBy: { periodDate: "desc" },
      select: { period: true },
    });
    const ours = last?.period ?? null;

    let hosDst: string;
    let tilstand: string;

    if ("error" in info) {
      // Afslag fra kilden er ikke fravær af data. Sig hvad der skete.
      hosDst = "ikke oplyst";
      tilstand = `KILDEN SVAREDE IKKE: ${info.error}`;
      process.exitCode = 1;
    } else if (info.latestPeriod === null) {
      hosDst = "ingen tidsdimension";
      tilstand = "KAN IKKE AFGØRES: tabellen har ingen tidsvariabel";
      process.exitCode = 1;
    } else {
      hosDst = info.latestPeriod;
      const dstKey = periodKey(info.latestPeriod);
      const ourKey = ours ? periodKey(ours) : null;

      if (info.active === false) {
        tilstand = ours === info.latestPeriod
          ? "LUKKET hos DST, vi har hele serien"
          : `LUKKET hos DST, og vi mangler frem til ${info.latestPeriod}`;
      } else if (ourKey === null) {
        tilstand = "VI HAR INTET hentet";
        process.exitCode = 1;
      } else if (ourKey < dstKey) {
        tilstand = `VI ER BAGUD med ${info.latestPeriod} mod vores ${ours}`;
        process.exitCode = 1;
      } else if (ourKey > dstKey) {
        tilstand = `VI HAR MERE end DST oplyser. Undersøg`;
        process.exitCode = 1;
      } else {
        tilstand = "aktuel";
      }
    }

    rows.push({
      slug: s.slug,
      tableId: s.tableId,
      hos_dst: hosDst,
      hos_os: ours ?? "intet",
      tilstand,
    });
  }

  console.table(rows);

  console.log("\nPer dashboard:");
  for (const [path, list] of Object.entries(DASHBOARD_SOURCES)) {
    const r = rows.filter((x) => list.includes(x.slug));
    const problem = r.filter((x) => x.tilstand !== "aktuel" && !x.tilstand.startsWith("LUKKET hos DST, vi har"));
    console.log(
      `  ${path.padEnd(20)} ${problem.length === 0 ? "alle kilder aktuelle" : problem.map((x) => x.slug + ": " + x.tilstand).join("; ")}`
    );
  }
}

main()
  .catch((e) => {
    console.error("Fatal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
