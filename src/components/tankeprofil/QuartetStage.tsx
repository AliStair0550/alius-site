"use client";

import { useState, useEffect } from "react";
import { CARDS, ARCHETYPES, type QuadrantKey, type Totals } from "./data";
import { Quadrant } from "./Quadrant";
import { getQuartetsForCard } from "./quartets";
import type { QuartetAnswer } from "./scoring";

const QUADS: QuadrantKey[] = ["A", "B", "C", "D"];

type Props = {
  currentCard: number;
  totals: Totals;
  getAnswer: (quartetId: string) => QuartetAnswer | undefined;
  setAnswer: (quartetId: string, best: QuadrantKey, worst: QuadrantKey) => void;
  currentCardAnsweredCount: number;
  onNext: () => void;
  onPrev: () => void;
};

export function QuartetStage({
  currentCard,
  totals,
  getAnswer,
  setAnswer,
  currentCardAnsweredCount,
  onNext,
  onPrev,
}: Props) {
  const card = CARDS[currentCard];
  const quartets = getQuartetsForCard(currentCard);
  const isLastCard = currentCard === CARDS.length - 1;

  const [viewedIdx, setViewedIdx] = useState(0);
  const [localBest, setLocalBest] = useState<QuadrantKey | null>(null);
  const [localWorst, setLocalWorst] = useState<QuadrantKey | null>(null);

  const quartet = quartets[viewedIdx];
  const isLastQuartet = viewedIdx === quartets.length - 1;
  const allAnswered = currentCardAnsweredCount === quartets.length;

  // Sync local selection state when quartet changes
  useEffect(() => {
    const a = getAnswer(quartet.id);
    setLocalBest(a?.best ?? null);
    setLocalWorst(a?.worst ?? null);
    // intentionally omitting getAnswer from deps — quartet.id is the signal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quartet.id]);

  function handleBest(q: QuadrantKey) {
    setLocalBest(q);
    if (localWorst !== null) setAnswer(quartet.id, q, localWorst);
  }

  function handleWorst(q: QuadrantKey) {
    setLocalWorst(q);
    if (localBest !== null) setAnswer(quartet.id, localBest, q);
  }

  function goNext() {
    if (!isLastQuartet) {
      setViewedIdx((v) => v + 1);
    } else {
      onNext();
    }
  }

  function goPrev() {
    if (viewedIdx > 0) {
      setViewedIdx((v) => v - 1);
    } else {
      onPrev();
    }
  }

  const currentAnswered = localBest !== null && localWorst !== null;
  const nextEnabled = !isLastQuartet ? currentAnswered : allAnswered;
  const nextLabel = isLastQuartet && allAnswered
    ? isLastCard ? "Se din profil" : "Næste kort"
    : "Næste spørgsmål";

  return (
    <section className="animate-[fadeIn_0.7s_ease-out]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-8 mb-12 pb-6 border-b border-ink/10">
        <div>
          <div className="text-[11px] tracking-[0.3em] uppercase text-moss font-normal mb-4">
            {card.subtitle} · Spørgsmål {viewedIdx + 1} af {quartets.length}
          </div>
          <h1 className="font-fraunces font-light text-[clamp(36px,4.5vw,56px)] leading-none tracking-[-0.01em]">
            {card.title}
          </h1>
        </div>
        <p className="text-sm text-stone opacity-70 max-w-[280px] md:text-right leading-[1.5]">
          Vælg hvad der passer dig{" "}
          <span className="text-moss">bedst</span> og{" "}
          <span className="opacity-60">dårligst</span>.
        </p>
      </div>

      {/* Quartet progress bar — clickable to jump */}
      <div className="flex gap-1 mb-14">
        {quartets.map((q, i) => {
          const done = getAnswer(q.id) != null;
          return (
            <button
              key={q.id}
              onClick={() => setViewedIdx(i)}
              title={`Spørgsmål ${i + 1}`}
              className={`h-[3px] flex-1 cursor-pointer border-none p-0 transition-colors duration-500 ${
                done ? "bg-moss" : i === viewedIdx ? "bg-ink" : "bg-ink/10"
              }`}
            />
          );
        })}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-8 md:gap-16 items-start">
        <div>
          <div className="space-y-2">
            {QUADS.map((q) => {
              const word = quartet.words[q];
              const isBest = localBest === q;
              const isWorst = localWorst === q;

              return (
                <div
                  key={q}
                  className={`flex items-center gap-4 p-5 border transition-colors duration-200 ${
                    isBest
                      ? "border-moss/40 bg-moss/5"
                      : isWorst
                      ? "border-ink/20 bg-ink/[0.03]"
                      : "border-ink/10"
                  }`}
                >
                  <span className="flex-1 text-[16px] font-light text-ink leading-[1.35]">
                    {word}
                  </span>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleBest(q)}
                      disabled={isWorst}
                      className={`px-4 py-2 text-[11px] tracking-[0.15em] uppercase transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30 ${
                        isBest
                          ? "bg-moss text-parchment"
                          : "border border-moss/35 text-moss/80 hover:border-moss hover:text-moss"
                      }`}
                    >
                      Bedst
                    </button>
                    <button
                      onClick={() => handleWorst(q)}
                      disabled={isBest}
                      className={`px-4 py-2 text-[11px] tracking-[0.15em] uppercase transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30 ${
                        isWorst
                          ? "bg-ink/25 text-ink border border-ink/25"
                          : "border border-ink/20 text-stone/60 hover:border-ink/40 hover:text-stone"
                      }`}
                    >
                      Dårligst
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="md:sticky md:top-8 p-8 bg-sand">
          <div className="text-[10px] tracking-[0.3em] uppercase text-ink opacity-50 mb-6 font-normal">
            Din profil indtil videre
          </div>
          <div className="mb-6">
            <Quadrant totals={totals} size={200} />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {QUADS.map((q) => (
              <div key={q} className="flex justify-between py-2 border-b border-ink/10">
                <span className="opacity-60 text-[11px] tracking-[0.15em] uppercase">
                  {ARCHETYPES[q].name}
                </span>
                <span className="font-fraunces text-[18px]">{totals[q]}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t border-ink/15 text-center text-sm text-stone">
            <strong className="font-fraunces text-[28px] font-light block text-ink mb-1">
              {currentCardAnsweredCount} / {quartets.length}
            </strong>
            besvaret på dette kort
          </div>
        </aside>
      </div>

      {/* Navigation */}
      <div className="flex flex-col-reverse md:flex-row justify-between gap-4 mt-16 pt-8 border-t border-ink/10">
        <button
          onClick={goPrev}
          className={`inline-flex items-center gap-4 px-9 py-[22px] text-[13px] font-normal tracking-[0.25em] uppercase border border-ink/25 cursor-pointer transition-all duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-ink hover:text-parchment hover:border-ink justify-center md:w-auto w-full ${
            currentCard === 0 && viewedIdx === 0 ? "invisible" : ""
          }`}
        >
          &larr; Tilbage
        </button>
        <button
          onClick={goNext}
          disabled={!nextEnabled}
          className="inline-flex items-center gap-4 bg-ink text-parchment px-9 py-[22px] text-[13px] font-normal tracking-[0.25em] uppercase cursor-pointer transition-all duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-moss hover:gap-6 disabled:opacity-40 disabled:pointer-events-none justify-center md:w-auto w-full group"
        >
          {nextLabel}
          <span className="transition-transform duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1">
            &rarr;
          </span>
        </button>
      </div>
    </section>
  );
}
