// ============================================================
// Signal detectors for BYGV33 (housing starts per municipality)
//
// Data structure:
//   areaCode = OMRÅDE code, areaType = KOMMUNE/REGION/NATIONAL
//   period = quarterly "2024K1"–"2024K4"
//   value = count of newly started residential dwellings
// ============================================================

import {
  type Signal,
  type DataPoint,
  getLatestPeriod,
  humanizePeriod,
  filterByArea,
  filterByPeriod,
  groupByArea,
  getValue,
  getQuarterPeriodOffset,
} from "./types";

function formatCount(n: number): string {
  return Math.round(n).toLocaleString("da-DK");
}

// ============================================================
// 1. National quarter-over-quarter change
// ============================================================
export function detectBygNationalChange(points: DataPoint[]): Signal[] {
  const national = filterByArea(points, "NATIONAL").filter(
    (p) => p.areaCode === "000" && p.value !== null
  );
  const latest = getLatestPeriod(national);
  if (!latest) return [];
  const previous = getQuarterPeriodOffset(national, 1);
  if (!previous) return [];

  const latestVal = getValue(national, "000", latest);
  const prevVal = getValue(national, "000", previous);
  if (latestVal === null || prevVal === null || prevVal === 0) return [];

  const change = latestVal - prevVal;
  const pct = (change / prevVal) * 100;
  if (Math.abs(pct) < 5) return [];

  const direction: "up" | "down" = change > 0 ? "up" : "down";
  const verb = direction === "up" ? "steg" : "faldt";

  return [
    {
      type: "top_mover",
      direction,
      severity: Math.abs(pct) >= 20 ? "important" : "note",
      headline: `Boligbyggeriet ${verb} ${Math.abs(pct).toFixed(0)}% fra ${humanizePeriod(previous)} til ${humanizePeriod(latest)}`,
      body: `Antallet af nyopstartede boliger på landsplan ${verb} fra ${formatCount(prevVal)} til ${formatCount(latestVal)}.`,
      period: latest,
      magnitude: Math.abs(pct),
      areaCode: "000",
      areaName: "Hele landet",
      evidence: { latestValue: latestVal, previousValue: prevVal, change, pctChange: pct },
    },
  ];
}

// ============================================================
// 2. Top movers — kommuner with biggest quarter-over-quarter change
// ============================================================
export function detectBygTopMovers(points: DataPoint[], maxSignals = 4): Signal[] {
  const kommuner = filterByArea(points, "KOMMUNE");
  const latest = getLatestPeriod(kommuner);
  if (!latest) return [];
  const previous = getQuarterPeriodOffset(kommuner, 1);
  if (!previous) return [];

  const grouped = groupByArea(kommuner);
  const changes: Array<{
    areaCode: string;
    areaName: string;
    change: number;
    latestVal: number;
  }> = [];

  for (const [code, series] of grouped) {
    const latestPt = series.find((p) => p.period === latest);
    const prevPt = series.find((p) => p.period === previous);
    if (
      !latestPt?.areaName ||
      latestPt.value === null ||
      !prevPt ||
      prevPt.value === null
    )
      continue;

    // Skip municipalities with negligible activity
    if (latestPt.value + prevPt.value < 5) continue;

    changes.push({
      areaCode: code,
      areaName: latestPt.areaName,
      change: latestPt.value - prevPt.value,
      latestVal: latestPt.value,
    });
  }

  const increases = changes
    .filter((c) => c.change > 0)
    .sort((a, b) => b.change - a.change);
  const decreases = changes
    .filter((c) => c.change < 0)
    .sort((a, b) => a.change - b.change);

  const signals: Signal[] = [];

  for (const c of decreases.slice(0, Math.ceil(maxSignals / 2))) {
    if (Math.abs(c.change) < 10) break;
    signals.push({
      type: "top_mover",
      direction: "down",
      severity: Math.abs(c.change) >= 50 ? "important" : "note",
      headline: `Boligbyggeriet faldt mest i ${c.areaName} (${formatCount(c.change)} boliger)`,
      body: `Fra ${humanizePeriod(previous)} til ${humanizePeriod(latest)} faldt antallet af nyopstartede boliger i ${c.areaName} med ${formatCount(Math.abs(c.change))} til ${formatCount(c.latestVal)}.`,
      period: latest,
      magnitude: Math.abs(c.change),
      areaCode: c.areaCode,
      areaName: c.areaName,
      evidence: {
        change: c.change,
        latestValue: c.latestVal,
        fromPeriod: previous,
        toPeriod: latest,
      },
    });
  }

  for (const c of increases.slice(0, maxSignals - signals.length)) {
    if (c.change < 10) break;
    signals.push({
      type: "top_mover",
      direction: "up",
      severity: c.change >= 50 ? "important" : "note",
      headline: `Boligbyggeriet steg mest i ${c.areaName} (+${formatCount(c.change)} boliger)`,
      body: `Fra ${humanizePeriod(previous)} til ${humanizePeriod(latest)} steg antallet af nyopstartede boliger i ${c.areaName} med ${formatCount(c.change)} til ${formatCount(c.latestVal)}.`,
      period: latest,
      magnitude: c.change,
      areaCode: c.areaCode,
      areaName: c.areaName,
      evidence: {
        change: c.change,
        latestValue: c.latestVal,
        fromPeriod: previous,
        toPeriod: latest,
      },
    });
  }

  return signals;
}

// ============================================================
// 3. National record — highest/lowest quarterly activity in recent history
// ============================================================
export function detectBygNationalRecord(points: DataPoint[]): Signal[] {
  const national = filterByArea(points, "NATIONAL")
    .filter((p) => p.areaCode === "000" && p.value !== null)
    .sort((a, b) => a.periodDate.getTime() - b.periodDate.getTime());
  if (national.length < 8) return [];

  const latest = national[national.length - 1];
  if (!latest.value) return [];

  const recent = national.slice(-20); // 5 years of quarterly data
  const allValues = recent.map((p) => p.value!);
  const max = Math.max(...allValues);
  const min = Math.min(...allValues);
  const yearsBack = Math.floor(recent.length / 4);

  const signals: Signal[] = [];

  if (latest.value === max && yearsBack >= 3) {
    const prevAtLevel = recent.slice(0, -1).filter((p) => p.value! >= max - 5);
    if (prevAtLevel.length === 0) {
      signals.push({
        type: "record",
        direction: "up",
        severity: "note",
        headline: `Højeste boligbyggeri på ${yearsBack}+ år i ${humanizePeriod(latest.period)}`,
        body: `Med ${formatCount(latest.value)} nyopstartede boliger er ${humanizePeriod(latest.period)} det mest aktive kvartal i over ${yearsBack} år.`,
        period: latest.period,
        magnitude: latest.value,
        areaCode: "000",
        areaName: "Hele landet",
        evidence: { currentValue: latest.value, type: "high", yearsBack },
      });
    }
  }

  if (latest.value === min && yearsBack >= 3) {
    const prevAtLevel = recent.slice(0, -1).filter((p) => p.value! <= min + 5);
    if (prevAtLevel.length === 0) {
      signals.push({
        type: "record",
        direction: "down",
        severity: "important",
        headline: `Laveste boligbyggeri på ${yearsBack}+ år i ${humanizePeriod(latest.period)}`,
        body: `Med kun ${formatCount(latest.value)} nyopstartede boliger er ${humanizePeriod(latest.period)} det mindst aktive kvartal i over ${yearsBack} år.`,
        period: latest.period,
        magnitude: -latest.value,
        areaCode: "000",
        areaName: "Hele landet",
        evidence: { currentValue: latest.value, type: "low", yearsBack },
      });
    }
  }

  return signals;
}

// ============================================================
// Main orchestrator
// ============================================================
export function generateBygv33Signals(points: DataPoint[]): Signal[] {
  const all: Signal[] = [
    ...detectBygNationalChange(points),
    ...detectBygTopMovers(points),
    ...detectBygNationalRecord(points),
  ];

  return all.sort((a, b) => {
    const sev = { important: 2, note: 1, info: 0 };
    return (
      (sev[b.severity] - sev[a.severity]) ||
      ((b.magnitude ?? 0) - (a.magnitude ?? 0))
    );
  });
}
