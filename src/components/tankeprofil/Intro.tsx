import Link from "next/link";

type IntroProps = { onStart: () => void };

export function Intro({ onStart }: IntroProps) {
  return (
    <section className="animate-[fadeIn_0.7s_ease-out]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-start">
        <div>
          <div className="text-[11px] tracking-[0.3em] uppercase text-moss font-normal mb-8">
            Personlighedsprofil
          </div>
          <h1 className="font-fraunces font-light text-[clamp(48px,6vw,88px)] leading-[0.95] tracking-[-0.02em] mb-10">
            Lær din<br />
            <em className="italic text-moss">præferencer</em>
            <br />
            at kende.
          </h1>
          <p className="text-[19px] font-light leading-[1.55] text-stone max-w-[480px]">
            En personlighedsprofil, der giver et klart billede af, hvor du naturligt finder energi, og hvor du kan have blinde vinkler eller oversete muligheder.
          </p>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8 mt-14">
            <button
              onClick={onStart}
              className="inline-flex items-center gap-4 bg-ink text-parchment px-9 py-[22px] text-[13px] font-normal tracking-[0.25em] uppercase cursor-pointer transition-all duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-moss hover:gap-6 group"
            >
              Begynd
              <span className="transition-transform duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1">
                &rarr;
              </span>
            </button>
            <Link
              href="/tankeprofil/teori"
              className="text-[12px] font-normal tracking-[0.25em] uppercase text-stone hover:text-moss transition-colors border-b border-ink/10 hover:border-moss pb-1 no-underline"
            >
              Læs teorien bag
            </Link>
          </div>
        </div>
        <div className="border-l-0 md:border-l border-t md:border-t-0 border-ink/10 pl-0 md:pl-12 pt-8 md:pt-0">
          {[
            ["Varighed", "4 minutter"],
            ["Kort", "Tre"],
            ["Format", "Intuitivt valg"],
            ["Resultat", "Med det samme"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between py-5 border-b border-ink/10 last:border-b-0 text-sm"
            >
              <span className="text-stone opacity-60 tracking-[0.15em] uppercase text-[11px]">
                {label}
              </span>
              <span className="font-normal">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
