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
  rankable: boolean;
  rankableReason?: string | null;
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
 * Må serien konkurrere om en plads på ranglisten.
 *
 * Læser KUN feltet. Den udleder ikke selv af lag eller status, fordi to
 * steder der beregner det samme før eller siden er uenige. Feltet sættes
 * ved indlæsning af defaultRankable() nedenfor, og kan derefter
 * overskrives manuelt for enkelte serier.
 */
export function isRankable(series: AnalysableSeries): boolean {
  return series.rankable;
}

/**
 * Standardværdien for rankable, sat når en serie skrives.
 *
 * To tilfælde sætter det automatisk til false:
 *
 *   - CLOSED. Serien opdateres aldrig igen, så dens seneste bevægelse er
 *     per definition gammel. KONK4's 20 brancheserier og FORV1's F11 er
 *     sådan nogle: bevaret i fuld længde, vises gerne, kan aldrig udløse
 *     et signal.
 *   - STRUCTURAL. Bestandstal er kontekst på kommuneprofilen, ikke
 *     ugentligt signal. Ingen handler på et befolkningstal i dette
 *     kvartal.
 *
 * Alt andet er rangerbart som udgangspunkt og kan slås fra manuelt.
 */
export function defaultRankable(
  layer: SeriesLayer,
  status: SeriesStatus
): { rankable: boolean; reason: string | null } {
  if (status === "CLOSED") {
    return { rankable: false, reason: "Lukket serie. Opdateres aldrig igen." };
  }
  if (layer === "STRUCTURAL") {
    return {
      rankable: false,
      reason: "Bestandstal. Kontekst på kommuneprofilen, ikke ugentligt signal.",
    };
  }
  return { rankable: true, reason: null };
}

/**
 * Værn mod at feltet og de to automatiske regler kommer i utakt.
 * En lukket eller strukturel serie må aldrig være rangerbar, uanset hvad
 * nogen har sat manuelt.
 */
export function rankableIsConsistent(series: AnalysableSeries): boolean {
  if (!series.rankable) return true; // manuelt fravalg er altid lovligt
  return series.status !== "CLOSED" && series.layer !== "STRUCTURAL";
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
