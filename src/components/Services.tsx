"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// ── Farver (aflæst fra de tidligere illustrationer) ─────────────────────────
const MOSS = "#2D5F4A"; // eneste accent
const GRAY = "rgba(26,26,26,0.22)"; // dæmpede prikker
const CAPS = "rgba(26,26,26,0.2)"; // caps-etiket i illustration (jf. IDENTITET · UDTRYK · OPLEVELSE)

// Ens felt for alle tre illustrationer, så de tre skridt hænger visuelt sammen
const VB = "0 0 480 260";
const CENTER = { transformBox: "view-box", transformOrigin: "240px 130px" } as const;

function ringDots(cx: number, cy: number, r: number, n: number, startDeg = 0): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = ((startDeg + (360 / n) * i) * Math.PI) / 180;
    out.push([+(cx + r * Math.cos(a)).toFixed(2), +(cy + r * Math.sin(a)).toFixed(2)]);
  }
  return out;
}

// ── 01 KORTLÆG: spredt rod, tre fundne prikker der pulser ("fundet") ────────
const KORTLAEG: { x: number; y: number; hi?: boolean }[] = [
  { x: 60, y: 55 }, { x: 120, y: 45, hi: true }, { x: 180, y: 62 }, { x: 250, y: 48 },
  { x: 320, y: 58 }, { x: 390, y: 50 }, { x: 432, y: 82 },
  { x: 45, y: 110 }, { x: 110, y: 95 }, { x: 165, y: 120 }, { x: 225, y: 100, hi: true },
  { x: 290, y: 118 }, { x: 355, y: 102 }, { x: 415, y: 128 },
  { x: 70, y: 160 }, { x: 135, y: 150 }, { x: 195, y: 175 }, { x: 255, y: 158 },
  { x: 320, y: 172 }, { x: 385, y: 160 }, { x: 435, y: 188 },
  { x: 55, y: 208 }, { x: 150, y: 205 }, { x: 220, y: 214 }, { x: 300, y: 206 },
  { x: 365, y: 216, hi: true }, { x: 420, y: 224 },
];
const FOUND = KORTLAEG.filter((p) => p.hi);

function KortlaegViz() {
  return (
    <div className="h-[172px] overflow-hidden select-none">
      <svg viewBox={VB} className="w-full h-full" aria-hidden="true" role="presentation">
        {KORTLAEG.map((p, i) =>
          p.hi ? (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={5} fill={MOSS} />
              <circle cx={p.x} cy={p.y} r={10} fill="none" stroke={MOSS} strokeWidth={1} opacity={0.55} />
            </g>
          ) : (
            <circle key={i} cx={p.x} cy={p.y} r={3.6} fill={GRAY} />
          )
        )}
        {/* Emitterende puls på de fundne - i sekvens */}
        {FOUND.map((p, i) => (
          <circle
            key={`f${i}`}
            className="svc-pulse"
            style={{ transformBox: "view-box", transformOrigin: `${p.x}px ${p.y}px`, animationDelay: `${i}s` }}
            cx={p.x}
            cy={p.y}
            r={9}
            fill="none"
            stroke={MOSS}
            strokeWidth={1}
          />
        ))}
      </svg>
    </div>
  );
}

// ── 02 BYG: koncentriske ringe der roterer lagdelt, kerne der pulser ────────
const BYG_INNER = ringDots(240, 130, 42, 8, 0);
const BYG_MID = ringDots(240, 130, 82, 14, 12);
const BYG_OUTER = ringDots(240, 130, 118, 20, 0);

function BygViz() {
  return (
    <div className="h-[172px] overflow-hidden select-none">
      <svg viewBox={VB} className="w-full h-full" aria-hidden="true" role="presentation">
        {/* Ydre ring tegnet som tynd Moss-cirkel */}
        <circle cx={240} cy={130} r={118} fill="none" stroke={MOSS} strokeWidth={1} opacity={0.4} />

        {/* Kerne-puls (dopamin) */}
        {["0s", "-1.5s"].map((d) => (
          <circle
            key={d}
            className="svc-pulse"
            style={{ ...CENTER, animationDelay: d }}
            cx={240}
            cy={130}
            r={16}
            fill="none"
            stroke={MOSS}
            strokeWidth={1}
          />
        ))}

        {/* Indre prik-ring (statisk) */}
        {BYG_INNER.map(([x, y], i) => (
          <circle key={`i${i}`} cx={x} cy={y} r={3.6} fill={GRAY} />
        ))}

        {/* Midterring roterer modsat - lagdelt mekanisme */}
        <g className="svc-rotate-rev" style={CENTER}>
          {BYG_MID.map(([x, y], i) => (
            <circle key={`m${i}`} cx={x} cy={y} r={3.4} fill={GRAY} />
          ))}
        </g>

        {/* Yderste prik-ring roterer langsomt (slås fra ved reduced-motion) */}
        <g className="svc-rotate" style={CENTER}>
          {BYG_OUTER.map(([x, y], i) => (
            <circle key={`o${i}`} cx={x} cy={y} r={3.2} fill={GRAY} />
          ))}
        </g>

        {/* Centrum: fyldt Moss med dobbeltring */}
        <circle cx={240} cy={130} r={5.5} fill={MOSS} />
        <circle cx={240} cy={130} r={11} fill="none" stroke={MOSS} strokeWidth={1} opacity={0.55} />
      </svg>
    </div>
  );
}

// ── 03 DRIFT: jævne rækker, glødende diagonal, levende puls-linje ───────────
const DRIFT_COLS = [90, 140, 190, 240, 290, 340, 390];
const DRIFT_ROWS = [108, 146, 184, 222];
const ECG = "M 55,58 H 190 C 205,58 208,42 222,42 C 236,42 239,58 253,58 H 425";

function DriftViz() {
  return (
    <div className="h-[172px] overflow-hidden select-none">
      <svg viewBox={VB} className="w-full h-full" aria-hidden="true" role="presentation">
        {/* Rolig ECG-linje (svag) over rækkerne */}
        <path d={ECG} fill="none" stroke={MOSS} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" opacity={0.28} />

        {/* Levende puls der rejser hen over linjen */}
        <path
          d={ECG}
          className="svc-travel"
          pathLength={100}
          fill="none"
          stroke={MOSS}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="9 91"
        />

        {/* Ordnede rækker; diagonal i Moss der gløder */}
        {DRIFT_ROWS.map((y, r) =>
          DRIFT_COLS.map((x, c) => {
            const moss = r === c;
            return (
              <circle
                key={`${r}-${c}`}
                className={moss ? "svc-glow" : undefined}
                style={moss ? { animationDelay: `${c * 0.3}s` } : undefined}
                cx={x}
                cy={y}
                r={moss ? 4.4 : 3.6}
                fill={moss ? MOSS : GRAY}
              />
            );
          })
        )}

        {/* Caps-etiket under, samme stil som den gamle sektion */}
        <text
          x={240}
          y={250}
          textAnchor="middle"
          fill={CAPS}
          fontFamily="Jost,sans-serif"
          fontSize={9}
          letterSpacing={3}
        >
          IKKE AFHÆNGIGE AF OS · MEDMINDRE I VÆLGER DET
        </text>
      </svg>
    </div>
  );
}

// ── Data ────────────────────────────────────────────────────────────────────
const columns = [
  {
    label: "01 Kortlæg",
    heading: "Vi finder timerne, før vi bygger noget.",
    desc: "Vi følger jeres arbejdsgange, hvor de foregår, og finder de tre med størst gevinst. I får planen med tallet i kroner, før vi skriver én linje kode.",
    Viz: KortlaegViz,
  },
  {
    label: "02 Byg",
    heading: "Maskinen bygges på det, I allerede har.",
    desc: "Vi forbinder jeres systemer og automatiserer de tre arbejdsgange. AI, hvor det skaber værdi. Aldrig hvor det skaber risiko.",
    Viz: BygViz,
  },
  {
    label: "03 Drift",
    heading: "I ejer alt. Vi holder det kørende.",
    desc: "Test med jeres egne folk, fuld dokumentation og overdragelse. Maskinen arbejder herefter hver dag, og I kan følge den i ét overblik.",
    Viz: DriftViz,
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
    <section
      id="ydelser"
      aria-label="Fra manuelt arbejde til maskine i tre skridt"
      className="py-20 md:py-28 px-6 md:px-8 max-w-[1100px] mx-auto"
    >
      <h2 className="font-[300] text-[2rem] text-ink tracking-[0.03em] mb-2 leading-[1.3]">
        Fra manuelt arbejde til maskine. I tre skridt.
      </h2>
      <p className="font-[200] text-[0.95rem] text-stone leading-[1.9] mb-12">
        Tre arbejdsgange. 30 dage. Fast pris.
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
            <p className="font-[200] text-[0.85rem] text-stone leading-[1.8] mb-7">
              {desc}
            </p>

            <div aria-hidden="true">
              <Viz />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-14 md:mt-16 text-center">
        <Link
          href="/automatisering"
          className="group inline-flex items-center gap-2 font-[300] text-[0.92rem] text-ink tracking-[0.02em]"
        >
          <span className="border-b border-transparent group-hover:border-moss group-hover:text-moss transition-colors">
            Se hele 30-dages forløbet
          </span>
          <span aria-hidden className="transition-transform group-hover:translate-x-1">
            →
          </span>
        </Link>
      </div>
    </section>
  );
}
