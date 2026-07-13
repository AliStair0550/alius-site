"use client";

import AliusLogo from "./AliusLogo";

const INK = "#1A1A1A";
const MOSS = "#2D5F4A";
const SLATE = "#6B7B75";
const PARCHMENT = "#FAF8F4";

// Pipeline-geometri
const SPINE = { x1: 74, x2: 380, y: 100 };
const NODES = [130, 227, 324]; // tre agenter der processerer pakken i sekvens

// Rod: manuelle opgaver der ligger skævt og driver roligt (kaos)
const MESS = [
  { x: 20, y: 50, w: 32, h: 10, rot: -8, d: "0s" },
  { x: 31, y: 66, w: 25, h: 9, rot: 7, d: "-1.4s" },
  { x: 17, y: 83, w: 34, h: 10, rot: -4, d: "-2.7s" },
  { x: 33, y: 99, w: 23, h: 9, rot: 11, d: "-0.7s" },
  { x: 22, y: 116, w: 31, h: 10, rot: -10, d: "-3.4s" },
];
// Struktur: de samme opgaver, nu i lige, ordnede rækker
const STRUCT_Y = [50, 68, 86, 104, 122];
const FEED_Y = [64, 92, 120];

function MachineFlow() {
  return (
    <div
      aria-hidden
      className="mt-16 md:mt-0 w-full max-w-[400px] md:max-w-[480px] md:w-[48%] md:absolute md:right-2 md:top-1/2 md:-translate-y-1/2 z-0"
    >
      <svg viewBox="0 0 460 200" className="w-full h-auto" role="presentation">
        {/* Rod: manuelle opgaver der ligger skævt og driver roligt */}
        {MESS.map((m, i) => (
          <g key={`m${i}`} transform={`rotate(${m.rot} ${m.x + m.w / 2} ${m.y + m.h / 2})`}>
            <rect
              className="mf-drift"
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

        {/* Intake: rodet trækkes ind i pipelinen */}
        {FEED_Y.map((y, i) => (
          <g key={`fi${i}`}>
            <line x1={58} y1={y} x2={SPINE.x1} y2={SPINE.y} stroke={INK} strokeWidth={1} opacity={0.08} />
            <line
              className="mf-intake"
              style={{ animationDelay: `${i * 0.3}s` }}
              x1={58}
              y1={y}
              x2={SPINE.x1}
              y2={SPINE.y}
              stroke={MOSS}
              strokeWidth={1}
              strokeDasharray="3 9"
              strokeLinecap="round"
              opacity={0.5}
            />
          </g>
        ))}

        {/* Pipeline-spine */}
        <line x1={SPINE.x1} y1={SPINE.y} x2={SPINE.x2} y2={SPINE.y} stroke={INK} strokeWidth={1} opacity={0.14} strokeLinecap="round" />

        {/* Arbejdspakken rejser gennem pipelinen og forsvinder ind i hver agent (processering) */}
        <g className="mf-packet">
          <circle cx={SPINE.x1} cy={SPINE.y} r={7} fill={MOSS} opacity={0.16} />
          <circle cx={SPINE.x1} cy={SPINE.y} r={3.2} fill={MOSS} />
        </g>

        {/* Output-feeders ud til den ordnede struktur */}
        {FEED_Y.map((y, i) => (
          <g key={`fo${i}`}>
            <line x1={SPINE.x2} y1={SPINE.y} x2={402} y2={y} stroke={INK} strokeWidth={1} opacity={0.08} />
            <line
              className="mf-outflow"
              style={{ animationDelay: `${i * 0.3}s` }}
              x1={SPINE.x2}
              y1={SPINE.y}
              x2={402}
              y2={y}
              stroke={MOSS}
              strokeWidth={1}
              strokeDasharray="3 9"
              strokeLinecap="round"
              opacity={0.28}
            />
          </g>
        ))}

        {/* Struktur: færdige resultater i lige rækker der lyser i sekvens */}
        {STRUCT_Y.map((y, i) => (
          <rect
            key={`r${i}`}
            className="mf-result"
            style={{ animationDelay: `${i * 0.09}s` }}
            x={402}
            y={y}
            width={40}
            height={10}
            rx={2}
            fill={MOSS}
            opacity={0.4}
          />
        ))}

        {/* Agenter: små intelligente enheder der processerer pakken */}
        {NODES.map((x, i) => (
          <g key={`n${i}`}>
            {/* Proces-ring der breder sig ud mens agenten arbejder */}
            <circle
              className={`mf-ring-${i + 1}`}
              style={{ transformBox: "view-box", transformOrigin: `${x}px 100px` }}
              cx={x}
              cy={100}
              r={15}
              fill="none"
              stroke={MOSS}
              strokeWidth={1}
              opacity={0}
            />
            {/* Antenne */}
            <line x1={x} y1={89} x2={x} y2={83} stroke={INK} strokeWidth={1} opacity={0.45} />
            <circle cx={x} cy={81.5} r={1.6} fill={INK} opacity={0.45} />
            {/* Krop */}
            <rect x={x - 12} y={89} width={24} height={22} rx={6} fill={PARCHMENT} stroke={INK} strokeWidth={1} opacity={0.6} />
            {/* Aktiv-glød når agenten processerer pakken */}
            <rect
              className={`mf-agent-${i + 1}`}
              x={x - 12}
              y={89}
              width={24}
              height={22}
              rx={6}
              fill={MOSS}
              opacity={0}
            />
            {/* Øjne der blinker */}
            <g className="mf-blink" style={{ transformBox: "view-box", transformOrigin: `${x}px 98px`, animationDelay: `${i * 0.5}s` }}>
              <circle cx={x - 4.5} cy={98} r={1.7} fill={INK} opacity={0.75} />
              <circle cx={x + 4.5} cy={98} r={1.7} fill={INK} opacity={0.75} />
            </g>
            {/* Glad mund - lille smil */}
            <path d={`M ${x - 4.5} 103.5 Q ${x} 108 ${x + 4.5} 103.5`} fill="none" stroke={INK} strokeWidth={1} strokeLinecap="round" opacity={0.5} />
          </g>
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
