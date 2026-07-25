"use client";

import Link from "next/link";
import { ARCHETYPES, type QuadrantKey } from "./data";

type Props = {
  displayName: string;
  companyName: string;
  primary: QuadrantKey;
  secondary: QuadrantKey;
  accessToken: string | null;
  reportToken: string | null;
};

export function TeamCompletion({
  displayName,
  companyName,
  primary,
  secondary,
  accessToken,
  reportToken,
}: Props) {
  const reportUrl = reportToken
    ? `${typeof window !== "undefined" ? window.location.origin : "https://alius.dk"}/tankeprofil/hold/rapport/${reportToken}`
    : null;

  const primaryArch = ARCHETYPES[primary];
  const secondaryArch = ARCHETYPES[secondary];

  return (
    <section className="animate-[fadeIn_0.7s_ease-out] max-w-[680px]">
      <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-8">Færdig</div>
      <h1 className="font-fraunces font-light text-[clamp(40px,5vw,64px)] leading-[0.98] tracking-[-0.02em] mb-6">
        Tak,{" "}
        <em className="italic text-moss">{displayName}</em>.
      </h1>
      <p className="text-[18px] font-light leading-[1.55] text-stone max-w-[480px] mb-14">
        Her er dit eget resultat først. Din profil er samtidig blevet en del af
        holdets samlede billede for {companyName}.
      </p>

      {/* Dit resultat: hvad er du, og hvad betyder det */}
      <div className="border-t border-ink/10 pt-12">
        <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-5">
          Du er en
        </div>
        <h2 className="font-fraunces font-light italic text-[clamp(48px,7vw,88px)] leading-[0.95] tracking-[-0.03em] text-ink mb-5">
          {primaryArch.name}
        </h2>
        <p className="text-[19px] font-light leading-[1.5] text-ink max-w-[520px] mb-4">
          {primaryArch.essence}
        </p>
        <p className="text-[15px] font-light leading-[1.6] text-stone opacity-80 max-w-[520px]">
          Med <strong className="text-ink font-normal">{secondaryArch.name.toLowerCase()}</strong>{" "}
          som medløber. Det er den kombination der gør din profil genkendelig.
        </p>
      </div>

      {/* Styrker først */}
      <div className="mt-12 pt-12 border-t border-ink/10">
        <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-3">
          Dine styrker
        </div>
        <h3 className="font-fraunces font-light text-[28px] leading-[1.1] tracking-[-0.01em] mb-8">
          Hvad du gør bedst.
        </h3>
        <ul className="list-none border-t border-ink/10">
          {primaryArch.strengths.slice(0, 3).map(([title, desc], i) => (
            <li
              key={title}
              className="py-5 border-b border-ink/10 grid grid-cols-[56px_1fr] gap-4 md:gap-6 items-baseline"
            >
              <span className="font-fraunces font-light text-2xl text-moss">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <div className="font-normal mb-1.5 text-base">{title}</div>
                <div className="text-sm text-stone opacity-80 leading-[1.5]">{desc}</div>
              </div>
            </li>
          ))}
        </ul>

        {accessToken && (
          <Link
            href={`/tankeprofil/min-profil/${accessToken}`}
            className="inline-flex items-center gap-3 text-[12px] font-normal tracking-[0.2em] uppercase text-moss hover:gap-4 transition-all duration-300 no-underline mt-8 border-b border-moss/30 hover:border-moss pb-1 group"
          >
            Se hele din profil
            <span className="transition-transform duration-300 group-hover:translate-x-1">
              &rarr;
            </span>
          </Link>
        )}
      </div>

      {/* Så holdet: hvordan I passer sammen */}
      {reportUrl && (
        <div className="mt-14 p-8 md:p-10 bg-sand">
          <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-3">
            Og så holdet
          </div>
          <h3 className="font-fraunces font-light text-[28px] leading-[1.1] tracking-[-0.01em] mb-3">
            Sådan passer I sammen.
          </h3>
          <p className="text-[15px] text-stone leading-[1.6] mb-6 max-w-[420px]">
            Din profil indgår nu i holdets fælles rapport, der viser hvor I trækker
            i samme retning og hvad der mangler i rummet. Den opdateres løbende. Åbn den med dit hold.
          </p>
          <a
            href={reportUrl}
            className="inline-flex items-center gap-4 bg-ink text-parchment px-9 py-[18px] text-[12px] font-normal tracking-[0.25em] uppercase no-underline transition-all duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-moss hover:gap-6 group"
          >
            Se holdrapporten
            <span className="transition-transform duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1">
              &rarr;
            </span>
          </a>
        </div>
      )}
    </section>
  );
}
