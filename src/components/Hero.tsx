"use client";

import AliusLogo from "./AliusLogo";

const INK = "#1A1A1A";
const MOSS = "#2D5F4A";
const SLATE = "#6B7B75";
const PARCHMENT = "#FAF8F4";

// Pipeline-geometri
const SPINE = { x1: 74, x2: 380, y: 100 };
const NODES_X = [130, 227, 324];             // tre proces-trin
const NODE_DELAY = ["0.1s", "1.2s", "2.3s"]; // trin lyser i sekvens (3.4s cyklus)
const TOKENS = ["0s", "-0.68s", "-1.36s", "-2.04s", "-2.72s"]; // jævn strøm

// Rod: manuelle opgaver der ligger skævt og spredt
const MESS = [
  { x: 20, y: 48, w: 32, h: 10, rot: -8, d: "0s" },
  { x: 31, y: 64, w: 25, h: 9, rot: 7, d: "-0.9s" },
  { x: 17, y: 81, w: 34, h: 10, rot: -4, d: "-1.8s" },
  { x: 33, y: 97, w: 23, h: 9, rot: 11, d: "-0.5s" },
  { x: 22, y: 114, w: 31, h: 10, rot: -10, d: "-2.4s" },
  { x: 30, y: 131, w: 26, h: 9, rot: 5, d: "-1.3s" },
];
// Struktur: de samme opgaver, nu ordnet i lige rækker
const STRUCT_Y = [48, 66, 84, 102, 120, 138];

function MachineFlow() {
  return (
    <div
      aria-hidden
      className="mt-16 md:mt-0 w-full max-w-[400px] md:max-w-[480px] md:w-[48%] md:absolute md:right-2 md:top-1/2 md:-translate-y-1/2 z-0"
    >
      <svg viewBox="0 0 460 200" className="w-full h-auto" role="presentation">
        {/* Rod: manuelle opgaver der ligger skævt og spredt */}
        {MESS.map((m, i) => (
          <g key={`m${i}`} transform={`rotate(${m.rot} ${m.x + m.w / 2} ${m.y + m.h / 2})`}>
            <rect
              className="mf-mess"
              style={{ animationDelay: m.d }}
              x={m.x}
              y={m.y}
              width={m.w}
              height={m.h}
              rx={2}
              fill="none"
              stroke={INK}
              strokeWidth={1}
              opacity={0.4}
            />
          </g>
        ))}
        {/* Feeders: rodet trækkes ind i pipelinen */}
        {[60, 92, 124].map((y, i) => (
          <line key={`fi${i}`} x1={58} y1={y} x2={SPINE.x1} y2={SPINE.y} stroke={INK} strokeWidth={1} opacity={0.09} />
        ))}

        {/* Pipeline-spine */}
        <line x1={SPINE.x1} y1={SPINE.y} x2={SPINE.x2} y2={SPINE.y} stroke={INK} strokeWidth={1} opacity={0.14} />

        {/* Eksekverings-energi der sweeper gennem pipelinen */}
        {["0s", "-1.2s"].map((d) => (
          <line
            key={`ex${d}`}
            className="mf-exec"
            style={{ animationDelay: d }}
            x1={SPINE.x1}
            y1={SPINE.y}
            x2={SPINE.x2}
            y2={SPINE.y}
            pathLength={100}
            stroke={MOSS}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeDasharray="10 90"
          />
        ))}

        {/* Trin-noder som små maskiner: antenne, øjne der blinker, mund */}
        {NODES_X.map((x, i) => (
          <g key={`n${i}`}>
            {/* Antenne */}
            <line x1={x} y1={89} x2={x} y2={83} stroke={INK} strokeWidth={1} opacity={0.45} />
            <circle cx={x} cy={81.5} r={1.6} fill={INK} opacity={0.45} />
            {/* Krop */}
            <rect x={x - 12} y={89} width={24} height={22} rx={6} fill={PARCHMENT} stroke={INK} strokeWidth={1} opacity={0.6} />
            {/* Aktiv-glød når maskinen eksekverer */}
            <rect
              className="mf-node"
              style={{ animationDelay: NODE_DELAY[i] }}
              x={x - 12}
              y={89}
              width={24}
              height={22}
              rx={6}
              fill={MOSS}
              opacity={0}
            />
            {/* Øjne der blinker */}
            <g className="mf-blink" style={{ transformBox: "view-box", transformOrigin: `${x}px 98px`, animationDelay: `${i * 0.55}s` }}>
              <circle cx={x - 4.5} cy={98} r={1.7} fill={INK} opacity={0.75} />
              <circle cx={x + 4.5} cy={98} r={1.7} fill={INK} opacity={0.75} />
            </g>
            {/* Glad mund - lille smil */}
            <path d={`M ${x - 4.5} 103.5 Q ${x} 108 ${x + 4.5} 103.5`} fill="none" stroke={INK} strokeWidth={1} strokeLinecap="round" opacity={0.5} />
          </g>
        ))}

        {/* Tokens der flyder gennem pipelinen */}
        {TOKENS.map((d, i) => (
          <circle
            key={`t${i}`}
            className="mf-pipe"
            style={{ animationDelay: d }}
            cx={SPINE.x1}
            cy={SPINE.y}
            r={2.8}
            fill={MOSS}
          />
        ))}

        {/* Feeders ud til den ordnede struktur */}
        {[60, 92, 124].map((y, i) => (
          <line key={`fo${i}`} x1={SPINE.x2} y1={SPINE.y} x2={402} y2={y} stroke={INK} strokeWidth={1} opacity={0.09} />
        ))}

        {/* Struktur: færdige resultater i lige, ordnede rækker */}
        {STRUCT_Y.map((y, i) => (
          <rect
            key={`r${i}`}
            className="mf-result"
            style={{ animationDelay: `${i * 0.28}s` }}
            x={402}
            y={y}
            width={40}
            height={10}
            rx={2}
            fill={MOSS}
            opacity={0.4}
          />
        ))}

        {/* Etiketter */}
        {(
          [
            [43, "KAOS"],
            [227, "AGENTER"],
            [421, "KLARHED"],
          ] as const
        ).map(([x, label]) => (
          <text
            key={label}
            x={x}
            y="178"
            textAnchor="middle"
            fill={SLATE}
            style={{ fontSize: "9px", letterSpacing: "0.16em", fontWeight: 300, opacity: 0.6 }}
          >
            {label}
          </text>
        ))}
      </svg>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="min-h-screen flex flex-col justify-center items-start px-6 md:px-8 pt-32 pb-20 max-w-[1100px] mx-auto relative">
      <div className="animate-fade-up delay-200 mb-10 relative z-10">
        <AliusLogo width={220} />
      </div>

      <h1 className="animate-fade-up delay-500 font-[300] text-[1.8rem] md:text-[2.2rem] text-ink leading-[1.35] tracking-[0.01em] max-w-[600px] mb-5 relative z-10">
        Automatisering, der arbejder for jer.
      </h1>

      <p className="animate-fade-up delay-700 font-[200] text-[1.05rem] text-slate leading-[1.8] max-w-[480px] mb-8 relative z-10">
        Vi finder de arbejdsgange, der bremser jer, og bygger maskinerne, der gør jeres virksomhed hurtigere, stærkere og mere skalerbar.
      </p>

      <div className="animate-fade-up delay-900 flex gap-4 flex-wrap relative z-10">
        <a
          href="#kontakt"
          className="font-[300] text-[0.82rem] tracking-[0.08em] uppercase px-7 py-3 bg-ink text-parchment border border-ink hover:bg-moss hover:border-moss transition-all"
        >
          Book 20 minutter
        </a>
        <a
          href="/beregner"
          className="font-[300] text-[0.82rem] tracking-[0.08em] uppercase px-7 py-3 border border-clay text-ink hover:border-moss hover:text-moss transition-all"
        >
          Beregn jeres gevinst
        </a>
      </div>

      <MachineFlow />
    </section>
  );
}
