"use client";

import Link from "next/link";
import { getKommuneByCode } from "@/lib/areas";

type Props = {
  headline: string;
  body: string | null;
  direction: "UP" | "DOWN" | "STABLE" | null;
  severity: string;
  areaName: string | null;
  areaCode: string | null;
};

export function PulseSignalCard({
  headline,
  body,
  direction,
  severity,
  areaName,
  areaCode,
}: Props) {
  const isImportant = severity === "important";
  // Only link if signal is about a specific kommune (not national)
  const kommune = areaCode && areaCode !== "000"
    ? getKommuneByCode(areaCode)
    : null;

  const cardContent = (
    <>
      <header className="flex items-center gap-3 mb-3">
        <DirectionGlyph direction={direction} />
        <span
          className={`text-[10px] tracking-[0.3em] uppercase font-normal ${
            isImportant ? "text-moss" : "text-stone opacity-60"
          }`}
        >
          {areaName ?? "Hele landet"}
        </span>
        {kommune && (
          <span
            className="ml-auto text-stone opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-[14px]"
            aria-hidden
          >
            &rarr;
          </span>
        )}
      </header>

      <h3 className="font-fraunces font-light italic text-[20px] md:text-[22px] leading-[1.25] text-ink mb-3 tracking-[-0.005em]">
        {headline}
      </h3>

      {body && (
        <p className="text-[14px] leading-[1.6] text-stone">{body}</p>
      )}
    </>
  );

  const baseClasses = `block p-6 md:p-8 transition-colors no-underline ${
    isImportant
      ? "bg-fog border-l-2 border-moss"
      : "bg-fog/40 hover:bg-fog/70"
  }`;

  if (kommune) {
    return (
      <Link href={`/pulse/ledighed/${kommune.slug}`} className={`group ${baseClasses}`}>
        {cardContent}
      </Link>
    );
  }

  return <article className={baseClasses}>{cardContent}</article>;
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
