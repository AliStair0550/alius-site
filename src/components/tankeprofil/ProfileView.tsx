"use client";

import { useState } from "react";
import { ARCHETYPES, type QuadrantKey, type Totals } from "./data";
import { Quadrant } from "./Quadrant";
import { ShareSection } from "./ShareCard";

type ProfileViewProps = {
  totals: Totals;
  pct: Totals;
  primary: QuadrantKey;
  secondary: QuadrantKey;
  weakest: QuadrantKey;
  accessToken: string;
  email: string | null;
};

export function ProfileView({
  totals,
  pct,
  primary,
  secondary,
  weakest,
  accessToken,
  email: initialEmail,
}: ProfileViewProps) {
  const primaryArch = ARCHETYPES[primary];
  const secondaryArch = ARCHETYPES[secondary];
  const weakestArch = ARCHETYPES[weakest];

  const [email, setEmail] = useState(initialEmail ?? "");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEmail(true);
    setEmailError(null);

    try {
      const res = await fetch(`/api/profile/${accessToken}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setEmailError(data.error ?? "Kunne ikke gemme email");
      } else {
        setEmailSaved(true);
        setTimeout(() => setEmailSaved(false), 2500);
      }
    } catch {
      setEmailError("Forbindelsesfejl. Prøv igen.");
    } finally {
      setSavingEmail(false);
    }
  };

  return (
    <>
      {/* 01 Profil */}
      <section className="py-16 border-t border-ink/10">
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
            <div className="mt-8 bg-sand p-5 md:p-12">
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
      </section>

      {/* 02 Styrker */}
      <section className="py-16 border-t border-ink/10">
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
      </section>

      {/* 03 Blinde felter */}
      <section className="py-16 border-t border-ink/10">
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-16">
          <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60 pt-2">
            03 &#183; Blinde felter
          </div>
          <div>
            <h2 className="font-fraunces font-light text-[40px] leading-[1.1] mb-8 tracking-[-0.01em]">
              Hvor du sandsynligvis<br />overser noget.
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
      </section>

      {/* 04 Skygge */}
      <section className="py-16 border-t border-ink/10">
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
      </section>

      {/* Share section */}
      <ShareSection
        totals={totals}
        pct={pct}
        primary={primary}
        secondary={secondary}
      />

      {/* Email management (only show if no email set) */}
      {!initialEmail && (
        <section className="mt-16 p-10 md:p-12 bg-fog">
          <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-4">
            Gem din profil
          </div>
          <h3 className="font-fraunces font-light text-[28px] leading-[1.1] mb-4 tracking-[-0.01em]">
            Tilføj din email, så kan du altid finde tilbage hertil.
          </h3>
          <p className="text-stone text-[15px] leading-[1.6] mb-6 max-w-[480px]">
            Vi sender dig et link så du let kan vende tilbage til din profil senere. Du kan også bruge den samme profil i en fælles team-rapport uden at skulle tage testen igen.
          </p>
          <form onSubmit={handleSaveEmail} className="flex flex-col sm:flex-row gap-3 max-w-[480px]">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="din@email.dk"
              required
              disabled={savingEmail || emailSaved}
              className="flex-1 px-4 py-3 bg-parchment border border-ink/25 text-[15px] font-light text-ink outline-none placeholder:text-stone/40 focus:border-ink transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={savingEmail || emailSaved}
              className="px-6 py-3 bg-ink text-parchment border-none text-[12px] font-normal tracking-[0.25em] uppercase cursor-pointer transition-all duration-300 hover:bg-moss disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap"
            >
              {emailSaved ? "Gemt" : savingEmail ? "Gemmer..." : "Gem profil"}
            </button>
          </form>
          {emailError && (
            <p className="text-[13px] text-red-700 mt-3">{emailError}</p>
          )}
        </section>
      )}
    </>
  );
}
