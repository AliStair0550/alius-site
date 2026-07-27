// ============================================================
// Regler for hvad der må beregnes på en serie
//
// Der er forskel på at vise en serie og at regne mønstre på den.
// Denne fil samler de to regler der afgør forskellen, så de findes
// ét sted og ikke bliver genopfundet i hver detektor.
// ============================================================

import type { SeriesLayer, SeriesStatus } from "@prisma/client";

export type AnalysableSeries = {
  id: string;
  layer: SeriesLayer;
  status: SeriesStatus;
  breakAt: Date | null;
  breakReason?: string | null;
};

/**
 * Første periode der må indgå i en mønsterberegning.
 *
 * Null betyder "hele serien". Ellers er det bruddatoen: alt før den
 * måler noget andet end alt efter, og en beregning der krydser den
 * læser definitionsændringen som en bevægelse i virkeligheden.
 *
 * Serien skal stadig vises i fuld længde. Det er kun z-scores,
 * gennemsnit, standardafvigelser, streaks og lignende der skal
 * afgrænses.
 */
export function analysisStart(series: AnalysableSeries): Date | null {
  return series.breakAt;
}

/**
 * Skærer en tidsserie ned til det der må regnes på.
 * Punkter før bruddet kasseres, ikke fordi de er forkerte, men fordi
 * de ikke er sammenlignelige med resten.
 */
export function withinAnalysisWindow<T extends { period: Date }>(
  series: AnalysableSeries,
  points: T[]
): T[] {
  const start = analysisStart(series);
  if (!start) return points;
  return points.filter((p) => p.period >= start);
}

/**
 * Må serien overhovedet konkurrere om en plads på ranglisten.
 *
 * To grunde til nej:
 *
 *   - Lukket serie. Den opdateres aldrig igen, så dens seneste
 *     bevægelse er per definition gammel. KONK4's 20 brancheserier
 *     er sådan nogle: de bevares i fuld længde og må gerne vises,
 *     men de må ikke kunne udløse et signal.
 *   - STRUCTURAL. Bestandstal er kontekst på kommuneprofilen, ikke
 *     ugentligt signal. Ingen handler på et befolkningstal i dette
 *     kvartal, og hvis de får lov at konkurrere, fylder de pladser
 *     på forsiden.
 */
export function isRankable(series: AnalysableSeries): boolean {
  if (series.status === "CLOSED") return false;
  if (series.layer === "STRUCTURAL") return false;
  return true;
}

/**
 * Har serien for lidt sammenhængende historik til en z-score?
 *
 * Et brud nulstiller reelt historikken. En serie med brud sidste år
 * har ikke ti års sammenlignelige tal, uanset hvor lang den ser ud.
 */
export function hasEnoughHistoryForZScore(
  series: AnalysableSeries,
  earliestPeriod: Date,
  now: Date = new Date(),
  minYears = 5
): boolean {
  const start = analysisStart(series) ?? earliestPeriod;
  const years = (now.getTime() - start.getTime()) / (365.25 * 24 * 3600 * 1000);
  return years >= minYears;
}
