"use client";

import Link from "next/link";
import { ARCHETYPES, type QuadrantKey, type Totals } from "./data";
import { Quadrant } from "./Quadrant";

type ReportProps = {
  totals: Totals;
  pct: Totals;
  primary: QuadrantKey;
  secondary: QuadrantKey;
  weakest: QuadrantKey;
  onRestart: () => void;
};

export function Report({ totals, pct, primary, secondary, weakest, onRestart }: ReportProps) {
  const primaryArch = ARCHETYPES[primary];
  const secondaryArch = ARCHETYPES[secondary];
  const weakestArch = ARCHETYPES[weakest];

  return (
    <section className="animate-[fadeIn_0.7s_ease-out]">
      <div className="text-left pt-10 pb-20 border-b border-ink/10">
        <div className="text-[11px] tracking-[0.4em] uppercase text-moss mb-6">
          Din fulde personlighedsprofil
        </div>
        <h1 className="font-fraunces font-light italic text-[clamp(64px,9vw,128px)] leading-[0.95] tracking-[-0.03em] mb-6 text-ink">
          {primaryArch.name}
        </h1>
        <p className="font-fraunces text-[22px] text-stone font-light">
          med <em className="italic">{secondaryArch.name}</em> som medløber, og{" "}
          <em className="italic">{weakestArch.name}</em> som blindt felt
        </p>
      </div>

      {/* 01 Profil */}
      <div className="py-20 border-b border-ink/10">
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-16">
          <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60 pt-2">
            01 &#183; Profil
          </div>
          <div>
            <h2 className="font-fraunces font-light text-[40px] leading-[1.1] mb-8 tracking-[-0.01em]">
              Hvor din tænkning bor.
            </h2>
            <p className="text-[17px] leading-[1.65] text-stone mb-5 max-w-[640px]">
              {primaryArch.description}
            </p>
            <p className="text-[17px] leading-[1.65] text-stone mb-5 max-w-[640px]">
              Med <strong className="text-ink font-normal">{secondaryArch.name.toLowerCase()}</strong> som din sekundære kvadrant tilfører du noget der gør profilen særlig. Du er {secondaryArch.short}. Det er den kombination der gør dig genkendelig.
            </p>
            <div className="mt-8 bg-sand p-12">
              <div className="max-w-[400px] mx-auto">
                <Quadrant totals={totals} size={400} showLabels />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
                {(["A", "B", "C", "D"] as QuadrantKey[]).map((q) => (
                  <div key={q} className="text-center">
                    <div className="font-fraunces text-sm italic mb-2">
                      {ARCHETYPES[q].name}
                    </div>
                    <div className="font-fraunces text-[32px] font-light">
                      {Math.round(pct[q] * 100)}%
                    </div>
                    <div className="h-[2px] bg-ink/10 mt-3 relative overflow-hidden">
                      <div
                        className="absolute inset-0 bg-moss origin-left transition-transform duration-[1000ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                        style={{ transform: `scaleX(${pct[q]})` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 02 Styrker */}
      <div className="py-20 border-b border-ink/10">
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-16">
          <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60 pt-2">
            02 &#183; Styrker
          </div>
          <div>
            <h2 className="font-fraunces font-light text-[40px] leading-[1.1] mb-8 tracking-[-0.01em]">
              Hvad du gør bedst.
            </h2>
            <p className="text-[17px] leading-[1.65] text-stone mb-5 max-w-[640px]">
              Dette er hvor du naturligt henter energi og leverer værdi. Læn dig ind i det.
            </p>
            <ul className="list-none mt-8 border-t border-ink/10">
              {primaryArch.strengths.map(([title, desc], i) => (
                <li
                  key={title}
                  className="py-5 border-b border-ink/10 grid grid-cols-[80px_1fr] gap-6 items-baseline"
                >
                  <span className="font-fraunces font-light text-2xl text-moss">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <div className="font-normal mb-1.5 text-base">{title}</div>
                    <div className="text-sm text-stone opacity-80 leading-[1.5]">
                      {desc}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 03 Blinde felter */}
      <div className="py-20 border-b border-ink/10">
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-16">
          <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60 pt-2">
            03 &#183; Blinde felter
          </div>
          <div>
            <h2 className="font-fraunces font-light text-[40px] leading-[1.1] mb-8 tracking-[-0.01em]">
              Hvor du sandsynligvis
              <br />
              overser noget.
            </h2>
            <p className="text-[17px] leading-[1.65] text-stone mb-5 max-w-[640px]">
              Ingen profil er komplet, og det er heller ikke meningen. Her er hvor din tænkning typisk har en blindvinkel. Det er ikke svagheder. Det er steder hvor du med fordel kan stille flere spørgsmål.
            </p>
            <ul className="list-none mt-8 border-t border-ink/10">
              {primaryArch.blindspots.map(([title, desc], i) => (
                <li
                  key={title}
                  className="py-5 border-b border-ink/10 grid grid-cols-[80px_1fr] gap-6 items-baseline"
                >
                  <span className="font-fraunces font-light text-2xl text-moss">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <div className="font-normal mb-1.5 text-base">{title}</div>
                    <div className="text-sm text-stone opacity-80 leading-[1.5]">
                      {desc}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 04 Skygge */}
      <div className="py-20">
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-16">
          <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60 pt-2">
            04 &#183; Skygge
          </div>
          <div>
            <h2 className="font-fraunces font-light text-[40px] leading-[1.1] mb-8 tracking-[-0.01em]">
              Din modsatte kant.
            </h2>
            <p className="text-[17px] leading-[1.65] text-stone mb-5 max-w-[640px]">
              <strong className="text-ink font-normal">{weakestArch.name}</strong> er den kvadrant du henter mindst fra. Det betyder ikke at du ikke kan det. Det betyder at du sandsynligvis underprioriterer det. Når noget i din uge føles tungt eller forkert, er det ofte fordi situationen kalder på {weakestArch.short}.
            </p>
            <p className="text-[17px] leading-[1.65] text-stone mb-5 max-w-[640px]">
              Det stærkeste du kan gøre er ikke at blive {weakestArch.name.toLowerCase()}. Det er at omgive dig med nogen der er det, og lytte når de taler.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-16 p-10 md:p-16 bg-ink text-parchment text-center">
        <h3 className="font-fraunces font-light text-[40px] leading-[1.1] mb-4">
          Skal vi bruge
          <br />
          din profil til <em className="italic text-[#B8C9C1]">noget</em>?
        </h3>
        <p className="opacity-70 max-w-[480px] mx-auto mb-8 text-[15px]">
          Hos Alius arbejder vi med personlighedsprofiler som fundament for stærkere teams, klarere kommunikation og strategi der passer til hvem I faktisk er. Lad os tage en samtale.
        </p>
        <a
          href="mailto:hej@alius.dk"
          className="inline-flex items-center gap-4 bg-parchment text-ink px-9 py-[22px] text-[13px] font-normal tracking-[0.25em] uppercase cursor-pointer transition-all duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#4A7D68] hover:text-parchment hover:gap-6 no-underline group"
        >
          Book en samtale
          <span className="transition-transform duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1">
            &rarr;
          </span>
        </a>
      </div>

      <div className="text-center mt-12 text-xs tracking-[0.2em] uppercase">
        <button
          onClick={onRestart}
          className="text-stone bg-transparent border-none cursor-pointer border-b border-ink/10 pb-1 transition-colors duration-300 hover:text-moss font-inherit text-inherit tracking-inherit"
        >
          Tag testen igen
        </button>
      </div>

      <div className="text-center mt-8">
        <Link href="/" className="text-[11px] tracking-[0.25em] uppercase text-stone hover:text-moss transition-colors">
          Tilbage til alius.dk
        </Link>
      </div>
    </section>
  );
}
