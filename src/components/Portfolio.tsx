"use client";

import { useEffect, useState } from "react";

const projects = [
  {
    name: "Karnov Group",
    type: "Strategi · Portefølje · Automatisering",
    desc: "Fire år i krydsfeltet mellem strategi, kommerciel udvikling og eksekvering: koncernstrategi for Danmark og Sverige, automatisering af finansielle processer og rapportering på hele projektporteføljen. Fra business cases og produktanalyse til lancering af en juridisk platform på det danske marked.",
    image: "/karnov.png",
    link: "https://www.karnovgroup.com",
    layout: "image-right" as const,
  },
  {
    name: "Arbejdernes Landsbank",
    type: "Strategi · Projektledelse · Bank",
    desc: "Strategisk projektleder på centrale udviklingsinitiativer på tværs af forretning og IT. Var med til at opbygge bankens Cash Management område og arbejdede med integrationen af PenSam Bank som en del af omstruktureringen mellem Arbejdernes Landsbank, Sydbank og Vestjysk Bank.",
    image: "/al.jpg",
    link: "https://www.al-bank.dk",
    layout: "image-left" as const,
  },
  {
    name: "Stemplet",
    type: "Platform · SaaS · Loyalitet",
    desc: "Det digitale stempelkort, der bor i kundens Apple Wallet. Ét scan, og loyaliteten kører. Ingen app, ingen tilmelding. Bygget fra bunden.",
    Viz: StempletViz,
    link: "https://stemplet.alius.dk",
    layout: "image-right" as const,
  },
  {
    name: "SSTUDIO",
    type: "Branding · Web · Automatisering",
    desc: "Branding af skønhedssalon i Skive: ny visuel identitet, hjemmeside og digital strategi. Herudover automatisering af finansiel rapportering og andre driftsnære leverancer.",
    image: "/stylister.avif",
    cornerLogo: "/sstudio-logo.svg",
    link: "https://sstudio.dk",
    layout: "image-left" as const,
  },
  {
    name: "Smashii",
    type: "Branding · Hjemmeside",
    desc: "Streetfood brand og hjemmeside for smash burger koncept. Identitet, tone of voice og web.",
    bg: "#F5F2F0",
    logo: "/logo_darkpurple.png",
    link: "https://smashii.dk",
    layout: "image-right" as const,
  },
  {
    name: "Cafe Christian IX",
    type: "Hjemmeside · Design",
    desc: "Restaurant-hjemmeside med online menu og mobil-optimering.",
    bgImage: "https://www.cafe-cix.dk/assets/Billede34.jpg",
    logo: "https://www.cafe-cix.dk/assets/logo-white.png",
    link: "https://cafe-cix.dk",
    layout: "image-left" as const,
  },
  {
    name: "Markus Brandt",
    type: "Brandidentitet · Hjemmeside",
    desc: "Brandidentitet og hjemmeside for dansk artist og sangskriver. Bordeaux og varm guld palette.",
    image: "https://markusbrandt.dk/assets/hero.avif",
    overlay: { title: "Markus Brandt" },
    link: "https://markusbrandt.dk",
    layout: "image-right" as const,
  },
  {
    name: "Sens Food",
    type: "Iværksætteri · Produkt · Brand",
    desc: "Grundlagde og drev fødevarevirksomhed med fokus på dressinger. Stod for produktudvikling, brandopbygning, marketing og forhandling af distributionsaftaler med danske supermarkedskæder.",
    image: "/sensfood.jpg",
    link: "https://sensfood.dk",
    layout: "image-left" as const,
  },
  {
    name: "folka",
    type: "Platform · SaaS",
    desc: "Community management platform bygget fra bunden. Next.js, Stripe Connect, Prisma.",
    image: "/folka.jpg",
    tint: "moss",
    link: "https://folka.dk",
    layout: "full" as const,
    logoFont: true,
  },
];

// ── Stemplet: digitalt stempelkort der fyldes stempel for stempel ──────────
const STAMP_CREAM = "#EFE7D8";
const STAMP_BROWN = "#2B221C";
const STAMP_MOSS = "#2D5F4A";
const STAMP_COLS = [68, 114, 160, 206, 252];
const STAMP_ROWS = [118, 152];
const STAMPS = STAMP_ROWS.flatMap((y) => STAMP_COLS.map((x) => ({ x, y })));

function CoffeeCup({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M -4.5 -3 h 9 v 2.4 a 4.5 4.5 0 0 1 -9 0 z" fill={color} />
      <path d="M 4.6 -2 a 2.4 2.4 0 0 1 0 4" fill="none" stroke={color} strokeWidth={1.3} />
    </g>
  );
}

function StempletViz() {
  const [filled, setFilled] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      timer = setTimeout(() => setFilled(7), 0);
      return () => clearTimeout(timer);
    }
    let n = 0;
    const step = () => {
      setFilled(n);
      const delay = n >= 10 ? 1700 : 600;
      n = n >= 10 ? 0 : n + 1;
      timer = setTimeout(step, delay);
    };
    step();
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <svg viewBox="0 0 320 200" className="card-float" style={{ width: "76%", height: "auto" }} role="img" aria-label="Stemplet digitalt stempelkort">
        {/* Kort */}
        <rect x="24" y="20" width="272" height="160" rx="16" fill={STAMP_BROWN} />

        {/* Header: forretningsnavn */}
        <text x="44" y="48" fill={STAMP_CREAM} style={{ fontSize: "8px", letterSpacing: "0.09em", fontWeight: 500, opacity: 0.92 }}>COPENHAGEN</text>
        <text x="44" y="59" fill={STAMP_CREAM} style={{ fontSize: "8px", letterSpacing: "0.09em", fontWeight: 500, opacity: 0.92 }}>COFFEE LAB</text>

        {/* Tæller */}
        <text x="276" y="45" textAnchor="end" fill={STAMP_CREAM} style={{ fontSize: "6px", letterSpacing: "0.16em", opacity: 0.55 }}>STEMPLER</text>
        <text x="276" y="61" textAnchor="end" fill={filled >= 10 ? STAMP_MOSS : STAMP_CREAM} style={{ fontSize: "14px", fontWeight: 500 }}>{filled}/10</text>

        {/* Undertekst */}
        <text x="44" y="82" fill={STAMP_CREAM} style={{ fontSize: "8px", opacity: 0.6 }}>10. kop er gratis</text>

        {/* Stempler */}
        {STAMPS.map((s, i) => {
          const isReward = i === 9;
          const on = i < filled;
          return (
            <g key={i}>
              <circle
                cx={s.x}
                cy={s.y}
                r={13}
                fill="none"
                stroke={STAMP_CREAM}
                strokeWidth={1}
                opacity={0.22}
                strokeDasharray={isReward ? "2 2.6" : undefined}
              />
              {on && (
                <g className="stamp-fly" style={{ transformBox: "view-box", transformOrigin: `${s.x}px ${s.y}px` }}>
                  <circle cx={s.x} cy={s.y} r={13} fill={isReward ? STAMP_MOSS : STAMP_CREAM} />
                  <CoffeeCup x={s.x} y={s.y} color={isReward ? STAMP_CREAM : STAMP_BROWN} />
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ProjectImage({ p }: { p: (typeof projects)[number] }) {
  if ("Viz" in p && p.Viz) {
    const Viz = p.Viz;
    return <Viz />;
  }
  if ("image" in p && p.image) {
    return (
      <>
        <img
          src={p.image}
          alt={p.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.05]"
        />
        {"overlay" in p && p.overlay && (
          <>
            <div className="absolute inset-0 bg-ink/40 z-10" />
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
              <div className="font-[400] text-[1.8rem] text-parchment tracking-[0.04em]">
                {p.overlay.title}
              </div>
            </div>
          </>
        )}
        {"tint" in p && p.tint === "moss" && (
          <div className="absolute inset-0 bg-moss/40 z-[5]" />
        )}
        {"cornerLogo" in p && p.cornerLogo && (
          <img
            src={p.cornerLogo}
            alt={`${p.name} logo`}
            className="absolute bottom-4 right-4 w-[100px] z-10 opacity-80"
          />
        )}
      </>
    );
  }
  if ("bgImage" in p && p.bgImage) {
    return (
      <>
        <img
          src={p.bgImage}
          alt={p.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.05]"
        />
        <div className="absolute inset-0 bg-ink/50" />
        {"logo" in p && p.logo && (
          <img
            src={p.logo}
            alt={`${p.name} logo`}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] z-10"
            style={{ filter: "brightness(0) saturate(100%) invert(68%) sepia(30%) saturate(600%) hue-rotate(5deg) brightness(0.9)" }}
          />
        )}
      </>
    );
  }
  if ("bg" in p && p.bg) {
    return (
      <div
        className="absolute inset-0 flex items-center justify-center transition-transform duration-[600ms] ease-out group-hover:scale-[1.05]"
        style={{ background: p.bg }}
      >
        {"logo" in p && p.logo && (
          <img
            src={p.logo}
            alt={`${p.name} logo`}
            className="w-[300px] max-w-full"
          />
        )}
      </div>
    );
  }
  return null;
}

function ProjectInfo({ p }: { p: (typeof projects)[number] }) {
  return (
    <div className="flex flex-col justify-center">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.4)" }} />
        <div className="text-[0.6rem] tracking-[0.18em] uppercase font-[300]" style={{ color: "rgba(255,255,255,0.6)" }}>
          {p.type}
        </div>
      </div>
      <div className="font-[400] text-[1.3rem] text-parchment mb-2">
        {p.name}
      </div>
      <div className="font-[200] text-[0.85rem] leading-[1.7]" style={{ color: "rgba(255,255,255,0.6)" }}>
        {p.desc}
      </div>
    </div>
  );
}

export default function Portfolio() {
  return (
    <section id="portfolio" className="bg-moss py-20 md:py-28 relative overflow-hidden">
      <div className="max-w-[1100px] mx-auto px-6 md:px-8 mb-10">
        <h2 className="font-[300] text-[2.2rem] text-parchment tracking-[0.03em] leading-[1.3]">
          Fra idé til virkelighed.
        </h2>
        <p className="font-[200] text-[0.9rem] mt-4 leading-[1.7]" style={{ color: "rgba(255,255,255,0.5)" }}>
          Udvalgte projekter.
        </p>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 md:px-8 mb-12">
        <div className="h-px" style={{ background: "rgba(255,255,255,0.1)" }} />
      </div>

      <div className="max-w-[1100px] mx-auto px-6 md:px-8 relative z-10">
        {projects.map((p, i) => (
          <div key={i}>
            <a
              href={p.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block group rounded-sm transition-all duration-500 hover:translate-y-[-2px]"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.15) 100%)",
                border: "1px solid rgba(255,255,255,0.1)",
                backdropFilter: "blur(8px)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
                e.currentTarget.style.background = "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.1) 100%)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                e.currentTarget.style.background = "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.15) 100%)";
              }}
            >
              {p.layout === "full" ? (
                <div className="relative aspect-[16/10] overflow-hidden rounded-sm">
                  <ProjectImage p={p} />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 z-10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.4)" }} />
                      <div className="text-[0.6rem] tracking-[0.18em] uppercase font-[300]" style={{ color: "rgba(255,255,255,0.6)" }}>
                        {p.type}
                      </div>
                    </div>
                    <div
                      className="text-parchment mb-2"
                      style={"logoFont" in p && p.logoFont ? {
                        fontFamily: "'Cormorant Garamond', Georgia, serif",
                        fontStyle: "italic",
                        fontWeight: 500,
                        fontSize: "2rem",
                        letterSpacing: "-0.025em",
                      } : { fontWeight: 400, fontSize: "1.3rem" }}
                    >
                      {p.name}
                    </div>
                    <div className="font-[200] text-[0.85rem] leading-[1.7] max-w-[480px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                      {p.desc}
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`grid grid-cols-1 md:grid-cols-[1fr_0.55fr] gap-8 md:gap-12 p-4 md:p-6 ${
                  p.layout === "image-right" ? "md:grid-cols-[0.55fr_1fr]" : ""
                }`}>
                  {p.layout === "image-right" && (
                    <ProjectInfo p={p} />
                  )}
                  <div className="aspect-[16/10] relative overflow-hidden rounded-sm">
                    <ProjectImage p={p} />
                  </div>
                  {p.layout === "image-left" && (
                    <ProjectInfo p={p} />
                  )}
                </div>
              )}
            </a>

            {i < projects.length - 1 && (
              <div className="my-10 md:my-14" />
            )}
          </div>
        ))}
      </div>

    </section>
  );
}
