"use client";

import { humanizePeriod } from "@/lib/signals/types";

type Props = {
  latestValue: number | null;
  latestPeriod: string | null;
  headlineSignal: {
    headline: string;
    body: string | null;
    direction: "UP" | "DOWN" | "STABLE" | null;
  } | null;
};

export function PulseHero({ latestValue, latestPeriod, headlineSignal }: Props) {
  if (latestValue === null || latestPeriod === null) {
    return (
      <section className="py-16">
        <p className="text-stone italic">Data er ved at blive samlet.</p>
      </section>
    );
  }

  const formattedValue = latestValue.toLocaleString("da-DK", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  return (
    <section className="py-8 md:py-16">
      <div className="text-[11px] tracking-[0.4em] uppercase text-moss mb-8 flex items-center gap-4">
        <span>Ledigheden i Danmark</span>
        <span className="h-px bg-ink/10 flex-1 max-w-[120px]" />
        <span className="opacity-60">{humanizePeriod(latestPeriod)}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 md:gap-16 items-baseline mb-12">
        <h1 className="font-fraunces font-light italic text-[clamp(120px,20vw,260px)] leading-[0.85] tracking-[-0.04em] text-ink">
          {formattedValue}
          <span className="text-[0.4em] text-stone opacity-50 ml-1">%</span>
        </h1>

        {headlineSignal && (
          <div className="md:pb-6">
            <div className="flex items-center gap-3 mb-4">
              <DirectionGlyph direction={headlineSignal.direction} />
              <span className="text-[11px] tracking-[0.3em] uppercase text-moss">
                Hovedsignal
              </span>
            </div>
            <p className="font-fraunces font-light italic text-[24px] md:text-[32px] leading-[1.2] tracking-[-0.01em] text-ink mb-4">
              {headlineSignal.headline}
            </p>
            {headlineSignal.body && (
              <p className="text-[15px] md:text-[16px] leading-[1.6] text-ink/75 max-w-[520px]">
                {headlineSignal.body}
              </p>
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
