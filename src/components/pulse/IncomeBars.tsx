"use client";

type Point = {
  year: number;
  value: number;
};

type Props = {
  points: Point[];
  highlightLatest?: boolean;
};

export function IncomeBars({ points, highlightLatest = true }: Props) {
  if (points.length === 0) return null;

  const sorted = [...points].sort((a, b) => a.year - b.year);
  const values = sorted.map((p) => p.value);
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);

  // Pad min down so bars don't start at 0 — makes differences visible
  // For income, going from min*0.9 looks better
  const paddedMin = Math.floor((minVal * 0.92) / 1000) * 1000;
  const range = maxVal - paddedMin || 1;

  const width = 1100;
  const height = 280;
  const padding = { top: 32, right: 24, bottom: 48, left: 80 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const barCount = sorted.length;
  const barGap = 8;
  const totalGapWidth = barGap * (barCount - 1);
  const barWidth = Math.max(8, (plotWidth - totalGapWidth) / barCount);

  const xForBar = (idx: number) =>
    padding.left + idx * (barWidth + barGap);
  const yForValue = (val: number) =>
    padding.top + plotHeight - ((val - paddedMin) / range) * plotHeight;

  // Y-axis labels: 5 ticks
  const tickCount = 5;
  const ticks: number[] = [];
  for (let i = 0; i <= tickCount; i++) {
    ticks.push(paddedMin + (range * i) / tickCount);
  }

  // X-axis labels: show year every nth bar
  const labelInterval = Math.ceil(barCount / 8);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{ maxWidth: "100%", height: "auto" }}
      >
        {/* Grid lines */}
        {ticks.map((t) => (
          <line
            key={`grid-${t}`}
            x1={padding.left}
            x2={width - padding.right}
            y1={yForValue(t)}
            y2={yForValue(t)}
            stroke="rgba(26,26,26,0.06)"
            strokeWidth={1}
          />
        ))}

        {/* Bars */}
        {sorted.map((p, i) => {
          const x = xForBar(i);
          const y = yForValue(p.value);
          const h = padding.top + plotHeight - y;
          const isLatest = highlightLatest && i === barCount - 1;
          return (
            <g key={p.year}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(2, h)}
                fill={isLatest ? "#1A1A1A" : "#2D5F4A"}
                opacity={isLatest ? 1 : 0.55}
              />
            </g>
          );
        })}

        {/* Y-axis labels */}
        {ticks.map((t) => (
          <text
            key={`ylabel-${t}`}
            x={padding.left - 12}
            y={yForValue(t) + 4}
            fontSize={11}
            fill="rgba(26,26,26,0.5)"
            textAnchor="end"
            fontFamily="inherit"
          >
            {`${Math.round(t / 1000)} t.kr.`}
          </text>
        ))}

        {/* X-axis labels */}
        {sorted.map((p, i) => {
          if (i % labelInterval !== 0 && i !== barCount - 1) return null;
          return (
            <text
              key={`xlabel-${p.year}`}
              x={xForBar(i) + barWidth / 2}
              y={padding.top + plotHeight + 20}
              fontSize={11}
              fill="rgba(26,26,26,0.5)"
              textAnchor="middle"
              fontFamily="inherit"
            >
              {p.year}
            </text>
          );
        })}

        {/* Latest value annotation */}
        {(() => {
          const latest = sorted[sorted.length - 1];
          const x = xForBar(barCount - 1) + barWidth / 2;
          const y = yForValue(latest.value);
          return (
            <text
              x={x}
              y={y - 8}
              fontSize={12}
              fill="#1A1A1A"
              textAnchor="middle"
              fontFamily="inherit"
              fontWeight={500}
            >
              {Math.round(latest.value / 1000)}
            </text>
          );
        })()}
      </svg>
    </div>
  );
}
