"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Thinker } from "@/lib/frihedstaenkere";
import { formatYear } from "@/lib/frihedstaenkere";

type Props = {
  thinkers: Thinker[];
};

const W = 1400;
const H = 360;
const TIMELINE_Y = 200;
const PAD_L = 60;
const PAD_R = 60;
const PLOT_W = W - PAD_L - PAD_R;

function xFromYear(year: number): number {
  if (year <= 1600) {
    const ratio = (year - -500) / (1600 - -500);
    return PAD_L + ratio * 0.16 * PLOT_W;
  }
  const ratio = (year - 1600) / (2030 - 1600);
  return PAD_L + (0.16 + ratio * 0.84) * PLOT_W;
}

const ERA_ZONES = [
  { label: "Antikken", start: -500, end: 1600, color: "rgba(193,127,58,0.07)", accent: "#C17F3A" },
  { label: "Oplysningstiden", start: 1600, end: 1800, color: "rgba(74,140,90,0.07)", accent: "#4A8C5A" },
  { label: "1800-tallet", start: 1800, end: 1900, color: "rgba(90,110,160,0.07)", accent: "#5A6EA0" },
  { label: "1900-2000-tallet", start: 1900, end: 2030, color: "rgba(140,90,90,0.07)", accent: "#8C5A5A" },
];

const YEAR_TICKS = [1700, 1800, 1900, 1950, 2000];

const MOBILE_ERA_ORDER = [
  { key: "Antikken", accent: "#C17F3A" },
  { key: "Oplysningstiden", accent: "#4A8C5A" },
  { key: "1800-tallet", accent: "#5A6EA0" },
  { key: "1900-tallet", accent: "#8C5A5A" },
  { key: "2000-tallet", accent: "#5A7A8C" },
];

export function ThinkerTimeline({ thinkers }: Props) {
  const router = useRouter();
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);

  const sorted = [...thinkers].sort((a, b) => a.born - b.born);

  const positions = sorted.map((t) => ({
    ...t,
    x: xFromYear(t.born),
  }));

  const labeled = positions.map((t, i) => {
    const prev = positions[i - 1];
    const next = positions[i + 1];
    const tooClose =
      (prev && Math.abs(t.x - prev.x) < 70) ||
      (next && Math.abs(t.x - next.x) < 70);
    return { ...t, showLabel: !tooClose, above: i % 2 === 0 };
  });

  const slugSet = new Set(thinkers.map((t) => t.slug));
  type Arc = { x1: number; x2: number; slug1: string; slug2: string; color: string };
  const arcs: Arc[] = [];
  const seen = new Set<string>();

  for (const t of labeled) {
    for (const rel of t.relations) {
      if (!slugSet.has(rel.slug)) continue;
      const key = [t.slug, rel.slug].sort().join(":");
      if (seen.has(key)) continue;
      seen.add(key);
      const target = labeled.find((p) => p.slug === rel.slug);
      if (!target) continue;
      arcs.push({ x1: t.x, x2: target.x, slug1: t.slug, slug2: rel.slug, color: t.moodColors[1] });
    }
  }

  const hoveredThinker = hoveredSlug ? labeled.find((t) => t.slug === hoveredSlug) : null;
  const isAnyHovered = hoveredSlug !== null;

  const handleClick = useCallback(
    (slug: string) => router.push(`/frihedstænkere/${slug}`),
    [router]
  );

  const mobileGroups = MOBILE_ERA_ORDER.map(({ key, accent }) => ({
    era: key,
    accent,
    thinkers: sorted.filter((t) => t.era === key),
  })).filter((g) => g.thinkers.length > 0);

  return (
    <div className="relative w-full overflow-hidden select-none" style={{ backgroundColor: "#F5EDE0" }}>
      {/* Grain */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none z-0 opacity-40"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(26,26,26,0.04) 1px, transparent 0)",
          backgroundSize: "16px 16px",
        }}
      />

      {/* ── DESKTOP SVG ─────────────────────────────────────── */}
      <div className="hidden md:block relative z-10">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          style={{ height: "auto", display: "block" }}
        >
          <defs>
            <marker id="arrow-era" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
              <polygon points="0 0, 6 2.5, 0 5" fill="rgba(45,95,74,0.7)" />
            </marker>
          </defs>

          {/* Era zone fills */}
          {ERA_ZONES.map((zone) => {
            const x1 = xFromYear(zone.start);
            const x2 = xFromYear(zone.end);
            return <rect key={zone.label} x={x1} y={0} width={x2 - x1} height={H} fill={zone.color} />;
          })}

          {/* Era accent line at top */}
          {ERA_ZONES.map((zone) => {
            const x1 = xFromYear(zone.start);
            const x2 = xFromYear(zone.end);
            return (
              <rect key={`accent-${zone.label}`} x={x1} y={0} width={x2 - x1} height={3}
                fill={zone.accent} opacity={0.35} />
            );
          })}

          {/* Era dividers */}
          {ERA_ZONES.slice(1).map((zone) => {
            const x = xFromYear(zone.start);
            return (
              <line key={zone.label} x1={x} x2={x} y1={3} y2={H - 20}
                stroke="rgba(26,26,26,0.1)" strokeWidth={1} strokeDasharray="3,7" />
            );
          })}

          {/* Era labels */}
          {ERA_ZONES.map((zone) => {
            const x1 = xFromYear(zone.start);
            const x2 = xFromYear(Math.min(zone.end, 2030));
            const cx = (x1 + x2) / 2;
            return (
              <text key={zone.label} x={cx} y={24} fontSize={9.5} fill={zone.accent}
                textAnchor="middle" letterSpacing={3} fontFamily="Jost, sans-serif"
                opacity={0.6} style={{ textTransform: "uppercase" }}>
                {zone.label.toUpperCase()}
              </text>
            );
          })}

          {/* Year tick marks */}
          {YEAR_TICKS.map((year) => {
            const x = xFromYear(year);
            return (
              <g key={year}>
                <line x1={x} x2={x} y1={TIMELINE_Y + 2} y2={TIMELINE_Y + 12}
                  stroke="rgba(26,26,26,0.2)" strokeWidth={1} />
                <text x={x} y={TIMELINE_Y + 24} fontSize={8} fill="rgba(26,26,26,0.3)"
                  textAnchor="middle" fontFamily="Jost, sans-serif" letterSpacing={0.5}>
                  {year}
                </text>
              </g>
            );
          })}

          {/* Break indicator at 1600 */}
          {(() => {
            const xb = xFromYear(1600);
            return (
              <>
                <line x1={xb - 8} x2={xb - 2} y1={TIMELINE_Y - 10} y2={TIMELINE_Y + 10}
                  stroke="rgba(26,26,26,0.25)" strokeWidth={1} />
                <line x1={xb + 2} x2={xb + 8} y1={TIMELINE_Y - 10} y2={TIMELINE_Y + 10}
                  stroke="rgba(26,26,26,0.25)" strokeWidth={1} />
              </>
            );
          })()}

          {/* Main timeline bar */}
          <line x1={PAD_L} x2={W - PAD_R} y1={TIMELINE_Y} y2={TIMELINE_Y}
            stroke="rgba(26,26,26,0.22)" strokeWidth={1.5} />

          {/* Connection arcs */}
          {arcs.map((arc, i) => {
            const midX = (arc.x1 + arc.x2) / 2;
            const arcH = Math.min(95, Math.abs(arc.x2 - arc.x1) * 0.2 + 24);
            const controlY = TIMELINE_Y - arcH;
            const isActive = hoveredSlug === arc.slug1 || hoveredSlug === arc.slug2;
            return (
              <path key={i}
                d={`M ${arc.x1} ${TIMELINE_Y} Q ${midX} ${controlY} ${arc.x2} ${TIMELINE_Y}`}
                fill="none"
                stroke={isActive ? arc.color : "rgba(26,26,26,0.09)"}
                strokeWidth={isActive ? 2 : 0.8}
                strokeDasharray={isActive ? "none" : "2,5"}
                opacity={isAnyHovered && !isActive ? 0.25 : 1}
                style={{ transition: "all 220ms" }}
                markerEnd={isActive ? "url(#arrow-era)" : undefined}
              />
            );
          })}

          {/* Thinker nodes */}
          {labeled.map((t) => {
            const isHovered = hoveredSlug === t.slug;
            const isDimmed = isAnyHovered && !isHovered;
            const labelY = t.above ? TIMELINE_Y - 36 : TIMELINE_Y + 50;
            const yearY = t.above ? TIMELINE_Y - 20 : TIMELINE_Y + 32;

            return (
              <g key={t.slug}
                onClick={() => handleClick(t.slug)}
                onPointerEnter={() => setHoveredSlug(t.slug)}
                onPointerLeave={() => setHoveredSlug(null)}
                style={{
                  cursor: "pointer",
                  opacity: isDimmed ? 0.18 : 1,
                  transition: "opacity 220ms",
                }}
              >
                {/* Outer ring — always visible, accent on hover */}
                <circle cx={t.x} cy={TIMELINE_Y} r={14}
                  fill="none"
                  stroke={isHovered ? t.moodColors[1] : "rgba(26,26,26,0.12)"}
                  strokeWidth={isHovered ? 1.5 : 1}
                  style={{ transition: "all 220ms" }}
                />

                {/* Inner node */}
                <circle cx={t.x} cy={TIMELINE_Y} r={isHovered ? 7.5 : 5.5}
                  fill={isHovered ? t.moodColors[1] : "rgba(26,26,26,0.18)"}
                  stroke={isHovered ? "none" : "rgba(26,26,26,0.45)"}
                  strokeWidth={1.5}
                  style={{ transition: "all 220ms" }}
                />

                {/* Year label */}
                {t.showLabel && (
                  <text x={t.x} y={yearY} fontSize={9} textAnchor="middle"
                    fontFamily="Jost, sans-serif"
                    fill={isHovered ? t.moodColors[1] : "rgba(26,26,26,0.38)"}
                    style={{ transition: "fill 220ms" }}>
                    {formatYear(t.born)}
                  </text>
                )}

                {/* Name label */}
                {t.showLabel && (
                  <text x={t.x} y={labelY}
                    fontSize={isHovered ? 13.5 : 11}
                    fill={isHovered ? "rgba(26,26,26,0.95)" : "rgba(26,26,26,0.58)"}
                    textAnchor="middle"
                    fontFamily="Jost, sans-serif"
                    fontWeight={isHovered ? 500 : 300}
                    style={{ transition: "all 220ms" }}>
                    {t.name}
                  </text>
                )}
              </g>
            );
          })}

          {/* Tooltip — dark card */}
          {hoveredThinker && (() => {
            const tx = hoveredThinker.x;
            const tw = 220;
            const th = 76;
            const tipX = Math.max(PAD_L + tw / 2, Math.min(W - PAD_R - tw / 2, tx));
            const above = hoveredThinker.above;
            const tipY = above ? TIMELINE_Y - 100 - th : TIMELINE_Y + 30;

            return (
              <g style={{ pointerEvents: "none" }}>
                <line
                  x1={tx} x2={tipX}
                  y1={above ? TIMELINE_Y - 16 : TIMELINE_Y + 16}
                  y2={above ? tipY + th : tipY}
                  stroke={hoveredThinker.moodColors[1]} strokeWidth={0.8} opacity={0.5}
                />
                <rect x={tipX - tw / 2} y={tipY} width={tw} height={th}
                  fill="#1E1A14" stroke={hoveredThinker.moodColors[1]}
                  strokeWidth={0.8} strokeOpacity={0.5} rx={2} />
                {/* Accent top bar */}
                <rect x={tipX - tw / 2} y={tipY} width={tw} height={2}
                  fill={hoveredThinker.moodColors[1]} opacity={0.6} rx={1} />
                <text x={tipX} y={tipY + 22} fontSize={12} fill="rgba(249,247,242,0.92)"
                  textAnchor="middle" fontFamily="Jost, sans-serif" fontWeight={400}>
                  {hoveredThinker.name}
                </text>
                <text x={tipX} y={tipY + 36} fontSize={9} fill="rgba(249,247,242,0.38)"
                  textAnchor="middle" fontFamily="Jost, sans-serif" letterSpacing={1}>
                  {formatYear(hoveredThinker.born)}{hoveredThinker.died ? ` - ${formatYear(hoveredThinker.died)}` : ""}
                </text>
                <text x={tipX} y={tipY + 58} fontSize={10.5} fill={hoveredThinker.moodColors[1]}
                  textAnchor="middle" fontFamily="Fraunces, Georgia, serif"
                  fontStyle="italic" fontWeight={300}>
                  {hoveredThinker.visualEnergy}
                </text>
              </g>
            );
          })()}
        </svg>

        {/* Name strip — desktop */}
        <div className="px-8 pb-5 pt-1">
          <div className="flex items-center overflow-x-auto"
            style={{ scrollbarWidth: "none" } as React.CSSProperties}>
            {labeled.map((t, i) => (
              <button key={t.slug}
                onPointerEnter={() => setHoveredSlug(t.slug)}
                onPointerLeave={() => setHoveredSlug(null)}
                onClick={() => handleClick(t.slug)}
                className="flex-shrink-0 px-3 py-2 text-[10px] tracking-[0.15em] uppercase whitespace-nowrap min-h-[44px] flex items-center transition-all"
                style={{
                  color: hoveredSlug === t.slug ? t.moodColors[1] : "rgba(26,26,26,0.35)",
                  opacity: isAnyHovered && hoveredSlug !== t.slug ? 0.3 : 1,
                }}>
                {t.name}
                {i < labeled.length - 1 && <span className="ml-3 opacity-20">&middot;</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── MOBILE VIEW ─────────────────────────────────────── */}
      <div className="md:hidden relative z-10 px-5 py-7">
        <div className="space-y-5">
          {mobileGroups.map(({ era, accent, thinkers: eraT }) => (
            <div key={era}>
              {/* Era header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-3 h-px flex-shrink-0" style={{ backgroundColor: accent }} />
                <span className="text-[9px] tracking-[0.4em] uppercase"
                  style={{ color: accent, opacity: 0.8 }}>
                  {era}
                </span>
                <div className="flex-1 h-px" style={{ backgroundColor: "rgba(26,26,26,0.08)" }} />
              </div>

              {/* Thinker chips */}
              <div className="flex flex-wrap gap-2 pl-6">
                {eraT.map((t) => (
                  <button
                    key={t.slug}
                    onClick={() => handleClick(t.slug)}
                    className="flex items-center gap-2 px-3 py-2 border transition-all active:scale-95"
                    style={{
                      borderColor: "rgba(26,26,26,0.12)",
                      backgroundColor: "rgba(245,237,224,0.5)",
                    }}
                  >
                    <span className="text-[8.5px] font-mono" style={{ color: accent, opacity: 0.7 }}>
                      {formatYear(t.born)}
                    </span>
                    <span className="text-[12px] font-light tracking-wide text-ink/80">
                      {t.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Mobile total count */}
        <div className="mt-6 text-[9px] tracking-[0.3em] uppercase text-ink/25 text-center">
          {sorted.length} tænkere · {Math.abs(sorted[0].born)} f.Kr. - {sorted[sorted.length - 1].born}
        </div>
      </div>
    </div>
  );
}
