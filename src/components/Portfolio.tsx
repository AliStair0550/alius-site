"use client";

import { useRef } from "react";

const projects = [
  {
    name: "Markus Brandt",
    type: "Brandidentitet - Hjemmeside",
    desc: "Brandidentitet og hjemmeside for dansk artist og sangskriver. Bordeaux og varm guld palette.",
    image: "https://markusbrandt.dk/assets/hero.avif",
    link: "https://markusbrandt.dk",
  },
  {
    name: "Cafe Christian IX",
    type: "Hjemmeside - Design",
    desc: "Restaurant-hjemmeside med online menu, bordreservation og mobil-optimering.",
    bgImage: "https://www.cafe-cix.dk/assets/Billede34.jpg",
    logo: "https://www.cafe-cix.dk/assets/logo-white.png",
    link: "https://cafe-cix.dk",
  },
  {
    name: "Smashii",
    type: "Branding - Hjemmeside",
    desc: "Streetfood brand og hjemmeside for smash burger koncept. Identitet, tone of voice og web.",
    bg: "#3D2060",
    logo: "https://smashii.dk/assets/logonew.png",
    link: "https://smashii.dk",
  },
  {
    name: "SSTUDIO",
    type: "Branding - Rebrand",
    desc: "Komplet rebrand af skønhedssalon i Skive. Ny visuel identitet, hjemmeside og digital strategi.",
    image: "/stylister.avif",
    link: "https://sstudio.dk",
  },
  {
    name: "folka",
    type: "Platform - SaaS",
    desc: "Community management platform bygget fra bunden. Next.js, Stripe Connect, Prisma.",
    bg: "#283038",
    link: "https://folka.dk",
  },
];

export default function Portfolio() {
  const trackRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: number) => {
    trackRef.current?.scrollBy({ left: dir * 520, behavior: "smooth" });
  };

  return (
    <section id="portfolio" className="bg-stone py-24 md:py-32 overflow-hidden">
      <div className="max-w-[1100px] mx-auto px-6 md:px-8 flex flex-col md:flex-row justify-between md:items-end mb-14 gap-6">
        <div>
          <div className="text-[0.6rem] tracking-[0.22em] uppercase text-clay font-[300] mb-8">
            Portfolio
          </div>
          <h2 className="font-[300] text-[2.2rem] text-parchment tracking-[0.03em] leading-[1.3]">
            Strategi og eksekvering.
            <br />
            Fra samme hånd.
          </h2>
          <p className="font-[200] text-[0.9rem] text-fog mt-4 leading-[1.7] max-w-[420px]">
            Udvalgte projekter hvor vi har bygget fundament, formet strategi og
            implementeret forandring.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => scroll(-1)}
            className="w-[44px] h-[44px] border border-clay/50 text-parchment flex items-center justify-center hover:border-moss hover:text-moss transition-colors cursor-pointer text-lg"
          >
            &larr;
          </button>
          <button
            onClick={() => scroll(1)}
            className="w-[44px] h-[44px] border border-clay/50 text-parchment flex items-center justify-center hover:border-moss hover:text-moss transition-colors cursor-pointer text-lg"
          >
            &rarr;
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        className="portfolio-track flex gap-6 px-6 md:px-8 overflow-x-auto scroll-smooth"
      >
        {projects.map((p, i) => (
          <a
            key={i}
            href={p.link}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-[480px] shrink-0 cursor-pointer group block"
          >
            <div className="w-full aspect-[16/10] relative overflow-hidden rounded-sm">
              {"image" in p && p.image ? (
                <img
                  src={p.image}
                  alt={p.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                />
              ) : "bgImage" in p && p.bgImage ? (
                <>
                  <img
                    src={p.bgImage}
                    alt={p.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                  />
                  <div className="absolute inset-0 bg-ink/50" />
                  {"logo" in p && p.logo && (
                    <img
                      src={p.logo}
                      alt={`${p.name} logo`}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120px] z-10"
                      style={{ filter: "sepia(1) saturate(1.5) brightness(0.78) hue-rotate(5deg)" }}
                    />
                  )}
                </>
              ) : "bg" in p && p.bg ? (
                <div
                  className="absolute inset-0 flex items-center justify-center transition-transform duration-700 group-hover:scale-[1.05]"
                  style={{ background: p.bg }}
                >
                  {"logo" in p && p.logo && (
                    <img
                      src={p.logo}
                      alt={`${p.name} logo`}
                      className="w-[200px]"
                    />
                  )}
                </div>
              ) : null}

              <div className="absolute inset-0 bg-moss/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                <span className="text-[0.78rem] tracking-[0.12em] uppercase text-parchment font-[300]">
                  Se projekt &rarr;
                </span>
              </div>
            </div>

            <div className="pt-5 pb-2">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-moss" />
                <div className="text-[0.6rem] tracking-[0.18em] uppercase text-clay font-[300]">
                  {p.type}
                </div>
              </div>
              <div className="font-[300] text-[1.15rem] text-parchment mb-1.5">
                {p.name}
              </div>
              <div className="font-[200] text-[0.82rem] text-fog/70 leading-[1.6]">
                {p.desc}
              </div>
            </div>
          </a>
        ))}
      </div>

      <div className="max-w-[1100px] mx-auto px-6 md:px-8 pt-12">
        <a
          href="#"
          className="font-[200] text-[0.75rem] tracking-[0.1em] uppercase text-clay border-b border-clay pb-0.5 hover:text-moss hover:border-moss transition-colors"
        >
          Se alle projekter og mit CV &rarr;
        </a>
      </div>
    </section>
  );
}
