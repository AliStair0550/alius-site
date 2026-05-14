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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-ink/8">
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
      className="group block bg-parchment hover:bg-fog/30 transition-colors no-underline overflow-hidden"
    >
      {/* Portrait / placeholder */}
      <div className="relative w-full aspect-[4/3] overflow-hidden">
        {t.portraitSrc && !imgError ? (
          <Image
            src={t.portraitSrc}
            alt={t.name}
            fill
            className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
            onError={() => setImgError(true)}
          />
        ) : (
          // Mood color gradient placeholder
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 30% 40%, ${t.moodColors[1]}55 0%, ${t.moodColors[0]} 70%)`,
            }}
          />
        )}

        {/* Symbol overlay */}
        <div className="absolute bottom-3 left-4 text-[10px] tracking-[0.3em] uppercase text-parchment/30 pointer-events-none">
          {t.symbol}
        </div>

        {/* Era badge */}
        <div className="absolute top-3 right-3 text-[9px] tracking-[0.25em] uppercase bg-ink/50 text-parchment/70 px-2 py-1 backdrop-blur-sm">
          {t.era}
        </div>
      </div>

      {/* Info */}
      <div className="p-6">
        {/* Nationality + years */}
        <div className="text-[10px] tracking-[0.3em] uppercase text-stone/50 mb-3">
          {t.nationality} &middot; {formatYear(t.born)}–{t.died ? formatYear(t.died) : "nu"}
        </div>

        {/* Name */}
        <h2 className="font-fraunces font-light text-[26px] leading-[1.1] tracking-[-0.01em] text-ink mb-2 group-hover:text-moss transition-colors">
          {t.name}
        </h2>

        {/* Visual energy */}
        <p
          className="font-fraunces font-light italic text-[13px] mb-4 leading-[1.4]"
          style={{ color: t.moodColors[1] }}
        >
          &ldquo;{t.visualEnergy}&rdquo;
        </p>

        {/* Central idea */}
        <p className="text-[13px] leading-[1.6] text-stone/70 line-clamp-2 mb-4">
          {t.centralIdea}
        </p>

        {/* Themes */}
        <div className="flex flex-wrap gap-1.5">
          {t.themes.map((theme) => (
            <span
              key={theme}
              className="text-[9px] tracking-[0.2em] uppercase border px-2 py-1"
              style={{
                color: `${t.moodColors[1]}99`,
                borderColor: `${t.moodColors[1]}33`,
              }}
            >
              {theme}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
