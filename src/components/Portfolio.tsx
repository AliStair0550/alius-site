"use client";

import { useRef, useEffect, useCallback, useState } from "react";

const projects = [
  {
    name: "Markus Brandt",
    type: "Brandidentitet - Hjemmeside",
    desc: "Brandidentitet og hjemmeside for dansk artist og sangskriver. Bordeaux og varm guld palette.",
    image: "https://markusbrandt.dk/assets/hero.avif",
    link: "https://markusbrandt.dk",
    accent: "#6B2230",
    width: "min-w-[560px]",
  },
  {
    name: "Cafe Christian IX",
    type: "Hjemmeside - Design",
    desc: "Restaurant-hjemmeside med online menu, bordreservation og mobil-optimering.",
    bgImage: "https://www.cafe-cix.dk/assets/Billede34.jpg",
    logo: "https://www.cafe-cix.dk/assets/logo-white.png",
    link: "https://cafe-cix.dk",
    accent: "#C5A55A",
    width: "min-w-[380px]",
  },
  {
    name: "Smashii",
    type: "Branding - Hjemmeside",
    desc: "Streetfood brand og hjemmeside for smash burger koncept. Identitet, tone of voice og web.",
    bg: "#3D2060",
    logo: "https://smashii.dk/assets/logonew.png",
    link: "https://smashii.dk",
    accent: "#3D2060",
    width: "min-w-[560px]",
  },
  {
    name: "SSTUDIO",
    type: "Branding - Rebrand",
    desc: "Komplet rebrand af skønhedssalon i Skive. Ny visuel identitet, hjemmeside og digital strategi.",
    image: "/stylister.avif",
    link: "https://sstudio.dk",
    accent: "#2D5F4A",
    width: "min-w-[380px]",
  },
  {
    name: "folka",
    type: "Platform - SaaS",
    desc: "Community management platform bygget fra bunden. Next.js, Stripe Connect, Prisma.",
    image: "/biking.avif",
    link: "https://folka.dk",
    accent: "#2A4858",
    width: "min-w-[560px]",
  },
];

function CardImage({ p }: { p: (typeof projects)[number] }) {
  if ("image" in p && p.image) {
    return (
      <img
        src={p.image}
        alt={p.name}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
      />
    );
  }
  if ("bgImage" in p && p.bgImage) {
    return (
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
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] z-10"
            style={{ filter: "sepia(1) saturate(1.5) brightness(0.78) hue-rotate(5deg)" }}
          />
        )}
      </>
    );
  }
  if ("bg" in p && p.bg) {
    return (
      <div
        className="absolute inset-0 flex items-center justify-center transition-transform duration-700 group-hover:scale-[1.05]"
        style={{ background: p.bg }}
      >
        {"logo" in p && p.logo && (
          <img
            src={p.logo}
            alt={`${p.name} logo`}
            className="w-[340px]"
          />
        )}
      </div>
    );
  }
  return null;
}

function RenderCard({ p, i }: { p: (typeof projects)[number]; i: number }) {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <a
      key={i}
      href={p.link}
      target="_blank"
      rel="noopener noreferrer"
      className={`${p.width} shrink-0 cursor-pointer group block`}
    >
      <div
        ref={imgRef}
        className="w-full aspect-[16/10] relative overflow-hidden rounded-sm"
        onMouseMove={onMove}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <CardImage p={p} />

        <div
          className="absolute rounded-full bg-moss/90 z-20 pointer-events-none flex items-center justify-center transition-transform duration-300"
          style={{
            width: 120,
            height: 120,
            left: mouse.x - 60,
            top: mouse.y - 60,
            transform: hovering ? "scale(1)" : "scale(0)",
          }}
        >
          <span className="text-[0.65rem] tracking-[0.1em] uppercase text-parchment font-[300]">
            Se projekt
          </span>
        </div>
      </div>

      <div className="bg-parchment border border-fog p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-moss" />
          <div className="text-[0.6rem] tracking-[0.18em] uppercase text-slate font-[300]">
            {p.type}
          </div>
        </div>
        <div className="font-[300] text-[1.15rem] text-ink mb-1.5">
          {p.name}
        </div>
        <div className="font-[200] text-[0.82rem] text-stone leading-[1.6]">
          {p.desc}
        </div>
      </div>
    </a>
  );
}

export default function Portfolio() {
  const trackRef = useRef<HTMLDivElement>(null);

  const handleLoop = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const cardWidth = 480 + 24;
    const setWidth = cardWidth * projects.length;

    if (track.scrollLeft <= 0) {
      track.scrollLeft += setWidth;
    } else if (track.scrollLeft >= setWidth * 2) {
      track.scrollLeft -= setWidth;
    }
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const cardWidth = 480 + 24;
    track.scrollLeft = cardWidth * projects.length;
    track.addEventListener("scroll", handleLoop);
    return () => track.removeEventListener("scroll", handleLoop);
  }, [handleLoop]);

  return (
    <section id="portfolio" className="bg-clay py-16 md:py-20 overflow-hidden">
      <div className="max-w-[1100px] mx-auto px-6 md:px-8 mb-10">
        <h2 className="font-[300] text-[2.2rem] text-ink tracking-[0.03em] leading-[1.3]">
          Strategi og eksekvering.
        </h2>
        <p className="font-[200] text-[0.9rem] text-stone mt-4 leading-[1.7] max-w-[420px]">
          Udvalgte projekter hvor vi har bygget fundament, formet strategi og
          implementeret forandring.
        </p>
      </div>

      <div
        ref={trackRef}
        className="portfolio-track flex gap-6 px-6 md:px-8 overflow-x-auto"
      >
        {projects.map((p, i) => <RenderCard p={p} i={i} key={i} />)}
        {projects.map((p, i) => <RenderCard p={p} i={i + projects.length} key={i + projects.length} />)}
        {projects.map((p, i) => <RenderCard p={p} i={i + projects.length * 2} key={i + projects.length * 2} />)}
      </div>

      <div className="max-w-[1100px] mx-auto px-6 md:px-8 pt-10">
        <a
          href="#"
          className="font-[200] text-[0.75rem] tracking-[0.1em] uppercase text-stone border-b border-stone pb-0.5 hover:text-moss hover:border-moss transition-colors"
        >
          Se alle projekter og mit CV &rarr;
        </a>
      </div>
    </section>
  );
}
