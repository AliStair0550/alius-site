"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Thinker } from "@/lib/frihedstaenkere";
import { formatYear } from "@/lib/frihedstaenkere";

type Props = { thinkers: Thinker[] };

const W = 1400;
const H = 500;
const TIMELINE_Y = 270;
const PAD_L = 70;
const PAD_R = 70;
const PLOT_W = W - PAD_L - PAD_R;
const LEVEL_STEP = 34;
const MAX_LEVEL = 5;
const LABEL_CLEAR = 82;
const LEVEL_ORDER = [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5];

function xFromYear(year: number): number {
  if (year <= 1600) {
    return PAD_L + ((year + 500) / 2100) * 0.16 * PLOT_W;
  }
  return PAD_L + (0.16 + ((year - 1600) / 430) * 0.84) * PLOT_W;
}

const ERA_ZONES = [
  { label: "Antikken",          start: -500, end: 1600, accent: "#C17F3A" },
  { label: "Oplysningstiden",   start: 1600, end: 1800, accent: "#4A8C5A" },
  { label: "1800-tallet",       start: 1800, end: 1900, accent: "#5A6EA0" },
  { label: "1900-2000-tallet",  start: 1900, end: 2030, accent: "#8C5A5A" },
];

const YEAR_TICKS = [1700, 1800, 1900, 1950, 2000];

const MOBILE_ERA_ORDER = [
  { key: "Antikken",        accent: "#C17F3A" },
  { key: "Oplysningstiden", accent: "#4A8C5A" },
  { key: "1800-tallet",     accent: "#5A6EA0" },
  { key: "1900-tallet",     accent: "#8C5A5A" },
  { key: "2000-tallet",     accent: "#5A7A8C" },
];

type Placed = Thinker & { x: number; nodeY: number; level: number };

function placeThinkers(thinkers: Thinker[]): Placed[] {
  const sorted = [...thinkers].sort((a, b) => a.born - b.born);
  const occupied = new Map<number, number[]>();
  return sorted.map((t) => {
    const x = xFromYear(t.born);
    let level = 0;
    for (const lvl of LEVEL_ORDER) {
      if (Math.abs(lvl) > MAX_LEVEL) continue;
      const at = occupied.get(lvl) ?? [];
      if (!at.some((px) => Math.abs(px - x) < LABEL_CLEAR)) {
        level = lvl;
        break;
      }
    }
    if (!occupied.has(level)) occupied.set(level, []);
    occupied.get(level)!.push(x);
    return { ...t, x, level, nodeY: TIMELINE_Y + level * LEVEL_STEP };
  });
}

export function ThinkerTimeline({ thinkers }: Props) {
  const router = useRouter();
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);

  const placed = placeThinkers(thinkers);

  const slugSet = new Set(thinkers.map((t) => t.slug));
  type Arc = { x1: number; y1: number; x2: number; y2: number; slug1: string; slug2: string; color: string };
  const arcs: Arc[] = [];
  const seen = new Set<string>();
  for (const t of placed) {
    for (const rel of t.relations) {
      if (!slugSet.has(rel.slug)) continue;
      const key = [t.slug, rel.slug].sort().join(":");
      if (seen.has(key)) continue;
      seen.add(key);
      const target = placed.find((p) => p.slug === rel.slug);
      if (!target) continue;
      arcs.push({ x1: t.x, y1: t.nodeY, x2: target.x, y2: target.nodeY, slug1: t.slug, slug2: rel.slug, color: t.moodColors[1] });
    }
  }

  const hoveredT = hoveredSlug ? placed.find((t) => t.slug === hoveredSlug) ?? null : null;
  const isAnyHovered = hoveredSlug !== null;

  const handleClick = useCallback(
    (slug: string) => router.push(`/frihedstænkere/${slug}`),
    [router]
  );

  const mobileGroups = MOBILE_ERA_ORDER.map(({ key, accent }) => ({
    era: key,
    accent,
    thinkers: [...thinkers].filter((t) => t.era === key).sort((a, b) => a.born - b.born),
  })).filter((g) => g.thinkers.length > 0);

  return (
    <div className="relative w-full overflow-hidden select-none" style={{ backgroundColor: "#F5EDE0" }}>
      <div aria-hidden className="absolute inset-0 pointer-events-none z-0 opacity-40"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(26,26,26,0.04) 1px, transparent 0)", backgroundSize: "16px 16px" }} />

      {/* ── DESKTOP ─────────────────────────────── */}
      <div className="hidden md:block relative z-10">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height: "auto", display: "block" }}>
          <defs>
            <filter id="node-glow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="7" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <radialGradient id="bg-vignette" cx="50%" cy="54%" r="55%">
              <stop offset="0%" stopColor="rgba(255,251,244,0.7)" />
              <stop offset="100%" stopColor="rgba(245,237,224,0)" />
            </radialGradient>
            {ERA_ZONES.map((z) => (
              <linearGradient key={`g-${z.label}`} id={`g-${z.label}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor={z.accent} stopOpacity={0.04} />
                <stop offset="25%"  stopColor={z.accent} stopOpacity={0.11} />
                <stop offset="75%"  stopColor={z.accent} stopOpacity={0.11} />
                <stop offset="100%" stopColor={z.accent} stopOpacity={0.04} />
              </linearGradient>
            ))}
          </defs>

          {/* Background vignette */}
          <rect x={0} y={0} width={W} height={H} fill="url(#bg-vignette)" />

          {/* Era fills */}
          {ERA_ZONES.map((z) => {
            const x1 = xFromYear(z.start);
            const x2 = xFromYear(Math.min(z.end, 2028));
            return <rect key={z.label} x={x1} y={0} width={x2 - x1} height={H} fill={`url(#g-${z.label})`} />;
          })}

          {/* Era accent bars */}
          {ERA_ZONES.map((z) => {
            const x1 = xFromYear(z.start);
            const x2 = xFromYear(Math.min(z.end, 2028));
            return <rect key={`b-${z.label}`} x={x1} y={0} width={x2 - x1} height={4} fill={z.accent} opacity={0.5} />;
          })}

          {/* Era dividers */}
          {ERA_ZONES.slice(1).map((z) => {
            const x = xFromYear(z.start);
            return <line key={`d-${z.label}`} x1={x} x2={x} y1={4} y2={H - 28} stroke="rgba(26,26,26,0.1)" strokeWidth={1} strokeDasharray="3,9" />;
          })}

          {/* Era labels */}
          {ERA_ZONES.map((z) => {
            const x1 = xFromYear(z.start);
            const x2 = xFromYear(Math.min(z.end, 2028));
            return (
              <text key={`l-${z.label}`} x={(x1 + x2) / 2} y={27} fontSize={9}
                fill={z.accent} textAnchor="middle" letterSpacing={3.5}
                fontFamily="Jost, sans-serif" opacity={0.7}>
                {z.label.toUpperCase()}
              </text>
            );
          })}

          {/* Year ticks */}
          {YEAR_TICKS.map((yr) => {
            const x = xFromYear(yr);
            return (
              <g key={yr}>
                <line x1={x} x2={x} y1={TIMELINE_Y + 2} y2={TIMELINE_Y + 13} stroke="rgba(26,26,26,0.18)" strokeWidth={1} />
                <text x={x} y={TIMELINE_Y + 25} fontSize={8.5} fill="rgba(26,26,26,0.28)"
                  textAnchor="middle" fontFamily="Jost, sans-serif" letterSpacing={0.5}>
                  {yr}
                </text>
              </g>
            );
          })}

          {/* Break mark at ~1600 */}
          {(() => {
            const xb = xFromYear(1600);
            return (
              <>
                <line x1={xb - 8} x2={xb - 2} y1={TIMELINE_Y - 11} y2={TIMELINE_Y + 11} stroke="rgba(26,26,26,0.2)" strokeWidth={1} />
                <line x1={xb + 2} x2={xb + 8} y1={TIMELINE_Y - 11} y2={TIMELINE_Y + 11} stroke="rgba(26,26,26,0.2)" strokeWidth={1} />
              </>
            );
          })()}

          {/* Timeline bar */}
          <line x1={PAD_L} x2={W - PAD_R} y1={TIMELINE_Y} y2={TIMELINE_Y}
            stroke="rgba(26,26,26,0.22)" strokeWidth={1.5} />

          {/* Stems */}
          {placed.map((t) => {
            if (t.level === 0) return null;
            const stemTop    = t.level < 0 ? t.nodeY + 13 : TIMELINE_Y - 2;
            const stemBottom = t.level < 0 ? TIMELINE_Y + 2 : t.nodeY - 13;
            return (
              <line key={`stem-${t.slug}`} x1={t.x} y1={stemTop} x2={t.x} y2={stemBottom}
                stroke="rgba(26,26,26,0.13)" strokeWidth={0.8} strokeDasharray="2,3.5" />
            );
          })}

          {/* Connection arcs */}
          {arcs.map((arc, i) => {
            const isActive = hoveredSlug === arc.slug1 || hoveredSlug === arc.slug2;
            const midX = (arc.x1 + arc.x2) / 2;
            const topY = Math.min(arc.y1, arc.y2);
            const arcH = Math.min(100, Math.abs(arc.x2 - arc.x1) * 0.18 + 22);
            return (
              <path key={i}
                d={`M ${arc.x1} ${arc.y1} Q ${midX} ${topY - arcH} ${arc.x2} ${arc.y2}`}
                fill="none"
                stroke={isActive ? arc.color : "rgba(26,26,26,0.1)"}
                strokeWidth={isActive ? 2 : 1}
                strokeDasharray={isActive ? undefined : "2,5"}
                opacity={isAnyHovered && !isActive ? 0.15 : 1}
                style={{ transition: "all 200ms" }}
              />
            );
          })}

          {/* Nodes */}
          {placed.map((t) => {
            const isHovered = hoveredSlug === t.slug;
            const isDimmed  = isAnyHovered && !isHovered;
            const above  = t.level <= 0;
            const nameY  = above ? t.nodeY - 30 : t.nodeY + 36;
            const yearY  = above ? t.nodeY - 18 : t.nodeY + 23;
            return (
              <g key={t.slug}
                onClick={() => handleClick(t.slug)}
                onPointerEnter={() => setHoveredSlug(t.slug)}
                onPointerLeave={() => setHoveredSlug(null)}
                style={{ cursor: "pointer", opacity: isDimmed ? 0.13 : 1, transition: "opacity 200ms" }}>

                {/* Animated pulse ring */}
                {isHovered && (
                  <circle cx={t.x} cy={t.nodeY} r={15} fill="none"
                    stroke={t.moodColors[1]} strokeWidth={1.5} style={{ pointerEvents: "none" }}>
                    <animate attributeName="r"       from="15" to="36" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.55" to="0" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Outer ring */}
                <circle cx={t.x} cy={t.nodeY} r={14} fill="none"
                  stroke={isHovered ? t.moodColors[1] : "rgba(26,26,26,0.15)"}
                  strokeWidth={isHovered ? 2 : 1}
                  style={{ transition: "all 200ms" }} />

                {/* Inner dot */}
                <circle cx={t.x} cy={t.nodeY} r={isHovered ? 8.5 : 5}
                  fill={isHovered ? t.moodColors[1] : "rgba(26,26,26,0.22)"}
                  filter={isHovered ? "url(#node-glow)" : undefined}
                  style={{ transition: "all 200ms" }} />

                {/* Year */}
                <text x={t.x} y={yearY} fontSize={8.5} textAnchor="middle"
                  fontFamily="Jost, sans-serif"
                  fill={isHovered ? t.moodColors[1] : "rgba(26,26,26,0.32)"}
                  style={{ transition: "fill 200ms" }}>
                  {formatYear(t.born)}
                </text>

                {/* Name */}
                <text x={t.x} y={nameY}
                  fontSize={isHovered ? 13.5 : 10}
                  fill={isHovered ? "rgba(26,26,26,0.95)" : "rgba(26,26,26,0.52)"}
                  textAnchor="middle" fontFamily="Jost, sans-serif"
                  fontWeight={isHovered ? 500 : 300}
                  style={{ transition: "all 200ms" }}>
                  {t.name}
                </text>
              </g>
            );
          })}

          {/* Tooltip */}
          {hoveredT && (() => {
            const tw = 284;
            const th = 96;
            const PW = 64;
            const tipX = Math.max(PAD_L + tw / 2 + 4, Math.min(W - PAD_R - tw / 2 - 4, hoveredT.x));
            const preferred = hoveredT.level <= 0
              ? hoveredT.nodeY - 14 - th - 10
              : hoveredT.nodeY + 14 + 10;
            const tipY = Math.max(8, Math.min(H - th - 8, preferred));
            const ldrY0 = tipY < hoveredT.nodeY ? tipY + th : tipY;
            const ldrY1 = tipY < hoveredT.nodeY ? hoveredT.nodeY - 14 : hoveredT.nodeY + 14;
            return (
              <g style={{ pointerEvents: "none" }}>
                {/* Shadow */}
                <rect x={tipX - tw / 2 + 3} y={tipY + 3} width={tw} height={th} fill="rgba(0,0,0,0.16)" rx={2} />
                {/* Card */}
                <rect x={tipX - tw / 2} y={tipY} width={tw} height={th}
                  fill="#1E1A14" stroke={hoveredT.moodColors[1]} strokeWidth={0.7} strokeOpacity={0.45} rx={2} />
                {/* Accent bar */}
                <rect x={tipX - tw / 2} y={tipY} width={tw} height={3.5} fill={hoveredT.moodColors[1]} opacity={0.7} rx={1} />
                {/* Leader */}
                <line x1={hoveredT.x} y1={ldrY1} x2={tipX} y2={ldrY0}
                  stroke={hoveredT.moodColors[1]} strokeWidth={0.8} opacity={0.4} />
                {/* Portrait */}
                {hoveredT.portraitSrc && (
                  <image href={hoveredT.portraitSrc}
                    x={tipX - tw / 2 + 6} y={tipY + 8}
                    width={PW} height={th - 16}
                    preserveAspectRatio="xMidYMin slice" />
                )}
                {/* Text block */}
                <text x={tipX - tw / 2 + PW + 14} y={tipY + 24} fontSize={13}
                  fill="rgba(249,247,242,0.94)" fontFamily="Jost, sans-serif" fontWeight={500}>
                  {hoveredT.name}
                </text>
                <text x={tipX - tw / 2 + PW + 14} y={tipY + 38} fontSize={8.5}
                  fill="rgba(249,247,242,0.35)" fontFamily="Jost, sans-serif" letterSpacing={1}>
                  {formatYear(hoveredT.born)}{hoveredT.died ? ` - ${formatYear(hoveredT.died)}` : ""} · {hoveredT.era}
                </text>
                <text x={tipX - tw / 2 + PW + 14} y={tipY + 64} fontSize={10.5}
                  fill={hoveredT.moodColors[1]} fontFamily="Fraunces, Georgia, serif"
                  fontStyle="italic" fontWeight={300}>
                  {hoveredT.visualEnergy.length > 30
                    ? hoveredT.visualEnergy.slice(0, 28) + "…"
                    : hoveredT.visualEnergy}
                </text>
              </g>
            );
          })()}
        </svg>

        {/* Name strip */}
        <div className="px-8 pb-5 pt-1 border-t border-ink/5">
          <div className="flex items-center overflow-x-auto"
            style={{ scrollbarWidth: "none" } as React.CSSProperties}>
            {[...placed].sort((a, b) => a.born - b.born).map((t, i, arr) => (
              <button key={t.slug}
                onPointerEnter={() => setHoveredSlug(t.slug)}
                onPointerLeave={() => setHoveredSlug(null)}
                onClick={() => handleClick(t.slug)}
                className="flex-shrink-0 px-2.5 py-2 text-[9.5px] tracking-[0.18em] uppercase whitespace-nowrap min-h-[44px] flex items-center transition-all"
                style={{
                  color: hoveredSlug === t.slug ? t.moodColors[1] : "rgba(26,26,26,0.3)",
                  fontWeight: hoveredSlug === t.slug ? 500 : 300,
                  opacity: isAnyHovered && hoveredSlug !== t.slug ? 0.22 : 1,
                }}>
                {t.name}
                {i < arr.length - 1 && <span className="ml-2.5 opacity-15 text-[8px]">/</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── MOBILE ──────────────────────────────── */}
      <div className="md:hidden relative z-10 px-5 py-7">
        <div className="space-y-6">
          {mobileGroups.map(({ era, accent, thinkers: eraT }) => (
            <div key={era}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-4 h-px flex-shrink-0" style={{ backgroundColor: accent }} />
                <span className="text-[9px] tracking-[0.4em] uppercase" style={{ color: accent, opacity: 0.8 }}>
                  {era}
                </span>
                <div className="flex-1 h-px" style={{ backgroundColor: "rgba(26,26,26,0.08)" }} />
              </div>
              <div className="flex flex-wrap gap-2 pl-6">
                {eraT.map((t) => (
                  <button key={t.slug} onClick={() => handleClick(t.slug)}
                    className="flex items-center gap-2 px-3 py-2 border transition-all active:scale-95"
                    style={{ borderColor: "rgba(26,26,26,0.12)", backgroundColor: "rgba(245,237,224,0.5)" }}>
                    <span className="text-[8.5px] font-mono" style={{ color: accent, opacity: 0.7 }}>
                      {formatYear(t.born)}
                    </span>
                    <span className="text-[12px] font-light tracking-wide text-ink/80">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 text-[9px] tracking-[0.3em] uppercase text-ink/25 text-center">
          {thinkers.length} tænkere
        </div>
      </div>
    </div>
  );
}
