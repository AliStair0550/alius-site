"use client";

type Point = {
  period: string;
  value: number;
};

type Props = {
  points: Point[];
  color?: string;
};

export function KommuneSparkline({ points, color = "#1A1A1A" }: Props) {
  if (points.length < 2) return null;

  const sorted = [...points].sort((a, b) => a.period.localeCompare(b.period));
  const values = sorted.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const W = 200;
  const H = 48;
  const padX = 2;
  const padY = 4;

  const toX = (i: number) =>
    padX + (i / (sorted.length - 1)) * (W - 2 * padX);
  const toY = (v: number) =>
    H - padY - ((v - min) / range) * (H - 2 * padY);

  const d = sorted
    .map((p, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(p.value).toFixed(1)}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      className="overflow-visible"
      aria-hidden
    >
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
