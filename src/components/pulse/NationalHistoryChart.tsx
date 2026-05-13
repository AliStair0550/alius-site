"use client";

import { useState } from "react";

type Point = {
  period: string;
  periodDate: string; // ISO string
  value: number;
};

type Props = {
  points: Point[];
  yearsBack?: number; // default 5
};

const MONTHS_DA = [
  "jan", "feb", "mar", "apr", "maj", "jun",
  "jul", "aug", "sep", "okt", "nov", "dec",
];

export function NationalHistoryChart({ points, yearsBack = 5 }: Props) {
  const [hover, setHover] = useState<{
    point: Point;
    x: number;
    y: number;
  } | null>(null);

  if (points.length < 2) {
    return null;
  }

  // Filter to last N years
  const cutoffDate = new Date();
  cutoffDate.setFullYear(cutoffDate.getFullYear() - yearsBack);
  const filtered = points
    .filter((p) => new Date(p.periodDate) >= cutoffDate)
    .sort(
      (a, b) =>
        new Date(a.periodDate).getTime() - new Date(b.periodDate).getTime()
    );

  if (filtered.length < 2) {
    return null;
  }

  // SVG dimensions
  const width = 1100;
  const height = 360;
  const padding = { top: 32, right: 24, bottom: 48, left: 56 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Compute y-axis scale with some headroom
  const values = filtered.map((p) => p.value);
  const minVal = Math.floor(Math.min(...values) * 2) / 2; // round down to nearest 0.5
  const maxVal = Math.ceil(Math.max(...values) * 2) / 2; // round up
  const yRange = maxVal - minVal || 1;

  // Find min and max for annotations
  const minPoint = filtered.reduce((acc, p) =>
    p.value < acc.value ? p : acc
  );
  const maxPoint = filtered.reduce((acc, p) =>
    p.value > acc.value ? p : acc
  );
  const latestPoint = filtered[filtered.length - 1];

  // Helper: convert datapoint to SVG coordinates
  const xScale = (idx: number) =>
    padding.left + (idx / (filtered.length - 1)) * plotWidth;
  const yScale = (val: number) =>
    padding.top + plotHeight - ((val - minVal) / yRange) * plotHeight;

  // Build path
  const linePath = filtered
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(p.value)}`)
    .join(" ");

  // Area fill below line (subtle)
  const areaPath =
    linePath +
    ` L ${xScale(filtered.length - 1)} ${padding.top + plotHeight}` +
    ` L ${xScale(0)} ${padding.top + plotHeight} Z`;

  // Y-axis ticks (4 evenly spaced)
  const ticks: number[] = [];
  for (let i = 0; i <= 4; i++) {
    ticks.push(minVal + (yRange * i) / 4);
  }

  // X-axis: pick ~6 evenly spaced labels
  const xLabelCount = 6;
  const xLabels: Array<{ x: number; label: string }> = [];
  for (let i = 0; i < xLabelCount; i++) {
    const idx = Math.round((i / (xLabelCount - 1)) * (filtered.length - 1));
    const p = filtered[idx];
    const date = new Date(p.periodDate);
    xLabels.push({
      x: xScale(idx),
      label: `${MONTHS_DA[date.getUTCMonth()]} ${date.getUTCFullYear() % 100}`,
    });
  }

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const transformed = pt.matrixTransform(ctm.inverse());

    // Find nearest data point
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < filtered.length; i++) {
      const px = xScale(i);
      const dist = Math.abs(transformed.x - px);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    const p = filtered[nearestIdx];
    setHover({
      point: p,
      x: xScale(nearestIdx),
      y: yScale(p.value),
    });
  };

  const formatTooltip = (p: Point) => {
    const date = new Date(p.periodDate);
    const month = MONTHS_DA[date.getUTCMonth()];
    const year = date.getUTCFullYear();
    return {
      label: `${month} ${year}`,
      value: p.value.toLocaleString("da-DK", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }) + "%",
    };
  };

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{ maxWidth: "100%", height: "auto" }}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHover(null)}
        className="cursor-crosshair"
      >
        {/* Grid lines */}
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

        {/* Area fill */}
        <path d={areaPath} fill="rgba(45,95,74,0.04)" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="#2D5F4A"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Min annotation */}
        <circle
          cx={xScale(filtered.indexOf(minPoint))}
          cy={yScale(minPoint.value)}
          r={3}
          fill="#2D5F4A"
          opacity={0.4}
        />
        <text
          x={xScale(filtered.indexOf(minPoint))}
          y={yScale(minPoint.value) + 18}
          fontSize={10}
          fill="rgba(26,26,26,0.5)"
          textAnchor="middle"
          fontFamily="inherit"
        >
          {formatTooltip(minPoint).label}: {formatTooltip(minPoint).value}
        </text>

        {/* Max annotation */}
        <circle
          cx={xScale(filtered.indexOf(maxPoint))}
          cy={yScale(maxPoint.value)}
          r={3}
          fill="#2D5F4A"
          opacity={0.4}
        />
        <text
          x={xScale(filtered.indexOf(maxPoint))}
          y={yScale(maxPoint.value) - 12}
          fontSize={10}
          fill="rgba(26,26,26,0.5)"
          textAnchor="middle"
          fontFamily="inherit"
        >
          {formatTooltip(maxPoint).label}: {formatTooltip(maxPoint).value}
        </text>

        {/* Latest point */}
        <circle
          cx={xScale(filtered.length - 1)}
          cy={yScale(latestPoint.value)}
          r={5}
          fill="#1A1A1A"
        />

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
        {hover && (() => {
          const tipHalfW = 56;
          const tipX = Math.max(
            padding.left + tipHalfW,
            Math.min(width - padding.right - tipHalfW, hover.x)
          );
          return (
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
              <circle cx={hover.x} cy={hover.y} r={5} fill="#1A1A1A" />
              <g transform={`translate(${tipX}, ${hover.y - 24})`}>
                <rect
                  x={-tipHalfW}
                  y={-22}
                  width={tipHalfW * 2}
                  height={28}
                  fill="#1A1A1A"
                  rx={2}
                />
                <text
                  x={0}
                  y={-4}
                  fontSize={11}
                  fill="#F9F7F2"
                  textAnchor="middle"
                  fontFamily="inherit"
                >
                  {formatTooltip(hover.point).label} ·{" "}
                  {formatTooltip(hover.point).value}
                </text>
              </g>
            </>
          );
        })()}
      </svg>
    </div>
  );
}
