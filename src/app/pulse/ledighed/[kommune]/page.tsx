import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getKommuneBySlug, getAllKommuner } from "@/lib/areas";
import { humanizePeriod, formatPercent, formatPercentagePoints } from "@/lib/signals/types";
import { ComparisonChart } from "@/components/pulse/ComparisonChart";
import { PulseSignalCard } from "@/components/pulse/SignalCard";

type Props = {
  params: Promise<{ kommune: string }>;
};

export const revalidate = 3600;

type Direction = "UP" | "DOWN" | "STABLE";

function toDirection(s: string | null): Direction | null {
  if (s === "UP" || s === "DOWN" || s === "STABLE") return s;
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kommune } = await params;
  const k = getKommuneBySlug(kommune);
  if (!k) {
    return { title: "Kommune ikke fundet · Alius Pulse" };
  }
  return {
    title: `Ledighed i ${k.name} · Alius Pulse`,
    description: `Den seneste ledighedsudvikling i ${k.name} kommune. Opdateres månedligt med data fra Danmarks Statistik.`,
  };
}

export async function generateStaticParams() {
  return getAllKommuner().map((k) => ({ kommune: k.slug }));
}

export default async function KommunePage({ params }: Props) {
  const { kommune: slug } = await params;
  const kommune = getKommuneBySlug(slug);
  if (!kommune) notFound();

  const source = await prisma.dataSource.findUnique({
    where: { slug: "dst-aus08" },
  });
  if (!source) notFound();

  // Get latest kommune datapoint
  const latestKommune = await prisma.dataPoint.findFirst({
    where: {
      sourceId: source.id,
      areaCode: kommune.code,
      value: { not: null },
    },
    orderBy: { periodDate: "desc" },
  });

  if (!latestKommune) notFound();

  // Get previous month value (for change calculation)
  const previousKommune = await prisma.dataPoint.findFirst({
    where: {
      sourceId: source.id,
      areaCode: kommune.code,
      value: { not: null },
      periodDate: { lt: latestKommune.periodDate },
    },
    orderBy: { periodDate: "desc" },
  });

  // Get latest national value for comparison
  const latestNational = await prisma.dataPoint.findFirst({
    where: {
      sourceId: source.id,
      areaCode: "000",
      period: latestKommune.period,
      value: { not: null },
    },
  });

  // 5-year history for both kommune and national
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

  const kommuneHistory = await prisma.dataPoint.findMany({
    where: {
      sourceId: source.id,
      areaCode: kommune.code,
      value: { not: null },
      periodDate: { gte: fiveYearsAgo },
    },
    orderBy: { periodDate: "asc" },
    select: { period: true, periodDate: true, value: true },
  });

  const nationalHistory = await prisma.dataPoint.findMany({
    where: {
      sourceId: source.id,
      areaCode: "000",
      value: { not: null },
      periodDate: { gte: fiveYearsAgo },
    },
    orderBy: { periodDate: "asc" },
    select: { period: true, periodDate: true, value: true },
  });

  // Get all signals about this specific kommune
  const kommuneSignals = await prisma.signal.findMany({
    where: {
      sourceId: source.id,
      areaCode: kommune.code,
    },
    orderBy: [{ severity: "desc" }, { magnitude: "desc" }],
  });

  // Calculate insights
  const change = previousKommune
    ? latestKommune.value! - previousKommune.value!
    : null;
  const deviationFromNational = latestNational
    ? latestKommune.value! - latestNational.value!
    : null;

  // National ranking
  const allKommunerInLatestPeriod = await prisma.dataPoint.findMany({
    where: {
      sourceId: source.id,
      areaType: "KOMMUNE",
      period: latestKommune.period,
      value: { not: null },
    },
    orderBy: { value: "desc" },
    select: { areaCode: true, value: true },
  });
  const rank = allKommunerInLatestPeriod.findIndex(
    (k) => k.areaCode === kommune.code
  );
  const totalRanked = allKommunerInLatestPeriod.length;

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

      <div className="max-w-[1200px] mx-auto px-5 py-8 md:px-8 md:py-12 relative z-10">
        {/* Breadcrumb header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-baseline gap-4 pb-8 md:pb-12 border-b border-ink/10 mb-12 md:mb-16">
          <Link
            href="/pulse/ledighed"
            className="font-extralight text-sm tracking-[0.3em] uppercase text-ink no-underline hover:text-moss transition-colors"
          >
            &larr; Alius &#183; Pulse
          </Link>
          <div className="text-[11px] tracking-[0.2em] uppercase text-stone opacity-60">
            Kommune &#183; Ledighed
          </div>
        </header>

        {/* Hero */}
        <section className="mb-16 md:mb-20">
          <div className="text-[11px] tracking-[0.4em] uppercase text-moss mb-6 flex items-center gap-4">
            <span>Ledigheden i</span>
            <span className="h-px bg-ink/10 flex-1 max-w-[120px]" />
            <span className="opacity-60">{humanizePeriod(latestKommune.period)}</span>
          </div>

          <h1 className="font-fraunces font-light italic text-[clamp(60px,10vw,140px)] leading-[0.9] tracking-[-0.04em] mb-12">
            {kommune.name}
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-16 pb-8 border-b border-ink/10">
            <Stat
              label="Aktuel ledighed"
              value={formatPercent(latestKommune.value!)}
              context={
                change !== null
                  ? `${formatPercentagePoints(change)} fra sidste måned`
                  : null
              }
            />
            <Stat
              label="Vs landsplan"
              value={
                deviationFromNational !== null
                  ? formatPercentagePoints(deviationFromNational)
                  : "–"
              }
              context={
                latestNational
                  ? `Landsplan: ${formatPercent(latestNational.value!)}`
                  : null
              }
            />
            <Stat
              label="Placering i landet"
              value={rank >= 0 ? `Nr. ${rank + 1}` : "–"}
              context={rank >= 0 ? `Af ${totalRanked} kommuner` : null}
            />
          </div>
        </section>

        {/* Comparison chart */}
        {kommuneHistory.length > 12 && (
          <section className="mb-16 md:mb-20">
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-16 mb-10">
              <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60">
                Sammenligning
              </div>
              <div>
                <h2 className="font-fraunces font-light text-[36px] md:text-[44px] leading-[1.1] tracking-[-0.01em] mb-4">
                  {kommune.name} vs landsplan.
                </h2>
                <p className="text-stone text-[15px] leading-[1.6] max-w-[640px]">
                  Sæsonkorrigeret ledighed over de seneste fem år, sammenholdt med landsgennemsnittet.
                </p>
              </div>
            </div>
            <div className="bg-fog/40 p-4 md:p-8">
              <ComparisonChart
                primaryName={kommune.name}
                primaryPoints={kommuneHistory.map((p) => ({
                  period: p.period,
                  periodDate: p.periodDate.toISOString(),
                  value: p.value!,
                }))}
                secondaryName="Landsplan"
                secondaryPoints={nationalHistory.map((p) => ({
                  period: p.period,
                  periodDate: p.periodDate.toISOString(),
                  value: p.value!,
                }))}
              />
            </div>
          </section>
        )}

        {/* Kommune-specific signals */}
        {kommuneSignals.length > 0 && (
          <section className="mb-16 md:mb-20">
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-16 mb-10">
              <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60">
                Observationer
              </div>
              <h2 className="font-fraunces font-light text-[36px] md:text-[44px] leading-[1.1] tracking-[-0.01em]">
                Hvad fortæller tallene.
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {kommuneSignals.map((s) => (
                <PulseSignalCard
                  key={s.id}
                  headline={s.headline}
                  body={s.body}
                  direction={toDirection(s.direction)}
                  severity={s.severity}
                  areaName={s.areaName}
                  areaCode={s.areaCode}
                />
              ))}
            </div>
          </section>
        )}

        {/* Source */}
        <section className="mt-20 pt-10 border-t border-ink/10 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-3">
              Kilde
            </div>
            <p className="text-[14px] leading-[1.6] text-stone mb-3">
              Tallene for {kommune.name} kommune er hentet direkte fra Danmarks Statistik, tabel AUS08.
            </p>
          </div>
          <div>
            <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-3">
              Andre kommuner
            </div>
            <p className="text-[14px] leading-[1.6] text-stone">
              <Link
                href="/pulse/ledighed"
                className="text-moss hover:underline"
              >
                Tilbage til oversigten &rarr;
              </Link>
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-16 p-10 md:p-16 bg-ink text-parchment">
          <div className="text-[11px] tracking-[0.3em] uppercase text-moss-light mb-4">
            For virksomheder
          </div>
          <h3 className="font-fraunces font-light text-[36px] md:text-[44px] leading-[1.1] mb-6">
            Vil I have data <em className="italic text-[#B8C9C1]">tilpasset jeres marked?</em>
          </h3>
          <p className="opacity-70 max-w-[560px] mb-10 text-[16px] leading-[1.6]">
            Vi laver custom data-analyser for virksomheder der vil forstå deres marked dybere. Kombinerer offentlige data med jeres egne tal, og leverer rapporter, dashboards eller månedlige indsigter.
          </p>
          <a
            href={`mailto:hej@alius.dk?subject=Data-arbejde for [firmanavn]&body=Hej,%0A%0AJeg så jeres data om ${kommune.name} og er interesseret i...`}
            className="inline-flex items-center gap-4 bg-parchment text-ink px-9 py-[22px] text-[13px] font-normal tracking-[0.25em] uppercase no-underline hover:bg-[#4A7D68] hover:text-parchment transition-colors group"
          >
            Tag fat
            <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
          </a>
        </section>

        <footer className="mt-24 pt-8 border-t border-ink/10 text-[11px] text-stone opacity-50 tracking-[0.05em] leading-[1.6]">
          Alius Pulse er udviklet af Alius og bygger på åbne data fra Danmarks Statistik. Tal benyttes under licens CC 4.0 BY.
        </footer>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  context,
}: {
  label: string;
  value: string;
  context: string | null;
}) {
  return (
    <div>
      <div className="text-[11px] tracking-[0.25em] uppercase text-stone opacity-60 mb-3">
        {label}
      </div>
      <div className="font-fraunces font-light text-[40px] md:text-[52px] leading-[1] tracking-[-0.02em] mb-2 tabular-nums">
        {value}
      </div>
      {context && (
        <div className="text-[13px] text-stone opacity-70">{context}</div>
      )}
    </div>
  );
}
