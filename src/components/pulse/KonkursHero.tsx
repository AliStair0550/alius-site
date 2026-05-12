"use client";

import { humanizePeriod } from "@/lib/signals/types";

type Props = {
  latestValue: number | null;
  latestPeriod: string | null;
  monthChange: number | null;
  previousValue: number | null;
  headlineSignal: {
    headline: string;
    body: string | null;
    direction: "UP" | "DOWN" | "STABLE" | null;
  } | null;
};

export function KonkursHero({
  latestValue,
  latestPeriod,
  monthChange,
  previousValue,
  headlineSignal,
}: Props) {
  if (latestValue === null || latestPeriod === null) {
    return (
      <section className="py-16">
        <p className="text-stone italic">Data er ved at blive samlet.</p>
      </section>
    );
  }

  const formattedValue = Math.round(latestValue).toLocaleString("da-DK");

  return (
    <section className="py-8 md:py-16">
      <div className="text-[11px] tracking-[0.4em] uppercase text-moss mb-8 flex items-center gap-4">
        <span>Konkurser i Danmark</span>
        <span className="h-px bg-ink/10 flex-1 max-w-[120px]" />
        <span className="opacity-60">{humanizePeriod(latestPeriod)}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 md:gap-16 items-baseline mb-12">
        <div>
          <h1 className="font-fraunces font-light italic text-[clamp(100px,16vw,220px)] leading-[0.85] tracking-[-0.04em] text-ink">
            {formattedValue}
          </h1>
          <div className="text-[11px] tracking-[0.25em] uppercase text-stone opacity-60 mt-3">
            Sæsonkorrigeret
          </div>
        </div>

        {headlineSignal && (
          <div className="md:pb-6">
            <div className="flex items-center gap-3 mb-4">
              <DirectionGlyph direction={headlineSignal.direction} />
              <span className="text-[11px] tracking-[0.3em] uppercase text-moss">
                Hovedsignal
              </span>
            </div>
            <p className="font-fraunces font-light italic text-[24px] md:text-[32px] leading-[1.2] tracking-[-0.01em] text-ink mb-5">
              {headlineSignal.headline}
            </p>
            {headlineSignal.body && (
              <p className="text-[15px] md:text-[16px] leading-[1.6] text-ink/75 max-w-[520px]">
                {headlineSignal.body}
              </p>
            )}
            {monthChange !== null && previousValue !== null && (
              <div className="text-[12px] text-stone opacity-60 mt-6 tracking-[0.05em]">
                Forrige måned: {Math.round(previousValue).toLocaleString("da-DK")} konkurser
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function DirectionGlyph({
  direction,
}: {
  direction: "UP" | "DOWN" | "STABLE" | null;
}) {
  if (!direction || direction === "STABLE") {
    return (
      <span className="text-[14px] text-stone opacity-50" aria-label="stabil">
        &#8212;
      </span>
    );
  }
  if (direction === "UP") {
    return (
      <span className="text-[14px] text-moss" aria-label="op">
        &#9650;
      </span>
    );
  }
  return (
    <span className="text-[14px] text-moss" aria-label="ned">
      &#9660;
    </span>
  );
}
