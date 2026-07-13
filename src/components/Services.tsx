"use client";

import { useEffect, useRef, useState } from "react";

// ── Farver (aflæst fra de tidligere illustrationer) ─────────────────────────
const MOSS = "#2D5F4A"; // eneste accent
const GRAY = "rgba(26,26,26,0.22)"; // dæmpede prikker

// Ens felt for alle tre illustrationer, så de tre skridt hænger visuelt sammen
const VB = "0 0 480 260";
const CENTER = { transformBox: "view-box", transformOrigin: "240px 130px" } as const;

// ── 01 KORTLÆG: en scanner sweeper feltet og finder de tre arbejdsgange ─────
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
        {/* Alle arbejdsgange - rå, uanalyserede */}
        {KORTLAEG.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3.6} fill={GRAY} />
        ))}

        {/* Scanner der analyserer feltet fra venstre mod højre */}
        <line className="svc-sweep" x1={20} y1={28} x2={20} y2={236} stroke={MOSS} strokeWidth={1.5} strokeLinecap="round" />

        {/* De tre fund forbindes til ét genkendt sæt (mønster-genkendelse) */}
        <polyline
          className="svc-link"
          points={FOUND.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke={MOSS}
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={100}
          strokeDasharray="100 100"
          opacity={0}
        />

        {/* De tre med størst gevinst - opdages præcis når scanneren rammer dem */}
        {FOUND.map((p, i) => (
          <g
            key={`f${i}`}
            className={`svc-found-${i + 1}`}
            style={{ transformBox: "view-box", transformOrigin: `${p.x}px ${p.y}px` }}
          >
            <circle cx={p.x} cy={p.y} r={10.5} fill="none" stroke={MOSS} strokeWidth={1} opacity={0.5} />
            <circle cx={p.x} cy={p.y} r={5} fill={MOSS} />
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── 02 BYG: jeres systemer forbindes til én maskine (netværk med data-puls) ─
const NET_HUB: [number, number] = [240, 130];
const NET_NODES: [number, number][] = [
  [108, 74], [212, 52], [332, 66], [402, 126],
  [350, 198], [232, 216], [118, 190], [76, 130],
];
const NET_MESH: [number, number][] = [[0, 1], [2, 3], [4, 5], [6, 7], [1, 2], [7, 0]];
const NET_PULSE = [0, 2, 4, 6];

function BygViz() {
  const [hx, hy] = NET_HUB;
  return (
    <div className="h-[172px] overflow-hidden select-none">
      <svg viewBox={VB} className="w-full h-full" aria-hidden="true" role="presentation">
        {/* Forbindelser: hub -> systemer */}
        {NET_NODES.map(([x, y], i) => (
          <line key={`s${i}`} x1={hx} y1={hy} x2={x} y2={y} stroke={GRAY} strokeWidth={1} />
        ))}
        {/* Mesh mellem systemer */}
        {NET_MESH.map(([a, b], i) => (
          <line
            key={`me${i}`}
            x1={NET_NODES[a][0]} y1={NET_NODES[a][1]}
            x2={NET_NODES[b][0]} y2={NET_NODES[b][1]}
            stroke={GRAY} strokeWidth={0.8} opacity={0.55}
          />
        ))}
        {/* Levende forbindelser: systemerne udveksler data */}
        {NET_MESH.map(([a, b], i) => (
          <line
            key={`mf${i}`}
            className="svc-flow-in"
            style={{ animationDelay: `${i * 0.25}s` }}
            x1={NET_NODES[a][0]} y1={NET_NODES[a][1]}
            x2={NET_NODES[b][0]} y2={NET_NODES[b][1]}
            stroke={MOSS} strokeWidth={0.8} strokeDasharray="2 8" strokeLinecap="round" opacity={0.3}
          />
        ))}

        {/* Data-puls der rejser ind mod hub (automatisering) */}
        {NET_PULSE.map((ni, i) => {
          const [x, y] = NET_NODES[ni];
          return (
            <line
              key={`p${i}`}
              className="svc-travel"
              style={{ animationDelay: `${i * 0.6}s` }}
              x1={x} y1={y} x2={hx} y2={hy}
              pathLength={100}
              stroke={MOSS}
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray="9 91"
            />
          );
        })}

        {/* System-noder */}
        {NET_NODES.map(([x, y], i) => (
          <circle key={`n${i}`} cx={x} cy={y} r={4} fill={GRAY} />
        ))}

        {/* Kerne-puls */}
        {["0s", "-1.5s"].map((d) => (
          <circle
            key={d}
            className="svc-pulse"
            style={{ ...CENTER, animationDelay: d }}
            cx={hx} cy={hy} r={14}
            fill="none" stroke={MOSS} strokeWidth={1}
          />
        ))}

        {/* Hub: den samlede maskine - trækker vejret roligt */}
        <g className="svc-hub-breath" style={CENTER}>
          <circle cx={hx} cy={hy} r={6} fill={MOSS} />
          <circle cx={hx} cy={hy} r={12} fill="none" stroke={MOSS} strokeWidth={1} opacity={0.55} />
        </g>
      </svg>
    </div>
  );
}

// ── 03 DRIFT: kørende system - ordnet grid, live-indikator og ECG-puls ──────
const DRIFT_COLS = [90, 140, 190, 240, 290, 340, 390];
const DRIFT_ROWS = [112, 150, 188, 226];
// Hjerteslag-monitor: flad baseline med to beats
const ECG = "M 48 62 H 152 L 160 42 L 168 84 L 176 62 H 300 L 308 42 L 316 84 L 324 62 H 432";

function DriftViz() {
  return (
    <div className="h-[172px] overflow-hidden select-none">
      <svg viewBox={VB} className="w-full h-full" aria-hidden="true" role="presentation">
        {/* Live-status */}
        <circle className="svc-glow" cx={50} cy={34} r={3} fill={MOSS} />
        <text x={60} y={37.5} fill={MOSS} fontFamily="Jost,sans-serif" fontSize={8} letterSpacing={2} opacity={0.8}>LIVE</text>

        {/* Hjerteslag-monitor (svag baseline) */}
        <path d={ECG} fill="none" stroke={MOSS} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" opacity={0.28} />
        {/* Puls-cursor der rejser hen over monitoren */}
        <path
          d={ECG}
          className="svc-travel"
          pathLength={100}
          fill="none"
          stroke={MOSS}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="7 93"
        />

        {/* Kørende system: grid med aktivitets-bølge kolonne for kolonne */}
        {DRIFT_ROWS.map((y, r) =>
          DRIFT_COLS.map((x, c) => (
            <circle
              key={`${r}-${c}`}
              className="svc-wave"
              style={{ animationDelay: `${(r + c) * 0.16}s` }}
              cx={x}
              cy={y}
              r={3.6}
              fill={GRAY}
            />
          ))
        )}

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
    heading: "Vi bygger på det, I allerede har.",
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
      aria-label="Fra manuelt arbejde til automatiseret maskine"
      className="py-20 md:py-28 px-6 md:px-8 max-w-[1100px] mx-auto"
    >
      <h2 className="font-[300] text-[2rem] text-ink tracking-[0.03em] mb-2 leading-[1.3]">
        Fra manuelt arbejde til automatiseret maskine.
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
    </section>
  );
}
