"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

// ── Folka Kort: en vifte af loyalitetskort der skifter ──────────────────────
//
// Pointen er at man kan se at hver forretning får sit eget kort. Syv kort i
// en vifte, ét ad gangen foran, og hvert kort med sit eget mønster der
// bevæger sig. Navne og tilbud er dem kort.folka.dk selv viser.
//
// Forløbet for hvert kort: det glider frem, får et stempel, og en besked
// lander øverst. Det er produktets tre ting vist uden en forklaring:
// stempler, henvisninger og direkte beskeder.
//
// Alt måles i --u, en 480-del af feltets bredde, så viften er den samme på
// 605 px og på en telefon. Syv pladser og ikke fem: kortet der forlader
// viften til venstre, kommer ind igen fra højre, og det sker usynligt mellem
// de to skjulte yderpladser. Ellers fløj det tværs over billedet.
//
// HTML og ikke SVG som Stemplet, fordi det forreste kort skal ligge øverst.
// I SVG afgør rækkefølgen i DOM'en det, og flyttes et element, stopper dets
// CSS-transition midt i bevægelsen. z-index har ikke det problem.
//
// Baggrunden og mønstrene bruger Folkas egne farver, ikke Alius'. Det er et
// billede af Folkas produkt, ligesom Cykelmov og Stemplet viser deres.

const u = (n: number) => `calc(var(--u) * ${n})`;

type Kort = {
  navn: string;
  bg: string;
  tekst: string;
  /** Øverst til højre: etiket og værdi. */
  top: [string, string];
  /** Antal stempler ud af et antal. Mangler på henvisningskort. */
  stempler?: [number, number];
  status: string;
  /** Nederst: etiket og værdi. */
  bund: [string, string];
  besked: string;
  Ikon: () => ReactNode;
  Moenster: () => ReactNode;
};

const ikon = (d: ReactNode) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ width: "62%", height: "62%" }}>
    {d}
  </svg>
);

const KORT: Kort[] = [
  {
    navn: "Kaffestuen",
    bg: "#14110F",
    tekst: "#F7F2EA",
    top: ["Stempler", "7 af 10"],
    stempler: [7, 10],
    status: "Stamkunde",
    bund: ["Belønning", "10. kop er gratis"],
    besked: "Dobbelt stempel i dag",
    Ikon: () => ikon(<><path d="M3 6h8v4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z" /><path d="M11 7h1a2 2 0 0 1 0 4h-1" /><path d="M6 2v2M8.5 2v2" /></>),
    Moenster: () => (
      <>
        <div className="folka-drift absolute" style={{ left: "-25%", top: "2%", width: "120%", aspectRatio: "1", background: "radial-gradient(circle, rgba(214,120,48,0.9) 0%, rgba(214,120,48,0) 66%)" }} />
        <div className="folka-drift-2 absolute" style={{ right: "-38%", top: "30%", width: "90%", aspectRatio: "1", background: "radial-gradient(circle, rgba(150,142,132,0.6) 0%, rgba(150,142,132,0) 66%)" }} />
      </>
    ),
  },
  {
    navn: "Salon Nord",
    bg: "#2B1F2A",
    tekst: "#F6EEF3",
    top: ["Din kode", "EMMA-K7"],
    status: "Henvis en ven",
    bund: ["Til gode", "Gratis klip"],
    besked: "Louise brugte din kode",
    Ikon: () => ikon(<><circle cx="4.5" cy="4.5" r="2" /><circle cx="4.5" cy="11.5" r="2" /><path d="M6 6l7 6.5M6 10l7-6.5" /></>),
    Moenster: () => (
      <svg viewBox="0 0 150 212" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full" fill="none">
        {[16, 30, 44, 58, 72, 86].map((r, i) => (
          <circle key={r} className="folka-ring" cx="92" cy="92" r={r} stroke="#C98BB0" strokeWidth="1" style={{ animationDelay: `${i * 0.28}s`, transformOrigin: "92px 92px" }} />
        ))}
        <circle className="folka-bob" cx="92" cy="92" r="8" fill="#D998BC" style={{ transformOrigin: "92px 92px" }} />
      </svg>
    ),
  },
  {
    navn: "Havnekiosken",
    bg: "#0E3B52",
    tekst: "#EDF7FB",
    top: ["Til gode", "50 kr."],
    status: "Henvis en ven",
    bund: ["Vennen får", "En gratis is"],
    besked: "Du har 50 kr. til gode",
    Ikon: () => ikon(<><path d="M4.5 7a3.5 3.5 0 0 1 7 0" /><path d="M4 7h8l-4 7z" /></>),
    Moenster: () => (
      <svg viewBox="0 0 300 212" preserveAspectRatio="xMinYMid slice" className="absolute inset-0 h-full" style={{ width: "200%" }} fill="none">
        {[
          { y: 72, c: "#1C5B78", k: "folka-boelge" },
          { y: 104, c: "#2A7B9C", k: "folka-boelge-2" },
          { y: 136, c: "#4FB3D9", k: "folka-boelge" },
        ].map((b) => (
          <path key={b.y} className={b.k} fill={b.c} opacity="0.75" d={`M0 ${b.y} q37.5 -18 75 0 t75 0 t75 0 t75 0 V212 H0 Z`} />
        ))}
      </svg>
    ),
  },
  {
    navn: "Blomsterhuset",
    bg: "#86A675",
    tekst: "#14241A",
    top: ["Stempler", "4 af 8"],
    stempler: [4, 8],
    status: "Stamkunde",
    bund: ["Belønning", "En buket på os"],
    besked: "Friske tulipaner i dag",
    Ikon: () => ikon(<><circle cx="8" cy="8" r="1.6" /><circle cx="8" cy="3.8" r="2" /><circle cx="8" cy="12.2" r="2" /><circle cx="3.8" cy="8" r="2" /><circle cx="12.2" cy="8" r="2" /></>),
    Moenster: () => (
      <svg viewBox="0 0 150 212" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full" fill="none">
        <circle className="folka-bob" cx="104" cy="62" r="26" fill="#EDE7D3" style={{ transformOrigin: "104px 62px" }} />
        <path className="folka-bakke" fill="#5D8256" d="M-30 120 C 20 84, 70 92, 110 112 S 180 124, 190 112 V212 H-30 Z" />
        <path className="folka-bakke-2" fill="#3E6444" d="M-30 150 C 30 124, 80 158, 120 142 S 180 130, 190 142 V212 H-30 Z" />
      </svg>
    ),
  },
  {
    navn: "Baren",
    bg: "#1B1530",
    tekst: "#F4EFFA",
    top: ["Stempler", "6 af 10"],
    stempler: [6, 10],
    status: "Stamgæst",
    bund: ["Belønning", "Én på huset"],
    besked: "Happy hour fra kl. 16",
    Ikon: () => ikon(<><path d="M3 3h10L8 9z" /><path d="M8 9v4.5M5.5 13.5h5" /></>),
    Moenster: () => (
      <svg viewBox="0 0 150 212" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full" fill="none">
        <circle className="folka-sol" cx="75" cy="128" r="50" fill="#E8875A" style={{ transformOrigin: "75px 128px" }} />
        <circle className="folka-sol" cx="75" cy="128" r="34" fill="#F4C9A0" style={{ transformOrigin: "75px 128px", animationDelay: "0.6s" }} />
      </svg>
    ),
  },
  {
    navn: "Kunstmuseet",
    bg: "#D9D4CA",
    tekst: "#22201C",
    top: ["Besøg", "3 af 5"],
    stempler: [3, 5],
    status: "Medlem",
    bund: ["Belønning", "Gratis entré"],
    besked: "Ny udstilling åbner fredag",
    Ikon: () => ikon(<><path d="M2.5 6L8 2.5 13.5 6z" /><path d="M4 6.5v5M8 6.5v5M12 6.5v5" /><path d="M2.5 13h11" /></>),
    Moenster: () => (
      <svg viewBox="0 0 150 212" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full" fill="none">
        <g className="folka-svaev">
          {[78, 62, 46, 30].map((r) => (
            <path key={r} d={`M${75 - r} 170 V${118} a${r} ${r} 0 0 1 ${r * 2} 0 V170`} stroke="#22201C" strokeOpacity="0.32" strokeWidth="1.2" />
          ))}
          <circle cx="75" cy="118" r="12" fill="#A77D5B" />
        </g>
      </svg>
    ),
  },
  {
    navn: "Bageriet",
    bg: "#E9DFCF",
    tekst: "#2E2115",
    top: ["Stempler", "9 af 10"],
    stempler: [9, 10],
    status: "Morgenfrisk",
    bund: ["Belønning", "Gratis rugbrød"],
    besked: "Der er friskbagt nu",
    Ikon: () => ikon(<><path d="M2.5 9.5a5.5 5.5 0 0 1 11 0c0 1.2-.8 2-2 2h-7c-1.2 0-2-.8-2-2z" /><path d="M6 6.5l.8 2M9.5 6.5l-.8 2" /></>),
    Moenster: () => (
      <svg viewBox="0 0 150 212" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full" fill="none">
        <defs>
          <pattern id="folkaBroed" width="38" height="30" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
            <path d="M6 20a13 13 0 0 1 26 0" stroke="#A98A63" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M12 20a7 7 0 0 1 14 0" stroke="#A98A63" strokeWidth="1.2" strokeLinecap="round" />
          </pattern>
        </defs>
        <rect className="folka-glid" x="-40" y="-40" width="260" height="320" fill="url(#folkaBroed)" opacity="0.6" />
      </svg>
    ),
  },
];

/** Pladserne i viften, efter afstand fra det forreste kort. */
const PLADS: Record<number, { x: number; y: number; r: number; s: number; dim: number; o: number }> = {
  0: { x: 0, y: 0, r: 0, s: 1, dim: 0, o: 1 },
  1: { x: 106, y: 14, r: 8, s: 0.9, dim: 0.28, o: 1 },
  2: { x: 192, y: 42, r: 15, s: 0.8, dim: 0.5, o: 1 },
  3: { x: 268, y: 74, r: 21, s: 0.7, dim: 0.6, o: 0 },
};

function placering(offset: number): CSSProperties {
  const p = PLADS[Math.abs(offset)];
  const side = Math.sign(offset);
  return {
    transform: `translate(${u(p.x * side)}, ${u(p.y)}) rotate(${p.r * side}deg) scale(${p.s})`,
    opacity: p.o,
    zIndex: 10 - Math.abs(offset),
  };
}

function Passet({ k, foran, stemplet }: { k: Kort; foran: boolean; stemplet: boolean }) {
  const fyldt = k.stempler ? k.stempler[0] + (foran && stemplet ? 1 : 0) : 0;
  const lys = k.tekst.startsWith("#F") || k.tekst.startsWith("#E");
  const stilleTone = lys ? "rgba(255,255,255,0.68)" : "rgba(0,0,0,0.6)";
  return (
    <>
      <k.Moenster />
      <div className="absolute inset-0 flex flex-col" style={{ padding: u(10), color: k.tekst }}>
        <div className="flex items-start justify-between" style={{ gap: u(6) }}>
          <div className="flex items-center min-w-0" style={{ gap: u(5) }}>
            <span className="flex items-center justify-center shrink-0 rounded-full" style={{ width: u(19), height: u(19), background: "rgba(255,255,255,0.92)", color: "#1A1A1A" }}>
              <k.Ikon />
            </span>
            <span className="truncate" style={{ fontSize: u(9.5), fontWeight: 500, letterSpacing: "-0.01em" }}>{k.navn}</span>
          </div>
          <div className="text-right shrink-0">
            <div className="uppercase" style={{ fontSize: u(6), letterSpacing: "0.1em", color: stilleTone }}>{k.top[0]}</div>
            <div className="tabular-nums" style={{ fontSize: u(9.5), fontWeight: 500, lineHeight: 1.2 }}>
              {k.stempler ? `${fyldt} af ${k.stempler[1]}` : k.top[1]}
            </div>
          </div>
        </div>

        <div className="mt-auto">
          <div style={{ fontSize: u(15), fontWeight: 500, letterSpacing: "-0.01em" }}>{k.status}</div>
          {k.stempler && (
            <div className="flex flex-wrap" style={{ gap: u(3.5), marginTop: u(6) }}>
              {Array.from({ length: k.stempler[1] }, (_, i) => (
                <span
                  key={i}
                  className={`folka-prik rounded-full${i < fyldt ? " is-on" : ""}`}
                  style={{ width: u(9), height: u(9), border: `1px solid ${k.tekst}`, background: i < fyldt ? k.tekst : "transparent" }}
                />
              ))}
            </div>
          )}
          <div className="uppercase" style={{ fontSize: u(6), letterSpacing: "0.1em", color: stilleTone, marginTop: u(7) }}>{k.bund[0]}</div>
          <div style={{ fontSize: u(10), fontWeight: 500 }}>{k.bund[1]}</div>
        </div>
      </div>
    </>
  );
}

export default function FolkaKortViz() {
  const rod = useRef<HTMLDivElement>(null);
  const [aktiv, setAktiv] = useState(0);
  const [trin, setTrin] = useState(0); // 0 lander, 1 stempel, 2 besked

  useEffect(() => {
    const el = rod.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = setTimeout(() => setTrin(1), 0);
      return () => clearTimeout(t);
    }

    // Kører kun mens feltet er i billedet. Resten af tiden står det stille.
    let timere: ReturnType<typeof setTimeout>[] = [];
    const stop = () => {
      timere.forEach(clearTimeout);
      timere = [];
    };
    const runde = () => {
      setTrin(0);
      timere = [
        setTimeout(() => setTrin(1), 900),
        setTimeout(() => setTrin(2), 1500),
        setTimeout(() => setTrin(0), 3300),
        setTimeout(() => {
          setAktiv((a) => (a + 1) % KORT.length);
          runde();
        }, 3650),
      ];
    };
    const io = new IntersectionObserver(([e]) => {
      stop();
      if (e.isIntersecting) runde();
    }, { threshold: 0.2 });
    io.observe(el);
    return () => {
      stop();
      io.disconnect();
    };
  }, []);

  const k = KORT[aktiv];

  return (
    <div ref={rod} className="absolute inset-0 overflow-hidden" style={{ containerType: "inline-size", background: "#020B1C", fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif" }} role="img" aria-label="Folka Kort: loyalitetskort med hver sit design for en café, en salon, en kiosk, en blomsterbutik, en bar, et museum og et bageri">
      <div className="absolute inset-0" style={{ ["--u" as string]: "calc(100cqw / 480)" }}>
        <div className="folka-drift absolute" style={{ left: "-16%", top: "-30%", width: "62%", aspectRatio: "1", background: "radial-gradient(circle, rgba(27,94,174,0.5) 0%, rgba(27,94,174,0) 68%)" }} />
        <div className="folka-drift-2 absolute" style={{ right: "-14%", bottom: "-34%", width: "58%", aspectRatio: "1", background: "radial-gradient(circle, rgba(47,176,255,0.26) 0%, rgba(47,176,255,0) 68%)" }} />

        <div className="absolute" style={{ left: "50%", top: u(156), width: 0, height: 0 }}>
          {KORT.map((kort, i) => {
            // Afstand til det forreste kort, fra -3 til 3.
            const n = KORT.length;
            const offset = ((i - aktiv + n + 3) % n) - 3;
            const p = PLADS[Math.abs(offset)];
            return (
              <div
                key={kort.navn}
                className="folka-pas absolute overflow-hidden"
                style={{
                  ...placering(offset),
                  width: u(158),
                  height: u(212),
                  left: u(-79),
                  top: u(-106),
                  borderRadius: u(14),
                  background: kort.bg,
                  outline: "1px solid rgba(255,255,255,0.12)",
                  outlineOffset: "-1px",
                }}
              >
                <Passet k={kort} foran={offset === 0} stemplet={trin >= 1} />
                <div className="folka-daemp absolute inset-0" style={{ background: "#020B1C", opacity: p.dim }} />
              </div>
            );
          })}
        </div>

        {/* Den direkte besked: lander over kortet som på en låseskærm */}
        <div
          className={`folka-besked absolute flex items-center${trin === 2 ? " is-on" : ""}`}
          style={{ zIndex: 20, left: "50%", top: u(10), gap: u(6), padding: `${u(5)} ${u(11)} ${u(5)} ${u(5)}`, borderRadius: u(99), background: "rgba(255,255,255,0.94)", color: "#0B1628", whiteSpace: "nowrap" }}
        >
          <span className="flex items-center justify-center rounded-full" style={{ width: u(18), height: u(18), background: k.bg, color: k.tekst }}>
            <k.Ikon />
          </span>
          <span style={{ fontSize: u(9.5) }}>
            <span style={{ fontWeight: 600 }}>{k.navn}</span> {k.besked}
          </span>
        </div>
      </div>
    </div>
  );
}
