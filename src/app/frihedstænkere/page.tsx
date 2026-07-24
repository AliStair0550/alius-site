import type { Metadata } from "next";
import Link from "next/link";
import { THINKERS, ALL_THEMES } from "@/lib/frihedstaenkere";
import { ThinkersGrid } from "./ThinkersGrid";
import { ThinkerTimeline } from "@/components/frihedstænkere/ThinkerTimeline";

export const metadata: Metadata = {
  alternates: { canonical: "/frihedstænkere" },
  title: "Frihedstænkere · Alius",
  description:
    "Et idébibliotek over tænkere der har formet vores forståelse af frihed, magt og civilisation. Fra Platon til Byung-Chul Han.",
};

export default function FrihedstaenkerePage() {
  return (
    <div className="min-h-screen text-ink font-sans font-light overflow-x-hidden" style={{ backgroundColor: "#F5EDE0" }}>
      {/* Top bar */}
      <div className="max-w-[1200px] mx-auto px-5 py-8 md:px-8 md:py-10 relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-baseline gap-4 pb-8 border-b border-ink/10">
          <Link
            href="/værktøjer"
            className="font-extralight text-sm tracking-[0.3em] uppercase text-ink no-underline hover:text-moss transition-colors"
          >
            &larr; Værktøjer
          </Link>
          <div className="text-[11px] tracking-[0.2em] uppercase text-stone opacity-60">
            Frihedstænkere
          </div>
        </header>
      </div>

      {/* Hero — warm light paper */}
      <div className="relative overflow-hidden" style={{ backgroundColor: "#F5EDE0" }}>
        {/* Dot grid */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(26,26,26,0.04) 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="max-w-[1200px] mx-auto px-5 pt-14 pb-16 md:px-8 md:pt-20 md:pb-24 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_400px] gap-8 md:gap-20 mb-10">
            <h1 className="font-fraunces font-light italic text-[clamp(38px,8.5vw,104px)] leading-[0.93] tracking-[-0.03em] text-ink">
              Frihedstænkere
            </h1>
            <div className="self-end space-y-3 text-[15px] leading-[1.7] text-stone/60 max-w-[380px]">
              <p>De fleste mennesker overtager deres verdenssyn uden nogensinde at opdage det.</p>
              <p>Fra skolen. Fra kulturen. Fra algoritmer. Fra hinanden.</p>
              <p className="text-stone/80">Frihedstænkere er et bibliotek over mennesker der så noget andet.</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap items-center gap-6 text-[11px] tracking-[0.2em] uppercase text-ink/30">
            <span>{THINKERS.length} tænkere</span>
            <span className="opacity-40">&middot;</span>
            <span>
              {Math.abs([...THINKERS].sort((a, b) => a.born - b.born)[0].born)} f.Kr. · {[...THINKERS].sort((a, b) => b.born - a.born)[0].born}
            </span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <ThinkerTimeline thinkers={THINKERS} />

      {/* Content section — warm dark */}
      <div style={{ backgroundColor: "#18140E" }}>
        <div className="max-w-[1200px] mx-auto px-5 py-16 md:px-8 md:py-20">
          <ThinkersGrid thinkers={THINKERS} allThemes={ALL_THEMES} />
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="bg-ink text-parchment">
        <div className="max-w-[1200px] mx-auto px-5 py-16 md:px-8 md:py-20">
          <div className="text-[11px] tracking-[0.3em] uppercase text-moss-light mb-4">
            For virksomheder
          </div>
          <h3 className="font-fraunces font-light text-[32px] md:text-[44px] leading-[1.1] mb-6 max-w-[600px]">
            Idéer er ikke akademiske.{" "}
            <em className="italic text-[#B8C9C1]">De er strategiske.</em>
          </h3>
          <p className="text-parchment/60 max-w-[520px] mb-10 text-[16px] leading-[1.6]">
            Alius bruger idéhistorie til at skærpe strategi. Vil du tænke dybere
            om din organisation, dit marked eller din fremtid?
          </p>
          <a
            href="mailto:hej@alius.dk"
            className="inline-flex items-center gap-4 bg-parchment text-ink px-9 py-[22px] text-[13px] font-normal tracking-[0.25em] uppercase no-underline hover:bg-[#4A7D68] hover:text-parchment transition-colors group"
          >
            Tag fat
            <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
          </a>
        </div>
      </div>

      <footer className="border-t border-ink/10 text-[11px] text-stone/40 tracking-[0.05em] py-6 px-5 md:px-8" style={{ backgroundColor: "#F5EDE0" }}>
        Alius &middot; Strategi, brand og teknologi bygget som ét.
      </footer>
    </div>
  );
}
