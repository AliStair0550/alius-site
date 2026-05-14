"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Thinker } from "@/lib/frihedstaenkere";
import { formatYear } from "@/lib/frihedstaenkere";

type Props = {
  thinkers: Thinker[];
};

// SVG canvas
const W = 1400;
const H = 320;
const TIMELINE_Y = 180;
const PAD_L = 60;
const PAD_R = 60;
const PLOT_W = W - PAD_L - PAD_R;

// Piecewise linear: ancient(-500→1600) occupies 0–16%, modern(1600→2030) occupies 16–100%
function xFromYear(year: number): number {
  if (year <= 1600) {
    const ratio = (year - -500) / (1600 - -500);
    return PAD_L + ratio * 0.16 * PLOT_W;
  }
  const ratio = (year - 1600) / (2030 - 1600);
  return PAD_L + (0.16 + ratio * 0.84) * PLOT_W;
}

const ERA_ZONES = [
  { label: "Antikken", start: -500, end: 1600, color: "rgba(193,127,58,0.04)" },
  { label: "Oplysningstiden", start: 1600, end: 1800, color: "rgba(74,140,90,0.04)" },
  { label: "1800-tallet", start: 1800, end: 1900, color: "rgba(90,110,160,0.04)" },
  { label: "1900-2000-tallet", start: 1900, end: 2030, color: "rgba(140,90,90,0.04)" },
];

export function ThinkerTimeline({ thinkers }: Props) {
  const router = useRouter();
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);

  const sorted = [...thinkers].sort((a, b) => a.born - b.born);

  // Compute x positions
  const positions = sorted.map((t) => ({
    ...t,
    x: xFromYear(t.born),
  }));

  // Determine label positions: alternate above/below, but avoid overlaps in dense clusters
  const labeled = positions.map((t, i) => {
    const prev = positions[i - 1];
    const next = positions[i + 1];
    const tooClose =
      (prev && Math.abs(t.x - prev.x) < 70) ||
      (next && Math.abs(t.x - next.x) < 70);
    return { ...t, showLabel: !tooClose, above: i % 2 === 0 };
  });

  // Build connection arcs (only between thinkers in the dataset)
  const slugSet = new Set(thinkers.map((t) => t.slug));
  type Arc = {
    x1: number; x2: number; slug1: string; slug2: string;
    color: string; label: string;
  };
  const arcs: Arc[] = [];
  const seen = new Set<string>();

  for (const t of labeled) {
    const x1 = t.x;
    for (const rel of t.relations) {
      if (!slugSet.has(rel.slug)) continue;
      const key = [t.slug, rel.slug].sort().join(":");
      if (seen.has(key)) continue;
      seen.add(key);
      const target = labeled.find((p) => p.slug === rel.slug);
      if (!target) continue;
      arcs.push({
        x1,
        x2: target.x,
        slug1: t.slug,
        slug2: rel.slug,
        color: t.moodColors[1],
        label: rel.label,
      });
    }
  }

  const hoveredThinker = hoveredSlug ? labeled.find((t) => t.slug === hoveredSlug) : null;

  const handleClick = useCallback(
    (slug: string) => {
      router.push(`/frihedstænkere/${slug}`);
    },
    [router]
  );

  return (
    <div className="relative w-full overflow-hidden select-none" style={{ backgroundColor: "#18140E" }}>
      {/* Subtle grain texture overlay */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none z-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(249,247,242,0.03) 1px, transparent 0)",
          backgroundSize: "16px 16px",
        }}
      />

      <div className="relative z-10 px-8 pt-10 pb-0">
        {/* Header */}
        <div className="flex items-baseline justify-between mb-6">
          <span className="text-[10px] tracking-[0.35em] uppercase text-parchment/30">
            Idéernes strøm gennem historien
          </span>
          <span className="text-[10px] tracking-[0.2em] uppercase text-parchment/20">
            {sorted[0].born < 0 ? `${Math.abs(sorted[0].born)} f.Kr.` : sorted[0].born} · {sorted[sorted.length - 1].born}
          </span>
        </div>
      </div>

      {/* SVG Timeline */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ height: "auto", display: "block" }}
        className="cursor-pointer"
      >
        <defs>
          <marker id="arrow-moss" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
            <polygon points="0 0, 6 2.5, 0 5" fill="rgba(45,95,74,0.5)" />
          </marker>
        </defs>

        {/* Era zone backgrounds */}
        {ERA_ZONES.map((zone) => {
          const x1 = xFromYear(zone.start);
          const x2 = xFromYear(zone.end);
          return (
            <rect
              key={zone.label}
              x={x1}
              y={0}
              width={x2 - x1}
              height={H}
              fill={zone.color}
            />
          );
        })}

        {/* Era dividers */}
        {ERA_ZONES.slice(1).map((zone) => {
          const x = xFromYear(zone.start);
          return (
            <line
              key={zone.label}
              x1={x} x2={x} y1={20} y2={H - 20}
              stroke="rgba(249,247,242,0.06)"
              strokeWidth={1}
              strokeDasharray="3,6"
            />
          );
        })}

        {/* Era labels */}
        {ERA_ZONES.map((zone) => {
          const x1 = xFromYear(zone.start);
          const x2 = xFromYear(Math.min(zone.end, 2030));
          const cx = (x1 + x2) / 2;
          return (
            <text
              key={zone.label}
              x={cx}
              y={22}
              fontSize={9}
              fill="rgba(249,247,242,0.25)"
              textAnchor="middle"
              letterSpacing={2.5}
              fontFamily="Jost, sans-serif"
              style={{ textTransform: "uppercase" }}
            >
              {zone.label.toUpperCase()}
            </text>
          );
        })}

        {/* Break indicator between ancient and modern */}
        {(() => {
          const xBreak = xFromYear(1600);
          return (
            <>
              <line x1={xBreak - 8} x2={xBreak - 2} y1={TIMELINE_Y - 8} y2={TIMELINE_Y + 8}
                stroke="rgba(249,247,242,0.15)" strokeWidth={1} />
              <line x1={xBreak + 2} x2={xBreak + 8} y1={TIMELINE_Y - 8} y2={TIMELINE_Y + 8}
                stroke="rgba(249,247,242,0.15)" strokeWidth={1} />
            </>
          );
        })()}

        {/* Main timeline bar */}
        <line
          x1={PAD_L} x2={W - PAD_R}
          y1={TIMELINE_Y} y2={TIMELINE_Y}
          stroke="rgba(249,247,242,0.12)"
          strokeWidth={1}
        />

        {/* Connection arcs */}
        {arcs.map((arc, i) => {
          const midX = (arc.x1 + arc.x2) / 2;
          const arcHeight = Math.min(80, Math.abs(arc.x2 - arc.x1) * 0.18 + 20);
          const controlY = TIMELINE_Y - arcHeight;
          const isActive =
            hoveredSlug === arc.slug1 || hoveredSlug === arc.slug2;
          return (
            <path
              key={i}
              d={`M ${arc.x1} ${TIMELINE_Y} Q ${midX} ${controlY} ${arc.x2} ${TIMELINE_Y}`}
              fill="none"
              stroke={isActive ? arc.color : "rgba(249,247,242,0.08)"}
              strokeWidth={isActive ? 1.5 : 0.8}
              strokeDasharray={isActive ? "none" : "2,4"}
              style={{ transition: "stroke 200ms, stroke-width 200ms" }}
              markerEnd={isActive ? "url(#arrow-moss)" : undefined}
            />
          );
        })}

        {/* Thinker nodes + labels */}
        {labeled.map((t) => {
          const isHovered = hoveredSlug === t.slug;
          const nodeY = TIMELINE_Y;
          const labelY = t.above ? nodeY - 28 : nodeY + 38;
          const yearY = t.above ? nodeY - 14 : nodeY + 22;

          return (
            <g
              key={t.slug}
              onClick={() => handleClick(t.slug)}
              onPointerEnter={() => setHoveredSlug(t.slug)}
              onPointerLeave={() => setHoveredSlug(null)}
              style={{ cursor: "pointer" }}
            >
              {/* Glow ring on hover */}
              {isHovered && (
                <circle
                  cx={t.x} cy={nodeY} r={14}
                  fill="none"
                  stroke={t.moodColors[1]}
                  strokeWidth={1}
                  opacity={0.3}
                />
              )}

              {/* Node circle */}
              <circle
                cx={t.x} cy={nodeY} r={isHovered ? 7 : 5}
                fill={isHovered ? t.moodColors[1] : "rgba(249,247,242,0.15)"}
                stroke={isHovered ? t.moodColors[1] : "rgba(249,247,242,0.3)"}
                strokeWidth={1}
                style={{ transition: "all 200ms" }}
              />

              {/* Tick below node */}
              <line
                x1={t.x} x2={t.x}
                y1={nodeY + 5} y2={nodeY + (t.above ? 12 : 12)}
                stroke="rgba(249,247,242,0.15)"
                strokeWidth={1}
              />

              {/* Year label */}
              {t.showLabel && (
                <text
                  x={t.x} y={yearY}
                  fontSize={8.5}
                  fill="rgba(249,247,242,0.25)"
                  textAnchor="middle"
                  fontFamily="Jost, sans-serif"
                >
                  {formatYear(t.born)}
                </text>
              )}

              {/* Name label */}
              {t.showLabel && (
                <text
                  x={t.x}
                  y={labelY}
                  fontSize={isHovered ? 12 : 10.5}
                  fill={isHovered ? "rgba(249,247,242,0.95)" : "rgba(249,247,242,0.45)"}
                  textAnchor="middle"
                  fontFamily="Jost, sans-serif"
                  fontWeight={isHovered ? 400 : 300}
                  style={{ transition: "all 200ms" }}
                >
                  {t.name}
                </text>
              )}
            </g>
          );
        })}

        {/* Hover tooltip */}
        {hoveredThinker &&
          (() => {
            const tx = hoveredThinker.x;
            const tooltipW = 200;
            const tooltipH = 64;
            const tipX = Math.max(
              PAD_L + tooltipW / 2,
              Math.min(W - PAD_R - tooltipW / 2, tx)
            );
            const above = hoveredThinker.above;
            const tipY = above
              ? TIMELINE_Y - 80 - tooltipH
              : TIMELINE_Y + 24;

            return (
              <g style={{ pointerEvents: "none" }}>
                {/* Connector line */}
                <line
                  x1={tx} x2={tipX}
                  y1={above ? TIMELINE_Y - 12 : TIMELINE_Y + 12}
                  y2={above ? tipY + tooltipH : tipY}
                  stroke={hoveredThinker.moodColors[1]}
                  strokeWidth={0.8}
                  opacity={0.4}
                />
                {/* Tooltip rect */}
                <rect
                  x={tipX - tooltipW / 2}
                  y={tipY}
                  width={tooltipW}
                  height={tooltipH}
                  fill="#1A2E24"
                  stroke={hoveredThinker.moodColors[1]}
                  strokeWidth={0.8}
                  strokeOpacity={0.4}
                  rx={1}
                />
                {/* Name */}
                <text
                  x={tipX} y={tipY + 18}
                  fontSize={11}
                  fill="rgba(249,247,242,0.9)"
                  textAnchor="middle"
                  fontFamily="Jost, sans-serif"
                  fontWeight={400}
                >
                  {hoveredThinker.name}
                </text>
                {/* Years */}
                <text
                  x={tipX} y={tipY + 30}
                  fontSize={9}
                  fill="rgba(249,247,242,0.35)"
                  textAnchor="middle"
                  fontFamily="Jost, sans-serif"
                  letterSpacing={1}
                >
                  {formatYear(hoveredThinker.born)}{hoveredThinker.died ? ` - ${formatYear(hoveredThinker.died)}` : ""}
                </text>
                {/* Central idea (truncated) */}
                <text
                  x={tipX} y={tipY + 48}
                  fontSize={9.5}
                  fill={hoveredThinker.moodColors[1]}
                  textAnchor="middle"
                  fontFamily="Fraunces, Georgia, serif"
                  fontStyle="italic"
                  fontWeight={300}
                >
                  {hoveredThinker.visualEnergy}
                </text>
              </g>
            );
          })()}
      </svg>

      {/* Dense thinker name row (always visible, for the crowded 20th century) */}
      <div className="px-4 md:px-8 pb-6 pt-2">
        <div
          className="flex items-center gap-0 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
        >
          {labeled.map((t, i) => (
            <button
              key={t.slug}
              onPointerEnter={() => setHoveredSlug(t.slug)}
              onPointerLeave={() => setHoveredSlug(null)}
              onClick={() => handleClick(t.slug)}
              className="flex-shrink-0 px-2 md:px-3 py-2 text-[11px] md:text-[10px] tracking-[0.15em] uppercase transition-colors whitespace-nowrap min-h-[44px] flex items-center"
              style={{
                color:
                  hoveredSlug === t.slug
                    ? t.moodColors[1]
                    : "rgba(249,247,242,0.3)",
              }}
            >
              {t.name}
              {i < labeled.length - 1 && (
                <span className="ml-2 md:ml-3 opacity-20">&middot;</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
