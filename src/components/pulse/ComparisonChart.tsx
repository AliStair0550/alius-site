"use client";

import { useState } from "react";

type Point = {
  period: string;
  periodDate: string;
  value: number;
};

type Props = {
  primaryName: string;
  primaryPoints: Point[];
  secondaryName: string;
  secondaryPoints: Point[];
  yearsBack?: number;
};

const MONTHS_DA = [
  "jan", "feb", "mar", "apr", "maj", "jun",
  "jul", "aug", "sep", "okt", "nov", "dec",
];

const PRIMARY_COLOR = "#1A1A1A"; // ink
const SECONDARY_COLOR = "#2D5F4A"; // moss

export function ComparisonChart({
  primaryName,
  primaryPoints,
  secondaryName,
  secondaryPoints,
  yearsBack = 5,
}: Props) {
  const [hover, setHover] = useState<{
    x: number;
    period: string;
    primaryValue: number | null;
    secondaryValue: number | null;
    primaryY: number | null;
    secondaryY: number | null;
  } | null>(null);

  if (primaryPoints.length < 2 || secondaryPoints.length < 2) return null;

  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - yearsBack);

  const primary = primaryPoints
    .filter((p) => new Date(p.periodDate) >= cutoff)
    .sort(
      (a, b) =>
        new Date(a.periodDate).getTime() - new Date(b.periodDate).getTime()
    );
  const secondary = secondaryPoints
    .filter((p) => new Date(p.periodDate) >= cutoff)
    .sort(
      (a, b) =>
        new Date(a.periodDate).getTime() - new Date(b.periodDate).getTime()
    );

  if (primary.length < 2 || secondary.length < 2) return null;

  // Build period → value lookups for fast cross-referencing
  const primaryByPeriod = new Map(primary.map((p) => [p.period, p.value]));
  const secondaryByPeriod = new Map(secondary.map((p) => [p.period, p.value]));

  // Use the longer series for x-axis
  const baseSeries = primary.length >= secondary.length ? primary : secondary;

  const width = 1100;
  const height = 380;
  const padding = { top: 32, right: 24, bottom: 64, left: 56 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const allValues = [
    ...primary.map((p) => p.value),
    ...secondary.map((p) => p.value),
  ];
  const minVal = Math.floor(Math.min(...allValues) * 2) / 2;
  const maxVal = Math.ceil(Math.max(...allValues) * 2) / 2;
  const yRange = maxVal - minVal || 1;

  const xScale = (idx: number) =>
    padding.left + (idx / (baseSeries.length - 1)) * plotWidth;
  const yScale = (val: number) =>
    padding.top + plotHeight - ((val - minVal) / yRange) * plotHeight;

  // Build paths
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

  const primaryPath = buildPath(primary);
  const secondaryPath = buildPath(secondary);

  // Y-axis ticks
  const ticks: number[] = [];
  for (let i = 0; i <= 4; i++) {
    ticks.push(minVal + (yRange * i) / 4);
  }

  // X-axis labels
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

  // Latest points
  const lastPrimary = primary[primary.length - 1];
  const lastSecondary = secondary[secondary.length - 1];
  const lastPrimaryIdx = baseSeries.findIndex(
    (b) => b.period === lastPrimary.period
  );
  const lastSecondaryIdx = baseSeries.findIndex(
    (b) => b.period === lastSecondary.period
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
    const pv = primaryByPeriod.get(period) ?? null;
    const sv = secondaryByPeriod.get(period) ?? null;

    setHover({
      x: xScale(nearestIdx),
      period,
      primaryValue: pv,
      secondaryValue: sv,
      primaryY: pv !== null ? yScale(pv) : null,
      secondaryY: sv !== null ? yScale(sv) : null,
    });
  };

  const formatTooltip = (period: string) => {
    const date = new Date(period.replace("M", "-") + "-01");
    const month = MONTHS_DA[date.getUTCMonth()];
    const year = date.getUTCFullYear();
    return `${month} ${year}`;
  };

  return (
    <div className="w-full overflow-x-auto">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 mb-4 text-[12px]">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-4 h-[2px]"
            style={{ backgroundColor: PRIMARY_COLOR }}
          />
          <span className="text-ink">{primaryName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-4 h-[2px]"
            style={{ backgroundColor: SECONDARY_COLOR }}
          />
          <span className="text-stone">{secondaryName}</span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{ maxWidth: "100%", height: "auto" }}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHover(null)}
        className="cursor-crosshair"
      >
        {/* Grid */}
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

        {/* Secondary line first (below) */}
        <path
          d={secondaryPath}
          fill="none"
          stroke={SECONDARY_COLOR}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.7}
        />

        {/* Primary line on top */}
        <path
          d={primaryPath}
          fill="none"
          stroke={PRIMARY_COLOR}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Latest markers */}
        {lastSecondaryIdx >= 0 && (
          <circle
            cx={xScale(lastSecondaryIdx)}
            cy={yScale(lastSecondary.value)}
            r={4}
            fill={SECONDARY_COLOR}
            opacity={0.7}
          />
        )}
        {lastPrimaryIdx >= 0 && (
          <circle
            cx={xScale(lastPrimaryIdx)}
            cy={yScale(lastPrimary.value)}
            r={5}
            fill={PRIMARY_COLOR}
          />
        )}

        {/* Y-axis labels */}
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
            {t.toFixed(1)}%
          </text>
        ))}

        {/* X-axis labels */}
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

        {/* Hover state */}
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
            {hover.primaryY !== null && (
              <circle cx={hover.x} cy={hover.primaryY} r={5} fill={PRIMARY_COLOR} />
            )}
            {hover.secondaryY !== null && (
              <circle
                cx={hover.x}
                cy={hover.secondaryY}
                r={4}
                fill={SECONDARY_COLOR}
              />
            )}
            {(() => {
              const tipHalfW = 80;
              const tipX = Math.max(
                padding.left + tipHalfW,
                Math.min(width - padding.right - tipHalfW, hover.x)
              );
              return (
                <g transform={`translate(${tipX}, ${padding.top + plotHeight + 48})`}>
                  <rect
                    x={-tipHalfW}
                    y={-12}
                    width={tipHalfW * 2}
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
                    {hover.primaryValue !== null &&
                      ` · ${primaryName.slice(0, 12)}: ${hover.primaryValue.toFixed(1)}%`}
                    {hover.secondaryValue !== null &&
                      ` · ${hover.secondaryValue.toFixed(1)}%`}
                  </text>
                </g>
              );
            })()}
          </>
        )}
      </svg>
    </div>
  );
}
