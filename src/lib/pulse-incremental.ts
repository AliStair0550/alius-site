// ============================================================
// Hvor langt tilbage en daglig hentning skal se
//
// Det inkrementelle job henter ikke "alt siden sidste observation".
// Det ville være forkert, og fejlen ville være usynlig.
//
// GRUNDEN: kilderne reviderer. DST retter tal måneder efter første
// publicering, og en hentning der starter ved vores nyeste periode
// ville aldrig se rettelsen. Databasen ville blive stående med det
// første tal, revisionsloggen ville være tom, og alt ville se rigtigt
// ud. Det er ikke tabt information, det er et forkert tal der ligner
// et rigtigt.
//
// Derfor et TILBAGEBLIK, ikke et startpunkt: hver kørsel henter et
// vindue der rækker bagud forbi det vi allerede har, så en revision
// inden for vinduet bliver fanget og logget som revision.
//
// GRÆNSEN, sagt højt: en revision ÆLDRE end tilbageblikket fanges
// ikke af det daglige job. Den fanges kun af scripts/backfill.ts, som
// henter hele historikken. Det er en bevidst afvejning, ikke en
// forglemmelse: DNVALD har 12.506 daglige perioder, og at hente dem
// hver dag for at fange en revision fra 2019 er ikke prisen værd.
// ============================================================

import type { SeriesFrequency, RevisionPolicy } from "@prisma/client";

/**
 * Dage tilbage per frekvens.
 *
 * Tallene er sat efter hvor lang tid der går før en periode regnes som
 * endelig hos kilderne, ikke efter hvad der er hurtigt.
 *
 *   DAILY      Kurser og priser rettes sjældent, og aldrig sent. To
 *              måneder dækker helligdagshuller og forsinkede noteringer.
 *   WEEKLY     Fire måneder. Ugetal er få og billige at hente.
 *   MONTHLY    450 dage. Skal række forbi samme måned sidste år, fordi
 *              årsændringen bruger den, og en revision af den gamle
 *              måned flytter det tal vi viser i dag.
 *   QUARTERLY  Tre år. Kvartalstal revideres længst, og der er kun
 *              tolv perioder på tre år.
 *   YEARLY     Fem år. Samme argument, endnu færre perioder.
 */
export const TILBAGEBLIK_DAGE: Record<SeriesFrequency, number> = {
  DAILY: 60,
  WEEKLY: 120,
  MONTHLY: 450,
  QUARTERLY: 1100,
  YEARLY: 1825,
};

/**
 * Serier kilden reviderer kraftigt får dobbelt tilbageblik.
 *
 * MAJOR betyder at tallet flyttes væsentligt efter publicering, ikke at
 * det pudses på sjette decimal. For dem er det billigere at hente for
 * meget end at stå med et forældet tal på forsiden.
 */
export const MAJOR_FAKTOR = 2;

export function tilbageblikDage(
  frequency: SeriesFrequency,
  revisionPolicy: RevisionPolicy
): number {
  const basis = TILBAGEBLIK_DAGE[frequency];
  return revisionPolicy === "MAJOR" ? basis * MAJOR_FAKTOR : basis;
}

/**
 * Første periode den daglige hentning skal bede kilden om.
 *
 * Bemærk at den IKKE afhænger af hvad vi allerede har. En hentning der
 * startede ved vores nyeste periode ville være hurtigere og ville aldrig
 * se en revision. Vinduet er fast, så det samme bliver hentet igen hver
 * dag, og writeObservations afgør hvad der er nyt.
 */
export function hentFra(
  frequency: SeriesFrequency,
  revisionPolicy: RevisionPolicy,
  nu: Date = new Date()
): Date {
  const dage = tilbageblikDage(frequency, revisionPolicy);
  return new Date(nu.getTime() - dage * 86_400_000);
}

/**
 * Hvor gammel må seriens nyeste observation være, før det er værd at
 * sige noget om.
 *
 * Ikke en alarm. Stale-alarmen i pulse-stale.ts er alarmen. Det her er
 * kun så den daglige log kan skelne "kilden har ikke publiceret nyt"
 * fra "vi hentede ikke". De to ser ens ud i databasen.
 */
export function forventetFriskhedDage(
  frequency: SeriesFrequency,
  expectedLagDays: number
): number {
  const periode: Record<SeriesFrequency, number> = {
    DAILY: 1,
    WEEKLY: 7,
    MONTHLY: 31,
    QUARTERLY: 92,
    YEARLY: 366,
  };
  return periode[frequency] + expectedLagDays;
}
