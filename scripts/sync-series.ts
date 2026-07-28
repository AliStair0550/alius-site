// ============================================================
// Dagligt inkrementelt hentejob til series og observations
//
// Run with:
//   set -a && . ./.env.local && set +a
//   npx tsx scripts/sync-series.ts [--dry] [serie-id ...]
//
// FORSKELLEN TIL scripts/backfill.ts
//
//   backfill    henter hele historikken kilden har. Timer for EDS.
//               Køres i hånden når en serie er ny eller har fået en
//               revision ældre end tilbageblikket.
//   sync-series henter et vindue bagud fra i dag. Sekunder. Køres
//               dagligt.
//
// De skriver begge gennem writeObservations, så revisionsreglen er den
// samme: observations.value opdateres aldrig, kun tilføjet med ny
// retrieved_at, og den gamle række får is_current = false.
//
// HVORFOR DAGLIGT, OGSÅ FOR MÅNEDSSERIER
//
// Alternativet er en publiceringskalender per kilde, der skal
// vedligeholdes og som er forkert den dag DST flytter en udgivelse.
// Et dagligt tjek af en månedsserie koster ét API-kald og finder tallet
// den dag det lander. Kalenderen er dyrere end kaldene.
//
// HVAD DET IKKE FANGER
//
// En revision ældre end seriens tilbageblik. Se pulse-incremental.ts.
// Det er en bevidst afvejning, ikke en mangel der er overset.
// ============================================================

import { PrismaClient } from "@prisma/client";
import { withDbRetry } from "../src/lib/db";
import { SERIES } from "../config/series";
import { DstAdapter } from "../src/lib/adapters/dst";
import { EdsAdapter } from "../src/lib/adapters/eds";
import { EurostatAdapter } from "../src/lib/adapters/eurostat";
import type { SeriesDef, SourceAdapter } from "../src/lib/adapters/types";
import { writeObservations } from "../src/lib/pulse-observations";
import { hentFra, tilbageblikDage, forventetFriskhedDage } from "../src/lib/pulse-incremental";

import { kraevSkriveret } from "./write-guard";
const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry");

/**
 * Overstyrer tilbageblikket for denne kørsel.
 *
 * Til reparation. Et døgn der blev skrevet forkert af en tidligere
 * fejl ligger stille i basen: værdien er plausibel, ingen alarm går.
 * Med et bredere vindue hentes det igen ad den normale vej, og
 * writeObservations logger rettelsen som den revision det er.
 *
 * Bruges ikke i det daglige job. Se --dage i loggen når den er sat.
 */
const DAGE_ARG = process.argv.find((a) => a.startsWith("--dage="));
const DAGE = DAGE_ARG ? Number(DAGE_ARG.slice("--dage=".length)) : null;
if (DAGE !== null && (!Number.isFinite(DAGE) || DAGE < 1)) {
  console.error(`--dage skal være et positivt heltal, ikke "${DAGE_ARG}"`);
  process.exit(1);
}

const ADAPTERS: Record<SeriesDef["source"], SourceAdapter> = {
  DST: new DstAdapter(),
  EDS: new EdsAdapter(),
  EUROSTAT: new EurostatAdapter(),
};

/** Hver serie ender i præcis én af disse. Ingen af dem er "ingenting". */
type Udfald =
  | { slags: "nye"; indsat: number; revideret: number; nyestePeriode: Date }
  | { slags: "uaendret"; nyestePeriode: Date | null; dageGammel: number | null }
  | { slags: "ingen_i_vindue" }
  | { slags: "ukendt_serie" }
  // Tørløb sammenligner ikke med basen. At kalde det "intet nyt" ville
  // være en påstand om noget der ikke er undersøgt.
  | { slags: "toerloeb"; hentet: number; nyesteHosKilden: Date }
  | { slags: "fejl"; besked: string };

type Resultat = { def: SeriesDef; udfald: Udfald; sekunder: number };

async function synkroniser(def: SeriesDef, nu: Date): Promise<Udfald> {
  const raekke = await prisma.series.findUnique({
    where: { id: def.id },
    select: { id: true, frequency: true, revisionPolicy: true, expectedLagDays: true },
  });

  // Serien findes i config, men ikke i basen. Det er ikke "ingen nye
  // tal", det er en serie der aldrig er blevet backfillet.
  if (!raekke) return { slags: "ukendt_serie" };

  const since =
    DAGE !== null
      ? new Date(nu.getTime() - DAGE * 86_400_000)
      : hentFra(raekke.frequency, raekke.revisionPolicy, nu);
  const adapter = ADAPTERS[def.source];
  const points = await adapter.fetchSeries(def, { since });

  if (points.length === 0) return { slags: "ingen_i_vindue" };

  if (DRY) {
    const nyeste = points.reduce<Date>(
      (m, p) => (p.period > m ? p.period : m),
      points[0].period
    );
    return { slags: "toerloeb", hentet: points.length, nyesteHosKilden: nyeste };
  }

  const r = await withDbRetry(() => writeObservations(prisma, def.id, points, nu));

  if (r.inserted > 0 || r.revised > 0) {
    const nyeste = points.reduce<Date>(
      (m, p) => (p.value !== null && p.period > m ? p.period : m),
      points[0].period
    );
    if (r.largeRevisions.length > 0) {
      for (const lr of r.largeRevisions) {
        console.log(
          `      STOR REVISION ${def.id} ${lr.period}: ${lr.from} -> ${lr.to} ` +
            `(${lr.pct.toFixed(1)} procent)`
        );
      }
    }
    return {
      slags: "nye",
      indsat: r.inserted,
      revideret: r.revised,
      nyestePeriode: nyeste,
    };
  }

  // Intet nyt. Sig hvor gammelt det nyeste er, så "kilden har ikke
  // publiceret" kan skelnes fra "vi henter det forkerte".
  const nyeste = await prisma.observation.findFirst({
    where: { seriesId: def.id, isCurrent: true, value: { not: null } },
    orderBy: { period: "desc" },
    select: { period: true },
  });
  const dageGammel = nyeste
    ? Math.floor((nu.getTime() - nyeste.period.getTime()) / 86_400_000)
    : null;
  return { slags: "uaendret", nyestePeriode: nyeste?.period ?? null, dageGammel };
}

/**
 * Beder siden om at genskabe /pulse.
 *
 * Uden det opdaterer siden sig alligevel, fordi den er ISR med en times
 * vindue. Kaldet gør det bare med det samme.
 *
 * Mangler hemmeligheden, siges det højt. En sprunget genskabelse der
 * ikke bliver nævnt ser bagefter ud som en genskabelse der virkede.
 */
async function genskabForsiden(): Promise<string> {
  const secret =
    process.env.REVALIDATE_SECRET ?? process.env.CRON_SECRET ?? process.env.ADMIN_SECRET;
  const base = process.env.SITE_URL ?? "https://alius.dk";
  if (!secret) {
    return (
      "SPRUNGET OVER: ingen af REVALIDATE_SECRET, CRON_SECRET eller " +
      "ADMIN_SECRET er sat. Siden opdaterer sig stadig, men foerst naar " +
      "ISR-vinduet paa en time udloeber."
    );
  }
  try {
    const res = await fetch(`${base}/api/revalidate/pulse`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return `svarede HTTP ${res.status}`;
    return "ok";
  } catch (e) {
    return `kunne ikke nås: ${(e as Error).message}`;
  }
}

async function main() {
  if (!DRY) kraevSkriveret("sync-series.ts");
  const nu = new Date();
  const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const defs = only.length ? SERIES.filter((s) => only.includes(s.id)) : SERIES;

  if (defs.length === 0) {
    console.error("Ingen serier matchede. Kendte id'er:");
    for (const s of SERIES) console.error(`  ${s.id}`);
    process.exit(1);
  }

  console.log(
    `${DRY ? "TØRLØB. " : ""}Inkrementel hentning af ${defs.length} serier, ` +
      `${nu.toISOString()}` +
      `${DAGE !== null ? `\nTilbageblik overstyret til ${DAGE} dage for alle serier.` : ""}\n`
  );

  await withDbRetry(() => prisma.$queryRaw`SELECT 1`);

  const resultater: Resultat[] = [];

  for (const def of defs) {
    const t0 = Date.now();
    let udfald: Udfald;
    try {
      udfald = await synkroniser(def, nu);
    } catch (e) {
      // Et afslag fra kilden er sin egen tilstand. Det bliver aldrig til
      // "ingen nye tal", og det stopper ikke de øvrige serier.
      udfald = { slags: "fejl", besked: (e as Error).message };
    }
    const sekunder = (Date.now() - t0) / 1000;
    resultater.push({ def, udfald, sekunder });

    const raekke = await prisma.series.findUnique({
      where: { id: def.id },
      select: { frequency: true, revisionPolicy: true },
    });
    const vindue =
      DAGE !== null
        ? `${DAGE}d overstyret`
        : raekke
          ? `${tilbageblikDage(raekke.frequency, raekke.revisionPolicy)}d`
          : "-";

    switch (udfald.slags) {
      case "nye":
        console.log(
          `  ${def.id} [${vindue}] ${udfald.indsat} nye, ${udfald.revideret} revideret, ` +
            `nyeste ${udfald.nyestePeriode.toISOString().slice(0, 10)} (${sekunder.toFixed(1)}s)`
        );
        break;
      case "uaendret":
        console.log(
          `  ${def.id} [${vindue}] intet nyt, nyeste ` +
            `${udfald.nyestePeriode?.toISOString().slice(0, 10) ?? "ingen"}` +
            `${udfald.dageGammel !== null ? ` (${udfald.dageGammel} dage gammel)` : ""}` +
            ` (${sekunder.toFixed(1)}s)`
        );
        break;
      case "toerloeb":
        console.log(
          `  ${def.id} [${vindue}] ${udfald.hentet} perioder hentet, nyeste hos kilden ` +
            `${udfald.nyesteHosKilden.toISOString().slice(0, 10)} (${sekunder.toFixed(1)}s). ` +
            `Ikke sammenlignet med basen.`
        );
        break;
      case "ingen_i_vindue":
        console.log(`  ${def.id} [${vindue}] kilden har ingen perioder i vinduet`);
        break;
      case "ukendt_serie":
        console.log(`  ${def.id} FINDES IKKE i basen. Kør backfill for den først.`);
        break;
      case "fejl":
        console.log(`  ${def.id} FEJL: ${udfald.besked}`);
        break;
    }
  }

  // ------------------------------------------------------------
  // Opsummering. Hver tilstand tælles for sig.
  // ------------------------------------------------------------
  const tael = (s: Udfald["slags"]) => resultater.filter((r) => r.udfald.slags === s).length;
  const fejl = resultater.filter((r) => r.udfald.slags === "fejl");
  const ukendte = resultater.filter((r) => r.udfald.slags === "ukendt_serie");
  const nye = resultater.filter((r) => r.udfald.slags === "nye");

  console.log("\n" + "=".repeat(64));
  if (DRY) {
    console.log(
      `Tørløb: ${tael("toerloeb")} serier hentet uden sammenligning   ` +
        `Ingen perioder i vindue: ${tael("ingen_i_vindue")}   ` +
        `Ikke i basen: ${ukendte.length}   Fejl: ${fejl.length}`
    );
  } else {
    console.log(
      `Nye tal: ${tael("nye")}   Intet nyt: ${tael("uaendret")}   ` +
        `Ingen perioder i vindue: ${tael("ingen_i_vindue")}   ` +
        `Ikke i basen: ${ukendte.length}   Fejl: ${fejl.length}`
    );
  }

  // Serier der er ældre end deres egen frekvens tillader. Ikke en
  // alarm, kun en note; alarmen er pulse-stale.ts.
  const gamle = resultater.filter((r) => {
    if (r.udfald.slags !== "uaendret" || r.udfald.dageGammel === null) return false;
    const def = r.def;
    return r.udfald.dageGammel > forventetFriskhedDage(def.frequency, def.expectedLagDays) * 2;
  });
  if (gamle.length > 0) {
    console.log(`\nSerier hvor kilden ikke har publiceret længe (${gamle.length}):`);
    for (const g of gamle) {
      const u = g.udfald as Extract<Udfald, { slags: "uaendret" }>;
      console.log(`  ${g.def.id}: ${u.dageGammel} dage siden nyeste tal`);
    }
  }

  if (nye.length > 0 && !DRY) {
    const svar = await genskabForsiden();
    console.log(`\nGenskabelse af /pulse: ${svar}`);
  } else if (!DRY) {
    console.log("\nIngen nye tal, /pulse ikke genskabt.");
  }

  if (fejl.length > 0) {
    console.log(`\nFEJL (${fejl.length}):`);
    for (const f of fejl) {
      console.log(`  ${f.def.id}: ${(f.udfald as { besked: string }).besked}`);
    }
    process.exitCode = 1;
  }
  if (ukendte.length > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error("Fatal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
