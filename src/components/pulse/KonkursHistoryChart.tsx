"use client";

import { useState } from "react";

type Point = {
  period: string;
  periodDate: string;
  value: number;
};

type Props = {
  seasonalPoints: Point[];
  actualPoints: Point[];
};

const MONTHS_DA = [
  "jan", "feb", "mar", "apr", "maj", "jun",
  "jul", "aug", "sep", "okt", "nov", "dec",
];

const SEASONAL_COLOR = "#1A1A1A";
const ACTUAL_COLOR = "#8B9D8E";

export function KonkursHistoryChart({ seasonalPoints, actualPoints }: Props) {
  const [hover, setHover] = useState<{
    x: number;
    period: string;
    seasonalValue: number | null;
    actualValue: number | null;
    seasonalY: number | null;
    actualY: number | null;
  } | null>(null);

  if (seasonalPoints.length < 2) return null;

  const seasonal = [...seasonalPoints].sort(
    (a, b) => new Date(a.periodDate).getTime() - new Date(b.periodDate).getTime()
  );
  const actual = [...actualPoints].sort(
    (a, b) => new Date(a.periodDate).getTime() - new Date(b.periodDate).getTime()
  );

  const seasonalByPeriod = new Map(seasonal.map((p) => [p.period, p.value]));
  const actualByPeriod = new Map(actual.map((p) => [p.period, p.value]));

  const baseSeries = seasonal.length >= actual.length ? seasonal : actual;

  const width = 1100;
  const height = 380;
  const padding = { top: 32, right: 24, bottom: 64, left: 64 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const allValues = [
    ...seasonal.map((p) => p.value),
    ...actual.map((p) => p.value),
  ].filter((v) => v !== null);

  if (allValues.length === 0) return null;

  const roundUp = (v: number, to: number) => Math.ceil(v / to) * to;
  const roundDown = (v: number, to: number) => Math.floor(v / to) * to;

  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const range = rawMax - rawMin;
  const interval = range > 500 ? 100 : range > 100 ? 50 : 25;

  const minVal = Math.max(0, roundDown(rawMin, interval));
  const maxVal = roundUp(rawMax, interval);
  const yRange = maxVal - minVal || 1;

  const xScale = (idx: number) =>
    padding.left + (idx / (baseSeries.length - 1)) * plotWidth;
  const yScale = (val: number) =>
    padding.top + plotHeight - ((val - minVal) / yRange) * plotHeight;

  const buildPath = (points: Point[]) => {
    return points
      .map((p, i) => {
        const baseIdx = baseSeries.findIndex((b) => b.period === p.period);
        if (baseIdx === -1) return null;
        return `${i === 0 ? "M" : "L"} ${xScale(baseIdx)} ${yScale(p.value)}`;
      })
      .filter(Boolean)
      .join(" ");
  };

  const seasonalPath = buildPath(seasonal);
  const actualPath = buildPath(actual);

  const ticks: number[] = [];
  for (let i = 0; i <= 4; i++) {
    ticks.push(minVal + (yRange * i) / 4);
  }

  const xLabelCount = 6;
  const xLabels: Array<{ x: number; label: string }> = [];
  for (let i = 0; i < xLabelCount; i++) {
    const idx = Math.round((i / (xLabelCount - 1)) * (baseSeries.length - 1));
    const p = baseSeries[idx];
    const date = new Date(p.periodDate);
    xLabels.push({
      x: xScale(idx),
      label: `${MONTHS_DA[date.getUTCMonth()]} ${date.getUTCFullYear() % 100}`,
    });
  }

  const lastSeasonal = seasonal[seasonal.length - 1];
  const lastSeasonalIdx = baseSeries.findIndex(
    (b) => b.period === lastSeasonal.period
  );

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const transformed = pt.matrixTransform(ctm.inverse());

    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < baseSeries.length; i++) {
      const px = xScale(i);
      const dist = Math.abs(transformed.x - px);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    const period = baseSeries[nearestIdx].period;
    const sv = seasonalByPeriod.get(period) ?? null;
    const av = actualByPeriod.get(period) ?? null;

    setHover({
      x: xScale(nearestIdx),
      period,
      seasonalValue: sv,
      actualValue: av,
      seasonalY: sv !== null ? yScale(sv) : null,
      actualY: av !== null ? yScale(av) : null,
    });
  };

  const formatTooltip = (period: string) => {
    const match = period.match(/^(\d{4})M(\d{2})$/);
    if (!match) return period;
    const monthIdx = parseInt(match[2], 10) - 1;
    return `${MONTHS_DA[monthIdx]} ${match[1]}`;
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex flex-wrap items-center gap-6 mb-4 text-[12px]">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-4 h-[2px]"
            style={{ backgroundColor: SEASONAL_COLOR }}
          />
          <span className="text-ink">Sæsonkorrigeret</span>
        </div>
        {actual.length > 0 && (
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-4 h-[2px]"
              style={{ backgroundColor: ACTUAL_COLOR }}
            />
            <span className="text-stone">Faktiske tal</span>
          </div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{ maxWidth: "100%", height: "auto" }}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHover(null)}
        className="cursor-crosshair"
      >
        {ticks.map((t) => (
          <line
            key={t}
            x1={padding.left}
            x2={width - padding.right}
            y1={yScale(t)}
            y2={yScale(t)}
            stroke="rgba(26,26,26,0.06)"
            strokeWidth={1}
          />
        ))}

        {actual.length > 0 && (
          <path
            d={actualPath}
            fill="none"
            stroke={ACTUAL_COLOR}
            strokeWidth={1.3}
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={0.6}
          />
        )}

        <path
          d={seasonalPath}
          fill="none"
          stroke={SEASONAL_COLOR}
          strokeWidth={1.8}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {lastSeasonalIdx >= 0 && (
          <circle
            cx={xScale(lastSeasonalIdx)}
            cy={yScale(lastSeasonal.value)}
            r={5}
            fill={SEASONAL_COLOR}
          />
        )}

        {ticks.map((t) => (
          <text
            key={`ylabel-${t}`}
            x={padding.left - 12}
            y={yScale(t) + 4}
            fontSize={11}
            fill="rgba(26,26,26,0.5)"
            textAnchor="end"
            fontFamily="inherit"
          >
            {Math.round(t).toLocaleString("da-DK")}
          </text>
        ))}

        {xLabels.map((l, i) => (
          <text
            key={`xlabel-${i}`}
            x={l.x}
            y={padding.top + plotHeight + 24}
            fontSize={11}
            fill="rgba(26,26,26,0.5)"
            textAnchor="middle"
            fontFamily="inherit"
          >
            {l.label}
          </text>
        ))}

        {hover && (
          <>
            <line
              x1={hover.x}
              x2={hover.x}
              y1={padding.top}
              y2={padding.top + plotHeight}
              stroke="rgba(26,26,26,0.2)"
              strokeWidth={1}
              strokeDasharray="2,3"
            />
            {hover.seasonalY !== null && (
              <circle
                cx={hover.x}
                cy={hover.seasonalY}
                r={5}
                fill={SEASONAL_COLOR}
              />
            )}
            {hover.actualY !== null && (
              <circle
                cx={hover.x}
                cy={hover.actualY}
                r={4}
                fill={ACTUAL_COLOR}
                opacity={0.8}
              />
            )}
            <g transform={`translate(${hover.x}, ${padding.top + plotHeight + 48})`}>
              <rect
                x={-95}
                y={-12}
                width={190}
                height={20}
                fill="#1A1A1A"
                rx={2}
              />
              <text
                x={0}
                y={3}
                fontSize={11}
                fill="#F9F7F2"
                textAnchor="middle"
                fontFamily="inherit"
              >
                {formatTooltip(hover.period)}
                {hover.seasonalValue !== null &&
                  ` · sæson: ${Math.round(hover.seasonalValue).toLocaleString("da-DK")}`}
                {hover.actualValue !== null &&
                  ` · faktisk: ${Math.round(hover.actualValue).toLocaleString("da-DK")}`}
              </text>
            </g>
          </>
        )}
      </svg>
    </div>
  );
}
