// ============================================================
// Find similar kommuner using normalized euclidean distance
//
// Compares kommuner on three normalized dimensions:
//   - Unemployment rate (0..1 normalized)
//   - Disposable income (0..1 normalized)
//   - Population (log-scaled, then 0..1 normalized)
//
// Returns top N most similar kommuner.
// ============================================================

export type KommuneMetrics = {
  code: string;
  name: string;
  slug: string;
  unemployment: number | null;
  income: number | null;
  population: number | null;
};

export type SimilarKommune = {
  code: string;
  name: string;
  slug: string;
  unemployment: number | null;
  income: number | null;
  population: number | null;
  distance: number;
};

/**
 * Returns the N kommuner most similar to the target, based on euclidean
 * distance across normalized unemployment, income, and population.
 *
 * Skip the target itself. Skip kommuner missing any of the three metrics.
 */
export function findSimilarKommuner(
  target: KommuneMetrics,
  all: KommuneMetrics[],
  limit = 3
): SimilarKommune[] {
  // Need at least target's metrics
  if (
    target.unemployment === null ||
    target.income === null ||
    target.population === null
  ) {
    return [];
  }

  // Filter candidates that have all three metrics
  const candidates = all.filter(
    (k) =>
      k.code !== target.code &&
      k.unemployment !== null &&
      k.income !== null &&
      k.population !== null
  );

  if (candidates.length === 0) return [];

  // Compute min/max for each dimension across all candidates (including target)
  const allWithTarget = [target, ...candidates];

  const unemploymentValues = allWithTarget.map((k) => k.unemployment!);
  const incomeValues = allWithTarget.map((k) => k.income!);
  // Use log scale for population because of wide spread (Læsø: 1672, Aarhus: 378k)
  const logPopValues = allWithTarget.map((k) => Math.log(k.population!));

  const minUnemp = Math.min(...unemploymentValues);
  const maxUnemp = Math.max(...unemploymentValues);
  const minIncome = Math.min(...incomeValues);
  const maxIncome = Math.max(...incomeValues);
  const minLogPop = Math.min(...logPopValues);
  const maxLogPop = Math.max(...logPopValues);

  const rangeUnemp = maxUnemp - minUnemp || 1;
  const rangeIncome = maxIncome - minIncome || 1;
  const rangeLogPop = maxLogPop - minLogPop || 1;

  // Normalize target
  const tUnemp = (target.unemployment - minUnemp) / rangeUnemp;
  const tIncome = (target.income - minIncome) / rangeIncome;
  const tLogPop = (Math.log(target.population) - minLogPop) / rangeLogPop;

  // Calculate distance to each candidate
  const withDistance: SimilarKommune[] = candidates.map((k) => {
    const cUnemp = (k.unemployment! - minUnemp) / rangeUnemp;
    const cIncome = (k.income! - minIncome) / rangeIncome;
    const cLogPop = (Math.log(k.population!) - minLogPop) / rangeLogPop;

    const distance = Math.sqrt(
      Math.pow(tUnemp - cUnemp, 2) +
        Math.pow(tIncome - cIncome, 2) +
        Math.pow(tLogPop - cLogPop, 2)
    );

    return {
      code: k.code,
      name: k.name,
      slug: k.slug,
      unemployment: k.unemployment,
      income: k.income,
      population: k.population,
      distance,
    };
  });

  // Sort ascending by distance, take top N
  withDistance.sort((a, b) => a.distance - b.distance);
  return withDistance.slice(0, limit);
}
