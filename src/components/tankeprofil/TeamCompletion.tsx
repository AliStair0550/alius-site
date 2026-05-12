"use client";

import Link from "next/link";

type Props = {
  displayName: string;
  companyName: string;
  accessToken: string | null;
  reportToken: string | null;
};

export function TeamCompletion({ displayName, companyName, accessToken, reportToken }: Props) {
  const reportUrl = reportToken
    ? `${typeof window !== "undefined" ? window.location.origin : "https://alius.dk"}/tankeprofil/hold/rapport/${reportToken}`
    : null;

  return (
    <section className="animate-[fadeIn_0.7s_ease-out] max-w-[640px]">
      <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-8">Færdig</div>
      <h1 className="font-fraunces font-light text-[clamp(48px,6vw,80px)] leading-[0.95] tracking-[-0.02em] mb-10">
        Tak,{" "}
        <em className="italic text-moss">{displayName}</em>.
      </h1>
      <p className="text-[19px] font-light leading-[1.55] text-stone max-w-[480px] mb-12">
        Din profil er nu en del af holdets samlede billede for {companyName}.
      </p>

      {reportUrl && (
        <div className="mb-10 p-8 bg-sand">
          <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-3">
            Holdrapporten er klar
          </div>
          <p className="text-[15px] text-stone leading-[1.6] mb-6 max-w-[400px]">
            Rapporten opdateres løbende som resten af holdet gennemfører testen. Åbn den med dit hold.
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

      {accessToken && (
        <div className="border-t border-ink/10 pt-10">
          <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60 mb-4">
            Din individuelle profil
          </div>
          <p className="text-[15px] text-stone leading-[1.6] mb-6 max-w-[440px]">
            Nysgerrig på hvad din profil fortæller? Du kan se den her, ingen login nødvendigt.
          </p>
          <Link
            href={`/tankeprofil/min-profil/${accessToken}`}
            className="inline-flex items-center gap-4 border border-ink/25 text-ink px-9 py-[18px] text-[12px] font-normal tracking-[0.25em] uppercase no-underline transition-all duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-ink hover:text-parchment hover:border-ink hover:gap-6 group"
          >
            Se min profil
            <span className="transition-transform duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1">
              &rarr;
            </span>
          </Link>
        </div>
      )}
    </section>
  );
}
