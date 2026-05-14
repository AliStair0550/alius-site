import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { THINKERS, getThinkerBySlug, formatYear } from "@/lib/frihedstaenkere";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return THINKERS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const thinker = getThinkerBySlug(slug);
  if (!thinker) return {};
  return {
    title: `${thinker.name} · Frihedstænkere · Alius`,
    description: thinker.tagline,
  };
}

export default async function ThinkerPage({ params }: Props) {
  const { slug } = await params;
  const thinker = getThinkerBySlug(slug);
  if (!thinker) notFound();

  const sortedAll = [...THINKERS].sort((a, b) => a.born - b.born);
  const currentIdx = sortedAll.findIndex((t) => t.slug === slug);
  const prev = currentIdx > 0 ? sortedAll[currentIdx - 1] : null;
  const next = currentIdx < sortedAll.length - 1 ? sortedAll[currentIdx + 1] : null;

  // Related thinkers that exist in the dataset
  const relatedThinkers = thinker.relations
    .map((rel) => {
      const found = getThinkerBySlug(rel.slug);
      return found ? { ...rel, thinker: found } : null;
    })
    .filter(Boolean) as { slug: string; name: string; label: string; thinker: (typeof THINKERS)[0] }[];

  return (
    <div className="min-h-screen bg-parchment text-ink font-sans font-light overflow-x-hidden">
      {/* Dark hero header */}
      <div className="bg-forest relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(249,247,242,0.025) 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="max-w-[1200px] mx-auto px-5 py-8 md:px-8 md:py-10 relative z-10">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-baseline gap-4 pb-8 border-b border-parchment/10">
            <Link
              href="/frihedstaenkere"
              className="font-extralight text-sm tracking-[0.3em] uppercase text-parchment/50 no-underline hover:text-parchment transition-colors"
            >
              &larr; Frihedstænkere
            </Link>
            <div className="text-[11px] tracking-[0.2em] uppercase text-parchment/30">
              {thinker.era}
            </div>
          </header>
        </div>

        {/* Identity block */}
        <div className="max-w-[1200px] mx-auto px-5 pb-0 md:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-0 md:gap-0 items-end">
            <div className="pt-6 pb-12 md:pb-16">
              {/* Nationality + years */}
              <div className="text-[10px] tracking-[0.35em] uppercase text-parchment/30 mb-6">
                {thinker.nationality} &middot; {formatYear(thinker.born)}
                {thinker.died ? `-${formatYear(thinker.died)}` : ""}
              </div>

              {/* Name */}
              <h1 className="font-fraunces font-light text-[clamp(36px,7.5vw,88px)] leading-[0.95] tracking-[-0.025em] text-parchment mb-6">
                {thinker.name}
              </h1>

              {/* Tagline */}
              <p
                className="font-fraunces font-light italic text-[20px] md:text-[24px] leading-[1.35] max-w-[560px] mb-8"
                style={{ color: thinker.moodColors[1] }}
              >
                {thinker.tagline}
              </p>

              {/* Visual energy badge */}
              <div className="inline-flex items-center gap-3 text-[10px] tracking-[0.3em] uppercase text-parchment/25">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: thinker.moodColors[1] }}
                />
                {thinker.symbol} &middot; &ldquo;{thinker.visualEnergy}&rdquo;
              </div>
            </div>

            {/* Portrait */}
            <div className="relative self-stretch hidden md:block">
              <div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(ellipse at 40% 50%, ${thinker.moodColors[1]}33, ${thinker.moodColors[0]} 70%)`,
                }}
              />
              {thinker.portraitSrc && (
                <Image
                  src={thinker.portraitSrc}
                  alt={thinker.name}
                  fill
                  className="object-cover object-top grayscale mix-blend-luminosity"
                  priority
                />
              )}
              {/* Gradient fade to dark at bottom */}
              <div
                className="absolute bottom-0 left-0 right-0 h-24"
                style={{
                  background: `linear-gradient(to bottom, transparent, ${thinker.moodColors[0]})`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Themes strip */}
      <div className="border-b border-ink/10 bg-parchment">
        <div className="max-w-[1200px] mx-auto px-5 md:px-8 py-4 flex flex-wrap items-center gap-3">
          <span className="text-[10px] tracking-[0.3em] uppercase text-stone/40 mr-2">
            Temaer:
          </span>
          {thinker.themes.map((theme) => (
            <span
              key={theme}
              className="text-[10px] tracking-[0.2em] uppercase border px-2.5 py-1"
              style={{
                color: `${thinker.moodColors[1]}cc`,
                borderColor: `${thinker.moodColors[1]}44`,
              }}
            >
              {theme}
            </span>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div
        className="relative"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(26,26,26,0.035) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      >
        <div className="max-w-[1200px] mx-auto px-5 py-12 md:px-8 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-12 md:gap-20">
            {/* Left: content */}
            <div>
              {/* Introduction */}
              <section className="mb-14">
                <div className="text-[11px] tracking-[0.3em] uppercase text-stone/40 mb-6">
                  Introduktion
                </div>
                <p className="text-[18px] md:text-[20px] leading-[1.7] text-stone/80 max-w-[640px]">
                  {thinker.intro}
                </p>
              </section>

              {/* Core ideas */}
              <section className="mb-14">
                <div className="text-[11px] tracking-[0.3em] uppercase text-stone/40 mb-8 pb-4 border-b border-ink/10">
                  Nøgleidéer
                </div>
                <div className="space-y-10">
                  {thinker.coreIdeas.map((idea, i) => (
                    <div key={i} className="grid grid-cols-[28px_1fr] gap-4 md:gap-6">
                      <div
                        className="font-fraunces font-light italic text-[22px] leading-none mt-0.5"
                        style={{ color: `${thinker.moodColors[1]}66` }}
                      >
                        {i + 1}
                      </div>
                      <div>
                        <h3 className="font-fraunces font-light text-[21px] md:text-[24px] leading-[1.2] text-ink mb-3">
                          {idea.title}
                        </h3>
                        <p className="text-[16px] leading-[1.75] text-stone/70">
                          {idea.body}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Legacy */}
              <section className="mb-14">
                <div className="text-[11px] tracking-[0.3em] uppercase text-stone/40 mb-6 pb-4 border-b border-ink/10">
                  Arv & indflydelse
                </div>
                <p className="text-[16px] md:text-[17px] leading-[1.8] text-stone/70 max-w-[640px]">
                  {thinker.legacy}
                </p>
              </section>

              {/* Modern relevance */}
              <section className="mb-14 p-8 md:p-10 border-l-2"
                style={{ borderColor: `${thinker.moodColors[1]}44` }}>
                <div className="text-[10px] tracking-[0.3em] uppercase mb-4"
                  style={{ color: `${thinker.moodColors[1]}99` }}>
                  Moderne relevans
                </div>
                <p className="text-[16px] leading-[1.75] text-stone/75">
                  {thinker.modernRelevance}
                </p>
              </section>
            </div>

            {/* Sidebar */}
            <aside className="space-y-10 md:sticky md:top-12 self-start">
              {/* Quotes */}
              <div>
                <div className="text-[10px] tracking-[0.3em] uppercase text-stone/40 mb-6">
                  Citater
                </div>
                <div className="space-y-8">
                  {thinker.quotes.map((quote, i) => (
                    <div key={i} className="border-l-2 pl-5 py-1"
                      style={{ borderColor: `${thinker.moodColors[1]}55` }}>
                      <blockquote className="font-fraunces font-light italic text-[16px] md:text-[17px] leading-[1.6] text-ink mb-3">
                        &ldquo;{quote.text}&rdquo;
                      </blockquote>
                      <cite className="not-italic text-[10px] tracking-[0.15em] uppercase text-stone/40">
                        &middot; {quote.source}
                      </cite>
                    </div>
                  ))}
                </div>
              </div>

              {/* Relations */}
              {relatedThinkers.length > 0 && (
                <div>
                  <div className="text-[10px] tracking-[0.3em] uppercase text-stone/40 mb-5">
                    Idé-forbindelser
                  </div>
                  <div className="space-y-3">
                    {relatedThinkers.map((rel) => (
                      <Link
                        key={rel.slug}
                        href={`/frihedstaenkere/${rel.slug}`}
                        className="block p-4 no-underline group border border-ink/10 hover:border-ink/20 bg-fog/20 hover:bg-fog/50 transition-colors"
                      >
                        <div className="text-[9px] tracking-[0.25em] uppercase text-stone/40 mb-1">
                          {rel.label}
                        </div>
                        <div className="text-[15px] font-fraunces font-light text-ink group-hover:text-moss transition-colors">
                          {rel.name}
                        </div>
                        <div className="text-[11px] text-stone/50 mt-0.5">
                          {rel.thinker.nationality} &middot;{" "}
                          {formatYear(rel.thinker.born)}
                          {rel.thinker.died ? `-${formatYear(rel.thinker.died)}` : ""}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Central idea callout */}
              <div className="p-6"
                style={{
                  background: `radial-gradient(ellipse at 0% 0%, ${thinker.moodColors[1]}15, transparent 60%)`,
                  border: `1px solid ${thinker.moodColors[1]}22`,
                }}>
                <div className="text-[9px] tracking-[0.3em] uppercase mb-3"
                  style={{ color: `${thinker.moodColors[1]}88` }}>
                  Kerneidé
                </div>
                <p className="font-fraunces font-light italic text-[15px] leading-[1.6] text-stone/80">
                  {thinker.centralIdea}
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Prev/Next */}
      <nav className="border-t border-ink/10 bg-parchment">
        <div className="max-w-[1200px] mx-auto px-5 md:px-8 py-8 grid grid-cols-2 gap-4">
          {prev ? (
            <Link href={`/frihedstaenkere/${prev.slug}`} className="group no-underline">
              <div className="text-[10px] tracking-[0.25em] uppercase text-stone/40 mb-2">
                &larr; Forrige
              </div>
              <div className="font-fraunces font-light text-[19px] text-ink group-hover:text-moss transition-colors leading-[1.1]">
                {prev.name}
              </div>
              <div className="text-[12px] text-stone/40 mt-1">{formatYear(prev.born)}</div>
            </Link>
          ) : (
            <div />
          )}
          {next ? (
            <Link href={`/frihedstaenkere/${next.slug}`} className="group no-underline text-right ml-auto w-full">
              <div className="text-[10px] tracking-[0.25em] uppercase text-stone/40 mb-2">
                Næste &rarr;
              </div>
              <div className="font-fraunces font-light text-[19px] text-ink group-hover:text-moss transition-colors leading-[1.1]">
                {next.name}
              </div>
              <div className="text-[12px] text-stone/40 mt-1">{formatYear(next.born)}</div>
            </Link>
          ) : (
            <div />
          )}
        </div>
      </nav>

      <footer className="border-t border-ink/10 text-[11px] text-stone/40 tracking-[0.05em] py-6 px-5 md:px-8">
        Alius &middot; Strategi, brand og teknologi bygget som ét.
      </footer>
    </div>
  );
}
