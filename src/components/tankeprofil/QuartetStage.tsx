"use client";

import { useState, useEffect, useRef } from "react";
import { CARDS, type QuadrantKey, type Totals } from "./data";
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
  totals: _totals,
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
  const [completing, setCompleting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const quartet = quartets[viewedIdx];
  const isLastQuartet = viewedIdx === quartets.length - 1;
  const allAnswered = currentCardAnsweredCount === quartets.length;

  // Load existing answer when quartet changes
  useEffect(() => {
    const a = getAnswer(quartet.id);
    setLocalBest(a?.best ?? null);
    setLocalWorst(a?.worst ?? null);
    setCompleting(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quartet.id]);

  // Cleanup on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function triggerAutoAdvance() {
    setCompleting(true);
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!isLastQuartet) {
      timerRef.current = setTimeout(() => {
        setViewedIdx((v) => v + 1);
        setCompleting(false);
      }, 480);
    } else {
      // Last quartet: just flash, user clicks main nav button
      timerRef.current = setTimeout(() => setCompleting(false), 600);
    }
  }

  function handleBest(q: QuadrantKey) {
    setLocalBest(q);
    if (localWorst !== null) {
      setAnswer(quartet.id, q, localWorst);
      triggerAutoAdvance();
    }
  }

  function handleWorst(q: QuadrantKey) {
    setLocalWorst(q);
    if (localBest !== null) {
      setAnswer(quartet.id, localBest, q);
      triggerAutoAdvance();
    }
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
  const nextLabel =
    isLastQuartet && allAnswered
      ? isLastCard
        ? "Se din profil"
        : "Næste kort"
      : "Næste spørgsmål";

  return (
    <section className="animate-[fadeIn_0.7s_ease-out] max-w-[680px]">
      {/* Header */}
      <div className="mb-10 pb-6 border-b border-ink/10">
        <div className="text-[11px] tracking-[0.3em] uppercase text-moss font-normal mb-4">
          {card.subtitle}
        </div>
        <h1 className="font-fraunces font-light text-[clamp(36px,4.5vw,56px)] leading-none tracking-[-0.01em]">
          {card.title}
        </h1>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1 mb-3">
        {quartets.map((q, i) => {
          const done = getAnswer(q.id) != null;
          return (
            <button
              key={q.id}
              onClick={() => { if (!completing) setViewedIdx(i); }}
              title={`Spørgsmål ${i + 1}`}
              className={`h-[3px] flex-1 cursor-pointer border-none p-0 transition-colors duration-500 ${
                done ? "bg-moss" : i === viewedIdx ? "bg-ink" : "bg-ink/10"
              }`}
            />
          );
        })}
      </div>
      <div className="flex justify-between items-baseline mb-10">
        <span className="text-[11px] tracking-[0.25em] uppercase text-stone opacity-50">
          Spørgsmål {viewedIdx + 1} af {quartets.length}
        </span>
        <span className="text-[11px] tracking-[0.25em] uppercase text-stone opacity-50">
          {currentCardAnsweredCount} / {quartets.length} besvaret
        </span>
      </div>

      {/* Instruction */}
      <p className="text-[13px] tracking-[0.1em] uppercase text-stone opacity-60 mb-6">
        Vælg hvad der passer dig{" "}
        <span className="text-moss opacity-100">bedst</span> og{" "}
        <span>dårligst</span>
      </p>

      {/* Quartet rows — key triggers slide-in animation on each new question */}
      <div
        key={`${currentCard}-${viewedIdx}`}
        className="space-y-2 mb-14 animate-[slideInFromRight_0.28s_cubic-bezier(0.22,1,0.36,1)]"
      >
        {QUADS.map((q) => {
          const word = quartet.words[q];
          const isBest = localBest === q;
          const isWorst = localWorst === q;
          const isDimmed = completing && !isBest && !isWorst;

          return (
            <div
              key={q}
              className={`grid grid-cols-[1fr_auto_auto] gap-x-4 items-center p-4 md:p-5 border transition-all duration-200 ${
                isBest && completing
                  ? "border-moss/60 bg-moss/8 animate-[completionPulse_0.5s_ease-out]"
                  : isBest
                  ? "border-moss/40 bg-moss/5"
                  : isWorst
                  ? "border-ink/20 bg-ink/[0.03]"
                  : "border-ink/10"
              } ${isDimmed ? "opacity-40" : ""}`}
            >
              <span className="text-[15px] md:text-[16px] font-light text-ink leading-[1.4]">
                {word}
              </span>
              <button
                onClick={() => handleBest(q)}
                disabled={isWorst || completing}
                className={`px-3 md:px-4 py-2 text-[10px] md:text-[11px] tracking-[0.15em] uppercase transition-all duration-200 cursor-pointer whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-30 ${
                  isBest
                    ? "bg-moss text-parchment"
                    : "border border-moss/35 text-moss/80 hover:border-moss hover:text-moss"
                }`}
              >
                Bedst
              </button>
              <button
                onClick={() => handleWorst(q)}
                disabled={isBest || completing}
                className={`px-3 md:px-4 py-2 text-[10px] md:text-[11px] tracking-[0.15em] uppercase transition-all duration-200 cursor-pointer whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-30 ${
                  isWorst
                    ? "bg-ink/25 text-ink border border-ink/25"
                    : "border border-ink/20 text-stone/60 hover:border-ink/40 hover:text-stone"
                }`}
              >
                Dårligst
              </button>
            </div>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex flex-col-reverse md:flex-row justify-between gap-4 pt-8 border-t border-ink/10">
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
