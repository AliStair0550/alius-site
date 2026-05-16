import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { humanizePeriod } from "@/lib/signals/types";
import { TillidsChart } from "@/components/pulse/TillidsChart";
import { PulseSignalCard } from "@/components/pulse/SignalCard";

export const metadata: Metadata = {
  title: "Forbrugerklimaet · Alius Pulse",
  description:
    "Forbrugertillid, detailomsætning og danskernes købelyst. Månedlige nøgletal fra Danmarks Statistik.",
};

export const revalidate = false;

const SUB_INDICATORS = [
  { code: "F2", label: "Familiens økonomi i dag", note: "vs. for et år siden" },
  { code: "F3", label: "Familiens økonomi om et år", note: "vs. i dag" },
  { code: "F4", label: "Danmarks økonomi i dag", note: "vs. for et år siden" },
  { code: "F5", label: "Danmarks økonomi om et år", note: "vs. i dag" },
  { code: "F9", label: "Køb af større forbrugsgoder", note: "fordelagtigt nu?" },
];

function signedFormat(v: number): string {
  const s = Math.abs(v).toFixed(1);
  return v >= 0 ? `+${s}` : `−${s}`;
}

export default async function ForbrugPage() {
  const [forv1Source, detaSource, pris01Source] = await Promise.all([
    prisma.dataSource.findUnique({ where: { slug: "dst-forv1" } }),
    prisma.dataSource.findUnique({ where: { slug: "dst-deta211a" } }),
    prisma.dataSource.findUnique({ where: { slug: "dst-pris01" } }),
  ]);

  const forv1Signals = forv1Source
    ? await prisma.signal.findMany({
        where: { sourceId: forv1Source.id },
        orderBy: { magnitude: "desc" },
        take: 20,
      })
    : [];

  const sevRank: Record<string, number> = { important: 2, note: 1, info: 0 };
  const sortedForv1Signals = forv1Signals
    .sort(
      (a, b) =>
        (sevRank[b.severity] ?? 0) - (sevRank[a.severity] ?? 0) ||
        (b.magnitude ?? 0) - (a.magnitude ?? 0)
    )
    .slice(0, 4);

  const [f1All, subLatest, retailAll, inflationAll] = await Promise.all([
    forv1Source
      ? prisma.dataPoint.findMany({
          where: { sourceId: forv1Source.id, areaCode: "F1", value: { not: null } },
          orderBy: { periodDate: "asc" },
          select: { period: true, value: true },
        })
      : [],
    forv1Source
      ? prisma.dataPoint.findMany({
          where: {
            sourceId: forv1Source.id,
            areaCode: { in: SUB_INDICATORS.map(s => s.code) },
            value: { not: null },
          },
          orderBy: { periodDate: "desc" },
          distinct: ["areaCode"],
          select: { areaCode: true, value: true, period: true },
        })
      : [],
    detaSource
      ? prisma.dataPoint.findMany({
          where: { sourceId: detaSource.id, areaCode: "G47", value: { not: null } },
          orderBy: { periodDate: "asc" },
          select: { period: true, value: true },
        })
      : [],
    pris01Source
      ? prisma.dataPoint.findMany({
          where: { sourceId: pris01Source.id, areaCode: "300", value: { not: null } },
          orderBy: { periodDate: "asc" },
          select: { period: true, value: true },
        })
      : [],
  ]);

  const f1Points = (f1All as { period: string; value: number | null }[])
    .filter((p): p is { period: string; value: number } => p.value !== null);

  const retailPoints = (retailAll as { period: string; value: number | null }[])
    .filter((p): p is { period: string; value: number } => p.value !== null);

  const inflationPoints = (inflationAll as { period: string; value: number | null }[])
    .filter((p): p is { period: string; value: number } => p.value !== null);

  const latestInflation = inflationPoints[inflationPoints.length - 1] ?? null;

  const subByCode = new Map(subLatest.map(r => [r.areaCode, r]));

  const latestF1 = f1Points[f1Points.length - 1] ?? null;
  const prevMonthF1 = f1Points[f1Points.length - 2] ?? null;

  // Direction vs previous month
  let direction: "up" | "down" | "stable" | null = null;
  if (latestF1 && prevMonthF1 && latestF1.value !== null && prevMonthF1.value !== null) {
    const diff = latestF1.value - prevMonthF1.value;
    direction = diff > 0.5 ? "up" : diff < -0.5 ? "down" : "stable";
  }

  // Year-ago F1 for context
  const latestRetail = retailPoints[retailPoints.length - 1] ?? null;

  // YoY retail: same month last year
  let retailYoY: number | null = null;
  if (latestRetail) {
    const m = latestRetail.period.match(/^(\d{4})M(\d{2})$/);
    if (m) {
      const yearAgoKey = `${parseInt(m[1]) - 1}M${m[2]}`;
      const yearAgo = retailPoints.find(p => p.period === yearAgoKey);
      if (yearAgo && yearAgo.value !== null && latestRetail.value !== null) {
        retailYoY = latestRetail.value - yearAgo.value;
      }
    }
  }

  const directionArrow = direction === "up" ? "↑" : direction === "down" ? "↓" : "→";
  const directionLabel =
    direction === "up" ? "Stigende" : direction === "down" ? "Faldende" : "Stabilt";
  const directionColor =
    direction === "up"
      ? "text-moss"
      : direction === "down"
      ? "text-[#8B3A3A]"
      : "text-stone";

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
            href="/pulse"
            className="font-extralight text-sm tracking-[0.3em] uppercase text-ink no-underline hover:text-moss transition-colors"
          >
            Alius &#183; Pulse
          </Link>
          <div className="text-[11px] tracking-[0.2em] uppercase text-stone opacity-60">
            Forbrug
          </div>
        </header>

        {/* Hero */}
        <section className="py-8 md:py-16 mb-12 md:mb-20">
          <div className="text-[11px] tracking-[0.4em] uppercase text-moss mb-8">
            Forbrugerklimaet
          </div>
          <h1 className="font-fraunces font-light italic text-[clamp(48px,8vw,100px)] leading-[0.95] tracking-[-0.03em] mb-8 max-w-[900px]">
            Danskernes <em>stemning</em>, i tal.
          </h1>
          <p className="text-[18px] leading-[1.6] text-stone max-w-[640px]">
            Forbrugertillid, detailomsætning og købelyst samlet månedligt. Et termometer for den danske økonomi nedenfra.
          </p>
        </section>

        {/* F1 headline metric */}
        {latestF1 ? (
          <section className="mb-16 md:mb-24 p-8 md:p-12 bg-fog/30 border border-ink/10">
            <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60 mb-8">
              Forbrugertillidsindikatoren · {humanizePeriod(latestF1.period)}
            </div>
            <div className="flex flex-wrap items-end gap-6 md:gap-10 mb-8">
              <div>
                <div className="font-fraunces font-light text-[clamp(64px,10vw,120px)] leading-none tabular-nums tracking-[-0.03em] text-ink">
                  {latestF1.value.toFixed(1)}
                </div>
                <div className="text-[12px] tracking-[0.1em] uppercase text-stone opacity-50 mt-2">
                  Nettotal
                </div>
              </div>
              {direction && (
                <div className={`mb-2 ${directionColor}`}>
                  <div className="text-[40px] leading-none">{directionArrow}</div>
                  <div className="text-[11px] tracking-[0.2em] uppercase mt-1">
                    {directionLabel}
                  </div>
                </div>
              )}
            </div>
            <p className="text-[13px] leading-[1.7] text-stone max-w-[580px]">
              Forbrugertillidsindikatoren er et nettotal: andel positive svar minus andel negative svar. En positiv værdi betyder at flere er optimistiske end pessimistiske — og omvendt.
            </p>
          </section>
        ) : (
          <section className="mb-16 p-8 bg-fog/20 text-stone opacity-60">
            Data hentes...
          </section>
        )}

        {/* F1 chart — full history */}
        {f1Points.length > 0 && (
          <section className="mb-20 md:mb-28">
            <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60 mb-6">
              Forbrugertillid over tid
            </div>
            <div className="text-ink/15 -mx-5 md:-mx-8 px-5 md:px-8">
              <TillidsChart points={f1Points} />
            </div>
          </section>
        )}

        {/* Sub-indicators grid */}
        {subLatest.length > 0 && (
          <section className="mb-20 md:mb-28">
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-16 mb-10">
              <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60">
                Del-indikatorer
              </div>
              <div>
                <h2 className="font-fraunces font-light text-[32px] md:text-[40px] leading-[1.1] tracking-[-0.01em] mb-3">
                  Hvad siger danskerne?
                </h2>
                <p className="text-stone text-[14px] leading-[1.6] max-w-[560px]">
                  Fem delvinkler fra den månedlige forbrugerundersøgelse. Alle er nettotaler.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {SUB_INDICATORS.map(ind => {
                const row = subByCode.get(ind.code);
                if (!row || row.value === null) return null;
                const positive = row.value > 0;
                return (
                  <div key={ind.code} className="p-5 bg-fog/30 border border-transparent">
                    <div className="text-[11px] tracking-[0.1em] uppercase text-stone opacity-50 mb-1">
                      {ind.note}
                    </div>
                    <div className="text-[14px] leading-[1.4] text-stone mb-4">
                      {ind.label}
                    </div>
                    <div
                      className={`font-fraunces font-light text-[32px] leading-none tabular-nums ${
                        positive ? "text-moss" : "text-[#8B3A3A]"
                      }`}
                    >
                      {signedFormat(row.value)}
                    </div>
                    <div className="text-[11px] tracking-[0.1em] text-stone opacity-40 mt-1">
                      {humanizePeriod(row.period)}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Inflation section */}
        {inflationPoints.length > 0 && (
          <section className="mb-20 md:mb-28">
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-16 mb-10">
              <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60">
                Inflation
              </div>
              <div>
                <h2 className="font-fraunces font-light text-[32px] md:text-[40px] leading-[1.1] tracking-[-0.01em] mb-3">
                  Hvad koster tingene?
                </h2>
                {latestInflation && (
                  <div className="flex flex-wrap items-end gap-6 mb-4">
                    <div>
                      <div
                        className={`font-fraunces font-light text-[56px] md:text-[72px] leading-none tabular-nums tracking-[-0.02em] ${
                          latestInflation.value > 3 ? "text-[#8B3A3A]" : latestInflation.value > 0 ? "text-ink" : "text-moss"
                        }`}
                      >
                        {latestInflation.value.toFixed(1)}%
                      </div>
                      <div className="text-[11px] tracking-[0.1em] uppercase text-stone opacity-50 mt-1">
                        Inflation · {humanizePeriod(latestInflation.period)}
                      </div>
                    </div>
                  </div>
                )}
                <p className="text-stone text-[13px] leading-[1.6] max-w-[560px]">
                  Ændring i forbrugerprisindekset sammenlignet med samme måned året før. Et mål for hvor hurtigt priserne stiger i Danmark.
                </p>
              </div>
            </div>
            <div className="text-ink/15">
              <TillidsChart points={inflationPoints} />
            </div>
          </section>
        )}

        {/* Retail section */}
        {retailPoints.length > 0 && (
          <section className="mb-20 md:mb-28">
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-16 mb-10">
              <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60">
                Detailhandel
              </div>
              <div>
                <h2 className="font-fraunces font-light text-[32px] md:text-[40px] leading-[1.1] tracking-[-0.01em] mb-3">
                  Danskernes faktiske køb.
                </h2>
                <div className="flex flex-wrap items-end gap-8 mb-4">
                  {latestRetail && (
                    <div>
                      <div className="font-fraunces font-light text-[56px] md:text-[72px] leading-none tabular-nums tracking-[-0.02em]">
                        {Math.round(latestRetail.value)}
                      </div>
                      <div className="text-[11px] tracking-[0.1em] uppercase text-stone opacity-50 mt-1">
                        Indeks · {humanizePeriod(latestRetail.period)}
                      </div>
                    </div>
                  )}
                  {retailYoY !== null && (
                    <div className={`mb-2 ${retailYoY >= 0 ? "text-moss" : "text-[#8B3A3A]"}`}>
                      <div className="font-fraunces font-light text-[32px] leading-none tabular-nums">
                        {signedFormat(retailYoY)}
                      </div>
                      <div className="text-[11px] tracking-[0.1em] uppercase mt-1 opacity-60">
                        vs. samme md. i fjor
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-stone text-[13px] leading-[1.6] max-w-[560px]">
                  Detailomsætningsindekset viser den samlede omsætning i dansk detailhandel. Basisår 100 = gennemsnit 2015.
                </p>
              </div>
            </div>
            <div className="text-ink/15">
              <TillidsChart points={retailPoints} />
            </div>
          </section>
        )}

        {/* FORV1 signal feed */}
        {sortedForv1Signals.length > 0 && (
          <section className="mb-20 md:mb-28">
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-16 mb-10">
              <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60">
                Signaler
              </div>
              <div>
                <h2 className="font-fraunces font-light text-[32px] md:text-[40px] leading-[1.1] tracking-[-0.01em] mb-3">
                  Hvad fortæller tallene?
                </h2>
                <p className="text-stone text-[14px] leading-[1.6] max-w-[560px]">
                  Automatisk beregnede mønstre i forbrugertillidsdata — streaks, vendepunkter, og årssammenligninger.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedForv1Signals.map((s) => (
                <PulseSignalCard
                  key={s.id}
                  headline={s.headline}
                  body={s.body}
                  direction={s.direction as "UP" | "DOWN" | "STABLE" | null}
                  severity={s.severity}
                  areaName={s.areaName}
                  areaCode={s.areaCode}
                  href={null}
                />
              ))}
            </div>
          </section>
        )}

        {/* Attribution */}
        <section className="mt-20 pt-10 border-t border-ink/10 mb-12">
          <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-3">
            Om dataene
          </div>
          <p className="text-[14px] leading-[1.6] text-stone max-w-[640px]">
            Forbrugertillid fra DST-tabel FORV1 (månedlig, siden 1974). Inflation fra PRIS01 (månedlig, siden 2001). Detailomsætning fra DETA211A (månedlig, siden 2015). Alle fra Danmarks Statistik under licens CC 4.0 BY.
          </p>
        </section>

        <footer className="mt-16 pt-8 border-t border-ink/10 text-[11px] text-stone opacity-50 tracking-[0.05em] leading-[1.6]">
          Alius Pulse er udviklet af Alius og bygger på åbne data fra Danmarks Statistik. Tal benyttes under licens CC 4.0 BY.
        </footer>
      </div>
    </div>
  );
}
