"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const projects = [
  {
    name: "Karnov Group",
    type: "Strategi · Kommerciel · Automatisering",
    desc: "Fire år i krydsfeltet mellem strategi, kommerciel udvikling og eksekvering. Direkte leverancer: produktanalyser på tværs af platformen, forhandling og partnerskaber på trykprodukter, rationalisering af kommercielle produkter, automatisering af finansielle modeller samt rapportering og automatisering af CAPEX-projekter. Lead og facilitering på den nordiske strategi og lancering af den juridiske platform DIB på det danske marked.",
    image: "/karnov.png",
    link: "https://www.karnovgroup.com",
    layout: "image-right" as const,
  },
  {
    name: "Arbejdernes Landsbank",
    type: "Cash Management · Projektledelse · Bank",
    desc: "Strategisk projektleder på centrale initiativer på tværs af forretning og IT. Direkte leverancer: rådgivningskoncept og change management for bankens Cash Management-område, udvikling og automatisering af Netbank Erhverv, implementering af nyt intranet, forhandling med samarbejdspartnere og udvikling af finansielle produkter.",
    image: "/al.jpg",
    link: "https://www.al-bank.dk",
    layout: "image-left" as const,
  },
  {
    name: "Stemplet",
    type: "Platform · SaaS · Loyalitet",
    desc: "Digitalt loyalitetskort der bor i kundens Apple Wallet. Direkte leverancer: PassKit-passes der opdateres live efter hvert scan, QR-baseret stempling uden app eller signup, merchant-dashboard med realtidsstatistik og push ved optjent belønning. Fuld stack fra bunden - API, backend og infrastruktur.",
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
    name: "cykelmov",
    type: "Web · Booking · SEO",
    desc: "Nørrebros cykelbutik, digitalt relanceret fra bunden. Direkte leverancer: nyt brand, hjemmeside med online booking og lokal SEO. Sanity som headless CMS, hostet på Cloudflare.",
    Viz: CykelmovViz,
    link: "https://cykelmov.dk",
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
    name: "Smashii",
    type: "Branding · Hjemmeside",
    desc: "Streetfood brand og hjemmeside for smash burger koncept. Identitet, tone of voice og web.",
    bg: "#F5F2F0",
    logo: "/logo_darkpurple.png",
    link: "https://smashii.dk",
    layout: "image-right" as const,
  },
  {
    name: "Markus Brandt",
    type: "Brandidentitet · Hjemmeside",
    desc: "Brandidentitet og hjemmeside for dansk artist og sangskriver. Bordeaux og varm guld palette.",
    image: "https://markusbrandt.dk/assets/hero.avif",
    overlay: { title: "Markus Brandt" },
    link: "https://markusbrandt.dk",
    layout: "image-left" as const,
  },
  {
    name: "Sens Food",
    type: "Iværksætteri · Produkt · Brand",
    desc: "Grundlagde og drev fødevarevirksomhed med fokus på dressinger. Stod for produktudvikling, brandopbygning, marketing og forhandling af distributionsaftaler med danske supermarkedskæder.",
    image: "/sensfood.jpg",
    link: "https://sensfood.dk",
    layout: "image-right" as const,
  },
  {
    name: "folka",
    type: "Platform · SaaS · Community",
    desc: "Community management platform bygget fra bunden. Direkte leverancer: Stripe Connect til betalinger og udbetalinger, abonnements- og medlemslogik, rollebaseret adgang og community-værktøjer. Next.js, Prisma og Postgres - fra arkitektur til produktion.",
    image: "/folka.jpg",
    tint: "moss",
    link: "https://folka.dk",
    layout: "image-left" as const,
    logoFont: true,
  },
];

// ── Stemplet: digitalt stempelkort der fyldes stempel for stempel ──────────
const STAMP_CREAM = "#EFE7D8";
const STAMP_CARD = "#40332B"; // kortets flade (lidt lysere)
const STAMP_BROWN = "#2B221C"; // mørk til kaffekop-ikoner
const STAMP_MOSS = "#2D5F4A";
const STAMP_COLS = [79, 133, 187, 241];
const STAMP_ROWS = [118, 152];
const STAMPS = STAMP_ROWS.flatMap((y) => STAMP_COLS.map((x) => ({ x, y })));

// Dopamin: gnist-burst fra kortets midte når det 8. stempel lander
const SPARKLES: { dx: number; dy: number; r: number; c: string; d: string }[] = [
  { dx: 66, dy: -14, r: 3.4, c: STAMP_MOSS, d: "0ms" },
  { dx: 46, dy: -50, r: 2.8, c: STAMP_CREAM, d: "40ms" },
  { dx: 8, dy: -70, r: 3.8, c: "#4A7D68", d: "20ms" },
  { dx: -42, dy: -54, r: 2.8, c: STAMP_MOSS, d: "60ms" },
  { dx: -68, dy: -12, r: 3.4, c: STAMP_CREAM, d: "10ms" },
  { dx: -48, dy: 40, r: 2.8, c: "#4A7D68", d: "50ms" },
  { dx: 4, dy: 60, r: 3.4, c: STAMP_MOSS, d: "30ms" },
  { dx: 50, dy: 42, r: 2.8, c: STAMP_CREAM, d: "20ms" },
  { dx: 30, dy: -30, r: 2.2, c: STAMP_MOSS, d: "70ms" },
  { dx: -26, dy: 16, r: 2.2, c: STAMP_CREAM, d: "80ms" },
];

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
      timer = setTimeout(() => setFilled(6), 0);
      return () => clearTimeout(timer);
    }
    let n = 0;
    const step = () => {
      setFilled(n);
      const delay = n >= 8 ? 2200 : n === 0 ? 900 : 600;
      n = n >= 8 ? 0 : n + 1;
      timer = setTimeout(step, delay);
    };
    step();
    return () => clearTimeout(timer);
  }, []);

  const full = filled >= 8;

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <svg viewBox="0 0 320 200" className="card-float" style={{ width: "86%", height: "auto" }} role="img" aria-label="Stemplet digitalt stempelkort">
        <defs>
          <clipPath id="stampCardClip">
            <rect x="24" y="20" width="272" height="160" rx="20" />
          </clipPath>
          <linearGradient id="stampSheenGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.14" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Kort */}
        <rect x="24" y="20" width="272" height="160" rx="20" fill={STAMP_CARD} />

        {/* Premium sheen der stryger blødt hen over kortet */}
        <g clipPath="url(#stampCardClip)">
          <rect className="stamp-sheen" x="-70" y="10" width="70" height="180" fill="url(#stampSheenGrad)" style={{ transformBox: "view-box" }} />
        </g>

        {/* Fin lys kant langs toppen - glas-materiale */}
        <path d="M 44 20.6 H 276" stroke={STAMP_CREAM} strokeWidth="1" opacity="0.16" strokeLinecap="round" />

        {/* Header: forretningsnavn */}
        <text x="44" y="48" fill={STAMP_CREAM} style={{ fontSize: "8px", letterSpacing: "0.09em", fontWeight: 500, opacity: 0.92 }}>COPENHAGEN</text>
        <text x="44" y="59" fill={STAMP_CREAM} style={{ fontSize: "8px", letterSpacing: "0.09em", fontWeight: 500, opacity: 0.92 }}>COFFEE LAB</text>

        {/* Tæller */}
        <text x="276" y="45" textAnchor="end" fill={STAMP_CREAM} style={{ fontSize: "6px", letterSpacing: "0.16em", opacity: 0.55 }}>STEMPLER</text>
        <text x="276" y="61" textAnchor="end" fill={full ? STAMP_MOSS : STAMP_CREAM} style={{ fontSize: "14px", fontWeight: 500, transition: "fill 400ms ease" }}>{filled}/8</text>

        {/* Undertekst */}
        <text x="44" y="82" fill={full ? STAMP_MOSS : STAMP_CREAM} style={{ fontSize: "8px", opacity: full ? 0.95 : 0.6, transition: "fill 400ms ease, opacity 400ms ease" }}>
          {full ? "Din kop er klar" : "8. kop er gratis"}
        </text>

        {/* Stempler */}
        {STAMPS.map((s, i) => {
          const isReward = i === 7;
          const on = i < filled;
          return (
            <g key={i}>
              {/* Tom plads */}
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
              {/* Fyldt stempel - glider blødt ind og ud med et lille spring */}
              <g
                className={`stamp-mark${on ? " is-on" : ""}`}
                style={{ transformBox: "view-box", transformOrigin: `${s.x}px ${s.y}px` }}
              >
                {isReward && (
                  <circle
                    className="stamp-reward-glow"
                    cx={s.x}
                    cy={s.y}
                    r={13}
                    fill="none"
                    stroke={STAMP_MOSS}
                    strokeWidth={1.5}
                    style={{ transformBox: "view-box", transformOrigin: `${s.x}px ${s.y}px` }}
                  />
                )}
                <circle cx={s.x} cy={s.y} r={13} fill={isReward ? STAMP_MOSS : STAMP_CREAM} />
                <CoffeeCup x={s.x} y={s.y} color={isReward ? STAMP_CREAM : STAMP_BROWN} />
              </g>
            </g>
          );
        })}

        {/* Dopamin: fejring når det 8. stempel lander */}
        {full && (
          <g>
            {/* Kortet fejrer med en blød ring der breder sig ud */}
            <rect
              className="stamp-cheer"
              x="24"
              y="20"
              width="272"
              height="160"
              rx="20"
              fill="none"
              stroke={STAMP_MOSS}
              strokeWidth="2"
              style={{ transformBox: "view-box", transformOrigin: "160px 100px" }}
            />
            {/* "Ding" - tydelig ring der springer ud fra det optjente stempel */}
            <circle
              className="stamp-reward-burst"
              cx={STAMP_COLS[STAMP_COLS.length - 1]}
              cy={STAMP_ROWS[STAMP_ROWS.length - 1]}
              r={13}
              fill="none"
              stroke={STAMP_MOSS}
              strokeWidth="2"
              style={{
                transformBox: "view-box",
                transformOrigin: `${STAMP_COLS[STAMP_COLS.length - 1]}px ${STAMP_ROWS[STAMP_ROWS.length - 1]}px`,
              }}
            />
            {/* Gnist-burst fra kortets midte */}
            {SPARKLES.map((s, i) => (
              <circle
                key={`sp${i}`}
                className="stamp-spark"
                cx={160}
                cy={100}
                r={s.r}
                fill={s.c}
                style={{
                  transformBox: "view-box",
                  transformOrigin: "160px 100px",
                  ["--sx" as string]: `${s.dx}px`,
                  ["--sy" as string]: `${s.dy}px`,
                  animationDelay: s.d,
                }}
              />
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}

// ── Cykelmov: butiks-hero med logo (roterende hjul) og overskrift ───────────
function CykelmovViz() {
  return (
    <>
      <Image
        src="/cykelmov.jpg"
        alt="Cykelmov cykelbutik på Nørrebrogade"
        fill
        sizes="(max-width: 767px) 100vw, 640px"
        className="object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.05]"
      />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(20,20,25,0.92) 0%, rgba(20,20,25,0.4) 42%, rgba(20,20,25,0.1) 100%)" }}
      />

      {/* Cykelmov-logo med hjul der kører */}
      <div
        className="absolute top-4 left-5 z-10 flex items-center gap-2"
        style={{ fontFamily: "var(--font-bricolage), sans-serif", fontWeight: 800, fontSize: "1.05rem", letterSpacing: "-0.02em", textTransform: "uppercase", color: "#F5F3ED" }}
      >
        <span className="cm-hjul" />
        <span>
          Cykel<span style={{ color: "#6E86FF" }}>mov</span>
        </span>
      </div>

      {/* Hero-overskrift */}
      <div className="absolute left-5 right-5 bottom-5 z-10">
        <div
          className="text-[1.5rem] md:text-[1.7rem]"
          style={{ fontFamily: "var(--font-bricolage), sans-serif", fontWeight: 800, textTransform: "uppercase", lineHeight: 1.02, letterSpacing: "-0.01em", color: "#F5F3ED" }}
        >
          Nørrebro<br />kører på <span style={{ color: "#FFD02F" }}>Cykelmov</span>
        </div>
      </div>
    </>
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
        <Image
          src={p.image}
          alt={p.name}
          fill
          sizes="(max-width: 767px) 100vw, 640px"
          className="object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.05]"
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
            loading="lazy"
            decoding="async"
            className="absolute bottom-4 right-4 w-[100px] z-10 opacity-80"
          />
        )}
      </>
    );
  }
  if ("bgImage" in p && p.bgImage) {
    return (
      <>
        <Image
          src={p.bgImage}
          alt={p.name}
          fill
          sizes="(max-width: 767px) 100vw, 640px"
          className="object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.05]"
        />
        <div className="absolute inset-0 bg-ink/50" />
        {"logo" in p && p.logo && (
          <img
            src={p.logo}
            alt={`${p.name} logo`}
            loading="lazy"
            decoding="async"
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
            loading="lazy"
            decoding="async"
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
      <div
        className="text-parchment mb-2"
        style={"logoFont" in p && p.logoFont ? {
          fontFamily: "var(--font-cormorant), Georgia, serif",
          fontStyle: "italic",
          fontWeight: 500,
          fontSize: "1.9rem",
          letterSpacing: "-0.025em",
        } : { fontWeight: 400, fontSize: "1.3rem" }}
      >
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
          Alt her er bygget og leveret. Det meste kører i drift i dag.
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
