"use client";

import { useState } from "react";
import Link from "next/link";
import { ARCHETYPES, type QuadrantKey } from "./data";
import { Quadrant } from "./Quadrant";
import { TeamGlyph } from "./TeamGlyph";
import { calculateClarity, clarityQualifier } from "./confidence";
import type { TeamAnalysis } from "@/lib/team-analysis";

type Props = {
  companyName: string;
  sessionOpen: boolean;
  totalExpected: number;
  totalSubmitted: number;
  analysis: TeamAnalysis;
  reportUrl: string;
  joinUrl?: string;
};

const TENSION_LABEL: Record<"low" | "medium" | "high", string> = {
  low: "text-stone opacity-70",
  medium: "text-ink",
  high: "text-ink font-normal",
};

export function TeamReportReveal({
  companyName,
  sessionOpen,
  totalExpected,
  totalSubmitted,
  analysis: a,
  reportUrl,
  joinUrl,
}: Props) {
  const [revealed, setRevealed] = useState(1);
  const [copied, setCopied] = useState(false);

  function copyLink(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (a.participants.length === 0) {
    return (
      <div className="animate-[revealUp_0.6s_cubic-bezier(0.22,1,0.36,1)]">
        <div className="text-[11px] tracking-[0.4em] uppercase text-moss mb-6">
          Holdrapport · {companyName}
        </div>
        <h1 className="font-fraunces font-light italic text-[clamp(48px,7vw,88px)] leading-[0.95] tracking-[-0.03em] text-ink mb-8">
          Afventer
          <br />
          deltagere.
        </h1>
        <p className="text-[17px] leading-[1.65] text-stone max-w-[480px] mb-12">
          Ingen har udfyldt profilen endnu. Send dette link til holdet &mdash; rapporten bygger sig automatisk op som de færdiggør testen.
        </p>
        {joinUrl && (
          <div className="border border-ink/15 p-8 max-w-[480px]">
            <div className="text-[11px] tracking-[0.25em] uppercase text-stone opacity-50 mb-3">
              Deltager-link
            </div>
            <div className="text-[13px] text-moss break-all mb-5">{joinUrl}</div>
            <button
              onClick={() => copyLink(joinUrl)}
              className="inline-flex items-center gap-3 bg-ink text-parchment px-7 py-[16px] text-[12px] tracking-[0.25em] uppercase cursor-pointer transition-all duration-300 hover:bg-moss"
            >
              {copied ? "Kopieret ✓" : "Kopier link"}
            </button>
          </div>
        )}
        <div className="mt-16 text-[11px] tracking-[0.2em] uppercase text-stone opacity-40">
          {totalSubmitted} af {totalExpected} udfyldt
        </div>
      </div>
    );
  }

  const primaryArch = ARCHETYPES[a.aggregatePrimary];
  const secondaryArch = ARCHETYPES[a.aggregateSecondary];
  const weakestArch = ARCHETYPES[a.aggregateWeakest];

  // Build ordered section list based on what data exists
  type Section = { key: string; label: string; sectionLabel: string };
  const sections: Section[] = [
    { key: "konstellation", label: "Hvem er I som hold?", sectionLabel: "01 · Konstellation" },
    { key: "aggregat",      label: "Holdet som ét hoved", sectionLabel: "02 · Aggregat" },
    { key: "observationer", label: "Hvad mønstret fortæller", sectionLabel: "03 · Observationer" },
    ...(a.tensions.length > 0
      ? [{ key: "spaendinger", label: "Diagonale træk", sectionLabel: "04 · Spændinger" }]
      : []),
    ...(a.blindQuadrants.length > 0
      ? [{ key: "blindt", label: "Den stille stemme", sectionLabel: `0${a.tensions.length > 0 ? "5" : "4"} · Blindt felt` }]
      : []),
    { key: "deltagere", label: "Individuelle profiler", sectionLabel: `0${4 + (a.tensions.length > 0 ? 1 : 0) + (a.blindQuadrants.length > 0 ? 1 : 0)} · Deltagere` },
  ];

  const totalSteps = sections.length + 1; // +1 for hero
  const allRevealed = revealed >= totalSteps;
  const nextSection = sections[revealed - 1]; // 0-indexed: sections[0] is shown at revealed=2

  function revealNext() {
    if (!allRevealed) setRevealed((v) => v + 1);
  }

  function isVisible(sectionIndex: number) {
    return revealed >= sectionIndex + 2; // section 0 visible at revealed=2
  }

  return (
    <div className="animate-[revealUp_0.6s_cubic-bezier(0.22,1,0.36,1)]">
      {/* Open session banner */}
      {sessionOpen && (
        <div className="mb-12 px-6 py-4 border border-moss/30 bg-moss/5 text-[13px] text-moss leading-[1.5]">
          Session er stadig åben.{" "}
          <span className="opacity-60">
            {totalSubmitted} af {totalExpected} udfyldt.
          </span>
        </div>
      )}

      {/* Hero — always visible */}
      <div className="pb-16 border-b border-ink/10">
        <div className="text-[11px] tracking-[0.4em] uppercase text-moss mb-6">
          Holdrapport · {companyName}
        </div>
        <div className="flex flex-wrap items-baseline gap-4 mb-6">
          <h1 className="font-fraunces font-light italic text-[clamp(56px,8vw,104px)] leading-[0.95] tracking-[-0.03em] text-ink">
            {primaryArch.name}
          </h1>
          <span className="font-fraunces font-light text-[22px] text-stone">
            med <em className="italic">{secondaryArch.name.toLowerCase()}</em> som medløber
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-[11px] tracking-[0.2em] uppercase px-2 py-1 ${
              a.classification === "balanced"
                ? "bg-moss/10 text-moss"
                : a.classification === "polarized"
                ? "bg-amber-50 text-amber-800"
                : a.classification === "dominant" || a.classification === "uniform"
                ? "bg-ink/5 text-ink"
                : "bg-ink/5 text-stone"
            }`}
          >
            {a.classificationLabel}
          </span>
          <span className="text-[13px] text-stone opacity-50">
            {totalSubmitted} deltager{totalSubmitted !== 1 ? "e" : ""}
          </span>
        </div>
      </div>

      {/* Konstellation */}
      {isVisible(0) && (
        <RevealSection label={sections[0].sectionLabel}>
          <h2 className="font-fraunces font-light text-[36px] leading-[1.1] mb-6 tracking-[-0.01em]">
            {sections[0].label}
          </h2>
          <p className="text-[17px] leading-[1.65] text-stone mb-10 max-w-[600px]">
            {a.classificationDescription}
          </p>
          <div className="bg-sand p-8 md:p-12 max-w-[540px]">
            <TeamGlyph
              participants={a.participants.map((p) => ({ name: p.name, primary: p.primary }))}
              size={440}
            />
          </div>
        </RevealSection>
      )}

      {/* Aggregat */}
      {isVisible(1) && (
        <RevealSection label={sections[1].sectionLabel}>
          <h2 className="font-fraunces font-light text-[36px] leading-[1.1] mb-6 tracking-[-0.01em]">
            {sections[1].label}
          </h2>
          <p className="text-[17px] leading-[1.65] text-stone mb-8 max-w-[600px]">
            Hvis alle deltagere smeltede sammen til én profil, ville den primære kvadrant
            være{" "}
            <strong className="text-ink font-normal">{primaryArch.name.toLowerCase()}</strong>,
            med{" "}
            <strong className="text-ink font-normal">{secondaryArch.name.toLowerCase()}</strong>{" "}
            som medløber og{" "}
            <strong className="text-ink font-normal">{weakestArch.name.toLowerCase()}</strong>{" "}
            som kollektivt blindt felt.
          </p>
          <div className="bg-sand p-8 max-w-[360px]">
            <div className="max-w-[280px] mx-auto">
              <Quadrant totals={a.aggregateTotals} size={280} showLabels />
            </div>
            <div className="grid grid-cols-4 gap-4 mt-6">
              {(["A", "B", "C", "D"] as QuadrantKey[]).map((q) => (
                <div key={q} className="text-center">
                  <div
                    className="text-[22px] font-fraunces font-light mb-1"
                    style={{ color: ARCHETYPES[q].color }}
                  >
                    {a.aggregateTotals[q]}
                  </div>
                  <div className="text-[10px] tracking-[0.1em] uppercase text-stone opacity-60">
                    {ARCHETYPES[q].name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </RevealSection>
      )}

      {/* Observationer */}
      {isVisible(2) && (
        <RevealSection label={sections[2].sectionLabel}>
          <h2 className="font-fraunces font-light text-[36px] leading-[1.1] mb-6 tracking-[-0.01em]">
            {sections[2].label}
          </h2>
          {a.observations.length > 0 ? (
            <ul className="space-y-5 max-w-[600px]">
              {a.observations.map((obs, i) => (
                <li key={i} className="flex gap-4 items-start">
                  <span className="text-moss mt-1 flex-shrink-0">-</span>
                  <span className="text-[16px] leading-[1.6] text-stone">{obs}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[16px] text-stone opacity-60 italic">
              Ikke nok data til observationer endnu.
            </p>
          )}
        </RevealSection>
      )}

      {/* Spændinger */}
      {a.tensions.length > 0 && isVisible(3) && (() => {
        const idx = sections.findIndex((s) => s.key === "spaendinger");
        return (
          <RevealSection label={sections[idx].sectionLabel}>
            <h2 className="font-fraunces font-light text-[36px] leading-[1.1] mb-6 tracking-[-0.01em]">
              {sections[idx].label}
            </h2>
            <p className="text-[17px] leading-[1.65] text-stone mb-10 max-w-[600px]">
              Spændinger opstår når holdet rummer modsatrettede tænkemåder. Det kan
              være en styrke, hvis I genkender og bruger det aktivt.
            </p>
            <div className="space-y-6 max-w-[600px]">
              {a.tensions.map((t, i) => (
                <div key={i} className="border-l-2 border-ink/15 pl-6 py-1">
                  <div
                    className={`text-[12px] tracking-[0.2em] uppercase mb-2 ${
                      t.severity === "high" ? "text-ink" : "text-stone opacity-60"
                    }`}
                  >
                    {t.label}
                    {t.severity === "high" && (
                      <span className="ml-2 text-[10px] tracking-[0.15em] uppercase text-moss">
                        Markant
                      </span>
                    )}
                  </div>
                  <p className={`text-[15px] leading-[1.6] ${TENSION_LABEL[t.severity]}`}>
                    {t.description}
                  </p>
                  <div className="flex gap-6 mt-3">
                    {([t.pair[0], t.pair[1]] as QuadrantKey[]).map((q, j) => (
                      <div key={q} className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: ARCHETYPES[q].color }}
                        />
                        <span className="text-[12px] text-stone opacity-70">
                          {ARCHETYPES[q].name}: {j === 0 ? t.countA : t.countB}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </RevealSection>
        );
      })()}

      {/* Blindt felt */}
      {a.blindQuadrants.length > 0 && (() => {
        const idx = sections.findIndex((s) => s.key === "blindt");
        if (idx < 0 || !isVisible(idx)) return null;
        return (
          <RevealSection label={sections[idx].sectionLabel}>
            <h2 className="font-fraunces font-light text-[36px] leading-[1.1] mb-6 tracking-[-0.01em]">
              {sections[idx].label}
            </h2>
            <p className="text-[17px] leading-[1.65] text-stone mb-10 max-w-[600px]">
              Ingen på holdet har{" "}
              {a.blindQuadrants.map((q) => ARCHETYPES[q].name.toLowerCase()).join(" eller ")}{" "}
              som primær styrke. Den tænkemåde mangler naturligt i rummet.
            </p>
            <div className="space-y-6 max-w-[600px]">
              {a.blindQuadrants.map((q) => {
                const arch = ARCHETYPES[q];
                return (
                  <div key={q} className="flex gap-5 items-start">
                    <div
                      className="w-1 flex-shrink-0 self-stretch mt-1"
                      style={{ backgroundColor: arch.color, opacity: 0.4 }}
                    />
                    <div>
                      <div
                        className="font-fraunces font-light italic text-[22px] mb-1"
                        style={{ color: arch.color }}
                      >
                        {arch.name}
                      </div>
                      <p className="text-[14px] leading-[1.6] text-stone max-w-[480px]">
                        {arch.blindspots[0][1]}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </RevealSection>
        );
      })()}

      {/* Deltagere */}
      {(() => {
        const idx = sections.findIndex((s) => s.key === "deltagere");
        if (idx < 0 || !isVisible(idx)) return null;
        return (
          <RevealSection label={sections[idx].sectionLabel}>
            <h2 className="font-fraunces font-light text-[36px] leading-[1.1] mb-6 tracking-[-0.01em]">
              {a.participants.length} profil{a.participants.length !== 1 ? "er" : ""}.
            </h2>
            <div className="space-y-3 max-w-[560px]">
              {a.participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-4 border-b border-ink/8"
                >
                  <div className="flex items-center gap-4">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: ARCHETYPES[p.primary].color }}
                    />
                    <span className="text-[15px]">{p.name}</span>
                    <span className="text-[11px] text-stone opacity-40 font-mono">
                      {clarityQualifier(calculateClarity(p.totals, p.primary).label)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[12px] text-stone opacity-50 font-mono">
                      {p.primary}/{p.secondary}
                    </span>
                    <Link
                      href={`/tankeprofil/min-profil/${p.accessToken}`}
                      className="text-[11px] tracking-[0.15em] uppercase text-moss hover:underline no-underline"
                    >
                      Profil &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </RevealSection>
        );
      })()}

      {/* Reveal-knap eller CTA */}
      {allRevealed ? (
        <div className="mt-20 bg-ink text-parchment px-8 md:px-16 py-16 md:py-20">
          <div className="max-w-[560px]">
            <div className="text-[11px] tracking-[0.3em] uppercase text-parchment/60 mb-6">
              Det var det
            </div>
            <h2 className="font-fraunces font-light text-[36px] md:text-[44px] leading-[1.1] mb-6 tracking-[-0.01em]">
              I er kortlagt.
            </h2>
            <p className="text-[16px] leading-[1.65] text-parchment/70 mb-10 max-w-[440px]">
              Brug det I har set her. Brug det i møder, i feedbacksamtaler, i hvem der leder hvad. Rapporten er jeres at vende tilbage til.
            </p>
            <div className="flex flex-wrap gap-4 items-center">
              <a
                href="https://alius.dk"
                className="inline-flex items-center gap-4 border border-parchment/30 text-parchment px-8 py-[18px] text-[12px] tracking-[0.25em] uppercase no-underline hover:bg-parchment/10 transition-colors group"
              >
                &larr; Tilbage til Alius
              </a>
              <button
                onClick={() => copyLink(reportUrl)}
                className="text-[12px] tracking-[0.2em] uppercase text-parchment/50 hover:text-parchment transition-colors cursor-pointer"
              >
                {copied ? "Kopieret ✓" : "Kopier rapport-link"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-20 border-t border-ink/10 flex flex-col items-center gap-6 text-center">
          <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-40">
            {revealed} / {totalSteps}
          </div>
          <button
            onClick={revealNext}
            className="inline-flex items-center gap-4 bg-ink text-parchment px-10 py-[22px] text-[13px] font-normal tracking-[0.25em] uppercase cursor-pointer transition-all duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-moss hover:gap-6 group"
          >
            {nextSection?.label ?? "Afslør næste"}
            <span className="transition-transform duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1">
              &rarr;
            </span>
          </button>
          <button
            onClick={() => setRevealed(totalSteps)}
            className="text-[11px] tracking-[0.2em] uppercase text-stone opacity-40 hover:opacity-70 transition-opacity cursor-pointer"
          >
            Vis alt på én gang
          </button>
        </div>
      )}
    </div>
  );
}

function RevealSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-16 md:py-20 border-b border-ink/10 animate-[revealUp_0.6s_cubic-bezier(0.22,1,0.36,1)]">
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-16">
        <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60 pt-2">
          {label}
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
