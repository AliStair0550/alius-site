// ============================================================
// Signal detectors for LABY01 — B11 (total population growth)
//
// Data structure:
//   areaCode = KOMGRP code, areaType = KOMMUNE/REGION/NATIONAL
//   period = 4-digit year string "2024"
//   value = net growth rate per 1,000 inhabitants (can be negative)
// ============================================================

import {
  type Signal,
  type DataPoint,
  getLatestPeriod,
  filterByArea,
  groupByArea,
  getAnnualPeriodOffset,
} from "./types";

function formatRate(v: number): string {
  const abs = Math.abs(v).toFixed(1).replace(".", ",");
  return v >= 0 ? `+${abs}` : `−${abs}`;
}

// ============================================================
// 1. Extremes — fastest-growing and deepest-declining municipalities
// ============================================================
export function detectVaekstExtremes(points: DataPoint[]): Signal[] {
  const kommuner = filterByArea(points, "KOMMUNE");
  const latest = getLatestPeriod(kommuner);
  if (!latest) return [];

  const latestPoints = kommuner
    .filter((p) => p.period === latest && p.value !== null && p.areaName !== null)
    .sort((a, b) => b.value! - a.value!);

  if (latestPoints.length < 10) return [];

  const signals: Signal[] = [];

  const top = latestPoints[0];
  if (top.value! >= 15) {
    signals.push({
      type: "comparison",
      direction: "up",
      severity: top.value! >= 25 ? "important" : "note",
      headline: `${top.areaName} vokser hurtigst — ${formatRate(top.value!)} per 1.000 i ${latest}`,
      body: `Med en vækstrate på ${formatRate(top.value!)} per 1.000 indbyggere har ${top.areaName} landets højeste befolkningstilvækst i ${latest}.`,
      period: latest,
      magnitude: top.value!,
      areaCode: top.areaCode,
      areaName: top.areaName,
      evidence: { value: top.value, year: latest },
    });
  }

  const bottom = latestPoints[latestPoints.length - 1];
  if (bottom.value! <= -10) {
    signals.push({
      type: "comparison",
      direction: "down",
      severity: bottom.value! <= -20 ? "important" : "note",
      headline: `${bottom.areaName} har størst befolkningsfald — ${formatRate(bottom.value!)} per 1.000 i ${latest}`,
      body: `Med et fald på ${formatRate(bottom.value!)} per 1.000 indbyggere har ${bottom.areaName} den kraftigste befolkningsnedgang i ${latest}.`,
      period: latest,
      magnitude: Math.abs(bottom.value!),
      areaCode: bottom.areaCode,
      areaName: bottom.areaName,
      evidence: { value: bottom.value, year: latest },
    });
  }

  return signals;
}

// ============================================================
// 2. Top movers — biggest year-over-year change in growth rate
// ============================================================
export function detectVaekstTopMovers(points: DataPoint[], maxSignals = 3): Signal[] {
  const kommuner = filterByArea(points, "KOMMUNE");
  const latest = getLatestPeriod(kommuner);
  if (!latest) return [];
  const previous = getAnnualPeriodOffset(kommuner, 1);
  if (!previous) return [];

  const grouped = groupByArea(kommuner);
  const changes: Array<{
    areaCode: string;
    areaName: string;
    change: number;
    latestValue: number;
  }> = [];

  for (const [, series] of grouped) {
    const latestPt = series.find((p) => p.period === latest);
    const prevPt = series.find((p) => p.period === previous);
    if (
      !latestPt?.areaName ||
      latestPt.value === null ||
      !prevPt ||
      prevPt.value === null
    )
      continue;

    const change = latestPt.value - prevPt.value;
    if (Math.abs(change) < 5) continue;

    changes.push({
      areaCode: latestPt.areaCode!,
      areaName: latestPt.areaName,
      change,
      latestValue: latestPt.value,
    });
  }

  const top = changes
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, maxSignals);

  return top.map((c) => ({
    type: "top_mover" as const,
    direction: (c.change > 0 ? "up" : "down") as "up" | "down",
    severity: (Math.abs(c.change) >= 15 ? "important" : "note") as
      | "important"
      | "note",
    headline:
      c.change > 0
        ? `Befolkningstilvæksten i ${c.areaName} er steget markant fra ${previous} til ${latest}`
        : `Befolkningsnedgangen i ${c.areaName} er forværret fra ${previous} til ${latest}`,
    body: `Vækstraten (per 1.000 indbyggere) gik fra ${formatRate(c.latestValue - c.change)} til ${formatRate(c.latestValue)}.`,
    period: latest,
    magnitude: Math.abs(c.change),
    areaCode: c.areaCode,
    areaName: c.areaName,
    evidence: {
      change: c.change,
      latestValue: c.latestValue,
      fromYear: previous,
      toYear: latest,
    },
  }));
}

// ============================================================
// 3. National trend — has the country as a whole been growing or shrinking?
// ============================================================
export function detectVaekstNational(points: DataPoint[]): Signal[] {
  const national = filterByArea(points, "NATIONAL")
    .filter((p) => p.areaCode === "000" && p.value !== null)
    .sort((a, b) => a.periodDate.getTime() - b.periodDate.getTime());
  if (national.length < 2) return [];

  const latest = national[national.length - 1];
  const previous = national[national.length - 2];
  if (latest.value === null || previous.value === null) return [];

  const change = latest.value - previous.value;
  const direction: "up" | "down" | "stable" =
    change > 0.5 ? "up" : change < -0.5 ? "down" : "stable";
  const verb =
    direction === "up" ? "steg" : direction === "down" ? "faldt" : "var stabil";

  return [
    {
      type: "top_mover",
      direction,
      severity: "note",
      headline:
        direction === "stable"
          ? `Befolkningstilvæksten på landsplan er stabil på ${formatRate(latest.value)} per 1.000 i ${latest.period}`
          : `Befolkningstilvæksten ${verb} til ${formatRate(latest.value)} per 1.000 på landsplan i ${latest.period}`,
      body: `Fra ${previous.period} til ${latest.period} gik den nationale vækstrate fra ${formatRate(previous.value)} til ${formatRate(latest.value)} per 1.000 indbyggere.`,
      period: latest.period,
      magnitude: 100 + Math.abs(change),
      areaCode: "000",
      areaName: "Hele landet",
      evidence: {
        latestValue: latest.value,
        previousValue: previous.value,
        change,
        fromYear: previous.period,
        toYear: latest.period,
      },
    },
  ];
}

// ============================================================
// Main orchestrator
// ============================================================
export function generateLaby01Signals(points: DataPoint[]): Signal[] {
  const all: Signal[] = [
    ...detectVaekstNational(points),
    ...detectVaekstExtremes(points),
    ...detectVaekstTopMovers(points),
  ];

  const sorted = all.sort((a, b) => {
    const sev = { important: 2, note: 1, info: 0 };
    return (
      (sev[b.severity] - sev[a.severity]) ||
      ((b.magnitude ?? 0) - (a.magnitude ?? 0))
    );
  });

  // Dedup: keep only one signal per (areaCode, direction) — first wins (highest rank)
  const seen = new Set<string>();
  return sorted.filter((s) => {
    const key =
      s.areaCode === "000"
        ? `000:${s.type}:${s.direction ?? "none"}`
        : `${s.areaCode ?? "?"}:${s.direction ?? "none"}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
