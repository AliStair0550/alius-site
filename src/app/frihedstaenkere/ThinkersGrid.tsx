"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Thinker } from "@/lib/frihedstaenkere";
import { formatYear } from "@/lib/frihedstaenkere";

type Props = {
  thinkers: Thinker[];
  allThemes: string[];
};

export function ThinkersGrid({ thinkers, allThemes }: Props) {
  const [activeTheme, setActiveTheme] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    let result = thinkers;
    if (activeTheme) {
      result = result.filter((t) => t.themes.includes(activeTheme));
    }
    if (query.trim()) {
      const lower = query.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(lower) ||
          t.tagline.toLowerCase().includes(lower) ||
          t.centralIdea.toLowerCase().includes(lower) ||
          t.themes.some((theme) => theme.toLowerCase().includes(lower))
      );
    }
    return result;
  }, [thinkers, activeTheme, query]);

  return (
    <div>
      {/* Search + filter */}
      <div className="mb-10 md:mb-14 space-y-5">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Søg tænker eller tema..."
          className="w-full max-w-[480px] px-0 py-3 bg-transparent border-0 border-b border-ink/20 text-[16px] font-light text-ink outline-none placeholder:text-stone/40 focus:border-ink transition-colors"
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] tracking-[0.25em] uppercase text-stone opacity-50 mr-1">
            Tema:
          </span>
          <button
            onClick={() => setActiveTheme(null)}
            className={`px-3 py-2 text-[11px] tracking-[0.15em] uppercase border transition-colors ${
              activeTheme === null
                ? "bg-ink text-parchment border-ink"
                : "text-stone border-ink/20 hover:border-ink/50 hover:text-ink"
            }`}
          >
            Alle
          </button>
          {allThemes.map((theme) => (
            <button
              key={theme}
              onClick={() => setActiveTheme(theme === activeTheme ? null : theme)}
              className={`px-3 py-2 text-[11px] tracking-[0.15em] uppercase border transition-colors ${
                activeTheme === theme
                  ? "bg-ink text-parchment border-ink"
                  : "text-stone border-ink/20 hover:border-ink/50 hover:text-ink"
              }`}
            >
              {theme}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-stone opacity-50 text-[15px] italic font-light py-8">
          Ingen tænkere matcher søgningen.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {filtered.map((t) => (
            <ThinkerCard key={t.slug} thinker={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function ThinkerCard({ thinker: t }: { thinker: Thinker }) {
  const [imgError, setImgError] = useState(false);

  return (
    <Link
      href={`/frihedstaenkere/${t.slug}`}
      className="group block no-underline overflow-hidden border border-ink/10 hover:border-ink/30 transition-all duration-300 bg-parchment"
    >
      {/* Portrait — tall portrait ratio */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "3/4" }}>
        {t.portraitSrc && !imgError ? (
          <>
            <Image
              src={t.portraitSrc}
              alt={t.name}
              fill
              className="object-cover object-top grayscale group-hover:grayscale-0 transition-all duration-700"
              onError={() => setImgError(true)}
            />
            {/* Subtle top darkening — dramatisk portræt-look */}
            <div className="absolute top-0 left-0 right-0 h-16 pointer-events-none"
              style={{ background: "linear-gradient(to bottom, rgba(18,14,10,0.3), transparent)" }}
            />
            {/* Smooth bottom fade to card background */}
            <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
              style={{ background: "linear-gradient(to bottom, transparent 0%, rgba(249,247,242,0.6) 50%, #F9F7F2 100%)" }}
            />
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 30% 40%, ${t.moodColors[1]}55 0%, ${t.moodColors[0]} 70%)`,
            }}
          />
        )}

        {/* Era badge */}
        <div className="absolute top-2 left-2 text-[8px] tracking-[0.2em] uppercase bg-parchment/80 text-ink/50 px-2 py-1 backdrop-blur-sm">
          {t.era}
        </div>
      </div>

      {/* Info */}
      <div className="px-4 py-4">
        {/* Years */}
        <div className="text-[9px] tracking-[0.25em] uppercase text-stone/40 mb-2">
          {formatYear(t.born)}{t.died ? `-${formatYear(t.died)}` : ""}
        </div>

        {/* Name */}
        <h2 className="font-fraunces font-light text-[20px] leading-[1.1] tracking-[-0.01em] text-ink mb-2 group-hover:text-moss transition-colors">
          {t.name}
        </h2>

        {/* Central thesis — the hook */}
        <p className="font-fraunces font-light italic text-[13px] leading-[1.45] text-stone/60">
          {t.visualEnergy}
        </p>
      </div>
    </Link>
  );
}
