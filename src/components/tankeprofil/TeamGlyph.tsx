import { ARCHETYPES, type QuadrantKey } from "./data";

type Dot = {
  name: string;
  primary: QuadrantKey;
};

type TeamGlyphProps = {
  participants: Dot[];
  size?: number;
};

// Dot positions within each quadrant as fractions of half-size [x, y]
// Left side of quadrant, leaving room for name text
const SLOTS: [number, number][] = [
  [0.13, 0.30],
  [0.13, 0.50],
  [0.13, 0.70],
  [0.13, 0.85],
  [0.55, 0.30],
  [0.55, 0.50],
  [0.55, 0.70],
  [0.55, 0.85],
];

// Quadrant top-left origin as fraction of full size
function origin(q: QuadrantKey): [number, number] {
  if (q === "A") return [0, 0];
  if (q === "D") return [0.5, 0];
  if (q === "B") return [0, 0.5];
  return [0.5, 0.5]; // C
}

export function TeamGlyph({ participants, size = 400 }: TeamGlyphProps) {
  const half = size / 2;
  const r = size * 0.018;
  const nameFontSize = size * 0.030;
  const labelFontSize = size * 0.024;

  // Group by primary
  const byQ: Record<QuadrantKey, Dot[]> = { A: [], B: [], C: [], D: [] };
  for (const p of participants) byQ[p.primary].push(p);

  // Build dot positions
  const dots: { x: number; y: number; name: string; q: QuadrantKey }[] = [];
  for (const q of ["A", "D", "B", "C"] as QuadrantKey[]) {
    const [ox, oy] = origin(q);
    byQ[q].forEach((p, i) => {
      const [fx, fy] = SLOTS[Math.min(i, SLOTS.length - 1)];
      dots.push({
        x: ox * size + fx * half,
        y: oy * size + fy * half,
        name: p.name,
        q,
      });
    });
  }

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      {/* Quadrant background fills */}
      {(["A", "D", "B", "C"] as QuadrantKey[]).map((q) => {
        const [ox, oy] = origin(q);
        return (
          <rect
            key={q}
            x={ox * size}
            y={oy * size}
            width={half}
            height={half}
            fill={ARCHETYPES[q].color}
            opacity={0.05}
          />
        );
      })}

      {/* Center grid lines */}
      <line
        x1={half} y1={size * 0.04}
        x2={half} y2={size * 0.96}
        stroke="rgba(26,26,26,0.12)"
        strokeWidth={0.5}
      />
      <line
        x1={size * 0.04} y1={half}
        x2={size * 0.96} y2={half}
        stroke="rgba(26,26,26,0.12)"
        strokeWidth={0.5}
      />

      {/* Quadrant archetype labels */}
      {(["A", "D", "B", "C"] as QuadrantKey[]).map((q) => {
        const [ox, oy] = origin(q);
        return (
          <text
            key={`lbl-${q}`}
            x={ox * size + size * 0.06}
            y={oy * size + size * 0.065}
            fontSize={labelFontSize}
            fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
            fill={ARCHETYPES[q].color}
            opacity={0.6}
            letterSpacing="0.08em"
          >
            {ARCHETYPES[q].name.toUpperCase()}
          </text>
        );
      })}

      {/* Participant dots + names */}
      {dots.map((d, i) => (
        <g key={i}>
          <circle cx={d.x} cy={d.y} r={r} fill={ARCHETYPES[d.q].color} opacity={0.9} />
          <text
            x={d.x + r + size * 0.018}
            y={d.y + nameFontSize * 0.36}
            fontSize={nameFontSize}
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
            fontWeight="300"
            fill="rgba(26,26,26,0.80)"
          >
            {d.name}
          </text>
        </g>
      ))}

      {/* Empty quadrant hint */}
      {(["A", "D", "B", "C"] as QuadrantKey[]).map((q) => {
        if (byQ[q].length > 0) return null;
        const [ox, oy] = origin(q);
        return (
          <text
            key={`empty-${q}`}
            x={ox * size + half / 2}
            y={oy * size + half / 2}
            textAnchor="middle"
            fontSize={nameFontSize}
            fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
            fill="rgba(26,26,26,0.15)"
            fontStyle="italic"
          >
            —
          </text>
        );
      })}
    </svg>
  );
}
