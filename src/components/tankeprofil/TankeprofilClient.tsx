"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTankeprofil } from "./useTankeprofil";
import { Intro } from "./Intro";
import { CardStage } from "./CardStage";
import { Teaser } from "./Teaser";
import { Report } from "./Report";

export function TankeprofilClient() {
  const tp = useTankeprofil();
  const [savedAccessToken, setSavedAccessToken] = useState<string | null>(null);
  const [saveAttempted, setSaveAttempted] = useState(false);

  // Save profile silently the first time we reach the teaser stage.
  // This way every completed test ends up in the database, even without email.
  useEffect(() => {
    if (tp.stage !== "teaser" || saveAttempted) return;
    setSaveAttempted(true);

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/profile/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            totals: tp.totals,
            primary: tp.ranking.primary,
            secondary: tp.ranking.secondary,
            weakest: tp.ranking.weakest,
            selections: tp.selections,
            source: "individual",
          }),
        });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setSavedAccessToken(data.accessToken);
        }
      } catch (err) {
        if (!cancelled) console.error("[Tankeprofil] Failed to save profile:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tp.stage, saveAttempted, tp.totals, tp.ranking, tp.selections]);

  // When user submits email at teaser, update the existing profile and proceed
  const handleSubmitEmail = async (email: string) => {
    if (savedAccessToken) {
      try {
        await fetch(`/api/profile/${savedAccessToken}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
      } catch (err) {
        console.error("[Tankeprofil] Failed to save email:", err);
      }
    }
    tp.goToReport();
  };

  // Reset save state when test is restarted
  useEffect(() => {
    if (tp.stage === "intro") {
      setSavedAccessToken(null);
      setSaveAttempted(false);
    }
  }, [tp.stage]);

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
          <Link href="/" className="font-extralight text-sm tracking-[0.3em] uppercase text-ink no-underline hover:text-moss transition-colors">
            Alius &#183; Personlighedsprofil
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/tankeprofil/teori"
              className="hidden md:inline-block text-[11px] tracking-[0.25em] uppercase text-stone hover:text-moss transition-colors no-underline"
            >
              Teorien bag
            </Link>
            <div className="font-extralight text-xs tracking-[0.2em] uppercase text-stone opacity-60">
              Et redskab i tre kort
            </div>
          </div>
        </header>

        {tp.stage === "intro" && <Intro onStart={() => tp.goToCard(0)} />}

        {tp.stage === "card" && (
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

        {tp.stage === "teaser" && (
          <Teaser
            totals={tp.totals}
            pct={tp.ranking.pct}
            primary={tp.ranking.primary}
            secondary={tp.ranking.secondary}
            weakest={tp.ranking.weakest}
            onSubmitEmail={handleSubmitEmail}
          />
        )}

        {tp.stage === "report" && (
          <Report
            totals={tp.totals}
            pct={tp.ranking.pct}
            primary={tp.ranking.primary}
            secondary={tp.ranking.secondary}
            weakest={tp.ranking.weakest}
            onRestart={tp.restart}
          />
        )}

        <footer className="mt-24 pt-8 border-t border-ink/10 max-w-[720px]">
          <div className="text-[11px] text-stone opacity-50 tracking-[0.05em] leading-[1.6] mb-4">
            Personlighedsprofil er udviklet af Alius som et selvstændigt værktøj, inspireret af tænkningen bag Whole Brain Thinking, oprindeligt formuleret af Dr. Kobus Neethling (Neethling Brain Instruments). Ord, arketyper og fortolkninger er Alius&apos; egne.
          </div>
          <Link
            href="/tankeprofil/teori"
            className="inline-block text-[11px] tracking-[0.25em] uppercase text-stone hover:text-moss transition-colors border-b border-ink/10 hover:border-moss pb-1 no-underline"
          >
            Læs hele teorien bag &rarr;
          </Link>
          {savedAccessToken && (
            <div className="mt-6 pt-6 border-t border-ink/10 text-[11px] text-stone opacity-50">
              Din profil er gemt. Bogmærk dette link for at vende tilbage:{" "}
              <Link
                href={`/tankeprofil/min-profil/${savedAccessToken}`}
                className="text-moss hover:underline break-all"
              >
                /tankeprofil/min-profil/{savedAccessToken.slice(0, 12)}...
              </Link>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
