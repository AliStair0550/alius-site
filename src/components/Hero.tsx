"use client";

import AliusLogo from "./AliusLogo";

const INK = "#1A1A1A";
const MOSS = "#2D5F4A";
const SLATE = "#6B7B75";
const PARCHMENT = "#FAF8F4";

// Pipeline-geometri
const SPINE = { x1: 74, x2: 380, y: 100 };
const NODES_X = [110, 190, 270, 350];       // fire proces-trin
const STACK_Y = [46, 70, 94, 118, 142];     // input-kø / output-resultater
const NODE_DELAY = ["-0.1s", "0.5s", "1.1s", "1.7s"]; // trin lyser i sekvens
const TOKENS = ["0s", "-0.48s", "-0.96s", "-1.44s", "-1.92s"]; // jævn strøm

function MachineFlow() {
  return (
    <div
      aria-hidden
      className="mt-16 md:mt-0 w-full max-w-[400px] md:max-w-[480px] md:w-[48%] md:absolute md:right-2 md:top-1/2 md:-translate-y-1/2 z-0"
    >
      <svg viewBox="0 0 460 200" className="w-full h-auto" role="presentation">
        {/* Input-kø: manuelle opgaver der venter */}
        {STACK_Y.map((y, i) => (
          <rect
            key={`q${i}`}
            className="mf-queue"
            style={{ animationDelay: `${-i * 0.3}s` }}
            x={26}
            y={y}
            width={34}
            height={12}
            rx={2.5}
            fill="none"
            stroke={INK}
            strokeWidth={1}
          />
        ))}
        {/* Feeders: opgaver trækkes ind i pipelinen */}
        {[52, 100, 148].map((y, i) => (
          <line key={`fi${i}`} x1={60} y1={y} x2={SPINE.x1} y2={SPINE.y} stroke={INK} strokeWidth={1} opacity={0.1} />
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

        {/* Trin-noder (moduler) der lyser op når de eksekverer */}
        {NODES_X.map((x, i) => (
          <g key={`n${i}`}>
            <rect x={x - 11} y={89} width={22} height={22} rx={5} fill={PARCHMENT} stroke={INK} strokeWidth={1} opacity={0.55} />
            <rect
              className="mf-node"
              style={{ animationDelay: NODE_DELAY[i] }}
              x={x - 11}
              y={89}
              width={22}
              height={22}
              rx={5}
              fill={MOSS}
              opacity={0}
            />
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

        {/* Feeders ud til resultaterne */}
        {[52, 100, 148].map((y, i) => (
          <line key={`fo${i}`} x1={SPINE.x2} y1={SPINE.y} x2={404} y2={y} stroke={INK} strokeWidth={1} opacity={0.1} />
        ))}

        {/* Output: færdige resultater der lyser i takt */}
        {STACK_Y.map((y, i) => (
          <rect
            key={`r${i}`}
            className="mf-result"
            style={{ animationDelay: `${i * 0.2}s` }}
            x={404}
            y={y}
            width={34}
            height={12}
            rx={2.5}
            fill={MOSS}
            opacity={0.18}
          />
        ))}

        {/* Etiketter */}
        {(
          [
            [43, "MANUELT"],
            [227, "AUTOMATISERING"],
            [421, "FÆRDIGT"],
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
        Vi bygger digitale maskiner.
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
