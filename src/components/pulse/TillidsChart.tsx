// Server component — renders an SVG sparkline for net-balance indicators.
// Handles both positive and negative values with a zero baseline.

const W = 1100;
const H = 220;
const PAD_X = 0;
const PAD_TOP = 32;
const PAD_BOT = 32;
const PLOT_H = H - PAD_TOP - PAD_BOT;

function parsePeriodLabel(period: string): string {
  const m = period.match(/^(\d{4})M(\d{2})$/);
  if (!m) return period;
  const months = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  return `${months[parseInt(m[2]) - 1]} ${m[1]}`;
}

type Point = { period: string; value: number };

export function TillidsChart({ points }: { points: Point[] }) {
  if (points.length < 2) return null;

  const values = points.map(p => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  // Pad range so zero line is visible even when all values are same sign
  const lower = Math.min(minVal, 0) - 5;
  const upper = Math.max(maxVal, 0) + 5;
  const range = upper - lower;

  function toY(v: number) {
    return PAD_TOP + PLOT_H * (1 - (v - lower) / range);
  }

  const zeroY = toY(0);
  const n = points.length;

  function toX(i: number) {
    return PAD_X + (i / (n - 1)) * (W - 2 * PAD_X);
  }

  // Build path
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(p.value).toFixed(1)}`).join(" ");

  // Area above zero
  const aboveSegments: string[] = [];
  const belowSegments: string[] = [];

  // Build filled area polygons by splitting at zero crossings
  function buildArea(above: boolean): string {
    let d = "";
    let inSeg = false;
    const boundary = above ? (v: number) => v >= 0 : (v: number) => v <= 0;
    const clipY = zeroY;

    for (let i = 0; i < n; i++) {
      const x = toX(i);
      const y = toY(points[i].value);
      const inBound = boundary(points[i].value);

      if (inBound && !inSeg) {
        // Start new segment — interpolate from prev if needed
        if (i > 0 && !boundary(points[i - 1].value)) {
          const px = toX(i - 1), py = toY(points[i - 1].value);
          const t = (0 - points[i - 1].value) / (points[i].value - points[i - 1].value);
          const cx = px + t * (x - px);
          d += `M${cx.toFixed(1)},${clipY.toFixed(1)} L${x.toFixed(1)},${y.toFixed(1)} `;
        } else {
          d += `M${x.toFixed(1)},${clipY.toFixed(1)} L${x.toFixed(1)},${y.toFixed(1)} `;
        }
        inSeg = true;
      } else if (inBound && inSeg) {
        d += `L${x.toFixed(1)},${y.toFixed(1)} `;
      } else if (!inBound && inSeg) {
        // End segment — interpolate
        const px = toX(i - 1), py = toY(points[i - 1].value);
        const t = (0 - points[i - 1].value) / (points[i].value - points[i - 1].value);
        const cx = px + t * (x - px);
        d += `L${cx.toFixed(1)},${clipY.toFixed(1)} Z `;
        inSeg = false;
      }
    }
    if (inSeg) {
      const lastX = toX(n - 1);
      d += `L${lastX.toFixed(1)},${clipY.toFixed(1)} Z`;
    }
    return d;
  }

  const abovePath = buildArea(true);
  const belowPath = buildArea(false);

  const latest = points[points.length - 1];
  const latestX = toX(n - 1);
  const latestY = toY(latest.value);

  // Year labels: show Jan of every 5th year
  const yearLabels: { x: number; label: string }[] = [];
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const m = p.period.match(/^(\d{4})M(\d{2})$/);
    if (m && m[2] === "01") {
      const year = parseInt(m[1]);
      if (year % 5 === 0) {
        yearLabels.push({ x: toX(i), label: m[1] });
      }
    }
  }

  const firstPeriod = parsePeriodLabel(points[0].period).toUpperCase();
  const lastPeriod = parsePeriodLabel(latest.period).toUpperCase();

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ display: "block" }}
      aria-hidden
    >
      {/* Period range label */}
      <text
        x={0}
        y={16}
        fontSize={11}
        fill="currentColor"
        className="text-stone"
        opacity={0.45}
        fontFamily="inherit"
        letterSpacing="0.15em"
        textAnchor="start"
      >
        {firstPeriod} TIL {lastPeriod}
      </text>

      {/* Zero line */}
      <line
        x1={PAD_X}
        y1={zeroY}
        x2={W - PAD_X}
        y2={zeroY}
        stroke="currentColor"
        strokeWidth={1}
        opacity={0.15}
        strokeDasharray="4 4"
      />

      {/* Zero label */}
      <text
        x={W - PAD_X}
        y={zeroY - 4}
        fontSize={10}
        fill="currentColor"
        opacity={0.3}
        fontFamily="inherit"
        textAnchor="end"
      >
        0
      </text>

      {/* Area above zero (positive) — moss green */}
      {abovePath && (
        <path d={abovePath} fill="#2D5F4A" opacity={0.18} />
      )}

      {/* Area below zero (negative) — ink with slight red tint */}
      {belowPath && (
        <path d={belowPath} fill="#8B3A3A" opacity={0.15} />
      )}

      {/* Main line */}
      <path
        d={pathD}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        opacity={0.7}
      />

      {/* Latest dot */}
      <circle
        cx={latestX}
        cy={latestY}
        r={4}
        fill={latest.value >= 0 ? "#2D5F4A" : "#8B3A3A"}
        stroke="var(--color-parchment, #FAF7F2)"
        strokeWidth={2}
      />

      {/* Year tick labels */}
      {yearLabels.map(({ x, label }) => (
        <text
          key={label}
          x={x}
          y={H - 4}
          fontSize={10}
          fill="currentColor"
          opacity={0.3}
          fontFamily="inherit"
          textAnchor="middle"
        >
          {label}
        </text>
      ))}

      {/* Min / Max labels */}
      <text
        x={0}
        y={H - 4}
        fontSize={10}
        fill="currentColor"
        opacity={0.35}
        fontFamily="inherit"
        textAnchor="start"
      >
        {minVal.toFixed(1)}
      </text>
      <text
        x={W}
        y={PAD_TOP + 10}
        fontSize={10}
        fill="currentColor"
        opacity={0.35}
        fontFamily="inherit"
        textAnchor="end"
      >
        {maxVal.toFixed(1)}
      </text>
    </svg>
  );
}
