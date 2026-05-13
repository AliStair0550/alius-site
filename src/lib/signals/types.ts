// ============================================================
// Signal engine — types and utilities
//
// A signal is a computed interpretation of data. It identifies a pattern
// (top mover, record, streak, etc.) and presents it in human-readable form.
//
// All detectors are pure functions: same input → same output, no side effects.
// ============================================================

export type SignalType =
  | "top_mover"
  | "record"
  | "streak"
  | "comparison"
  | "turning_point"
  | "outlier";

export type SignalDirection = "up" | "down" | "stable";
export type SignalSeverity = "info" | "note" | "important";

export type Signal = {
  type: SignalType;
  direction: SignalDirection | null;
  severity: SignalSeverity;
  headline: string;
  body: string | null;
  period: string;
  magnitude: number | null;
  areaCode: string | null;
  areaName: string | null;
  evidence: Record<string, unknown>;
};

export type DataPoint = {
  period: string;
  periodDate: Date;
  areaCode: string | null;
  areaName: string | null;
  areaType: "NATIONAL" | "REGION" | "LANDSDEL" | "KOMMUNE";
  value: number | null;
};

// ============================================================
// Time period utilities
// ============================================================

/**
 * Get the most recent period across the dataset.
 * Returns the period string, e.g. "2026M03".
 */
export function getLatestPeriod(points: DataPoint[]): string | null {
  if (points.length === 0) return null;
  const sorted = [...points].sort(
    (a, b) => b.periodDate.getTime() - a.periodDate.getTime()
  );
  return sorted[0].period;
}

/**
 * Get the period that is N months before the latest.
 */
export function getPeriodOffset(points: DataPoint[], monthsBack: number): string | null {
  const latest = getLatestPeriod(points);
  if (!latest) return null;

  const match = latest.match(/^(\d{4})M(\d{2})$/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);

  const targetDate = new Date(Date.UTC(year, month - 1 - monthsBack, 1));
  const targetYear = targetDate.getUTCFullYear();
  const targetMonth = String(targetDate.getUTCMonth() + 1).padStart(2, "0");
  return `${targetYear}M${targetMonth}`;
}

/**
 * Format a period string for human reading.
 * "2026M03" -> "marts 2026"
 * "2026K1"  -> "1. kvartal 2026"
 * "2024"    -> "2024"
 */
export function humanizePeriod(period: string): string {
  const monthMatch = period.match(/^(\d{4})M(\d{2})$/);
  if (monthMatch) {
    const year = monthMatch[1];
    const monthIdx = parseInt(monthMatch[2], 10) - 1;
    const months = [
      "januar", "februar", "marts", "april", "maj", "juni",
      "juli", "august", "september", "oktober", "november", "december",
    ];
    return `${months[monthIdx]} ${year}`;
  }
  const quarterMatch = period.match(/^(\d{4})K(\d)$/);
  if (quarterMatch) {
    return `${quarterMatch[2]}. kvartal ${quarterMatch[1]}`;
  }
  return period;
}

// ============================================================
// Number formatting
// ============================================================

export function formatNumber(value: number, decimals = 1): string {
  return value.toLocaleString("da-DK", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatChange(value: number, decimals = 1): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value, decimals)}`;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${formatNumber(value, decimals)}%`;
}

export function formatPercentagePoints(value: number, decimals = 1): string {
  return `${formatChange(value, decimals)} pp`;
}

// ============================================================
// Filtering helpers
// ============================================================

export function filterByArea(
  points: DataPoint[],
  areaType: DataPoint["areaType"]
): DataPoint[] {
  return points.filter((p) => p.areaType === areaType);
}

export function filterByPeriod(points: DataPoint[], period: string): DataPoint[] {
  return points.filter((p) => p.period === period);
}

export function filterByAreaCode(points: DataPoint[], areaCode: string): DataPoint[] {
  return points.filter((p) => p.areaCode === areaCode);
}

/**
 * Group datapoints by area code, returning a map from code to sorted timeseries.
 */
export function groupByArea(points: DataPoint[]): Map<string, DataPoint[]> {
  const map = new Map<string, DataPoint[]>();
  for (const p of points) {
    const key = p.areaCode ?? "national";
    const list = map.get(key) ?? [];
    list.push(p);
    map.set(key, list);
  }
  // Sort each group by period ascending
  for (const list of map.values()) {
    list.sort((a, b) => a.periodDate.getTime() - b.periodDate.getTime());
  }
  return map;
}

/**
 * Get value for a specific area and period.
 */
export function getValue(
  points: DataPoint[],
  areaCode: string | null,
  period: string
): number | null {
  const match = points.find(
    (p) => p.areaCode === areaCode && p.period === period
  );
  return match?.value ?? null;
}

/**
 * Calculate the change between two periods for a given area.
 * Returns null if either value is missing.
 */
export function calculateChange(
  points: DataPoint[],
  areaCode: string | null,
  fromPeriod: string,
  toPeriod: string
): number | null {
  const from = getValue(points, areaCode, fromPeriod);
  const to = getValue(points, areaCode, toPeriod);
  if (from === null || to === null) return null;
  return to - from;
}

/**
 * Get the period N quarters before the latest quarterly period.
 * Works with "2024K1"–"2024K4" format.
 */
export function getQuarterPeriodOffset(points: DataPoint[], quartersBack: number): string | null {
  const latest = getLatestPeriod(points);
  if (!latest) return null;
  const m = latest.match(/^(\d{4})K(\d)$/);
  if (!m) return null;
  let year = parseInt(m[1], 10);
  let quarter = parseInt(m[2], 10) - quartersBack;
  while (quarter <= 0) { quarter += 4; year--; }
  while (quarter > 4) { quarter -= 4; year++; }
  return `${year}K${quarter}`;
}

/**
 * Get the period N years before the latest annual period.
 * Works with plain 4-digit year strings like "2024".
 */
export function getAnnualPeriodOffset(points: DataPoint[], yearsBack: number): string | null {
  const latest = getLatestPeriod(points);
  if (!latest || !/^\d{4}$/.test(latest)) return null;
  return String(parseInt(latest, 10) - yearsBack);
}
