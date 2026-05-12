"use client";

const MONTHS_DA = [
  "jan", "feb", "mar", "apr", "maj", "jun",
  "jul", "aug", "sep", "okt", "nov", "dec",
];

function parsePeriod(period: string): string {
  const m = period.match(/^(\d{4})M(\d{2})$/);
  if (m) return `${MONTHS_DA[parseInt(m[2], 10) - 1]} ${m[1]}`;
  return period;
}

type Point = { period: string; value: number };
type Props = { points: Point[]; color?: string };

export function KommuneSparkline({ points, color = "#1A1A1A" }: Props) {
  if (points.length < 2) return null;

  const sorted = [...points].sort((a, b) => a.period.localeCompare(b.period));
  const values = sorted.map((p) => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const width = 1100;
  const height = 200;
  const pad = { top: 24, right: 24, bottom: 32, left: 24 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const xScale = (i: number) =>
    pad.left + (i / (sorted.length - 1)) * plotW;
  const yScale = (v: number) =>
    pad.top + plotH - ((v - minVal) / range) * plotH;

  const path = sorted
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(p.value)}`)
    .join(" ");

  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      style={{ maxWidth: "100%", height: "auto" }}
    >
      <text
        x={pad.left}
        y={pad.top - 6}
        fontSize={11}
        fill="rgba(26,26,26,0.5)"
        textAnchor="start"
        fontFamily="inherit"
        letterSpacing="0.2em"
      >
        {`${parsePeriod(first.period).toUpperCase()} TIL ${parsePeriod(last.period).toUpperCase()}`}
      </text>

      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      <circle
        cx={xScale(sorted.length - 1)}
        cy={yScale(last.value)}
        r={4}
        fill={color}
      />

      <text
        x={pad.left}
        y={pad.top + plotH + 24}
        fontSize={11}
        fill="rgba(26,26,26,0.5)"
        textAnchor="start"
        fontFamily="inherit"
      >
        {minVal.toLocaleString("da-DK")}
      </text>
      <text
        x={width - pad.right}
        y={pad.top + plotH + 24}
        fontSize={11}
        fill="rgba(26,26,26,0.5)"
        textAnchor="end"
        fontFamily="inherit"
      >
        {maxVal.toLocaleString("da-DK")}
      </text>
    </svg>
  );
}
