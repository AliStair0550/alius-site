"use client";

import { useEffect, useRef, useState } from "react";

// ── Brand Visualization ─────────────────────────────────────────────────────
// Digital experience canvas: browser + mobile screens building themselves up
function BrandViz({ active }: { active: boolean }) {
  const B_PERIM = 2 * (155 + 88); // browser frame perimeter
  const M_PERIM = 2 * (38  + 68); // mobile frame perimeter

  return (
    <div className="h-[172px] overflow-hidden select-none">
      <svg viewBox="0 0 260 120" className="w-full h-full">

        {/* ═══ Browser frame ═══ */}
        <rect x="0.5" y="1.5" width="155" height="88" rx="3"
          fill="none" stroke="#2D5F4A" strokeWidth="1.2"
          style={{
            strokeDasharray: B_PERIM,
            strokeDashoffset: active ? 0 : B_PERIM,
            transition: "stroke-dashoffset 820ms cubic-bezier(0.4,0,0.2,1) 120ms",
          }} />

        {/* Chrome bar */}
        <line x1="0.5" y1="14.5" x2="155.5" y2="14.5"
          stroke="rgba(45,95,74,0.18)" strokeWidth="0.6"
          style={{ opacity: active ? 1 : 0, transition: "opacity 250ms 880ms" }} />

        {/* Window controls */}
        {[6, 12, 18].map((x, i) => (
          <circle key={i} cx={x} cy="8" r="2"
            fill={["rgba(45,95,74,0.75)","rgba(45,95,74,0.4)","rgba(45,95,74,0.2)"][i]}
            style={{ opacity: active ? 1 : 0, transition: `opacity 220ms ${900 + i * 55}ms` }} />
        ))}

        {/* URL bar */}
        <rect x="26" y="3.5" width="88" height="8" rx="4"
          fill="rgba(45,95,74,0.06)" stroke="rgba(45,95,74,0.14)" strokeWidth="0.5"
          style={{ opacity: active ? 1 : 0, transition: "opacity 250ms 950ms" }} />
        <text x="70" y="9.5" fontSize="3.8" fill="rgba(26,26,26,0.28)"
          fontFamily="Jost,sans-serif" textAnchor="middle"
          style={{ opacity: active ? 1 : 0, transition: "opacity 200ms 1000ms" }}>
          alius.dk
        </text>

        {/* Nav items */}
        {[7, 40, 73, 118].map((x, i) => (
          <rect key={i} x={x} y="18" width={i === 3 ? 18 : 22} height="3" rx="1.5"
            fill={i === 3 ? "rgba(45,95,74,0.6)" : "rgba(26,26,26,0.1)"}
            style={{ opacity: active ? 1 : 0, transition: `opacity 220ms ${1040 + i * 50}ms` }} />
        ))}

        {/* Hero heading */}
        <rect x="7" y="28" width="110" height="5" rx="1" fill="rgba(26,26,26,0.18)"
          style={{ opacity: active ? 1 : 0, transition: "opacity 320ms 1180ms" }} />
        <rect x="7" y="36" width="80" height="3" rx="1" fill="rgba(26,26,26,0.1)"
          style={{ opacity: active ? 1 : 0, transition: "opacity 280ms 1260ms" }} />
        <rect x="7" y="41.5" width="60" height="2.5" rx="1" fill="rgba(26,26,26,0.07)"
          style={{ opacity: active ? 1 : 0, transition: "opacity 260ms 1320ms" }} />

        {/* CTA button */}
        <rect x="7" y="49" width="34" height="8.5" rx="2" fill="rgba(45,95,74,0.85)"
          style={{ opacity: active ? 1 : 0, transition: "opacity 320ms 1400ms" }} />
        <text x="24" y="55" fontSize="3.6" fill="rgba(250,248,244,0.92)"
          fontFamily="Jost,sans-serif" textAnchor="middle"
          style={{ opacity: active ? 1 : 0, transition: "opacity 260ms 1460ms" }}>
          Se mere →
        </text>

        {/* Feature cards */}
        {[0, 1, 2].map(i => (
          <g key={i}>
            <rect x={7 + i * 50} y="64" width="44" height="21" rx="2"
              fill="rgba(26,26,26,0.03)" stroke="rgba(26,26,26,0.08)" strokeWidth="0.5"
              style={{ opacity: active ? 1 : 0, transition: `opacity 280ms ${1480 + i * 70}ms` }} />
            <rect x={11 + i * 50} y="69" width="16" height="2.5" rx="1" fill="rgba(26,26,26,0.18)"
              style={{ opacity: active ? 1 : 0, transition: `opacity 220ms ${1530 + i * 70}ms` }} />
            <rect x={11 + i * 50} y="74" width="30" height="2" rx="1" fill="rgba(26,26,26,0.09)"
              style={{ opacity: active ? 1 : 0, transition: `opacity 200ms ${1560 + i * 70}ms` }} />
            <rect x={11 + i * 50} y="78" width="22" height="2" rx="1" fill="rgba(26,26,26,0.06)"
              style={{ opacity: active ? 1 : 0, transition: `opacity 200ms ${1580 + i * 70}ms` }} />
          </g>
        ))}

        {/* ═══ Mobile frame ═══ */}
        <rect x="165.5" y="7.5" width="38" height="68" rx="5"
          fill="none" stroke="#2D5F4A" strokeWidth="1.0"
          style={{
            strokeDasharray: M_PERIM,
            strokeDashoffset: active ? 0 : M_PERIM,
            transition: "stroke-dashoffset 560ms ease-out 650ms",
          }} />

        {/* Phone notch */}
        <rect x="178" y="11.5" width="12" height="4" rx="2"
          fill="rgba(45,95,74,0.15)"
          style={{ opacity: active ? 1 : 0, transition: "opacity 220ms 1240ms" }} />

        {/* Mobile content */}
        <rect x="170" y="22" width="28" height="2.5" rx="1" fill="rgba(26,26,26,0.15)"
          style={{ opacity: active ? 1 : 0, transition: "opacity 280ms 1290ms" }} />
        <rect x="170" y="27.5" width="22" height="2" rx="1" fill="rgba(26,26,26,0.08)"
          style={{ opacity: active ? 1 : 0, transition: "opacity 250ms 1350ms" }} />
        <rect x="170" y="32" width="16" height="2" rx="1" fill="rgba(26,26,26,0.05)"
          style={{ opacity: active ? 1 : 0, transition: "opacity 240ms 1390ms" }} />

        {/* Mobile CTA */}
        <rect x="170" y="39" width="28" height="8" rx="2" fill="rgba(45,95,74,0.75)"
          style={{ opacity: active ? 1 : 0, transition: "opacity 300ms 1470ms" }} />

        {/* Mobile cards */}
        {[0, 1].map(i => (
          <rect key={i} x={170 + i * 16} y="55" width="12" height="9" rx="1.5"
            fill="rgba(26,26,26,0.04)" stroke="rgba(26,26,26,0.08)" strokeWidth="0.5"
            style={{ opacity: active ? 1 : 0, transition: `opacity 250ms ${1580 + i * 60}ms` }} />
        ))}

        {/* Bottom nav dots */}
        {[179, 184, 189].map((x, i) => (
          <circle key={i} cx={x} cy="70" r="1.5"
            fill={i === 1 ? "#2D5F4A" : "rgba(26,26,26,0.18)"}
            style={{ opacity: active ? 1 : 0, transition: `opacity 220ms ${1670 + i * 40}ms` }} />
        ))}

        {/* Responsive connector */}
        <line x1="156" y1="44" x2="165" y2="44"
          stroke="rgba(45,95,74,0.2)" strokeWidth="0.6" strokeDasharray="2,2.5"
          style={{ opacity: active ? 1 : 0, transition: "opacity 280ms 1580ms" }} />

        {/* Label */}
        <text x="0" y="106" fontSize="5" fill="rgba(26,26,26,0.2)"
          fontFamily="Jost,sans-serif" letterSpacing="2.2"
          style={{ opacity: active ? 1 : 0, transition: "opacity 380ms 1840ms" }}>
          IDENTITET · UDTRYK · OPLEVELSE
        </text>

      </svg>
    </div>
  );
}

// ── Strategi Visualization ──────────────────────────────────────────────────
// Shows: growth curve drawing itself · market position · upward trajectory
const CURVE = "M 0,108 C 18,106 32,98 52,86 S 88,62 112,50 S 148,28 178,18 S 218,7 252,3";
const CURVE_LEN = 318;

function StrategiViz({ active }: { active: boolean }) {
  return (
    <div className="h-[172px] flex flex-col justify-center overflow-hidden select-none">
      <svg viewBox="0 0 262 118" className="w-full" style={{ height: 148 }}>

        {/* Horizontal grid lines */}
        {[28, 58, 88].map(y => (
          <line key={y} x1="0" y1={y} x2="262" y2={y}
            stroke="rgba(26,26,26,0.055)" strokeWidth="0.7"
            style={{ opacity: active ? 1 : 0, transition: "opacity 350ms 80ms" }}
          />
        ))}

        {/* Vertical grid lines */}
        {[65, 130, 196].map(x => (
          <line key={x} x1={x} y1="0" x2={x} y2="112"
            stroke="rgba(26,26,26,0.04)" strokeWidth="0.7"
            style={{ opacity: active ? 1 : 0, transition: "opacity 350ms 80ms" }}
          />
        ))}

        {/* Area under curve */}
        <path
          d={`${CURVE} L 252,112 L 0,112 Z`}
          fill="rgba(45,95,74,0.07)"
          style={{ opacity: active ? 1 : 0, transition: "opacity 500ms 820ms" }}
        />

        {/* Growth curve — draws itself */}
        <path
          d={CURVE}
          fill="none"
          stroke="#2D5F4A"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: CURVE_LEN,
            strokeDashoffset: active ? 0 : CURVE_LEN,
            transition: "stroke-dashoffset 960ms cubic-bezier(0.4,0,0.2,1) 180ms",
          }}
        />

        {/* Endpoint — pulsing dot */}
        <circle cx="252" cy="3" r="3" fill="#2D5F4A"
          style={{ opacity: active ? 1 : 0, transition: "opacity 150ms 1080ms" }}
        />
        {active && (
          <circle cx="252" cy="3" r="3" fill="none" stroke="#2D5F4A" strokeWidth="1">
            <animate attributeName="r"       values="3;14"  dur="2s" begin="1.15s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0" dur="2s" begin="1.15s" repeatCount="indefinite" />
          </circle>
        )}

        {/* Quarter labels */}
        {["Q1","Q2","Q3","Q4"].map((q, i) => (
          <text key={q} x={8 + i * 65} y="117" fontSize="7" fill="rgba(26,26,26,0.3)"
            fontFamily="Jost,sans-serif" letterSpacing="0.8"
            style={{ opacity: active ? 1 : 0, transition: `opacity 280ms ${560 + i * 75}ms` }}>
            {q}
          </text>
        ))}

        {/* Y-axis indicator */}
        <text x="0" y="6" fontSize="6.5" fill="rgba(26,26,26,0.22)"
          fontFamily="Jost,sans-serif" letterSpacing="0.5"
          style={{ opacity: active ? 1 : 0, transition: "opacity 300ms 700ms" }}>
          VÆKST
        </text>
      </svg>
    </div>
  );
}

// ── Teknologi Visualization ─────────────────────────────────────────────────
// Shows: neural/data network · nodes · animated data pulses
const NODES = [
  { x: 16, y: 22  }, { x: 62, y: 10  }, { x: 114, y: 27 }, { x: 162, y: 12 },
  { x: 212, y: 25 }, { x: 252, y: 14 }, { x: 36,  y: 66 }, { x: 88,  y: 76 },
  { x: 138, y: 60 }, { x: 188, y: 70 }, { x: 236, y: 58 }, { x: 18,  y: 106},
  { x: 68,  y: 116}, { x: 124, y: 103}, { x: 174, y: 113}, { x: 230, y: 98 },
];

const EDGES: [number,number][] = [
  [0,1],[1,2],[2,3],[3,4],[4,5],
  [0,6],[1,6],[1,7],[2,7],[2,8],[3,8],[3,9],[4,9],[4,10],[5,10],
  [6,7],[7,8],[8,9],[9,10],
  [6,11],[7,11],[7,12],[8,12],[8,13],[9,13],[9,14],[10,14],[10,15],
  [11,12],[12,13],[13,14],[14,15],
];

// Edges that get animated data pulses
const PULSE_PATHS = [
  { from:1, to:2,  dur:"1.9s", begin:"0s"    },
  { from:7, to:8,  dur:"2.2s", begin:"0.45s" },
  { from:3, to:9,  dur:"2.0s", begin:"0.9s"  },
  { from:8, to:13, dur:"1.8s", begin:"0.2s"  },
  { from:4, to:10, dur:"2.3s", begin:"1.1s"  },
];

function TeknologiViz({ active }: { active: boolean }) {
  return (
    <div className="h-[172px] overflow-hidden select-none">
      <svg viewBox="0 0 268 128" className="w-full h-full">

        {/* Edges */}
        {EDGES.map(([a, b], i) => (
          <line key={i}
            x1={NODES[a].x} y1={NODES[a].y}
            x2={NODES[b].x} y2={NODES[b].y}
            stroke="rgba(45,95,74,0.22)"
            strokeWidth="0.65"
            style={{ opacity: active ? 1 : 0, transition: `opacity 240ms ${120 + i * 16}ms` }}
          />
        ))}

        {/* Animated data pulses */}
        {active && PULSE_PATHS.map((pp, i) => (
          <circle key={i} r="2" fill="#2D5F4A">
            <animateMotion
              dur={pp.dur}
              begin={pp.begin}
              repeatCount="indefinite"
              path={`M${NODES[pp.from].x},${NODES[pp.from].y} L${NODES[pp.to].x},${NODES[pp.to].y}`}
            />
            <animate attributeName="opacity" values="0;1;0"   dur={pp.dur} begin={pp.begin} repeatCount="indefinite" />
            <animate attributeName="r"       values="1.5;2.5;1.5" dur={pp.dur} begin={pp.begin} repeatCount="indefinite" />
          </circle>
        ))}

        {/* Nodes */}
        {NODES.map((n, i) => {
          const primary = i % 5 === 0 || i === 8;
          return (
            <circle key={i}
              cx={n.x} cy={n.y}
              r={primary ? 4 : 2.5}
              fill={primary ? "#2D5F4A" : "rgba(45,95,74,0.4)"}
              style={{
                opacity: active ? 1 : 0,
                transition: `opacity 320ms ease-out ${320 + i * 38}ms`,
              }}
            />
          );
        })}

        {/* Subtle outer ring on primary nodes */}
        {active && NODES.filter((_, i) => i % 5 === 0 || i === 8).map((n, i) => (
          <circle key={`ring-${i}`} cx={n.x} cy={n.y} r="4" fill="none" stroke="#2D5F4A" strokeWidth="0.8">
            <animate attributeName="r"       values="4;10"   dur="2.5s" begin={`${i * 0.6}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0"  dur="2.5s" begin={`${i * 0.6}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </svg>
    </div>
  );
}

// ── Data ────────────────────────────────────────────────────────────────────
const columns = [
  {
    label:   "Brand",
    heading: "Identitet, udtryk og oplevelse",
    desc:    "Vi bygger oplevelser, der styrker dit brand og får dig til at skille dig ud.",
    Viz:     BrandViz,
  },
  {
    label:   "Strategi",
    heading: "Retning, vækst og forretning",
    desc:    "Vi analyserer dit marked, styrker din position og bygger planen, der får dig i mål.",
    Viz:     StrategiViz,
  },
  {
    label:   "Teknologi",
    heading: "Systemer, løsninger og innovation",
    desc:    "Vi bygger teknologi, der styrker dit brand og din forretning. Automatisk, skalerbart og smart.",
    Viz:     TeknologiViz,
  },
];

// ── Component ────────────────────────────────────────────────────────────────
export default function Services() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="ydelser" className="py-20 md:py-28 px-6 md:px-8 max-w-[1100px] mx-auto">
      <h2 className="font-[300] text-[2rem] text-ink tracking-[0.03em] mb-2 leading-[1.3]">
        Løsninger, der hviler på tre discipliner.
      </h2>
      <p className="font-[200] text-[0.95rem] text-stone leading-[1.9] mb-12">
        Alt skabes i fællesskab.
      </p>

      <div ref={sectionRef} className="grid grid-cols-1 md:grid-cols-3">
        {columns.map(({ label, heading, desc, Viz }, i) => (
          <div
            key={label}
            className={`py-8 md:py-0 md:px-8 first:md:pl-0 last:md:pr-0
              border-b md:border-b-0 md:border-r border-clay last:border-b-0 last:md:border-r-0
              transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
            style={{ transitionDelay: `${i * 0.18}s` }}
          >
            <div className="text-[0.65rem] tracking-[0.12em] uppercase text-moss font-[400] mb-4">
              {label}
            </div>
            <h3 className="font-[300] text-[1.15rem] text-ink mb-3 leading-[1.4]">
              {heading}
            </h3>
            {desc && (
              <p className="font-[200] text-[0.85rem] text-stone leading-[1.8] mb-7">
                {desc}
              </p>
            )}

            {/* Animated visualization */}
            <div className={desc ? "" : "mt-5"}>
              <Viz active={visible} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
