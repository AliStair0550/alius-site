import Link from "next/link";
import { ARCHETYPES, type QuadrantKey } from "./data";
import { Quadrant } from "./Quadrant";
import { TeamGlyph } from "./TeamGlyph";
import type { TeamAnalysis } from "@/lib/team-analysis";

const TENSION_COLOR: Record<"low" | "medium" | "high", string> = {
  low: "text-stone opacity-70",
  medium: "text-ink",
  high: "text-ink font-normal",
};

type Props = {
  companyName: string;
  sessionOpen: boolean;
  totalExpected: number;
  totalSubmitted: number;
  analysis: TeamAnalysis;
};

export function TeamReportView({
  companyName,
  sessionOpen,
  totalExpected,
  totalSubmitted,
  analysis,
}: Props) {
  const a = analysis;
  const primaryArch = ARCHETYPES[a.aggregatePrimary];
  const secondaryArch = ARCHETYPES[a.aggregateSecondary];
  const weakestArch = ARCHETYPES[a.aggregateWeakest];

  return (
    <div className="animate-[fadeIn_0.7s_ease-out]">

      {/* Open session banner */}
      {sessionOpen && (
        <div className="mb-12 px-6 py-4 border border-moss/30 bg-moss/5 text-[13px] text-moss leading-[1.5]">
          Session er stadig åben. Rapporten opdateres automatisk som deltagere tilmelder sig.{" "}
          <span className="opacity-60">
            {totalSubmitted} af {totalExpected} udfyldt.
          </span>
        </div>
      )}

      {/* Hero */}
      <div className="pb-16 border-b border-ink/10 mb-0">
        <div className="text-[11px] tracking-[0.4em] uppercase text-moss mb-6">
          Holdrapport · {companyName}
        </div>
        <div className="flex flex-wrap items-baseline gap-4 mb-6">
          <h1 className="font-fraunces font-light italic text-[clamp(56px,8vw,104px)] leading-[0.95] tracking-[-0.03em] text-ink">
            {primaryArch.name}
          </h1>
          <span className="font-fraunces font-light text-[22px] text-stone">
            med{" "}
            <em className="italic">{secondaryArch.name.toLowerCase()}</em> som medløber
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

      {/* 01 Konstellation */}
      <Section label="01 · Konstellation">
        <h2 className="font-fraunces font-light text-[36px] leading-[1.1] mb-6 tracking-[-0.01em]">
          Hvem er I som hold?
        </h2>
        <p className="text-[17px] leading-[1.65] text-stone mb-10 max-w-[600px]">
          {a.classificationDescription}
        </p>
        <div className="bg-sand p-8 md:p-12 max-w-[540px]">
          <TeamGlyph
            participants={a.participants.map((p) => ({
              name: p.name,
              primary: p.primary,
            }))}
            size={440}
          />
        </div>
      </Section>

      {/* 02 Aggregat */}
      <Section label="02 · Aggregat">
        <h2 className="font-fraunces font-light text-[36px] leading-[1.1] mb-6 tracking-[-0.01em]">
          Holdet som ét hoved.
        </h2>
        <p className="text-[17px] leading-[1.65] text-stone mb-8 max-w-[600px]">
          Hvis alle deltagere smeltede sammen til én profil, ville den primære kvadrant
          være{" "}
          <strong className="text-ink font-normal">{primaryArch.name.toLowerCase()}</strong>,
          med{" "}
          <strong className="text-ink font-normal">
            {secondaryArch.name.toLowerCase()}
          </strong>{" "}
          som medløber og{" "}
          <strong className="text-ink font-normal">
            {weakestArch.name.toLowerCase()}
          </strong>{" "}
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
      </Section>

      {/* 03 Observationer */}
      <Section label="03 · Observationer">
        <h2 className="font-fraunces font-light text-[36px] leading-[1.1] mb-6 tracking-[-0.01em]">
          Hvad mønstret fortæller.
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
      </Section>

      {/* 04 Spændinger */}
      {a.tensions.length > 0 && (
        <Section label="04 · Spændinger">
          <h2 className="font-fraunces font-light text-[36px] leading-[1.1] mb-6 tracking-[-0.01em]">
            Diagonale træk.
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
                <p
                  className={`text-[15px] leading-[1.6] ${TENSION_COLOR[t.severity]}`}
                >
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
        </Section>
      )}

      {/* 05 Blindt felt */}
      {a.blindQuadrants.length > 0 && (
        <Section
          label={`0${a.tensions.length > 0 ? "5" : "4"} · Blindt felt`}
        >
          <h2 className="font-fraunces font-light text-[36px] leading-[1.1] mb-6 tracking-[-0.01em]">
            Hele en{" "}
            {a.blindQuadrants.length === 1 ? "stemme" : "del"} er stille.
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
        </Section>
      )}

      {/* 06 Deltagere */}
      <Section
        label={`0${
          a.tensions.length > 0 && a.blindQuadrants.length > 0
            ? "6"
            : a.tensions.length > 0 || a.blindQuadrants.length > 0
            ? "5"
            : "4"
        } · Deltagere`}
      >
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
      </Section>

      {/* CTA */}
      <div className="mt-20 bg-ink text-parchment px-8 md:px-16 py-16 md:py-20">
        <div className="max-w-[560px]">
          <div className="text-[11px] tracking-[0.3em] uppercase text-parchment/60 mb-6">
            Næste skridt
          </div>
          <h2 className="font-fraunces font-light text-[36px] md:text-[44px] leading-[1.1] mb-6 tracking-[-0.01em]">
            Hvad gør I med det her?
          </h2>
          <p className="text-[16px] leading-[1.65] text-parchment/70 mb-10 max-w-[440px]">
            En rapport er et udgangspunkt, ikke en konklusion. Book en times samtale
            med Alius. Vi gennemgår mønstret og finder hvad I konkret kan gøre med det.
          </p>
          <a
            href="mailto:hej@alius.dk?subject=Book samtale om holdrapport"
            className="inline-flex items-center gap-4 border border-parchment/30 text-parchment px-8 py-[18px] text-[12px] tracking-[0.25em] uppercase no-underline hover:bg-parchment/10 transition-colors group"
          >
            Book en samtale
            <span className="transition-transform duration-300 group-hover:translate-x-1">
              &rarr;
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-16 md:py-20 border-b border-ink/10">
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-16">
        <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60 pt-2">
          {label}
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
