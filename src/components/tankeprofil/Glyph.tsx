import { ARCHETYPES, type Totals } from "./data";

type GlyphProps = {
  totals: Totals;
  size?: number;
  className?: string;
};

export function Glyph({ totals, size = 180, className }: GlyphProps) {
  const max = Math.max(totals.A, totals.B, totals.C, totals.D, 1);
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.4;
  const rA = Math.max((totals.A / max) * maxR, 8);
  const rB = Math.max((totals.B / max) * maxR, 8);
  const rC = Math.max((totals.C / max) * maxR, 8);
  const rD = Math.max((totals.D / max) * maxR, 8);
  const offset = size * 0.08;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      <g style={{ mixBlendMode: "multiply" }}>
        <circle cx={cx - offset} cy={cy - offset} r={rA} fill={ARCHETYPES.A.color} opacity={0.85} />
        <circle cx={cx + offset} cy={cy - offset} r={rD} fill={ARCHETYPES.D.color} opacity={0.85} />
        <circle cx={cx + offset} cy={cy + offset} r={rC} fill={ARCHETYPES.C.color} opacity={0.85} />
        <circle cx={cx - offset} cy={cy + offset} r={rB} fill={ARCHETYPES.B.color} opacity={0.85} />
      </g>
    </svg>
  );
}
