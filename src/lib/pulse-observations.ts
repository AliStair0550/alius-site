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
 * Sammenligner på seks decimaler, som er kolonnens præcision.
 * Uden det ville en float-repræsentation kunne se ud som en revision.
 */
function differs(a: Prisma.Decimal | null, b: number | null): boolean {
  if (a === null && b === null) return false;
  if (a === null || b === null) return true;
  return a.toDecimalPlaces(6).toString() !== new Prisma.Decimal(b).toDecimalPlaces(6).toString();
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
