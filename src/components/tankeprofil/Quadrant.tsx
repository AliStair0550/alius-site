import { ARCHETYPES, type Totals } from "./data";

type QuadrantProps = {
  totals: Totals;
  size?: number;
  showLabels?: boolean;
  className?: string;
};

export function Quadrant({ totals, size = 200, showLabels = false, className }: QuadrantProps) {
  const max = Math.max(totals.A, totals.B, totals.C, totals.D, 1);
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.35;
  const rA = (totals.A / max) * maxR;
  const rB = (totals.B / max) * maxR;
  const rC = (totals.C / max) * maxR;
  const rD = (totals.D / max) * maxR;

  // Avoid zero-radius path errors
  const safeR = (r: number) => Math.max(r, 0.01);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      <line x1={cx} y1={size * 0.1} x2={cx} y2={size * 0.9} stroke="rgba(26,26,26,0.2)" strokeWidth={0.5} />
      <line x1={size * 0.1} y1={cy} x2={size * 0.9} y2={cy} stroke="rgba(26,26,26,0.2)" strokeWidth={0.5} />
      <circle cx={cx} cy={cy} r={maxR} fill="none" stroke="rgba(26,26,26,0.1)" strokeWidth={0.5} />

      {/* A top-left */}
      <path
        d={`M ${cx} ${cy} L ${cx - safeR(rA)} ${cy} A ${safeR(rA)} ${safeR(rA)} 0 0 1 ${cx} ${cy - safeR(rA)} Z`}
        fill={ARCHETYPES.A.color}
        opacity={0.9}
      />
      {/* D top-right */}
      <path
        d={`M ${cx} ${cy} L ${cx} ${cy - safeR(rD)} A ${safeR(rD)} ${safeR(rD)} 0 0 1 ${cx + safeR(rD)} ${cy} Z`}
        fill={ARCHETYPES.D.color}
        opacity={0.9}
      />
      {/* C bottom-right */}
      <path
        d={`M ${cx} ${cy} L ${cx + safeR(rC)} ${cy} A ${safeR(rC)} ${safeR(rC)} 0 0 1 ${cx} ${cy + safeR(rC)} Z`}
        fill={ARCHETYPES.C.color}
        opacity={0.9}
      />
      {/* B bottom-left */}
      <path
        d={`M ${cx} ${cy} L ${cx} ${cy + safeR(rB)} A ${safeR(rB)} ${safeR(rB)} 0 0 1 ${cx - safeR(rB)} ${cy} Z`}
        fill={ARCHETYPES.B.color}
        opacity={0.9}
      />

      {showLabels && (
        <>
          <text x={cx - maxR - 16} y={cy - maxR - 8} textAnchor="middle" fontSize={14} fill="rgba(26,26,26,0.5)" fontFamily="Fraunces" fontStyle="italic">Analytiker</text>
          <text x={cx + maxR + 16} y={cy - maxR - 8} textAnchor="middle" fontSize={14} fill="rgba(26,26,26,0.5)" fontFamily="Fraunces" fontStyle="italic">Visionær</text>
          <text x={cx - maxR - 16} y={cy + maxR + 22} textAnchor="middle" fontSize={14} fill="rgba(26,26,26,0.5)" fontFamily="Fraunces" fontStyle="italic">Bygmester</text>
          <text x={cx + maxR + 16} y={cy + maxR + 22} textAnchor="middle" fontSize={14} fill="rgba(26,26,26,0.5)" fontFamily="Fraunces" fontStyle="italic">Forbinder</text>
        </>
      )}
    </svg>
  );
}
