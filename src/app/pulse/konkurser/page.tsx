import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { humanizePeriod } from "@/lib/signals/types";
import { PulseSignalCard } from "@/components/pulse/SignalCard";
import { KonkursHero } from "@/components/pulse/KonkursHero";
import { KonkursHistoryChart } from "@/components/pulse/KonkursHistoryChart";
import { BrancheRankings } from "@/components/pulse/BrancheRankings";

export const metadata: Metadata = {
  title: "Konkurspuls · Alius Pulse",
  description:
    "Antallet af konkurser i danske virksomheder, måned for måned og branche for branche. Sæsonkorrigerede tal fra Danmarks Statistik.",
};

export const revalidate = 3600;

type Direction = "UP" | "DOWN" | "STABLE";

function toDirection(s: string | null): Direction | null {
  if (s === "UP" || s === "DOWN" || s === "STABLE") return s;
  return null;
}

/**
 * Determine if a branche row represents a total ("I alt") aggregate
 * which we want to exclude from the per-branche rankings.
 */
function isTotalBranche(dims: Record<string, string> | null): boolean {
  if (!dims) return false;
  const label = dims.BRANCHE_LABEL?.toLowerCase() ?? "";
  const code = dims.BRANCHE_CODE?.toUpperCase() ?? "";
  return (
    label.includes("i alt") ||
    code === "000" ||
    code === "TOT" ||
    code === "ALL"
  );
}

type KonkPeriodTotals = {
  currentTotal: number;
  previousTotal: number;
};

/**
 * Aggregate the last 12 months and the 12 months before that, per branche.
 * Returns ranked rows sorted by absolute change.
 */
function aggregateBranches(
  rows: Array<{
    period: string;
    periodDate: Date;
    value: number | null;
    dimensions: Record<string, string> | null;
  }>,
  latestDate: Date
) {
  const currentEnd = latestDate;
  const currentStart = new Date(currentEnd);
  currentStart.setMonth(currentStart.getMonth() - 11);
  const previousEnd = new Date(currentStart);
  previousEnd.setMonth(previousEnd.getMonth() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setMonth(previousStart.getMonth() - 11);

  const byBranche = new Map<string, { label: string } & KonkPeriodTotals>();

  for (const r of rows) {
    if (r.value === null) continue;
    if (isTotalBranche(r.dimensions)) continue;
    const code = r.dimensions?.BRANCHE_CODE;
    const label = r.dimensions?.BRANCHE_LABEL;
    if (!code || !label) continue;

    const existing = byBranche.get(code) ?? {
      label,
      currentTotal: 0,
      previousTotal: 0,
    };

    if (r.periodDate >= currentStart && r.periodDate <= currentEnd) {
      existing.currentTotal += r.value;
    } else if (r.periodDate >= previousStart && r.periodDate <= previousEnd) {
      existing.previousTotal += r.value;
    }

    byBranche.set(code, existing);
  }

  const rowsAgg = Array.from(byBranche.entries())
    .map(([code, data]) => {
      const change = data.currentTotal - data.previousTotal;
      const pctChange =
        data.previousTotal > 0 ? (change / data.previousTotal) * 100 : 0;
      return {
        code,
        label: data.label,
        currentTotal: Math.round(data.currentTotal),
        previousTotal: Math.round(data.previousTotal),
        change: Math.round(change),
        pctChange,
      };
    })
    .filter((r) => r.currentTotal + r.previousTotal >= 5);

  return {
    rows: rowsAgg,
    currentStart,
    currentEnd,
    previousStart,
    previousEnd,
  };
}

function formatPeriodRange(start: Date, end: Date): string {
  const months = [
    "jan", "feb", "mar", "apr", "maj", "jun",
    "jul", "aug", "sep", "okt", "nov", "dec",
  ];
  const startStr = `${months[start.getUTCMonth()]} ${start.getUTCFullYear() % 100}`;
  const endStr = `${months[end.getUTCMonth()]} ${end.getUTCFullYear() % 100}`;
  return `${startStr}–${endStr}`;
}

export default async function KonkursPulsPage() {
  const source = await prisma.dataSource.findUnique({
    where: { slug: "dst-konk3" },
  });
  if (!source) return <NoDataView />;

  const brancheSource = await prisma.dataSource.findUnique({
    where: { slug: "dst-konk4" },
  });

  const allDatapoints = await prisma.dataPoint.findMany({
    where: { sourceId: source.id, value: { not: null } },
    orderBy: { periodDate: "asc" },
    select: { period: true, periodDate: true, value: true, dimensions: true },
  });

  // KONK3 sync only stores the seasonal series (enforced by filter + unique constraint)
  const seasonal = allDatapoints;
  const actual: typeof allDatapoints = [];

  const latestSeasonal = seasonal[seasonal.length - 1] ?? null;

  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

  const seasonalHistory = seasonal.filter((p) => p.periodDate >= fiveYearsAgo);
  const actualHistory = actual.filter((p) => p.periodDate >= fiveYearsAgo);

  // Load branche data
  let brancheAggregation = null;
  if (brancheSource && latestSeasonal) {
    const brancheRows = await prisma.dataPoint.findMany({
      where: { sourceId: brancheSource.id, value: { not: null } },
      select: { period: true, periodDate: true, value: true, dimensions: true },
    });
    const typed = brancheRows.map((r) => ({
      period: r.period,
      periodDate: r.periodDate,
      value: r.value,
      dimensions: r.dimensions as Record<string, string> | null,
    }));
    brancheAggregation = aggregateBranches(typed, latestSeasonal.periodDate);
  }

  const allSignals = await prisma.signal.findMany({
    where: { sourceId: source.id },
    orderBy: [{ severity: "desc" }, { magnitude: "desc" }],
  });

  const importantSignals = allSignals.filter((s) => s.severity === "important");
  const noteSignals = allSignals.filter((s) => s.severity === "note");
  const headlineSignal = importantSignals[0] ?? allSignals[0] ?? null;
  const otherSignals = [...importantSignals.slice(1), ...noteSignals];

  const previousSeasonal = seasonal.length >= 2 ? seasonal[seasonal.length - 2] : null;
  const monthChange =
    latestSeasonal && previousSeasonal && previousSeasonal.value
      ? latestSeasonal.value! - previousSeasonal.value!
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
        <header className="flex flex-col md:flex-row justify-between items-start md:items-baseline gap-4 pb-8 md:pb-12 border-b border-ink/10 mb-12 md:mb-16">
          <Link
            href="/pulse"
            className="font-extralight text-sm tracking-[0.3em] uppercase text-ink no-underline hover:text-moss transition-colors"
          >
            Alius &#183; Pulse
          </Link>
          <div className="text-[11px] tracking-[0.2em] uppercase text-stone opacity-60">
            Konkurser
          </div>
        </header>

        <KonkursHero
          latestValue={latestSeasonal?.value ?? null}
          latestPeriod={latestSeasonal?.period ?? null}
          monthChange={monthChange}
          previousValue={previousSeasonal?.value ?? null}
          headlineSignal={
            headlineSignal
              ? {
                  headline: headlineSignal.headline,
                  body: headlineSignal.body,
                  direction: toDirection(headlineSignal.direction),
                }
              : null
          }
        />

        {/* History chart */}
        {seasonalHistory.length > 12 && (
          <section className="mt-16 md:mt-20 mb-20">
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-16 mb-10">
              <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60">
                Historik
              </div>
              <div>
                <h2 className="font-fraunces font-light text-[36px] md:text-[44px] leading-[1.1] tracking-[-0.01em] mb-4">
                  Hvor er vi i forhold til de sidste 5 år?
                </h2>
                <p className="text-stone text-[15px] leading-[1.6] max-w-[640px]">
                  Antallet af erklærede konkurser pr. måned i aktive virksomheder. Sort linje viser sæsonkorrigerede tal, den lysere viser de faktiske tal.
                </p>
              </div>
            </div>
            <div className="bg-fog/40 p-4 md:p-8">
              <KonkursHistoryChart
                seasonalPoints={seasonalHistory.map((p) => ({
                  period: p.period,
                  periodDate: p.periodDate.toISOString(),
                  value: p.value!,
                }))}
                actualPoints={actualHistory.map((p) => ({
                  period: p.period,
                  periodDate: p.periodDate.toISOString(),
                  value: p.value!,
                }))}
              />
            </div>
          </section>
        )}

        {/* Brancher */}
        {brancheAggregation && brancheAggregation.rows.length > 0 && (
          <section className="mb-20">
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-16 mb-10">
              <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60">
                Brancher
              </div>
              <div>
                <h2 className="font-fraunces font-light text-[36px] md:text-[44px] leading-[1.1] tracking-[-0.01em] mb-4">
                  Hvor rammer det hårdest?
                </h2>
                <p className="text-stone text-[15px] leading-[1.6] max-w-[640px]">
                  Sammenligning af de seneste 12 måneder mod de foregående 12 måneder, per branche. Aktive virksomheder.
                </p>
              </div>
            </div>
            <div className="bg-fog/40 p-6 md:p-8">
              <BrancheRankings
                rows={brancheAggregation.rows}
                currentPeriodLabel={formatPeriodRange(
                  brancheAggregation.currentStart,
                  brancheAggregation.currentEnd
                )}
                previousPeriodLabel={formatPeriodRange(
                  brancheAggregation.previousStart,
                  brancheAggregation.previousEnd
                )}
              />
            </div>
          </section>
        )}

        {/* Signal feed */}
        {otherSignals.length > 0 && (
          <section className="mb-20">
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-16 mb-10">
              <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60">
                Signaler
              </div>
              <h2 className="font-fraunces font-light text-[36px] md:text-[44px] leading-[1.1] tracking-[-0.01em]">
                Hvad sker der i tallene.
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {otherSignals.map((s) => (
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

        <section className="mt-20 pt-10 border-t border-ink/10 mb-12">
          <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-3">
            Note
          </div>
          <p className="text-[14px] leading-[1.6] text-stone max-w-[640px]">
            Tallene viser konkurser i aktive virksomheder, altså virksomheder med omsætning eller medarbejdere. Det er det måltal, der bedst beskriver erhvervslivets sundhed.
          </p>
          <p className="text-[14px] leading-[1.6] text-stone max-w-[640px] mt-3">
            Branche-tallene er rullende 12-måneders summer for at jævne sæsonudsving ud og give meningsfulde sammenligninger.
          </p>
        </section>

        <section className="mt-12 pt-10 border-t border-ink/10 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-3">
              Kilder
            </div>
            <p className="text-[14px] leading-[1.6] text-stone mb-3">
              Hovedtal og historik fra{" "}
              <a href={`https://www.statistikbanken.dk/${source.tableId}`} target="_blank" rel="noopener noreferrer" className="text-moss hover:underline">KONK3</a>.
              {" "}Brancheopdeling fra{" "}
              <a href="https://www.statistikbanken.dk/KONK4" target="_blank" rel="noopener noreferrer" className="text-moss hover:underline">KONK4</a>.
              {" "}Begge fra Danmarks Statistik, opdateres månedligt.
            </p>
          </div>
          <div>
            <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-3">
              Senest opdateret
            </div>
            <p className="text-[14px] leading-[1.6] text-stone">
              {latestSeasonal
                ? `Seneste datapunkt: ${humanizePeriod(latestSeasonal.period)}.`
                : "Ingen data tilgængelig endnu."}
            </p>
            {source.lastFetchedAt && (
              <p className="text-[14px] leading-[1.6] text-stone mt-2">
                Sidst hentet:{" "}
                {new Date(source.lastFetchedAt).toLocaleDateString("da-DK", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                .
              </p>
            )}
          </div>
        </section>

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

function NoDataView() {
  return (
    <div className="min-h-screen bg-parchment flex items-center justify-center px-5 py-12">
      <div className="text-center max-w-[480px]">
        <h1 className="font-fraunces font-light italic text-[48px] leading-[0.95] mb-6">
          Konkurspulsen er ved at samles.
        </h1>
        <p className="text-stone text-[15px] leading-[1.6]">
          Vi henter de seneste tal fra Danmarks Statistik. Kom tilbage om lidt.
        </p>
      </div>
    </div>
  );
}
