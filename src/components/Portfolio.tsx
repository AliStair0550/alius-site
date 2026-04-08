"use client";

import { useRef } from "react";

const projects = [
  {
    type: "Fundament",
    label: "Hjemmeside - Branding",
    name: "Markus Brandt",
    desc: "Brandidentitet og hjemmeside for dansk musikartist. Bordeaux/guld-palette, Montserrat Bold.",
    bg: "linear-gradient(135deg, #2a3a30 0%, #1a2a20 100%)",
  },
  {
    type: "Fundament",
    label: "Hjemmeside - Design",
    name: "Cafe Cix",
    desc: "Restaurant-hjemmeside med online menu, SSL-opsætning og mobil-optimering.",
    bg: "linear-gradient(135deg, #3a2828 0%, #2a1818 100%)",
  },
  {
    type: "Fundament",
    label: "Branding - Rebrand",
    name: "S Studio",
    desc: "Komplet rebrand af skønhedsstudio. Ny palette, dobbelt-S logo, Libre Baskerville + Montserrat.",
    bg: "linear-gradient(135deg, #2a3028 0%, #1a201a 100%)",
  },
  {
    type: "Forandring",
    label: "Platform - SaaS",
    name: "folka",
    desc: "Community management platform. Next.js, Stripe Connect, 40+ tRPC routers, Prisma, Neon.",
    bg: "linear-gradient(135deg, #283038 0%, #182028 100%)",
  },
  {
    type: "Form",
    label: "Strategi - Vækst",
    name: "Kommende projekt",
    desc: "Vækststrategi og prisoptimering for dansk konsulentvirksomhed med 12 ansatte.",
    bg: "linear-gradient(135deg, #303028 0%, #202018 100%)",
  },
];

export default function Portfolio() {
  const trackRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: number) => {
    trackRef.current?.scrollBy({ left: dir * 360, behavior: "smooth" });
  };

  return (
    <section id="portfolio" className="bg-ink py-20 md:py-28 overflow-hidden">
      <div className="max-w-[1100px] mx-auto px-6 md:px-8 flex flex-col md:flex-row justify-between md:items-end mb-10 gap-6">
        <div>
          <div className="text-[0.6rem] tracking-[0.22em] uppercase text-slate font-[300] mb-8">
            Portfolio
          </div>
          <h2 className="font-[300] text-[2rem] text-parchment tracking-[0.03em] leading-[1.3]">
            Strategi og eksekvering.
            <br />
            Fra samme hånd.
          </h2>
          <p className="font-[200] text-[0.9rem] text-slate mt-3 leading-[1.7] max-w-[400px]">
            Udvalgte projekter hvor vi har bygget fundament, formet strategi og
            implementeret forandring.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => scroll(-1)}
            className="w-[42px] h-[42px] border border-slate text-parchment flex items-center justify-center hover:border-moss hover:text-moss transition-colors cursor-pointer text-lg"
          >
            &larr;
          </button>
          <button
            onClick={() => scroll(1)}
            className="w-[42px] h-[42px] border border-slate text-parchment flex items-center justify-center hover:border-moss hover:text-moss transition-colors cursor-pointer text-lg"
          >
            &rarr;
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        className="portfolio-track flex gap-5 px-6 md:px-8 overflow-x-auto scroll-smooth"
      >
        {projects.map((p, i) => (
          <div
            key={i}
            className="min-w-[340px] shrink-0 bg-[#222] border border-[#333] hover:border-moss transition-colors cursor-pointer group"
          >
            <div
              className="w-full aspect-[16/10] flex items-center justify-center relative overflow-hidden"
              style={{ background: p.bg }}
            >
              <span className="text-[0.6rem] tracking-[0.15em] uppercase text-slate font-[300]">
                {p.label}
              </span>
              <div className="absolute inset-0 bg-moss/85 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[0.72rem] tracking-[0.12em] uppercase text-parchment font-[300]">
                  Se case &rarr;
                </span>
              </div>
            </div>
            <div className="p-5">
              <div className="text-[0.6rem] tracking-[0.15em] uppercase text-slate font-[300] mb-1">
                {p.type}
              </div>
              <div className="font-[400] text-[1rem] text-parchment mb-1">
                {p.name}
              </div>
              <div className="font-[200] text-[0.8rem] text-slate leading-[1.6]">
                {p.desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-[1100px] mx-auto px-6 md:px-8 pt-8">
        <a
          href="#"
          className="font-[200] text-[0.75rem] tracking-[0.1em] uppercase text-slate border-b border-slate pb-0.5 hover:text-moss hover:border-moss transition-colors"
        >
          Se alle projekter og mit CV &rarr;
        </a>
      </div>
    </section>
  );
}
