import Link from "next/link";

type Props = {
  displayName: string;
  companyName: string;
  accessToken: string | null;
};

export function TeamCompletion({ displayName, companyName, accessToken }: Props) {
  return (
    <section className="animate-[fadeIn_0.7s_ease-out] max-w-[640px]">
      <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-8">Færdig</div>
      <h1 className="font-fraunces font-light text-[clamp(48px,6vw,80px)] leading-[0.95] tracking-[-0.02em] mb-10">
        Tak,{" "}
        <em className="italic text-moss">{displayName}</em>.
      </h1>
      <p className="text-[19px] font-light leading-[1.55] text-stone max-w-[480px] mb-12">
        Din profil er nu en del af holdets samlede billede for {companyName}. I hører fra Alius når rapporten er klar.
      </p>

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
            className="inline-flex items-center gap-4 bg-ink text-parchment px-9 py-[22px] text-[13px] font-normal tracking-[0.25em] uppercase no-underline transition-all duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-moss hover:gap-6 group"
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
