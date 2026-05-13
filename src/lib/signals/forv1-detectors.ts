// ============================================================
// Signal detectors for FORV1 (consumer confidence / forbrugertillid)
//
// Data structure:
//   areaCode = INDIKATOR code (F1–F13), areaType = NATIONAL, monthly periods
//   F1 = headline net balance (positive = optimistic majority, negative = pessimistic)
//   Values are percentages — higher is better.
// ============================================================

import {
  type Signal,
  type DataPoint,
  humanizePeriod,
  formatNumber,
} from "./types";

const MAIN_INDICATOR = "F1";
const MIN_CHANGE_PP = 0.5;

function getF1Series(points: DataPoint[]): DataPoint[] {
  return points
    .filter((p) => p.areaCode === MAIN_INDICATOR && p.value !== null)
    .sort((a, b) => a.periodDate.getTime() - b.periodDate.getTime());
}

function formatBalance(v: number): string {
  const s = Math.abs(v).toFixed(1).replace(".", ",");
  return v >= 0 ? `+${s}` : `−${s}`;
}

// ============================================================
// 1. Month-over-month change
// ============================================================
export function detectForv1Change(points: DataPoint[]): Signal[] {
  const series = getF1Series(points);
  if (series.length < 2) return [];

  const latest = series[series.length - 1];
  const previous = series[series.length - 2];
  if (latest.value === null || previous.value === null) return [];

  const change = latest.value - previous.value;

  if (Math.abs(change) < MIN_CHANGE_PP) {
    return [
      {
        type: "top_mover",
        direction: "stable",
        severity: "note",
        headline: `Forbrugertilliden er stabil på ${formatBalance(latest.value)} i ${humanizePeriod(latest.period)}`,
        body: `Nettotallet for forbrugertillid (F1) er uændret fra ${humanizePeriod(previous.period)}.`,
        period: latest.period,
        magnitude: 100,
        areaCode: null,
        areaName: "Hele landet",
        evidence: { latestValue: latest.value, previousValue: previous.value, change },
      },
    ];
  }

  const direction: "up" | "down" = change > 0 ? "up" : "down";
  const verb = direction === "up" ? "steg" : "faldt";
  const sentiment =
    latest.value >= 0 ? "i optimistisk territorium" : "i pessimistisk territorium";

  return [
    {
      type: "top_mover",
      direction,
      severity: Math.abs(change) >= 3 ? "important" : "note",
      headline: `Forbrugertilliden ${verb} til ${formatBalance(latest.value)} i ${humanizePeriod(latest.period)}`,
      body: `Net-balance-indikatoren (F1) ${verb} med ${formatNumber(Math.abs(change))} pp fra ${humanizePeriod(previous.period)}. Nettallet er nu ${sentiment}.`,
      period: latest.period,
      magnitude: 100 + Math.abs(change),
      areaCode: null,
      areaName: "Hele landet",
      evidence: { latestValue: latest.value, previousValue: previous.value, change },
    },
  ];
}

// ============================================================
// 2. Year-over-year comparison
// ============================================================
export function detectForv1YoY(points: DataPoint[]): Signal[] {
  const series = getF1Series(points);
  if (series.length < 13) return [];

  const latest = series[series.length - 1];
  const yearAgo = series[series.length - 13];
  if (latest.value === null || yearAgo.value === null) return [];

  const change = latest.value - yearAgo.value;
  if (Math.abs(change) < 3) return [];

  const direction: "up" | "down" = change > 0 ? "up" : "down";
  const verb = direction === "up" ? "bedre" : "dårligere";

  return [
    {
      type: "comparison",
      direction,
      severity: Math.abs(change) >= 8 ? "important" : "note",
      headline: `Forbrugertilliden er ${formatNumber(Math.abs(change), 0)} pp ${verb} end for et år siden`,
      body: `I ${humanizePeriod(latest.period)} er F1-nettallet ${formatBalance(latest.value)} mod ${formatBalance(yearAgo.value)} i ${humanizePeriod(yearAgo.period)}.`,
      period: latest.period,
      magnitude: Math.abs(change),
      areaCode: null,
      areaName: "Hele landet",
      evidence: { currentValue: latest.value, previousValue: yearAgo.value, change },
    },
  ];
}

// ============================================================
// 3. Consecutive-month streak in same direction
// ============================================================
export function detectForv1Streak(points: DataPoint[], minLength = 3): Signal[] {
  const series = getF1Series(points);
  if (series.length < minLength + 1) return [];

  let streakLength = 0;
  let streakDirection: "up" | "down" | null = null;
  let streakStart: DataPoint | null = null;

  for (let i = series.length - 1; i > 0; i--) {
    const curr = series[i].value!;
    const prev = series[i - 1].value!;
    const diff = curr - prev;
    const dir = diff > 0.5 ? "up" : diff < -0.5 ? "down" : null;

    if (dir === null) break;
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
  const verb = streakDirection === "up" ? "fremgang" : "tilbagegang";
  const verbed = streakDirection === "up" ? "forbedret" : "forværret";

  return [
    {
      type: "streak",
      direction: streakDirection,
      severity: streakLength >= 5 ? "important" : "note",
      headline: `${streakLength}. måned i træk med ${verb} i forbrugertillid`,
      body: `Forbrugertilliden (F1) er ${verbed} ${streakLength} måneder i træk, fra ${formatBalance(streakStart.value!)} til ${formatBalance(latest.value!)} i ${humanizePeriod(latest.period)}.`,
      period: latest.period,
      magnitude: streakLength,
      areaCode: null,
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
// 4. Zero crossing — sentiment switches between positive and negative
// ============================================================
export function detectForv1ZeroCrossing(points: DataPoint[]): Signal[] {
  const series = getF1Series(points);
  if (series.length < 2) return [];

  const latest = series[series.length - 1];
  const previous = series[series.length - 2];
  if (latest.value === null || previous.value === null) return [];

  if (previous.value >= 0 && latest.value < 0) {
    return [
      {
        type: "turning_point",
        direction: "down",
        severity: "important",
        headline: `Forbrugertilliden er vendt negativ i ${humanizePeriod(latest.period)}`,
        body: `Nettallet (F1) faldt fra ${formatBalance(previous.value)} til ${formatBalance(latest.value)}. Et negativt tal betyder, at pessimister overstiger optimister.`,
        period: latest.period,
        magnitude: Math.abs(latest.value),
        areaCode: null,
        areaName: "Hele landet",
        evidence: { previousValue: previous.value, latestValue: latest.value, crossedZero: true },
      },
    ];
  }

  if (previous.value < 0 && latest.value >= 0) {
    return [
      {
        type: "turning_point",
        direction: "up",
        severity: "important",
        headline: `Forbrugertilliden er vendt positiv i ${humanizePeriod(latest.period)}`,
        body: `Nettallet (F1) steg fra ${formatBalance(previous.value)} til ${formatBalance(latest.value)}. Et positivt tal betyder, at optimister nu overstiger pessimister.`,
        period: latest.period,
        magnitude: latest.value,
        areaCode: null,
        areaName: "Hele landet",
        evidence: { previousValue: previous.value, latestValue: latest.value, crossedZero: true },
      },
    ];
  }

  return [];
}

// ============================================================
// 5. Turning point — trend reversal over last 6 months
// ============================================================
export function detectForv1TurningPoint(points: DataPoint[]): Signal[] {
  const series = getF1Series(points);
  if (series.length < 8) return [];

  const recent = series.slice(-6);
  const firstHalf = recent.slice(0, 3);
  const secondHalf = recent.slice(3);

  const firstTrend = trendDir(firstHalf.map((p) => p.value!));
  const secondTrend = trendDir(secondHalf.map((p) => p.value!));

  if (
    firstTrend &&
    secondTrend &&
    firstTrend !== secondTrend &&
    firstTrend !== "stable" &&
    secondTrend !== "stable"
  ) {
    const latest = recent[recent.length - 1];
    const prevWord = firstTrend === "up" ? "fremgang" : "tilbagegang";
    const newWord = secondTrend === "up" ? "fremgang" : "tilbagegang";

    return [
      {
        type: "turning_point",
        direction: secondTrend,
        severity: "important",
        headline: `Tendens vendt: ${newWord} i forbrugertillid efter måneder med ${prevWord}`,
        body: `Forbrugertilliden (F1) har nu haft ${newWord} i tre måneder i træk efter en periode med ${prevWord}.`,
        period: latest.period,
        magnitude: Math.abs(latest.value! - firstHalf[0].value!),
        areaCode: null,
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

function trendDir(values: number[]): "up" | "down" | "stable" | null {
  if (values.length < 2) return null;
  const diff = values[values.length - 1] - values[0];
  if (Math.abs(diff) < 0.5) return "stable";
  return diff > 0 ? "up" : "down";
}

// ============================================================
// Main orchestrator
// ============================================================
export function generateForv1Signals(points: DataPoint[]): Signal[] {
  // Zero crossing and turning point take precedence over change/streak
  const zeroCrossings = detectForv1ZeroCrossing(points);
  const changeSignals = zeroCrossings.length === 0 ? detectForv1Change(points) : [];
  const turningPoints = detectForv1TurningPoint(points);
  const streaks = turningPoints.length === 0 ? detectForv1Streak(points) : [];

  const all: Signal[] = [
    ...zeroCrossings,
    ...changeSignals,
    ...turningPoints,
    ...streaks,
    ...detectForv1YoY(points),
  ];

  return all.sort((a, b) => {
    const sev = { important: 2, note: 1, info: 0 };
    return (
      (sev[b.severity] - sev[a.severity]) ||
      ((b.magnitude ?? 0) - (a.magnitude ?? 0))
    );
  });
}
