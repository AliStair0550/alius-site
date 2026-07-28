// ============================================================
// Append-only skrivning til observations
//
// Datakatalogets afsnit 2: "Ved ny hentning: hvis værdien for en periode
// afviger fra seneste is_current-række, sættes den gamle til
// is_current = false, og den nye indsættes. Ingen UPDATE på værdier,
// nogensinde."
//
// Den eneste UPDATE der forekommer her er på is_current-flaget.
// value røres aldrig efter indsættelse.
// ============================================================

import { Prisma, type PrismaClient } from "@prisma/client";
import type { FetchedPoint } from "./adapters/types";

export type WriteResult = {
  inserted: number;
  revised: number;
  unchanged: number;
  /** Revisioner over tærsklen. Skal ses efter, ikke ignoreres. */
  largeRevisions: Array<{ period: string; from: number; to: number; pct: number }>;
};

/**
 * Afvigelser over dette udløser en advarsel. Datakatalogets afsnit 4:
 * "Afvigelser over 5 procent på en allerede publiceret periode udløser
 * alarm, fordi det som regel betyder at parsingen er gået galt, ikke at
 * DST har revideret."
 */
const LARGE_REVISION_PCT = 5;

const CHUNK = 1000;

function chunk<T>(xs: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
}

const key = (areaCode: string, period: Date) =>
  `${areaCode}::${period.toISOString().slice(0, 10)}`;

/**
 * Hvor stor en forskel der skal til, før noget er en revision.
 *
 * RELATIV, ikke absolut. Fejlen den skal filtrere fra er proportional
 * med tallets størrelse: et døgngennemsnit lægger fireogtyve til
 * seksoghalvfems flydende tal sammen, og akkumuleringsfejlen vokser
 * med niveauet. En absolut tolerance ville være for stram på en
 * valutakurs og for løs på en ejendomsværdi.
 *
 * HVORFOR DEN BLEV LØSNET
 *
 * Sammenligningen lå på seks decimaler, som er kolonnens præcision.
 * Elprisen for DK1 den 26. august 2022 har den eksakte middelværdi
 *
 *     5246,2895914999999907498
 *
 * altså ni milliardtedele UNDER afrundingsgrænsen. Om den lander på
 * ...591 eller ...592 afhænger af i hvilken rækkefølge de fireogtyve
 * timepriser blev lagt sammen. To kørsler kunne derfor skiftes til at
 * "revidere" hinanden frem og tilbage på et tal der ikke havde ændret
 * sig.
 *
 * Seks decimaler på et døgngennemsnit i kroner er mere præcision end
 * tallet bærer. Revisionsloggen skal kun indeholde ændringer nogen
 * mener noget med; fyldes den med vipper, holder man op med at læse
 * den, og så er den ingenting værd.
 *
 * HVORFOR 1e-7
 *
 * Den skal ligge højt over float-støjen og lavt under enhver ægte
 * revision. Efterprøvet mod hver enhed i kataloget:
 *
 *   enhed           niveau      tolerance   mindste ægte ændring
 *   pct             3,47        3,5e-7      0,01     (2 decimaler)
 *   nettotal        14,7        1,5e-6      0,1      (1 decimal)
 *   indeks          105,4       1,1e-5      0,1      (1 decimal)
 *   antal           153         1,5e-5      1        (heltal)
 *   m2              165.037     1,7e-2      1        (heltal)
 *   dkk             2.662.528   0,27        1        (hele kroner)
 *   dkk_per_enhed   6,5601      6,6e-7      0,0001   (4 decimaler)
 *   dkk_mwh         5.246       5,2e-4      0,01
 *
 * Mindst tre størrelsesordener luft i begge retninger overalt. Den
 * afrundingsvippe der begrundede ændringen er 1e-6 på et niveau af
 * 5.246, altså langt inde i tolerancen. Den mindste ægte revision vi
 * har set, EDS' otte en halv procent, ligger seks størrelsesordener
 * over.
 *
 * Den absolutte bund gælder tal på eller nær nul, hvor en relativ
 * tolerance falder sammen til ingenting. Nettotal kan lovligt være 0.
 */
export const REVISION_RELATIV = 1e-7;
export const REVISION_ABSOLUT = 1e-9;

/**
 * Er forskellen stor nok til at være en revision.
 *
 * Ren funktion på tal, så reglen kan prøves uden en database.
 */
export function erRevision(a: number, b: number): boolean {
  const graense = Math.max(
    REVISION_ABSOLUT,
    REVISION_RELATIV * Math.max(Math.abs(a), Math.abs(b))
  );
  return Math.abs(a - b) > graense;
}

/**
 * Som erRevision, men på de typer basen leverer.
 *
 * null mod et tal er ALTID en revision. "Ikke publiceret endnu" og "et
 * tal" er to forskellige tilstande, uanset hvor lille tallet er, og de
 * må ikke smelte sammen.
 */
function differs(a: Prisma.Decimal | null, b: number | null): boolean {
  if (a === null && b === null) return false;
  if (a === null || b === null) return true;
  return erRevision(a.toNumber(), b);
}

export async function writeObservations(
  prisma: PrismaClient,
  seriesId: string,
  points: FetchedPoint[],
  retrievedAt: Date = new Date()
): Promise<WriteResult> {
  const result: WriteResult = { inserted: 0, revised: 0, unchanged: 0, largeRevisions: [] };

  const current = await prisma.observation.findMany({
    where: { seriesId, isCurrent: true },
    select: { areaCode: true, period: true, value: true, retrievedAt: true },
  });
  const existing = new Map(current.map((o) => [key(o.areaCode, o.period), o]));

  const toInsert: Prisma.ObservationCreateManyInput[] = [];
  const toRetire: Array<{ areaCode: string; period: Date; retrievedAt: Date }> = [];
  const seen = new Set<string>();

  for (const p of points) {
    const k = key(p.areaCode, p.period);
    if (seen.has(k)) continue; // dublet i samme hentning
    seen.add(k);

    const prior = existing.get(k);

    if (!prior) {
      toInsert.push({
        seriesId,
        areaCode: p.areaCode,
        period: p.period,
        value: p.value === null ? null : new Prisma.Decimal(p.value),
        retrievedAt,
        isCurrent: true,
      });
      result.inserted++;
      continue;
    }

    if (!differs(prior.value, p.value)) {
      result.unchanged++;
      continue;
    }

    // Revision. Den gamle række bliver stående med sin oprindelige
    // værdi og retrieved_at; kun flaget ændres.
    //
    // Kollisionsværn: retrieved_at er en del af primærnøglen. Rammer den
    // nye hentning samme tidsstempel som den gamle række, ville
    // createMany's skipDuplicates kassere den nye værdi lydløst, mens
    // den gamle allerede var markeret som ikke-aktuel. Resultatet ville
    // være en periode helt uden gældende værdi. Ét millisekund er nok
    // til at adskille dem.
    const stamp =
      prior.retrievedAt.getTime() === retrievedAt.getTime()
        ? new Date(retrievedAt.getTime() + 1)
        : retrievedAt;

    toRetire.push({ areaCode: p.areaCode, period: p.period, retrievedAt: prior.retrievedAt });
    toInsert.push({
      seriesId,
      areaCode: p.areaCode,
      period: p.period,
      value: p.value === null ? null : new Prisma.Decimal(p.value),
      retrievedAt: stamp,
      isCurrent: true,
    });
    result.revised++;

    const from = prior.value === null ? null : Number(prior.value);
    const to = p.value;
    if (from !== null && to !== null && from !== 0) {
      const pct = ((to - from) / Math.abs(from)) * 100;
      if (Math.abs(pct) > LARGE_REVISION_PCT) {
        result.largeRevisions.push({
          period: p.period.toISOString().slice(0, 10),
          from,
          to,
          pct,
        });
      }
    }
  }

  // Retirér først, så primærnøglen aldrig kolliderer på is_current.
  for (const b of chunk(toRetire, CHUNK)) {
    await prisma.$transaction(
      b.map((r) =>
        prisma.observation.update({
          where: {
            seriesId_areaCode_period_retrievedAt: {
              seriesId,
              areaCode: r.areaCode,
              period: r.period,
              retrievedAt: r.retrievedAt,
            },
          },
          data: { isCurrent: false },
        })
      )
    );
  }

  for (const b of chunk(toInsert, CHUNK)) {
    await prisma.observation.createMany({ data: b, skipDuplicates: true });
  }

  return result;
}
