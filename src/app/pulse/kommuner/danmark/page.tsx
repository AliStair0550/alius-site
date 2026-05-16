import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { humanizePeriod } from "@/lib/signals/types";
import { IncomeBars } from "@/components/pulse/IncomeBars";

export const metadata: Metadata = {
  title: "Danmark · Kommuneprofiler · Alius Pulse",
  description:
    "Danmark som helhed: befolkning, indkomst og ledighed. Det landsgennemsnit alle kommune-profiler sammenlignes med.",
};

export const revalidate = false;

const NATIONAL_AREA_CODE = "000";

export default async function DanmarkProfilePage() {
  // Load source IDs
  const folkSource = await prisma.dataSource.findUnique({
    where: { slug: "dst-folk1am" },
  });
  const indkSource = await prisma.dataSource.findUnique({
    where: { slug: "dst-indkp101" },
  });
  const ledigSource = await prisma.dataSource.findUnique({
    where: { slug: "dst-aus08" },
  });

  // Population: national latest + 24 months for sparkline
  const populationLatest = folkSource
    ? await prisma.dataPoint.findFirst({
        where: {
          sourceId: folkSource.id,
          areaCode: NATIONAL_AREA_CODE,
          value: { not: null },
        },
        orderBy: { periodDate: "desc" },
      })
    : null;

  const populationHistory = folkSource
    ? await prisma.dataPoint.findMany({
        where: {
          sourceId: folkSource.id,
          areaCode: NATIONAL_AREA_CODE,
          value: { not: null },
        },
        orderBy: { periodDate: "desc" },
        take: 24,
        select: { period: true, periodDate: true, value: true },
      })
    : [];

  const populationHistoryAsc = [...populationHistory].reverse();

  // 12-month change for population
  const population12mAgo =
    populationHistory.length >= 13 ? populationHistory[12].value : null;
  const populationChange12m =
    populationLatest?.value && population12mAgo
      ? populationLatest.value - population12mAgo
      : null;

  // Income: latest + last 10 years
  const incomeLatest = indkSource
    ? await prisma.dataPoint.findFirst({
        where: {
          sourceId: indkSource.id,
          areaCode: NATIONAL_AREA_CODE,
          value: { not: null },
        },
        orderBy: { periodDate: "desc" },
      })
    : null;

  const incomeHistory = indkSource
    ? await prisma.dataPoint.findMany({
        where: {
          sourceId: indkSource.id,
          areaCode: NATIONAL_AREA_CODE,
          value: { not: null },
        },
        orderBy: { periodDate: "desc" },
        take: 10,
        select: { period: true, periodDate: true, value: true },
      })
    : [];

  const incomeHistoryAsc = [...incomeHistory].reverse();
  const incomePoints = incomeHistoryAsc.map((p) => ({
    year: p.periodDate.getUTCFullYear(),
    value: p.value!,
  }));

  // Year-over-year income change
  const incomePrevious =
    incomeHistory.length >= 2 ? incomeHistory[1].value : null;
  const incomeChange =
    incomeLatest?.value && incomePrevious
      ? incomeLatest.value - incomePrevious
      : null;

  // Unemployment: latest national value + 12 months
  const unemploymentLatest = ledigSource
    ? await prisma.dataPoint.findFirst({
        where: {
          sourceId: ledigSource.id,
          areaCode: NATIONAL_AREA_CODE,
          value: { not: null },
        },
        orderBy: { periodDate: "desc" },
      })
    : null;

  const unemployment12mAgo = ledigSource
    ? await prisma.dataPoint.findFirst({
        where: {
          sourceId: ledigSource.id,
          areaCode: NATIONAL_AREA_CODE,
          value: { not: null },
          periodDate: unemploymentLatest
            ? {
                lte: new Date(
                  unemploymentLatest.periodDate.getTime() -
                    365 * 24 * 60 * 60 * 1000
                ),
              }
            : undefined,
        },
        orderBy: { periodDate: "desc" },
      })
    : null;

  const unemploymentChange12m =
    unemploymentLatest?.value && unemployment12mAgo?.value
      ? unemploymentLatest.value - unemployment12mAgo.value
      : null;

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
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-baseline gap-4 pb-8 md:pb-12 border-b border-ink/10 mb-12 md:mb-16">
          <Link
            href="/pulse/kommuner"
            className="font-extralight text-sm tracking-[0.3em] uppercase text-ink no-underline hover:text-moss transition-colors"
          >
            ALIUS &#183; PULSE &#183; KOMMUNER
          </Link>
          <div className="text-[11px] tracking-[0.2em] uppercase text-stone opacity-60">
            Danmark
          </div>
        </header>

        {/* Hero */}
        <section className="py-8 mb-16">
          <div className="text-[11px] tracking-[0.4em] uppercase text-moss mb-8">
            Landsprofil
          </div>

          <h1 className="font-fraunces font-light italic text-[clamp(80px,14vw,180px)] leading-[0.85] tracking-[-0.04em] mb-12 max-w-[900px]">
            Danmark
          </h1>

          {/* Three key metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <MetricBlock
              label="Befolkning"
              value={
                populationLatest?.value
                  ? populationLatest.value.toLocaleString("da-DK")
                  : "–"
              }
              period={
                populationLatest
                  ? humanizePeriod(populationLatest.period)
                  : null
              }
              delta={
                populationChange12m !== null
                  ? `${populationChange12m > 0 ? "+" : ""}${populationChange12m.toLocaleString("da-DK")} vs. for 12 mdr.`
                  : null
              }
            />
            <MetricBlock
              label="Disponibel indkomst"
              value={
                incomeLatest?.value
                  ? `${Math.round(incomeLatest.value / 1000)} t.kr.`
                  : "–"
              }
              period={incomeLatest?.period ?? null}
              delta={
                incomeChange !== null
                  ? `${incomeChange > 0 ? "+" : ""}${Math.round(incomeChange).toLocaleString("da-DK")} kr. vs. året før`
                  : null
              }
            />
            <MetricBlock
              label="Ledighed"
              value={
                unemploymentLatest?.value
                  ? `${unemploymentLatest.value.toLocaleString("da-DK", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
                  : "–"
              }
              period={
                unemploymentLatest
                  ? humanizePeriod(unemploymentLatest.period)
                  : null
              }
              delta={
                unemploymentChange12m !== null
                  ? `${unemploymentChange12m > 0 ? "+" : ""}${unemploymentChange12m.toFixed(1).replace(".", ",")} pp vs. for 12 mdr.`
                  : null
              }
            />
          </div>
        </section>

        {/* Synthesis */}
        <section className="mb-20 max-w-[820px]">
          <p className="font-fraunces font-light italic text-[20px] md:text-[24px] leading-[1.4] text-ink/85">
            Danmark som helhed sætter rammen for alle kommuner i Pulse. Her er
            de tre nøgletal som hver kommuneprofil sammenlignes med. Mørkere
            værdier på kortet over kommuner betyder, at kommunen ligger over
            landsgennemsnittet.
          </p>
        </section>

        {/* Population trend */}
        {populationHistoryAsc.length > 0 && (
          <section className="mb-20">
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-16 mb-8">
              <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60">
                Befolkning
              </div>
              <div>
                <h2 className="font-fraunces font-light text-[36px] md:text-[44px] leading-[1.1] tracking-[-0.01em] mb-4">
                  Befolkningsudvikling
                </h2>
                <p className="text-stone text-[15px] leading-[1.6] max-w-[640px]">
                  Samlet folketal i Danmark den 1. i måneden, seneste 24 måneder.
                </p>
              </div>
            </div>
            <div className="bg-fog/40 p-8">
              <NationalSparkline points={populationHistoryAsc} />
            </div>
          </section>
        )}

        {/* Income */}
        {incomePoints.length > 0 && (
          <section className="mb-20">
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-16 mb-8">
              <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60">
                Indkomst
              </div>
              <div>
                <h2 className="font-fraunces font-light text-[36px] md:text-[44px] leading-[1.1] tracking-[-0.01em] mb-4">
                  Disponibel indkomst
                </h2>
                <p className="text-stone text-[15px] leading-[1.6] max-w-[640px] mb-2">
                  Gennemsnitlig disponibel indkomst per person i hele landet, seneste 10 år.
                </p>
                <p className="text-stone/60 text-[13px] leading-[1.6] max-w-[640px]">
                  Disponibel indkomst er det beløb der er tilbage efter skat og overførsler. Det reelle rådighedsbeløb per person om året.
                </p>
              </div>
            </div>
            <div className="bg-fog/40 p-4 md:p-8">
              <IncomeBars points={incomePoints} />
            </div>
          </section>
        )}

        {/* Link to full unemployment */}
        <section className="mb-20">
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-16 mb-8">
            <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60">
              Ledighed
            </div>
            <div>
              <h2 className="font-fraunces font-light text-[36px] md:text-[44px] leading-[1.1] tracking-[-0.01em] mb-4">
                Ledighedsudvikling
              </h2>
              <p className="text-stone text-[15px] leading-[1.6] max-w-[640px] mb-6">
                Sæsonkorrigeret ledighed på landsplan. Det fulde billede med kort over alle 98 kommuner, signaler og top/bund-rankings findes på ledighedssiden.
              </p>
              <Link
                href="/pulse/ledighed"
                className="inline-flex items-center gap-3 text-[13px] tracking-[0.2em] uppercase text-ink no-underline border-b border-ink pb-1 hover:text-moss hover:border-moss transition-colors group"
              >
                Åbn ledighedspuls
                <span className="transition-transform group-hover:translate-x-1">
                  &rarr;
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* Source */}
        <section className="mt-20 pt-10 border-t border-ink/10 mb-12">
          <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-3">
            Kilder
          </div>
          <p className="text-[14px] leading-[1.6] text-stone max-w-[640px]">
            Befolkningstal fra <a href="https://www.statistikbanken.dk/FOLK1AM" target="_blank" rel="noopener noreferrer" className="text-moss hover:underline">FOLK1AM</a>. Indkomsttal fra <a href="https://www.statistikbanken.dk/INDKP101" target="_blank" rel="noopener noreferrer" className="text-moss hover:underline">INDKP101</a>. Ledighedstal fra <a href="https://www.statistikbanken.dk/AUS08" target="_blank" rel="noopener noreferrer" className="text-moss hover:underline">AUS08</a>. Alle fra Danmarks Statistik under licens CC 4.0 BY.
          </p>
        </section>

        {/* CTA */}
        <section className="mt-12 p-10 md:p-16 bg-ink text-parchment">
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
            href="mailto:hej@alius.dk?subject=Data-arbejde for [firmanavn]"
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

function MetricBlock({
  label,
  value,
  period,
  delta,
}: {
  label: string;
  value: string;
  period: string | null;
  delta: string | null;
}) {
  return (
    <div>
      <div className="text-[11px] tracking-[0.25em] uppercase text-stone opacity-60 mb-3">
        {label}
      </div>
      <div className="font-fraunces font-light text-[40px] md:text-[52px] leading-[1] text-ink mb-2 tabular-nums">
        {value}
      </div>
      {period && (
        <div className="text-[12px] text-stone opacity-70 mb-1">
          {period}
        </div>
      )}
      {delta && (
        <div className="text-[12px] text-moss font-light tabular-nums">
          {delta}
        </div>
      )}
    </div>
  );
}

function NationalSparkline({
  points,
}: {
  points: { period: string; periodDate: Date; value: number | null }[];
}) {
  const valid = points.filter((p) => p.value !== null) as {
    period: string;
    periodDate: Date;
    value: number;
  }[];
  if (valid.length < 2) return null;

  const values = valid.map((p) => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const width = 1100;
  const height = 200;
  const padding = { top: 24, right: 24, bottom: 32, left: 24 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const xScale = (idx: number) =>
    padding.left + (idx / (valid.length - 1)) * plotWidth;
  const yScale = (val: number) =>
    padding.top + plotHeight - ((val - minVal) / range) * plotHeight;

  const path = valid
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(p.value)}`)
    .join(" ");

  const first = valid[0];
  const last = valid[valid.length - 1];

  const MONTHS_DA = [
    "jan", "feb", "mar", "apr", "maj", "jun",
    "jul", "aug", "sep", "okt", "nov", "dec",
  ];

  const formatPeriod = (date: Date) =>
    `${MONTHS_DA[date.getUTCMonth()]} ${date.getUTCFullYear()}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      style={{ maxWidth: "100%", height: "auto" }}
    >
      <text
        x={padding.left}
        y={padding.top - 4}
        fontSize={11}
        fill="rgba(26,26,26,0.5)"
        textAnchor="start"
        fontFamily="inherit"
        letterSpacing="0.2em"
      >
        {`${formatPeriod(first.periodDate).toUpperCase()} TIL ${formatPeriod(last.periodDate).toUpperCase()}`}
      </text>
      <path
        d={path}
        fill="none"
        stroke="#1A1A1A"
        strokeWidth={1.8}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={xScale(valid.length - 1)}
        cy={yScale(last.value)}
        r={4}
        fill="#1A1A1A"
      />
      <text
        x={padding.left}
        y={padding.top + plotHeight + 24}
        fontSize={11}
        fill="rgba(26,26,26,0.5)"
        textAnchor="start"
        fontFamily="inherit"
      >
        {minVal.toLocaleString("da-DK")}
      </text>
      <text
        x={width - padding.right}
        y={padding.top + plotHeight + 24}
        fontSize={11}
        fill="rgba(26,26,26,0.5)"
        textAnchor="end"
        fontFamily="inherit"
      >
        {maxVal.toLocaleString("da-DK")}
      </text>
    </svg>
  );
}
