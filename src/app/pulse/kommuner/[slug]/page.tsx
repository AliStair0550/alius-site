import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getKommuneBySlug, getAllKommuner } from "@/lib/areas";
import { humanizePeriod } from "@/lib/signals/types";
import { KommuneSparkline } from "@/components/pulse/KommuneSparkline";
import { IncomeBars } from "@/components/pulse/IncomeBars";
import {
  findSimilarKommuner,
  type KommuneMetrics,
} from "@/lib/similar-kommuner";

type Props = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const k = getKommuneBySlug(slug);
  if (!k) return { title: "Kommune ikke fundet · Alius Pulse" };
  return {
    title: `${k.name} · Kommuneprofil · Alius Pulse`,
    description: `Befolkning, disponibel indkomst og ledighed i ${k.name} kommune. Data fra Danmarks Statistik.`,
  };
}

export async function generateStaticParams() {
  return getAllKommuner().map((k) => ({ slug: k.slug }));
}

export default async function KommuneProfilPage({ params }: Props) {
  const { slug } = await params;
  const kommune = getKommuneBySlug(slug);
  if (!kommune) notFound();

  // Load all three sources in parallel
  const [aus08Source, folk1amSource, indkp101Source] = await Promise.all([
    prisma.dataSource.findUnique({ where: { slug: "dst-aus08" } }),
    prisma.dataSource.findUnique({ where: { slug: "dst-folk1am" } }),
    prisma.dataSource.findUnique({ where: { slug: "dst-indkp101" } }),
  ]);

  // Fetch datapoints per source in parallel
  const [unemploymentPoints, populationPoints, incomePoints] =
    await Promise.all([
      aus08Source
        ? prisma.dataPoint.findMany({
            where: {
              sourceId: aus08Source.id,
              areaCode: kommune.code,
              value: { not: null },
            },
            orderBy: { periodDate: "asc" },
            select: { period: true, periodDate: true, value: true },
          })
        : Promise.resolve([]),
      folk1amSource
        ? prisma.dataPoint.findMany({
            where: {
              sourceId: folk1amSource.id,
              areaCode: kommune.code,
              value: { not: null },
            },
            orderBy: { periodDate: "asc" },
            select: { period: true, periodDate: true, value: true },
          })
        : Promise.resolve([]),
      indkp101Source
        ? prisma.dataPoint.findMany({
            where: {
              sourceId: indkp101Source.id,
              areaCode: kommune.code,
              value: { not: null },
            },
            orderBy: { periodDate: "asc" },
            select: { period: true, periodDate: true, value: true },
          })
        : Promise.resolve([]),
    ]);

  const latestUnemp = unemploymentPoints[unemploymentPoints.length - 1] ?? null;
  const prevUnemp =
    unemploymentPoints.length >= 13
      ? unemploymentPoints[unemploymentPoints.length - 13]
      : null;

  const latestPop = populationPoints[populationPoints.length - 1] ?? null;
  const prevPop =
    populationPoints.length >= 13
      ? populationPoints[populationPoints.length - 13]
      : null;

  const latestIncome = incomePoints[incomePoints.length - 1] ?? null;
  const prevIncome =
    incomePoints.length >= 2
      ? incomePoints[incomePoints.length - 2]
      : null;

  // Population sparkline: last 24 months
  const popSparkPoints = populationPoints
    .slice(-24)
    .map((p) => ({ period: p.period, value: p.value! }));

  // Income last 10 years for bar chart
  const incomeRecent = incomePoints.slice(-10);
  const incomeBarPoints = incomeRecent.map((p) => ({
    year: p.periodDate.getUTCFullYear(),
    value: p.value!,
  }));

  // "Lignende kommuner" — euclidean distance across unemployment, income, population
  const allKommuner = getAllKommuner();
  let lignende: ReturnType<typeof findSimilarKommuner> = [];

  if (latestUnemp && aus08Source && folk1amSource && indkp101Source) {
    const [allUnemp, allPop, allIncome] = await Promise.all([
      prisma.dataPoint.findMany({
        where: {
          sourceId: aus08Source.id,
          areaType: "KOMMUNE",
          value: { not: null },
        },
        orderBy: { periodDate: "desc" },
        distinct: ["areaCode"],
        select: { areaCode: true, value: true },
      }),
      prisma.dataPoint.findMany({
        where: {
          sourceId: folk1amSource.id,
          areaType: "KOMMUNE",
          value: { not: null },
        },
        orderBy: { periodDate: "desc" },
        distinct: ["areaCode"],
        select: { areaCode: true, value: true },
      }),
      prisma.dataPoint.findMany({
        where: {
          sourceId: indkp101Source.id,
          areaType: "KOMMUNE",
          value: { not: null },
        },
        orderBy: { periodDate: "desc" },
        distinct: ["areaCode"],
        select: { areaCode: true, value: true },
      }),
    ]);

    const unempByCode = new Map(allUnemp.map((r) => [r.areaCode, r.value]));
    const popByCode = new Map(allPop.map((r) => [r.areaCode, r.value]));
    const incomeByCode = new Map(allIncome.map((r) => [r.areaCode, r.value]));

    const allMetrics: KommuneMetrics[] = allKommuner.map((k) => ({
      code: k.code,
      name: k.name,
      slug: k.slug,
      unemployment: unempByCode.get(k.code) ?? null,
      income: incomeByCode.get(k.code) ?? null,
      population: popByCode.get(k.code) ?? null,
    }));

    const target: KommuneMetrics = {
      code: kommune.code,
      name: kommune.name,
      slug: kommune.slug,
      unemployment: latestUnemp.value,
      income: latestIncome?.value ?? null,
      population: latestPop?.value ?? null,
    };

    lignende = findSimilarKommuner(target, allMetrics, 3);
  }

  const hasAnyData =
    latestUnemp || latestPop || latestIncome;

  if (!hasAnyData) notFound();

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
            href="/pulse/kommuner"
            className="font-extralight text-sm tracking-[0.3em] uppercase text-ink no-underline hover:text-moss transition-colors"
          >
            Alius &#183; Pulse &#183; Kommuner
          </Link>
          <div className="text-[11px] tracking-[0.2em] uppercase text-stone opacity-60">
            {kommune.name}
          </div>
        </header>

        {/* Hero */}
        <section className="py-8 md:py-16 mb-16">
          <div className="text-[11px] tracking-[0.4em] uppercase text-moss mb-8">
            Kommuneprofil
          </div>
          <h1 className="font-fraunces font-light italic text-[clamp(56px,10vw,120px)] leading-[0.95] tracking-[-0.03em] mb-12">
            {kommune.name}
          </h1>

          {/* Three key numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-[860px]">
            {latestPop && (
              <Stat
                label="Befolkning"
                value={Math.round(latestPop.value!).toLocaleString("da-DK")}
                period={humanizePeriod(latestPop.period)}
                delta={
                  prevPop?.value
                    ? Math.round(latestPop.value! - prevPop.value)
                    : null
                }
                deltaLabel="vs. for 12 mdr."
                deltaUnit=""
                deltaSign
              />
            )}
            {latestIncome && (
              <Stat
                label="Disponibel indkomst"
                value={`${Math.round(latestIncome.value! / 1000).toLocaleString("da-DK")} t.kr.`}
                period={latestIncome.period}
                delta={
                  prevIncome?.value
                    ? Math.round(latestIncome.value! - prevIncome.value!)
                    : null
                }
                deltaLabel="vs. året før"
                deltaUnit=" kr."
                deltaSign
              />
            )}
            {latestUnemp && (
              <Stat
                label="Ledighed"
                value={`${latestUnemp.value!.toFixed(1)}%`}
                period={humanizePeriod(latestUnemp.period)}
                delta={
                  prevUnemp?.value != null
                    ? latestUnemp.value! - prevUnemp.value
                    : null
                }
                deltaLabel="vs. for 12 mdr."
                deltaUnit=" pp"
                deltaSign
                deltaDecimals={1}
              />
            )}
          </div>
        </section>

        {/* Population trend */}
        {popSparkPoints.length >= 6 && (
          <section className="mb-20">
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-16 mb-8">
              <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60">
                Befolkning
              </div>
              <div>
                <h2 className="font-fraunces font-light text-[28px] md:text-[36px] leading-[1.1] tracking-[-0.01em] mb-2">
                  Befolkningsudvikling
                </h2>
                <p className="text-stone text-[14px] leading-[1.6] max-w-[500px]">
                  Samlet folketal den 1. i måneden, seneste {popSparkPoints.length} måneder.
                </p>
              </div>
            </div>
            <div className="bg-fog/40 p-6 md:p-8">
              <KommuneSparkline points={popSparkPoints} />
            </div>
          </section>
        )}

        {/* Income trend */}
        {incomeBarPoints.length >= 3 && (
          <section className="mb-20">
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-16 mb-8">
              <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60">
                Indkomst
              </div>
              <div>
                <h2 className="font-fraunces font-light text-[28px] md:text-[36px] leading-[1.1] tracking-[-0.01em] mb-2">
                  Disponibel indkomst
                </h2>
                <p className="text-stone text-[14px] leading-[1.6] max-w-[500px] mb-2">
                  Gennemsnitlig disponibel indkomst per person, alle aldre og køn.
                </p>
                <p className="text-stone/60 text-[13px] leading-[1.6] max-w-[500px]">
                  Disponibel indkomst er det beløb der er tilbage efter skat og overførsler. Det reelle rådighedsbeløb per person om året.
                </p>
              </div>
            </div>
            <div className="bg-fog/40 p-6 md:p-8">
              <IncomeBars points={incomeBarPoints} />
            </div>
          </section>
        )}

        {/* Unemployment link */}
        {latestUnemp && (
          <section className="mb-20">
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-16 mb-8">
              <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60">
                Ledighed
              </div>
              <div>
                <h2 className="font-fraunces font-light text-[28px] md:text-[36px] leading-[1.1] tracking-[-0.01em] mb-2">
                  Ledighedsudvikling
                </h2>
                <p className="text-stone text-[14px] leading-[1.6] max-w-[500px] mb-6">
                  Sæsonkorrigeret ledighed for {kommune.name}. Se fuld historik, kort og signaler.
                </p>
                <Link
                  href={`/pulse/ledighed/${kommune.slug}`}
                  className="inline-flex items-center gap-3 text-[13px] tracking-[0.2em] uppercase text-ink no-underline border-b border-ink pb-1 hover:text-moss hover:border-moss transition-colors group"
                >
                  Ledighed i {kommune.name}
                  <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Lignende kommuner */}
        {lignende.length > 0 && (
          <section className="mb-20">
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-16 mb-8">
              <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60">
                Sammenlign
              </div>
              <h2 className="font-fraunces font-light text-[28px] md:text-[36px] leading-[1.1] tracking-[-0.01em]">
                Lignende kommuner.
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {lignende.map((k) => (
                <Link
                  key={k.code}
                  href={`/pulse/kommuner/${k.slug}`}
                  className="block p-5 bg-fog/30 hover:bg-fog/60 transition-colors no-underline group border border-transparent hover:border-ink/10"
                >
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="font-fraunces font-light text-[18px] text-ink">
                      {k.name}
                    </span>
                    <span className="text-[11px] text-stone opacity-40 group-hover:opacity-70 transition-opacity">
                      &rarr;
                    </span>
                  </div>
                  {k.unemployment != null && (
                    <div className="mb-1.5">
                      <div className="text-[11px] tracking-[0.15em] uppercase text-stone opacity-50 mb-0.5">
                        Ledighed
                      </div>
                      <div className="font-fraunces font-light text-[20px] text-ink tabular-nums">
                        {k.unemployment.toFixed(1)}%
                      </div>
                    </div>
                  )}
                  {k.income != null && (
                    <div>
                      <div className="text-[11px] tracking-[0.15em] uppercase text-stone opacity-50 mb-0.5">
                        Indkomst
                      </div>
                      <div className="font-fraunces font-light text-[16px] text-ink tabular-nums">
                        {Math.round(k.income / 1000).toLocaleString("da-DK")} t.kr.
                      </div>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Sources */}
        <section className="mt-12 pt-10 border-t border-ink/10 mb-12">
          <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-3">
            Kilder
          </div>
          <p className="text-[14px] leading-[1.6] text-stone max-w-[640px]">
            Befolkningstal fra{" "}
            <a href="https://www.statistikbanken.dk/FOLK1AM" target="_blank" rel="noopener noreferrer" className="text-moss hover:underline">FOLK1AM</a>.
            {" "}Indkomsttal fra{" "}
            <a href="https://www.statistikbanken.dk/INDKP101" target="_blank" rel="noopener noreferrer" className="text-moss hover:underline">INDKP101</a>.
            {" "}Ledighedstal fra{" "}
            <a href="https://www.statistikbanken.dk/AUS08" target="_blank" rel="noopener noreferrer" className="text-moss hover:underline">AUS08</a>.
            {" "}Alle fra Danmarks Statistik under licens CC 4.0 BY.
          </p>
        </section>

        <footer className="mt-16 pt-8 border-t border-ink/10 text-[11px] text-stone opacity-50 tracking-[0.05em] leading-[1.6]">
          Alius Pulse er udviklet af Alius og bygger på åbne data fra Danmarks Statistik. Tal benyttes under licens CC 4.0 BY.
        </footer>
      </div>
    </div>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────

type StatProps = {
  label: string;
  value: string;
  period: string;
  delta: number | null;
  deltaLabel: string;
  deltaUnit: string;
  deltaSign?: boolean;
  deltaDecimals?: number;
};

function Stat({
  label,
  value,
  period,
  delta,
  deltaLabel,
  deltaUnit,
  deltaSign,
  deltaDecimals = 0,
}: StatProps) {
  const deltaFormatted =
    delta !== null
      ? delta.toLocaleString("da-DK", {
          minimumFractionDigits: deltaDecimals,
          maximumFractionDigits: deltaDecimals,
        })
      : null;
  const deltaStr =
    delta !== null
      ? `${deltaSign && delta > 0 ? "+" : ""}${deltaFormatted}${deltaUnit}`
      : null;

  const deltaPositive = delta !== null && delta > 0;
  const deltaNegative = delta !== null && delta < 0;

  return (
    <div>
      <div className="text-[11px] tracking-[0.2em] uppercase text-stone opacity-60 mb-2">
        {label}
      </div>
      <div className="font-fraunces font-light text-[36px] md:text-[44px] leading-[1] tracking-[-0.02em] text-ink mb-2">
        {value}
      </div>
      <div className="text-[11px] text-stone opacity-50">{period}</div>
      {deltaStr && (
        <div
          className={`text-[12px] mt-1 ${
            deltaPositive ? "text-[#B45309]" : deltaNegative ? "text-moss" : "text-stone"
          }`}
        >
          {deltaStr} {deltaLabel}
        </div>
      )}
    </div>
  );
}
