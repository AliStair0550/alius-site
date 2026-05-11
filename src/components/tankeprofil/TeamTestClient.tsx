"use client";

import { useState, useEffect } from "react";
import { useTankeprofil } from "./useTankeprofil";
import { Intro } from "./Intro";
import { CardStage } from "./CardStage";
import { TeamCompletion } from "./TeamCompletion";

type Phase =
  | { type: "name-input" }
  | { type: "joining" }
  | { type: "join-error"; message: string }
  | { type: "testing"; accessToken: string }
  | { type: "done"; accessToken: string };

export function TeamTestClient({
  joinToken,
  companyName,
}: {
  joinToken: string;
  companyName: string;
}) {
  const tp = useTankeprofil();
  const [phase, setPhase] = useState<Phase>({ type: "name-input" });
  const [displayName, setDisplayName] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // When test is done (reaches teaser stage), submit to team and move to done
  useEffect(() => {
    if (tp.stage !== "teaser" || submitAttempted || phase.type !== "testing") return;
    setSubmitAttempted(true);

    const { accessToken } = phase;
    let cancelled = false;

    (async () => {
      try {
        await fetch(`/api/team/${joinToken}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessToken,
            totals: tp.totals,
            primary: tp.ranking.primary,
            secondary: tp.ranking.secondary,
            weakest: tp.ranking.weakest,
            selections: tp.selections,
          }),
        });
      } catch (err) {
        console.error("[TeamTestClient] Submit failed:", err);
      } finally {
        if (!cancelled) setPhase({ type: "done", accessToken });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tp.stage, submitAttempted, phase, joinToken, tp.totals, tp.ranking, tp.selections]);

  async function handleJoin(name: string) {
    setDisplayName(name);
    setPhase({ type: "joining" });

    try {
      const res = await fetch(`/api/team/${joinToken}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setPhase({ type: "join-error", message: data.error ?? "Kunne ikke tilmelde" });
      } else {
        setPhase({ type: "testing", accessToken: data.accessToken });
      }
    } catch {
      setPhase({ type: "join-error", message: "Netværksfejl. Tjek din forbindelse." });
    }
  }

  const isNamePhase = phase.type === "name-input" || phase.type === "joining" || phase.type === "join-error";

  return (
    <div className="min-h-screen bg-parchment text-ink font-sans font-light overflow-x-hidden relative">
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(26,26,26,0.04) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="max-w-[1100px] mx-auto px-5 py-8 md:px-8 md:py-12 relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-baseline gap-4 pb-8 md:pb-16 border-b border-ink/10 mb-10 md:mb-20">
          <div className="font-extralight text-sm tracking-[0.3em] uppercase text-ink">
            Alius · Personlighedsprofil
          </div>
          <div className="font-extralight text-xs tracking-[0.2em] uppercase text-stone opacity-60">
            {companyName}
          </div>
        </header>

        {isNamePhase && (
          <NameInput
            companyName={companyName}
            submitting={phase.type === "joining"}
            error={phase.type === "join-error" ? phase.message : null}
            onSubmit={handleJoin}
          />
        )}

        {phase.type === "testing" && tp.stage === "intro" && (
          <Intro onStart={() => tp.goToCard(0)} />
        )}

        {phase.type === "testing" && tp.stage === "card" && (
          <CardStage
            currentCard={tp.currentCard}
            cardSelection={tp.selections[tp.currentCard]}
            totals={tp.totals}
            shuffled={tp.getShuffled(tp.currentCard)}
            currentCardSelected={tp.currentCardSelected}
            onToggle={tp.toggleWord}
            onNext={tp.nextCard}
            onPrev={tp.prevCard}
          />
        )}

        {(phase.type === "testing" && tp.stage === "teaser") || phase.type === "done" ? (
          <TeamCompletion
            displayName={displayName}
            companyName={companyName}
            accessToken={phase.type === "done" ? phase.accessToken : null}
          />
        ) : null}

        <footer className="mt-24 pt-8 border-t border-ink/10 max-w-[720px]">
          <div className="text-[11px] text-stone opacity-50 tracking-[0.05em] leading-[1.6]">
            Personlighedsprofil er udviklet af Alius som et selvstændigt værktøj, inspireret af tænkningen bag Whole Brain Thinking, oprindeligt formuleret af Dr. Kobus Neethling (Neethling Brain Instruments). Ord, arketyper og fortolkninger er Alius&apos; egne.
          </div>
        </footer>
      </div>
    </div>
  );
}

function NameInput({
  companyName,
  submitting,
  error,
  onSubmit,
}: {
  companyName: string;
  submitting: boolean;
  error: string | null;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (name.trim()) onSubmit(name.trim());
  }

  return (
    <section className="animate-[fadeIn_0.7s_ease-out]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-start">
        <div>
          <div className="text-[11px] tracking-[0.3em] uppercase text-moss font-normal mb-8">
            {companyName}
          </div>
          <h1 className="font-fraunces font-light text-[clamp(48px,6vw,80px)] leading-[0.95] tracking-[-0.02em] mb-10">
            Hvad er dit{" "}
            <em className="italic text-moss">navn</em>?
          </h1>
          <p className="text-[17px] font-light leading-[1.55] text-stone max-w-[440px] mb-10">
            Dit navn vises på holdets fælles rapport. Du behøver ikke oprette en konto.
          </p>
          <form onSubmit={handleSubmit} className="space-y-6 max-w-[400px]">
            <label className="block">
              <span className="text-[11px] tracking-[0.2em] uppercase text-stone opacity-60 mb-2 block">
                Dit navn
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="fx Mette"
                required
                autoFocus
                disabled={submitting}
                className="w-full px-0 py-3 bg-transparent border-0 border-b border-ink/25 text-[20px] font-light text-ink outline-none placeholder:text-stone/40 focus:border-ink transition-colors disabled:opacity-50"
              />
            </label>
            {error && (
              <div className="p-3 border-l-2 border-red-600 bg-red-50/50 text-[13px] text-red-900">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="inline-flex items-center gap-4 bg-ink text-parchment px-9 py-[22px] text-[13px] font-normal tracking-[0.25em] uppercase cursor-pointer transition-all duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-moss hover:gap-6 disabled:opacity-50 disabled:pointer-events-none group"
            >
              {submitting ? "Et øjeblik..." : "Begynd testen"}
              <span className="transition-transform duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1">
                &rarr;
              </span>
            </button>
          </form>
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
