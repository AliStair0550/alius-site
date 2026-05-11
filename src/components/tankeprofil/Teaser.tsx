"use client";

import { useState } from "react";
import { ARCHETYPES, type QuadrantKey, type Totals } from "./data";
import { Glyph } from "./Glyph";
import { ShareSection } from "./ShareCard";

type TeaserProps = {
  totals: Totals;
  pct: Totals;
  primary: QuadrantKey;
  secondary: QuadrantKey;
  weakest: QuadrantKey;
  onSubmitEmail: (email: string) => void;
};

export function Teaser({ totals, pct, primary, secondary, weakest, onSubmitEmail }: TeaserProps) {
  const [email, setEmail] = useState("");
  const primaryArch = ARCHETYPES[primary];
  const secondaryArch = ARCHETYPES[secondary];
  const weakestArch = ARCHETYPES[weakest];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) onSubmitEmail(email);
  };

  return (
    <section className="animate-[fadeIn_0.7s_ease-out]">
      <div className="pt-10">
        <div className="flex items-center gap-4 text-[11px] tracking-[0.4em] uppercase text-moss mb-14 font-normal">
          <span className="h-px flex-1 max-w-[80px] bg-ink/10" />
          Din personlighedsprofil
          <span className="h-px flex-1 max-w-[200px] bg-ink/10" />
        </div>

        <div className="mb-6 pb-6 border-b border-ink/10">
          <div className="font-fraunces font-extralight italic text-[clamp(28px,4vw,48px)] text-stone opacity-50 mb-2 tracking-[-0.01em]">
            Du er en
          </div>
          <div className="flex items-end justify-between gap-6">
            <h1 className="font-fraunces font-light italic text-[clamp(72px,13vw,180px)] leading-[0.85] tracking-[-0.04em] text-ink animate-[revealUp_0.9s_cubic-bezier(0.22,1,0.36,1)_0.2s_both]">
              {primaryArch.name}
            </h1>
            <div className="w-[100px] md:w-[150px] flex-shrink-0 mb-2">
              <Glyph totals={totals} size={150} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 mb-20 py-6">
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-stone opacity-50 mb-3">
              Medløber
            </div>
            <div className="font-fraunces italic text-3xl font-light">
              {secondaryArch.name}
            </div>
            <div className="text-[13px] text-stone opacity-70 mt-1">
              Din sekundære kvadrant. Det der gør profilen særlig.
            </div>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-stone opacity-50 mb-3">
              Blindt felt
            </div>
            <div className="font-fraunces italic text-3xl font-light">
              {weakestArch.name}
            </div>
            <div className="text-[13px] text-stone opacity-70 mt-1">
              Kvadranten du sjældnest besøger. Her overser du muligheder.
            </div>
          </div>
        </div>

        <div className="relative bg-ink text-parchment px-6 py-16 md:px-16 md:py-24 -mx-5 md:-mx-8 mb-20 overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(249,247,242,0.06) 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="relative">
            <div className="text-[10px] tracking-[0.4em] uppercase text-parchment opacity-50 mb-8">
              Dit rum
            </div>
            <p className="font-fraunces font-extralight italic text-[clamp(28px,3.5vw,44px)] leading-[1.25] max-w-[800px] mb-8 tracking-[-0.01em]">
              <span className="text-[1.2em] text-moss-light opacity-60 mr-2">&ldquo;</span>
              {primaryArch.room}
            </p>
            <p className="text-[17px] leading-[1.6] max-w-[640px] opacity-70">
              {primaryArch.description}
            </p>
          </div>
        </div>
      </div>

      <div className="p-8 md:p-16 bg-fog max-w-[760px] mx-auto mb-16">
        <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-4">
          Fuld rapport
        </div>
        <h3 className="font-fraunces font-light text-[40px] leading-[1.05] mb-4 tracking-[-0.01em]">
          Få den dybe
          <br />
          <em className="italic text-moss">læsning</em> på mail.
        </h3>
        <p className="text-stone mb-8 text-[15px] max-w-[480px]">
          En seks-siders rapport med din fulde profil, dine styrker, dine blinde felter, og konkrete råd til hvordan du arbejder bedst alene og sammen med andre.
        </p>
        <ul className="list-none mb-8">
          {[
            "Detaljeret beskrivelse af dine fire kvadranter",
            "Dine fem største styrker og tre blinde felter",
            "Hvordan du kommunikerer og samarbejder bedst",
            "Tips til at strække dig ud i dine svagere kvadranter",
          ].map((item) => (
            <li
              key={item}
              className="py-3 border-b border-ink/10 text-sm flex items-center gap-4"
            >
              <span className="inline-block w-1.5 h-1.5 bg-moss rounded-full flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
        <form onSubmit={handleSubmit} className="flex border border-ink">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="din@email.dk"
            required
            className="flex-1 px-5 py-[18px] border-none bg-transparent text-[15px] font-light text-ink outline-none placeholder:text-stone/50"
          />
          <button
            type="submit"
            className="bg-ink text-parchment border-none px-7 text-xs font-normal tracking-[0.25em] uppercase cursor-pointer transition-colors duration-300 hover:bg-moss"
          >
            Send rapport
          </button>
        </form>
      </div>

      <ShareSection totals={totals} pct={pct} primary={primary} secondary={secondary} />
    </section>
  );
}
