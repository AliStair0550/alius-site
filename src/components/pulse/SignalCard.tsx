"use client";

type Props = {
  headline: string;
  body: string | null;
  direction: "UP" | "DOWN" | "STABLE" | null;
  severity: string;
  areaName: string | null;
};

export function PulseSignalCard({
  headline,
  body,
  direction,
  severity,
  areaName,
}: Props) {
  const isImportant = severity === "important";

  return (
    <article
      className={`p-6 md:p-8 transition-colors ${
        isImportant
          ? "bg-fog border-l-2 border-moss"
          : "bg-fog/40 hover:bg-fog/70"
      }`}
    >
      <header className="flex items-center gap-3 mb-3">
        <DirectionGlyph direction={direction} />
        <span
          className={`text-[10px] tracking-[0.3em] uppercase font-normal ${
            isImportant ? "text-moss" : "text-stone opacity-60"
          }`}
        >
          {areaName ?? "Hele landet"}
        </span>
      </header>

      <h3 className="font-fraunces font-light italic text-[20px] md:text-[22px] leading-[1.25] text-ink mb-3 tracking-[-0.005em]">
        {headline}
      </h3>

      {body && (
        <p className="text-[14px] leading-[1.6] text-stone">{body}</p>
      )}
    </article>
  );
}

function DirectionGlyph({
  direction,
}: {
  direction: "UP" | "DOWN" | "STABLE" | null;
}) {
  if (!direction || direction === "STABLE") {
    return (
      <span
        className="text-[11px] text-stone opacity-40 font-light"
        aria-label="stabil"
      >
        &#8212;
      </span>
    );
  }
  if (direction === "UP") {
    return (
      <span className="text-[11px] text-moss font-medium" aria-label="op">
        &#9650;
      </span>
    );
  }
  return (
    <span className="text-[11px] text-moss font-medium" aria-label="ned">
      &#9660;
    </span>
  );
}
