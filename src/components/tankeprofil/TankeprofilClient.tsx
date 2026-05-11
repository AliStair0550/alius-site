"use client";

import Link from "next/link";
import { useTankeprofil } from "./useTankeprofil";
import { Intro } from "./Intro";
import { CardStage } from "./CardStage";
import { Teaser } from "./Teaser";
import { Report } from "./Report";

export function TankeprofilClient() {
  const tp = useTankeprofil();

  const handleSubmitEmail = (email: string) => {
    // TODO: Send to backend when ready. For now just log and continue.
    if (typeof window !== "undefined") {
      console.log("[Tankeprofil] Email captured:", email);
    }
    tp.goToReport();
  };

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
        </footer>
      </div>
    </div>
  );
}
