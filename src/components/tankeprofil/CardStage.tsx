"use client";

import { CARDS, type QuadrantKey, type Totals } from "./data";
import { Quadrant } from "./Quadrant";

type CardStageProps = {
  currentCard: number;
  cardSelection: Record<QuadrantKey, string[]>;
  totals: Totals;
  shuffled: { word: string; quadrant: QuadrantKey }[];
  currentCardSelected: number;
  onToggle: (word: string, quadrant: QuadrantKey) => void;
  onNext: () => void;
  onPrev: () => void;
};

export function CardStage({
  currentCard,
  cardSelection,
  totals,
  shuffled,
  currentCardSelected,
  onToggle,
  onNext,
  onPrev,
}: CardStageProps) {
  const card = CARDS[currentCard];
  const isLast = currentCard === CARDS.length - 1;

  return (
    <section className="animate-[fadeIn_0.7s_ease-out]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-8 mb-12 pb-6 border-b border-ink/10">
        <div>
          <div className="text-[11px] tracking-[0.3em] uppercase text-moss font-normal mb-4">
            {card.subtitle}
          </div>
          <h1 className="font-fraunces font-light text-[clamp(36px,4.5vw,56px)] leading-none tracking-[-0.01em]">
            {card.title}
          </h1>
        </div>
        <p className="text-sm text-stone opacity-70 max-w-[280px] md:text-right leading-[1.5]">
          {card.instruction}
        </p>
      </div>

      <div className="flex gap-1 mb-14">
        {CARDS.map((_, i) => (
          <div
            key={i}
            className={`h-[2px] flex-1 transition-colors duration-500 ${
              i < currentCard ? "bg-moss" : i === currentCard ? "bg-ink" : "bg-ink/10"
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-8 md:gap-16 items-start">
        <div>
          <div className="flex flex-wrap gap-2">
            {shuffled.map((item) => {
              const isSelected = cardSelection[item.quadrant].includes(item.word);
              const disabled = currentCardSelected >= 8 && !isSelected;
              return (
                <button
                  key={`${item.word}-${item.quadrant}`}
                  onClick={() => onToggle(item.word, item.quadrant)}
                  disabled={disabled}
                  className={`relative px-5 py-3 rounded-full font-light text-[15px] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] select-none ${
                    isSelected
                      ? "bg-ink text-parchment border border-ink font-normal"
                      : "border border-ink/25 bg-transparent text-ink hover:border-ink hover:bg-fog"
                  } ${disabled ? "opacity-30 pointer-events-none" : "cursor-pointer"}`}
                >
                  {item.word}
                  {isSelected && (
                    <span
                      aria-hidden
                      className="absolute -inset-[3px] border border-ink rounded-full opacity-30 scale-[1.04] animate-[ringIn_0.4s_cubic-bezier(0.22,1,0.36,1)]"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="md:sticky md:top-8 p-8 bg-sand rounded">
          <div className="text-[10px] tracking-[0.3em] uppercase text-ink opacity-50 mb-6 font-normal">
            Din profil indtil videre
          </div>
          <div className="mb-6">
            <Quadrant totals={totals} size={200} />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {(["A", "B", "C", "D"] as QuadrantKey[]).map((q) => {
              const labels: Record<QuadrantKey, string> = {
                A: "Analytiker",
                B: "Bygmester",
                C: "Forbinder",
                D: "Visionær",
              };
              return (
                <div
                  key={q}
                  className="flex justify-between py-2 border-b border-ink/10"
                >
                  <span className="opacity-60 text-[11px] tracking-[0.15em] uppercase">
                    {labels[q]}
                  </span>
                  <span className="font-fraunces text-[18px]">{totals[q]}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-6 pt-6 border-t border-ink/15 text-center text-sm text-stone">
            <strong className="font-fraunces text-[28px] font-light block text-ink mb-1">
              {currentCardSelected} / 8
            </strong>
            valg på dette kort
          </div>
        </aside>
      </div>

      <div className="flex flex-col-reverse md:flex-row justify-between gap-4 mt-16 pt-8 border-t border-ink/10">
        <button
          onClick={onPrev}
          className={`inline-flex items-center gap-4 px-9 py-[22px] text-[13px] font-normal tracking-[0.25em] uppercase border border-ink/25 cursor-pointer transition-all duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-ink hover:text-parchment hover:border-ink justify-center md:w-auto w-full ${
            currentCard === 0 ? "invisible" : ""
          }`}
        >
          &larr; Tilbage
        </button>
        <button
          onClick={onNext}
          disabled={currentCardSelected < 8}
          className="inline-flex items-center gap-4 bg-ink text-parchment px-9 py-[22px] text-[13px] font-normal tracking-[0.25em] uppercase cursor-pointer transition-all duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-moss hover:gap-6 disabled:opacity-40 disabled:pointer-events-none justify-center md:w-auto w-full group"
        >
          {isLast ? "Se din profil" : "Næste kort"}
          <span className="transition-transform duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1">
            &rarr;
          </span>
        </button>
      </div>
    </section>
  );
}
