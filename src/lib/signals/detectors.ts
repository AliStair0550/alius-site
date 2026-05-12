// ============================================================
// Signal detectors for unemployment data
//
// Each detector is a pure function that takes datapoints and returns
// zero or more signals. They look for specific patterns:
//
// 1. detectNationalChange - latest month vs previous, national level
// 2. detectTopMovers - kommuner with biggest change since last month
// 3. detectRecords - all-time high/low values
// 4. detectStreaks - consecutive months of same direction
// 5. detectExtremes - kommuner with highest/lowest absolute values
// 6. detectYearOverYear - comparison to same month last year
// 7. detectVsNational - kommuner deviating most from national average
// 8. detectTurningPoints - direction reversals after long trends
// ============================================================

import {
  type Signal,
  type DataPoint,
  getLatestPeriod,
  getPeriodOffset,
  humanizePeriod,
  formatPercent,
  formatPercentagePoints,
  formatNumber,
  filterByArea,
  filterByPeriod,
  groupByArea,
  getValue,
  calculateChange,
} from "./types";

export type { DataPoint } from "./types";

// ============================================================
// 1. National-level month-over-month change
// ============================================================
export function detectNationalChange(points: DataPoint[]): Signal[] {
  const national = filterByArea(points, "NATIONAL");
  const latest = getLatestPeriod(national);
  const previous = getPeriodOffset(national, 1);
  if (!latest || !previous) return [];

  const change = calculateChange(national, "000", previous, latest);
  const latestValue = getValue(national, "000", latest);
  if (change === null || latestValue === null) return [];

  const direction = change > 0.05 ? "up" : change < -0.05 ? "down" : "stable";
  const verb =
    direction === "up" ? "steg" : direction === "down" ? "faldt" : "var stabil";

  return [
    {
      type: "top_mover",
      direction,
      severity: "important",
      headline:
        direction === "stable"
          ? `Ledigheden er stabil på ${formatPercent(latestValue)} på landsplan`
          : `Ledigheden ${verb} til ${formatPercent(latestValue)} på landsplan`,
      body:
        direction === "stable"
          ? `Ledigheden i ${humanizePeriod(latest)} var uændret fra ${humanizePeriod(previous)}.`
          : `Ledigheden ${verb} med ${formatNumber(Math.abs(change))} pp fra ${humanizePeriod(previous)} til ${humanizePeriod(latest)}.`,
      period: latest,
      magnitude: 100 + Math.abs(change),
      areaCode: "000",
      areaName: "Hele landet",
      evidence: {
        latestValue,
        previousValue: latestValue - change,
        change,
        fromPeriod: previous,
        toPeriod: latest,
      },
    },
  ];
}

// ============================================================
// 2. Top movers among kommuner (biggest month-over-month change)
// ============================================================
export function detectTopMovers(points: DataPoint[], maxSignals = 4): Signal[] {
  const kommuner = filterByArea(points, "KOMMUNE");
  const latest = getLatestPeriod(kommuner);
  const previous = getPeriodOffset(kommuner, 1);
  if (!latest || !previous) return [];

  const grouped = groupByArea(kommuner);
  const changes: Array<{
    areaCode: string;
    areaName: string;
    change: number;
    latestValue: number;
  }> = [];

  for (const [code, series] of grouped) {
    const latestPoint = series.find((p) => p.period === latest);
    const previousPoint = series.find((p) => p.period === previous);
    if (
      !latestPoint?.value ||
      !previousPoint?.value ||
      !latestPoint.areaName
    ) {
      continue;
    }
    changes.push({
      areaCode: code,
      areaName: latestPoint.areaName,
      change: latestPoint.value - previousPoint.value,
      latestValue: latestPoint.value,
    });
  }

  // Sort by absolute change descending
  changes.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

  const signals: Signal[] = [];
  const seenAreas = new Set<string>();
  let increases = 0;
  let decreases = 0;

  for (const c of changes) {
    if (signals.length >= maxSignals) break;
    if (seenAreas.has(c.areaCode)) continue;
    // We want balanced view: at least one up and one down if both exist
    if (c.change > 0 && increases >= maxSignals - 1) continue;
    if (c.change < 0 && decreases >= maxSignals - 1) continue;
    // Filter out tiny changes
    if (Math.abs(c.change) < 0.1) break;

    seenAreas.add(c.areaCode);
    const direction: "up" | "down" = c.change > 0 ? "up" : "down";
    const verb = direction === "up" ? "steg" : "faldt";
    if (direction === "up") increases++;
    else decreases++;

    signals.push({
      type: "top_mover",
      direction,
      severity: Math.abs(c.change) >= 0.5 ? "important" : "note",
      headline: `Ledigheden ${verb} mest i ${c.areaName} (${formatPercentagePoints(c.change)})`,
      body: `Fra ${humanizePeriod(previous)} til ${humanizePeriod(latest)} ${verb} ledigheden i ${c.areaName} fra ${formatPercent(c.latestValue - c.change)} til ${formatPercent(c.latestValue)}.`,
      period: latest,
      magnitude: Math.abs(c.change),
      areaCode: c.areaCode,
      areaName: c.areaName,
      evidence: {
        change: c.change,
        latestValue: c.latestValue,
        previousValue: c.latestValue - c.change,
        fromPeriod: previous,
        toPeriod: latest,
      },
    });
  }

  return signals;
}

// ============================================================
// 3. Records: kommuner at all-time high or low
// ============================================================
export function detectRecords(points: DataPoint[], maxSignals = 3): Signal[] {
  const kommuner = filterByArea(points, "KOMMUNE");
  const latest = getLatestPeriod(kommuner);
  if (!latest) return [];

  const grouped = groupByArea(kommuner);
  const records: Array<{
    areaCode: string;
    areaName: string;
    value: number;
    type: "high" | "low";
    yearsBack: number;
  }> = [];

  for (const [code, series] of grouped) {
    const latestPoint = series.find((p) => p.period === latest);
    if (!latestPoint?.value || !latestPoint.areaName) continue;

    // Look at the last 60 months (5 years)
    const recentSeries = series
      .filter((p) => p.value !== null)
      .slice(-60);

    if (recentSeries.length < 24) continue; // need at least 2 years of data

    const allValues = recentSeries.map((p) => p.value!);
    const max = Math.max(...allValues);
    const min = Math.min(...allValues);

    if (latestPoint.value === max && max > 0) {
      // How many months back was the last time we saw this value?
      const previousAtThisLevel = recentSeries
        .slice(0, -1)
        .filter((p) => p.value !== null && p.value >= max - 0.01);
      const yearsBack = previousAtThisLevel.length === 0
        ? Math.floor(recentSeries.length / 12)
        : 0;
      if (yearsBack >= 2) {
        records.push({
          areaCode: code,
          areaName: latestPoint.areaName,
          value: latestPoint.value,
          type: "high",
          yearsBack,
        });
      }
    }

    if (latestPoint.value === min) {
      const previousAtThisLevel = recentSeries
        .slice(0, -1)
        .filter((p) => p.value !== null && p.value <= min + 0.01);
      const yearsBack = previousAtThisLevel.length === 0
        ? Math.floor(recentSeries.length / 12)
        : 0;
      if (yearsBack >= 2) {
        records.push({
          areaCode: code,
          areaName: latestPoint.areaName,
          value: latestPoint.value,
          type: "low",
          yearsBack,
        });
      }
    }
  }

  // Sort by years back descending — longest streaks are more newsworthy
  records.sort((a, b) => b.yearsBack - a.yearsBack);

  return records.slice(0, maxSignals).map((r) => ({
    type: "record" as const,
    direction: r.type === "high" ? ("up" as const) : ("down" as const),
    severity: r.yearsBack >= 5 ? ("important" as const) : ("note" as const),
    headline:
      r.type === "high"
        ? `${r.areaName} har højeste ledighed i over ${r.yearsBack} år`
        : `${r.areaName} har laveste ledighed i over ${r.yearsBack} år`,
    body: `Med ${formatPercent(r.value)} ligger ${r.areaName} nu på det ${r.type === "high" ? "højeste" : "laveste"} niveau set i tabellen siden ${new Date().getFullYear() - r.yearsBack}.`,
    period: latest,
    magnitude: r.value,
    areaCode: r.areaCode,
    areaName: r.areaName,
    evidence: {
      currentValue: r.value,
      type: r.type,
      yearsBack: r.yearsBack,
    },
  }));
}

// ============================================================
// 4. Streaks: consecutive months in same direction
// ============================================================
export function detectStreaks(points: DataPoint[], minLength = 4): Signal[] {
  const national = filterByArea(points, "NATIONAL")
    .filter((p) => p.areaCode === "000" && p.value !== null)
    .sort((a, b) => a.periodDate.getTime() - b.periodDate.getTime());

  if (national.length < minLength + 1) return [];

  // Count back from latest to find current streak
  let streakLength = 0;
  let streakDirection: "up" | "down" | null = null;
  let streakStart: DataPoint | null = null;

  for (let i = national.length - 1; i > 0; i--) {
    const current = national[i].value!;
    const previous = national[i - 1].value!;
    const diff = current - previous;
    const dir: "up" | "down" | "stable" =
      diff > 0.02 ? "up" : diff < -0.02 ? "down" : "stable";

    if (dir === "stable") break;
    if (streakDirection === null) {
      streakDirection = dir;
      streakLength = 1;
      streakStart = national[i - 1];
    } else if (dir === streakDirection) {
      streakLength++;
      streakStart = national[i - 1];
    } else {
      break;
    }
  }

  if (streakLength < minLength || !streakDirection || !streakStart) return [];

  const latest = national[national.length - 1];
  const totalChange = latest.value! - streakStart.value!;

  const verb = streakDirection === "up" ? "stigning" : "fald";

  return [
    {
      type: "streak",
      direction: streakDirection,
      severity: streakLength >= 6 ? "important" : "note",
      headline: `${streakLength}. måned i træk med ${verb} på landsplan`,
      body: `Ledigheden er ${verb === "stigning" ? "steget" : "faldet"} ${streakLength} måneder i træk, samlet ${formatPercentagePoints(totalChange)} siden ${humanizePeriod(streakStart.period)}.`,
      period: latest.period,
      magnitude: streakLength,
      areaCode: "000",
      areaName: "Hele landet",
      evidence: {
        streakLength,
        totalChange,
        startPeriod: streakStart.period,
        startValue: streakStart.value,
        endValue: latest.value,
      },
    },
  ];
}

// ============================================================
// 5. Extremes: highest and lowest absolute values among kommuner
// ============================================================
export function detectExtremes(points: DataPoint[]): Signal[] {
  const kommuner = filterByArea(points, "KOMMUNE");
  const latest = getLatestPeriod(kommuner);
  if (!latest) return [];

  const latestPoints = filterByPeriod(kommuner, latest).filter(
    (p) => p.value !== null && p.areaName !== null
  );
  if (latestPoints.length === 0) return [];

  const sorted = [...latestPoints].sort((a, b) => b.value! - a.value!);
  const highest = sorted[0];
  const lowest = sorted[sorted.length - 1];

  if (!highest.areaName || !lowest.areaName) return [];

  return [
    {
      type: "comparison",
      direction: "up",
      severity: "note",
      headline: `${highest.areaName} har landets højeste ledighed (${formatPercent(highest.value!)})`,
      body: `Til sammenligning ligger landsgennemsnittet på ${formatPercent(getValue(filterByArea(points, "NATIONAL"), "000", latest) ?? 0)}.`,
      period: latest,
      magnitude: highest.value,
      areaCode: highest.areaCode,
      areaName: highest.areaName,
      evidence: { rank: 1, value: highest.value, period: latest },
    },
    {
      type: "comparison",
      direction: "down",
      severity: "note",
      headline: `${lowest.areaName} har landets laveste ledighed (${formatPercent(lowest.value!)})`,
      body: `Til sammenligning ligger landsgennemsnittet på ${formatPercent(getValue(filterByArea(points, "NATIONAL"), "000", latest) ?? 0)}.`,
      period: latest,
      magnitude: lowest.value,
      areaCode: lowest.areaCode,
      areaName: lowest.areaName,
      evidence: {
        rank: sorted.length,
        value: lowest.value,
        period: latest,
      },
    },
  ];
}

// ============================================================
// 6. Year-over-year: comparison to same month last year
// ============================================================
export function detectYearOverYear(points: DataPoint[]): Signal[] {
  const national = filterByArea(points, "NATIONAL");
  const latest = getLatestPeriod(national);
  const yearAgo = getPeriodOffset(national, 12);
  if (!latest || !yearAgo) return [];

  const change = calculateChange(national, "000", yearAgo, latest);
  const latestValue = getValue(national, "000", latest);
  if (change === null || latestValue === null) return [];

  // Only worth signaling if change is meaningful
  if (Math.abs(change) < 0.15) return [];

  const direction: "up" | "down" = change > 0 ? "up" : "down";
  const verb = direction === "up" ? "højere" : "lavere";

  return [
    {
      type: "comparison",
      direction,
      severity: Math.abs(change) >= 0.5 ? "important" : "note",
      headline: `Ledigheden er ${formatPercentagePoints(Math.abs(change)).replace("+", "")} ${verb} end for et år siden`,
      body: `På landsplan ligger ledigheden nu på ${formatPercent(latestValue)} mod ${formatPercent(latestValue - change)} i ${humanizePeriod(yearAgo)}.`,
      period: latest,
      magnitude: Math.abs(change),
      areaCode: "000",
      areaName: "Hele landet",
      evidence: {
        currentValue: latestValue,
        previousValue: latestValue - change,
        change,
        fromPeriod: yearAgo,
        toPeriod: latest,
      },
    },
  ];
}

// ============================================================
// 7. Vs national: kommuner deviating most from national average
// ============================================================
export function detectVsNational(points: DataPoint[]): Signal[] {
  const kommuner = filterByArea(points, "KOMMUNE");
  const national = filterByArea(points, "NATIONAL");
  const latest = getLatestPeriod(kommuner);
  if (!latest) return [];

  const nationalValue = getValue(national, "000", latest);
  if (nationalValue === null) return [];

  const latestKommuner = filterByPeriod(kommuner, latest).filter(
    (p) => p.value !== null && p.areaName !== null
  );

  const deviations = latestKommuner.map((p) => ({
    areaCode: p.areaCode!,
    areaName: p.areaName!,
    value: p.value!,
    deviation: p.value! - nationalValue,
  }));

  // Find biggest positive and negative deviation
  deviations.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));

  // Skip if biggest deviation is small (less than 1pp)
  if (deviations.length === 0 || Math.abs(deviations[0].deviation) < 1) {
    return [];
  }

  // Take the most extreme deviation in either direction
  const topPositive = deviations.find((d) => d.deviation > 0);
  const topNegative = deviations.find((d) => d.deviation < 0);

  const signals: Signal[] = [];
  if (topPositive && topPositive.deviation >= 1.5) {
    signals.push({
      type: "comparison",
      direction: "up",
      severity: "note",
      headline: `${topPositive.areaName} ligger ${formatPercentagePoints(topPositive.deviation).replace("+", "")} over landsgennemsnittet`,
      body: `Med ${formatPercent(topPositive.value)} har ${topPositive.areaName} markant højere ledighed end landsgennemsnittet på ${formatPercent(nationalValue)}.`,
      period: latest,
      magnitude: topPositive.deviation,
      areaCode: topPositive.areaCode,
      areaName: topPositive.areaName,
      evidence: {
        kommunValue: topPositive.value,
        nationalValue,
        deviation: topPositive.deviation,
      },
    });
  }
  if (topNegative && Math.abs(topNegative.deviation) >= 1.5) {
    signals.push({
      type: "comparison",
      direction: "down",
      severity: "note",
      headline: `${topNegative.areaName} ligger ${formatPercentagePoints(Math.abs(topNegative.deviation)).replace("+", "")} under landsgennemsnittet`,
      body: `Med ${formatPercent(topNegative.value)} har ${topNegative.areaName} markant lavere ledighed end landsgennemsnittet på ${formatPercent(nationalValue)}.`,
      period: latest,
      magnitude: Math.abs(topNegative.deviation),
      areaCode: topNegative.areaCode,
      areaName: topNegative.areaName,
      evidence: {
        kommunValue: topNegative.value,
        nationalValue,
        deviation: topNegative.deviation,
      },
    });
  }
  return signals;
}

// ============================================================
// 8. Turning points: direction reversal after a long trend
// ============================================================
export function detectTurningPoints(points: DataPoint[]): Signal[] {
  const national = filterByArea(points, "NATIONAL")
    .filter((p) => p.areaCode === "000" && p.value !== null)
    .sort((a, b) => a.periodDate.getTime() - b.periodDate.getTime());

  if (national.length < 8) return [];

  // Look at last 6 months: if previous 3 went one way and last 3 went the other, that's a turning point
  const recent = national.slice(-6);
  if (recent.length < 6) return [];

  const firstHalf = recent.slice(0, 3);
  const secondHalf = recent.slice(3);

  const firstTrend = trendDirection(firstHalf.map((p) => p.value!));
  const secondTrend = trendDirection(secondHalf.map((p) => p.value!));

  if (
    firstTrend !== null &&
    secondTrend !== null &&
    firstTrend !== secondTrend &&
    firstTrend !== "stable" &&
    secondTrend !== "stable"
  ) {
    const latest = recent[recent.length - 1];
    const previousTrendWord = firstTrend === "up" ? "stigninger" : "fald";
    const newTrendWord = secondTrend === "up" ? "stigning" : "fald";

    return [
      {
        type: "turning_point",
        direction: secondTrend,
        severity: "important",
        headline: `Tendens vendt: ${newTrendWord} efter måneder med ${previousTrendWord}`,
        body: `Efter tre måneder med ${previousTrendWord} har ledigheden nu skiftet retning. ${humanizePeriod(latest.period)} markerer den tredje måned i træk med ${newTrendWord === "stigning" ? "stigende" : "faldende"} ledighed.`,
        period: latest.period,
        magnitude: Math.abs(latest.value! - firstHalf[0].value!),
        areaCode: "000",
        areaName: "Hele landet",
        evidence: {
          firstTrend,
          secondTrend,
          recentValues: recent.map((p) => ({ period: p.period, value: p.value })),
        },
      },
    ];
  }

  return [];
}

function trendDirection(values: number[]): "up" | "down" | "stable" | null {
  if (values.length < 2) return null;
  const first = values[0];
  const last = values[values.length - 1];
  const diff = last - first;
  if (Math.abs(diff) < 0.05) return "stable";
  return diff > 0 ? "up" : "down";
}

// ============================================================
// Main: run all detectors and produce a ranked list
// ============================================================
export function generateAllSignals(points: DataPoint[]): Signal[] {
  const allSignals: Signal[] = [
    ...detectNationalChange(points),
    ...detectTopMovers(points),
    ...detectRecords(points),
    ...detectStreaks(points),
    ...detectExtremes(points),
    ...detectYearOverYear(points),
    ...detectVsNational(points),
    ...detectTurningPoints(points),
  ];

  // Rank: important first, then by magnitude
  return allSignals.sort((a, b) => {
    const severityRank = { important: 2, note: 1, info: 0 };
    const sevDiff = severityRank[b.severity] - severityRank[a.severity];
    if (sevDiff !== 0) return sevDiff;
    return (b.magnitude ?? 0) - (a.magnitude ?? 0);
  });
}
