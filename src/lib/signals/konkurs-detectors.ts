// ============================================================
// Signal detectors for KONK3 (declared bankruptcies)
//
// Different from unemployment detectors because:
// - Metric is a COUNT (not a percentage)
// - "Higher is worse" framing
// - Seasonally adjusted vs actual values both available
// - All national-level data (no kommuner here yet)
// ============================================================

import {
  type Signal,
  type DataPoint,
  getLatestPeriod,
  getPeriodOffset,
  humanizePeriod,
  formatNumber,
  filterByArea,
} from "./types";

// ============================================================
// Filter helper: get only seasonally-adjusted national series
// ============================================================
function getSeasonalSeries(points: DataPoint[]): DataPoint[] {
  return filterByArea(points, "NATIONAL")
    .filter((p) => p.value !== null)
    .sort((a, b) => a.periodDate.getTime() - b.periodDate.getTime());
}

function formatCount(value: number): string {
  return Math.round(value).toLocaleString("da-DK");
}

function formatPercentChange(change: number, base: number): string {
  if (base === 0) return "—";
  const pct = (change / base) * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1).replace(".", ",")}%`;
}

// ============================================================
// 1. National change month-over-month — ALWAYS the headline
// ============================================================
export function detectKonkursNationalChange(points: DataPoint[]): Signal[] {
  const series = getSeasonalSeries(points);
  if (series.length < 2) return [];

  const latest = series[series.length - 1];
  const previous = series[series.length - 2];

  if (latest.value === null || previous.value === null) return [];

  const change = latest.value - previous.value;
  const direction = change > 0 ? "up" : change < 0 ? "down" : "stable";

  const verb =
    direction === "up" ? "steg" : direction === "down" ? "faldt" : "var stabil";
  const pctChange = formatPercentChange(change, previous.value);

  return [
    {
      type: "top_mover",
      direction,
      severity: "important",
      headline:
        direction === "stable"
          ? `Antallet af konkurser er stabilt på ${formatCount(latest.value)}`
          : `Antallet af konkurser ${verb} til ${formatCount(latest.value)}`,
      body:
        direction === "stable"
          ? `${humanizePeriod(latest.period)} havde samme antal konkurser som ${humanizePeriod(previous.period)}.`
          : `Fra ${humanizePeriod(previous.period)} til ${humanizePeriod(latest.period)} ${verb} antallet af erklærede konkurser med ${Math.abs(Math.round(change))} (${pctChange}).`,
      period: latest.period,
      magnitude: 100 + Math.abs(change),
      areaCode: null,
      areaName: "Hele landet",
      evidence: {
        latestValue: latest.value,
        previousValue: previous.value,
        change,
        pctChange: (change / previous.value) * 100,
      },
    },
  ];
}

// ============================================================
// 2. Year-over-year comparison
// ============================================================
export function detectKonkursYoY(points: DataPoint[]): Signal[] {
  const series = getSeasonalSeries(points);
  if (series.length < 13) return [];

  const latest = series[series.length - 1];
  const yearAgoIdx = series.length - 13;
  const yearAgo = series[yearAgoIdx];

  if (latest.value === null || yearAgo.value === null) return [];

  const change = latest.value - yearAgo.value;
  const pctChange = (change / yearAgo.value) * 100;

  if (Math.abs(pctChange) < 10) return [];

  const direction: "up" | "down" = change > 0 ? "up" : "down";
  const verb = direction === "up" ? "højere" : "lavere";

  return [
    {
      type: "comparison",
      direction,
      severity: Math.abs(pctChange) >= 25 ? "important" : "note",
      headline: `Antallet af konkurser er ${Math.abs(pctChange).toFixed(0)}% ${verb} end for et år siden`,
      body: `${humanizePeriod(latest.period)} havde ${formatCount(latest.value)} konkurser mod ${formatCount(yearAgo.value)} i ${humanizePeriod(yearAgo.period)}.`,
      period: latest.period,
      magnitude: Math.abs(pctChange),
      areaCode: null,
      areaName: "Hele landet",
      evidence: {
        currentValue: latest.value,
        previousValue: yearAgo.value,
        change,
        pctChange,
      },
    },
  ];
}

// ============================================================
// 3. Streaks: consecutive months in same direction
// ============================================================
export function detectKonkursStreaks(
  points: DataPoint[],
  minLength = 3
): Signal[] {
  const series = getSeasonalSeries(points);
  if (series.length < minLength + 1) return [];

  let streakLength = 0;
  let streakDirection: "up" | "down" | null = null;
  let streakStart: DataPoint | null = null;

  for (let i = series.length - 1; i > 0; i--) {
    const current = series[i].value!;
    const previous = series[i - 1].value!;
    const diff = current - previous;
    const dir: "up" | "down" | "stable" =
      diff > 1 ? "up" : diff < -1 ? "down" : "stable";

    if (dir === "stable") break;
    if (streakDirection === null) {
      streakDirection = dir;
      streakLength = 1;
      streakStart = series[i - 1];
    } else if (dir === streakDirection) {
      streakLength++;
      streakStart = series[i - 1];
    } else {
      break;
    }
  }

  if (streakLength < minLength || !streakDirection || !streakStart) return [];

  const latest = series[series.length - 1];
  const totalChange = latest.value! - streakStart.value!;
  const pctChange = (totalChange / streakStart.value!) * 100;

  const verb = streakDirection === "up" ? "stigning" : "fald";
  const verbed = streakDirection === "up" ? "steget" : "faldet";

  return [
    {
      type: "streak",
      direction: streakDirection,
      severity: streakLength >= 5 ? "important" : "note",
      headline: `${streakLength}. måned i træk med ${verb} i konkurser`,
      body: `Antallet af konkurser er ${verbed} ${streakLength} måneder i træk, samlet ${pctChange > 0 ? "+" : ""}${pctChange.toFixed(0)}% siden ${humanizePeriod(streakStart.period)}.`,
      period: latest.period,
      magnitude: streakLength,
      areaCode: null,
      areaName: "Hele landet",
      evidence: {
        streakLength,
        totalChange,
        pctChange,
        startPeriod: streakStart.period,
        startValue: streakStart.value,
        endValue: latest.value,
      },
    },
  ];
}

// ============================================================
// 4. Records: highest/lowest in N years
// ============================================================
export function detectKonkursRecords(points: DataPoint[]): Signal[] {
  const series = getSeasonalSeries(points);
  if (series.length < 24) return [];

  const latest = series[series.length - 1];
  if (latest.value === null) return [];

  const recent = series.slice(-60);
  const recentValues = recent.map((p) => p.value!);
  const max = Math.max(...recentValues);
  const min = Math.min(...recentValues);

  const signals: Signal[] = [];

  if (latest.value === max && max > 0) {
    const previousAtThisLevel = recent
      .slice(0, -1)
      .filter((p) => p.value! >= max - 0.5);
    if (previousAtThisLevel.length === 0) {
      const yearsBack = Math.floor(recent.length / 12);
      if (yearsBack >= 2) {
        signals.push({
          type: "record",
          direction: "up",
          severity: yearsBack >= 4 ? "important" : "note",
          headline: `Højeste antal konkurser i over ${yearsBack} år`,
          body: `Med ${formatCount(latest.value)} konkurser når ${humanizePeriod(latest.period)} det højeste niveau set siden ${new Date().getFullYear() - yearsBack}.`,
          period: latest.period,
          magnitude: latest.value,
          areaCode: null,
          areaName: "Hele landet",
          evidence: { currentValue: latest.value, type: "high", yearsBack },
        });
      }
    }
  }

  if (latest.value === min) {
    const previousAtThisLevel = recent
      .slice(0, -1)
      .filter((p) => p.value! <= min + 0.5);
    if (previousAtThisLevel.length === 0) {
      const yearsBack = Math.floor(recent.length / 12);
      if (yearsBack >= 2) {
        signals.push({
          type: "record",
          direction: "down",
          severity: yearsBack >= 4 ? "important" : "note",
          headline: `Laveste antal konkurser i over ${yearsBack} år`,
          body: `Med ${formatCount(latest.value)} konkurser når ${humanizePeriod(latest.period)} det laveste niveau set siden ${new Date().getFullYear() - yearsBack}.`,
          period: latest.period,
          magnitude: -latest.value,
          areaCode: null,
          areaName: "Hele landet",
          evidence: { currentValue: latest.value, type: "low", yearsBack },
        });
      }
    }
  }

  return signals;
}

// ============================================================
// 5. Long-term trend (compared to 5-year average)
// ============================================================
export function detectKonkursVsAverage(points: DataPoint[]): Signal[] {
  const series = getSeasonalSeries(points);
  if (series.length < 60) return [];

  const latest = series[series.length - 1];
  if (latest.value === null) return [];

  const recent = series.slice(-60);
  const sum = recent.reduce((acc, p) => acc + (p.value ?? 0), 0);
  const avg = sum / recent.length;

  const diff = latest.value - avg;
  const pctDiff = (diff / avg) * 100;

  if (Math.abs(pctDiff) < 15) return [];

  const direction: "up" | "down" = diff > 0 ? "up" : "down";
  const verb = direction === "up" ? "højere" : "lavere";

  return [
    {
      type: "comparison",
      direction,
      severity: "note",
      headline: `${Math.abs(pctDiff).toFixed(0)}% ${verb} end 5-års gennemsnittet`,
      body: `Det gennemsnitlige antal konkurser de seneste 5 år har været ${formatCount(avg)} pr. måned. ${humanizePeriod(latest.period)} ligger ${verb} med ${formatCount(latest.value)}.`,
      period: latest.period,
      magnitude: Math.abs(pctDiff),
      areaCode: null,
      areaName: "Hele landet",
      evidence: { currentValue: latest.value, average: avg, pctDiff },
    },
  ];
}

// ============================================================
// Main orchestrator
// ============================================================
export function generateKonkursSignals(points: DataPoint[]): Signal[] {
  const allSignals: Signal[] = [
    ...detectKonkursNationalChange(points),
    ...detectKonkursYoY(points),
    ...detectKonkursStreaks(points),
    ...detectKonkursRecords(points),
    ...detectKonkursVsAverage(points),
  ];

  return allSignals.sort((a, b) => {
    const severityRank = { important: 2, note: 1, info: 0 };
    const sevDiff = severityRank[b.severity] - severityRank[a.severity];
    if (sevDiff !== 0) return sevDiff;
    return (b.magnitude ?? 0) - (a.magnitude ?? 0);
  });
}
