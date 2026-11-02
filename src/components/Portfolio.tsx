"use client";

import Image from "next/image";
import FolkaKortViz from "./FolkaKortViz";

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
    name: "folka",
    type: "Platform · Loyalitet · Apple Wallet",
    desc: "Et digitalt loyalitetskort direkte i Apple Wallet. Kunderne samler stempler, inviterer venner og får adgang til særlige rabatter.\n\nForretningen får samtidig en direkte kommunikationskanal til kundernes låseskærm via pushbeskeder. Hver forretning får sit eget kort, tilpasset med eget design og brand.",
    Viz: FolkaKortViz,
    link: "https://kort.folka.dk",
    layout: "image-right" as const,
    logoFont: true,
    // Viften af kort kan ikke stå i den smalle kolonne (333 px).
    bredtBillede: true,
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
    name: "SGA creatives",
    type: "Hjemmeside · Visuel identitet",
    desc: "Hjemmeside og visuel identitet for SGA creatives, der forbinder brands med kreative kræfter og leder kampagner og kulturelle oplevelser inden for mode, sneakers og lifestyle. Siden viser projekter for blandt andre Nike, adidas og Timberland.",
    // Heroens hovedbillede fra sgacreatives.com: Timberland × Rezet-eventet.
    // Hentet 27. oktober 2026 i 1040 px webp og gemt lokalt, så kortet ikke
    // afhænger af at SGA's side svarer. Billedet står på højkant og kortet
    // er 16:10; objectPosition holder ansigterne og støvlen i billedet i
    // stedet for kun æskerne forneden.
    image: "/sga-timberland.webp",
    objectPosition: "50% 12%",
    // Linjeskiftet følger SGA's egen hero: "Where brands / meet culture."
    overlay: { title: "Where brands\nmeet culture.", tone: "ink/50" as const },
    link: "https://www.sgacreatives.com",
    layout: "image-left" as const,
  },
];

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
          style={"objectPosition" in p && p.objectPosition ? { objectPosition: p.objectPosition } : undefined}
        />
        {"overlay" in p && p.overlay && (
          <>
            <div className={`absolute inset-0 z-10 ${"tone" in p.overlay && p.overlay.tone === "ink/50" ? "bg-ink/50" : "bg-ink/40"}`} />
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
              <div className="font-[400] text-[1.8rem] text-parchment tracking-[0.04em] text-center px-6 leading-[1.2] whitespace-pre-line">
                {p.overlay.title}
              </div>
            </div>
          </>
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
      <div className="font-[200] text-[0.85rem] leading-[1.7] whitespace-pre-line" style={{ color: "rgba(255,255,255,0.6)" }}>
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
              <div className={`grid grid-cols-1 gap-8 md:gap-12 p-4 md:p-6 ${
                "bredtBillede" in p && p.bredtBillede ? "md:grid-cols-[0.55fr_1fr]" : "md:grid-cols-[1fr_0.55fr]"
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
