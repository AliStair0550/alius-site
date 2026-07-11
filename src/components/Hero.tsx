"use client";

import AliusLogo from "./AliusLogo";

const INK = "#1A1A1A";
const MOSS = "#2D5F4A";
const SLATE = "#6B7B75";

// Venstre cirkel: manuelt rod - urolige prikker
const CHAOS = [
  { x: 50, y: 70, c: "mf-chaos-a", d: "0s" },
  { x: 78, y: 60, c: "mf-chaos-b", d: "-0.6s" },
  { x: 44, y: 90, c: "mf-chaos-c", d: "-1.2s" },
  { x: 92, y: 96, c: "mf-chaos-a", d: "-1.8s" },
  { x: 66, y: 108, c: "mf-chaos-b", d: "-0.3s" },
  { x: 98, y: 78, c: "mf-chaos-c", d: "-2.1s" },
  { x: 56, y: 104, c: "mf-chaos-a", d: "-1.5s" },
  { x: 82, y: 82, c: "mf-chaos-b", d: "-2.7s" },
  { x: 62, y: 90, c: "mf-chaos-c", d: "-0.9s" },
];

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [+(cx + r * Math.cos(a)).toFixed(2), +(cy + r * Math.sin(a)).toFixed(2)];
}

// Konvergerende indtag: tre baner der samles i maskinen (tragt)
const INTAKE = [
  { cls: "mf-in-a", x: 100, y: 60, d: "0s" }, { cls: "mf-in-a", x: 100, y: 60, d: "-1.5s" },
  { cls: "mf-in-b", x: 100, y: 84, d: "-0.5s" }, { cls: "mf-in-b", x: 100, y: 84, d: "-2s" },
  { cls: "mf-in-c", x: 100, y: 108, d: "-1s" }, { cls: "mf-in-c", x: 100, y: 108, d: "-2.5s" },
];
// Divergerende output: tre baner der vifter ud til rækkerne
const OUTPUT = [
  { cls: "mf-out-a", d: "0s" }, { cls: "mf-out-a", d: "-1.5s" },
  { cls: "mf-out-b", d: "-0.75s" }, { cls: "mf-out-b", d: "-2.25s" },
  { cls: "mf-out-c", d: "-0.4s" }, { cls: "mf-out-c", d: "-1.9s" },
];

// Svage guide-linjer der viser tragten ind og viften ud
const IN_GUIDE = [
  { x1: 104, y1: 60, x2: 192, y2: 84 },
  { x1: 104, y1: 84, x2: 192, y2: 84 },
  { x1: 104, y1: 108, x2: 192, y2: 84 },
];
const OUT_GUIDE = [
  { x1: 268, y1: 84, x2: 356, y2: 68 },
  { x1: 268, y1: 84, x2: 356, y2: 84 },
  { x1: 268, y1: 84, x2: 356, y2: 100 },
];

// Maskinen: ordnet koncentrisk ring af prikker + tandhjuls-takker
const RING = [
  [254, 84], [247, 67], [230, 60], [213, 67],
  [206, 84], [213, 101], [230, 108], [247, 101],
] as const;
const TEETH = Array.from({ length: 16 }, (_, i) => i * 22.5);

// Resultat: gjort arbejde i ordnede rækker (korte streger)
const RESULT: { x1: number; x2: number; y: number; d: string }[] = [];
[68, 84, 100].forEach((y, r) => {
  [
    { x1: 366, x2: 382 },
    { x1: 388, x2: 404 },
  ].forEach((col, c) => {
    RESULT.push({ ...col, y, d: `${(r * 2 + c) * 0.35}s` });
  });
});

const MID_ORIGIN = { transformBox: "view-box", transformOrigin: "230px 84px" } as const;

function MachineFlow() {
  return (
    <div
      aria-hidden
      className="mt-16 md:mt-0 w-full max-w-[380px] md:max-w-[460px] md:w-[46%] md:absolute md:right-2 md:top-1/2 md:-translate-y-1/2 z-0"
    >
      <svg viewBox="0 0 460 200" className="w-full h-auto" role="presentation">
        {/* Guide-linjer: tragt ind, vifte ud */}
        {[...IN_GUIDE, ...OUT_GUIDE].map((g, i) => (
          <line key={`g${i}`} {...g} stroke={INK} strokeWidth="1" opacity="0.07" />
        ))}

        {/* Cirkel-omrids: venstre + højre i ink, midten i moss (eneste accent) */}
        <circle cx="72" cy="84" r="52" fill="none" stroke={INK} strokeWidth="1" opacity="0.16" />
        <circle cx="388" cy="84" r="52" fill="none" stroke={INK} strokeWidth="1" opacity="0.16" />

        {/* Maskinen: tandhjul (roterende takker) + rim */}
        <circle cx="230" cy="84" r="52" fill="none" stroke={MOSS} strokeWidth="1" opacity="0.55" />
        <g className="mf-ring" style={MID_ORIGIN}>
          {TEETH.map((a, i) => {
            const [x1, y1] = polar(230, 84, 52, a);
            const [x2, y2] = polar(230, 84, 58, a);
            return (
              <line key={`t${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={MOSS} strokeWidth="1.4" strokeLinecap="round" opacity="0.4" />
            );
          })}
        </g>

        {/* Emitterende puls-ringe fra kernen (dopamin) */}
        {["0s", "-1.5s"].map((d) => (
          <circle
            key={`em${d}`}
            className="mf-emit"
            style={{ ...MID_ORIGIN, animationDelay: d }}
            cx="230"
            cy="84"
            r="18"
            fill="none"
            stroke={MOSS}
            strokeWidth="1"
          />
        ))}

        <circle
          className="mf-ring-rev"
          style={MID_ORIGIN}
          cx="230"
          cy="84"
          r="42"
          fill="none"
          stroke={MOSS}
          strokeWidth="1"
          strokeDasharray="4 7"
          opacity="0.5"
        />

        {/* Venstre: manuelt rod */}
        {CHAOS.map((p, i) => (
          <circle
            key={`c${i}`}
            className={p.c}
            style={{ animationDelay: p.d }}
            cx={p.x}
            cy={p.y}
            r="2"
            fill={INK}
            opacity="0.42"
          />
        ))}

        {/* Konvergerende flow ind i maskinen */}
        {INTAKE.map((p, i) => (
          <circle
            key={`in${i}`}
            className={`mf-flow ${p.cls}`}
            style={{ animationDelay: p.d }}
            cx={p.x}
            cy={p.y}
            r="2.2"
            fill={INK}
          />
        ))}

        {/* Maskinens indre prik-ring roterer */}
        <g className="mf-ring" style={MID_ORIGIN}>
          {RING.map(([x, y], i) => (
            <circle key={`r${i}`} cx={x} cy={y} r="2" fill={INK} opacity="0.5" />
          ))}
        </g>

        {/* Vejrtrækkende kerne */}
        <circle className="mf-breathe" style={MID_ORIGIN} cx="230" cy="84" r="3.4" fill={MOSS} />

        {/* Divergerende flow ud af maskinen */}
        {OUTPUT.map((p, i) => (
          <circle
            key={`out${i}`}
            className={`mf-flow ${p.cls}`}
            style={{ animationDelay: p.d }}
            cx="252"
            cy="84"
            r="2.2"
            fill={INK}
          />
        ))}

        {/* Højre: resultatet - ordnede rækker */}
        {RESULT.map((s, i) => (
          <line
            key={`res${i}`}
            className="mf-land"
            style={{ animationDelay: s.d }}
            x1={s.x1}
            y1={s.y}
            x2={s.x2}
            y2={s.y}
            stroke={INK}
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.5"
          />
        ))}

        {/* Etiketter */}
        {(
          [
            [72, "MANUELT"],
            [230, "MASKINEN"],
            [388, "RESULTAT"],
          ] as const
        ).map(([x, label]) => (
          <text
            key={label}
            x={x}
            y="168"
            textAnchor="middle"
            fill={SLATE}
            style={{ fontSize: "9px", letterSpacing: "0.18em", fontWeight: 300, opacity: 0.6 }}
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
