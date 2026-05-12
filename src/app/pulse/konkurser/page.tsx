import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { humanizePeriod } from "@/lib/signals/types";
import { PulseSignalCard } from "@/components/pulse/SignalCard";
import { KonkursHero } from "@/components/pulse/KonkursHero";
import { KonkursHistoryChart } from "@/components/pulse/KonkursHistoryChart";

export const metadata: Metadata = {
  title: "Konkurspuls · Alius Pulse",
  description:
    "Antallet af konkurser i danske virksomheder, måned for måned. Sæsonkorrigerede tal fra Danmarks Statistik, opdateret månedligt.",
};

export const dynamic = "force-dynamic";

type Direction = "UP" | "DOWN" | "STABLE";

function toDirection(s: string | null): Direction | null {
  if (s === "UP" || s === "DOWN" || s === "STABLE") return s;
  return null;
}

export default async function KonkursPulsPage() {
  const source = await prisma.dataSource.findUnique({
    where: { slug: "dst-konk3" },
  });

  if (!source) {
    return <NoDataView />;
  }

  const allDatapoints = await prisma.dataPoint.findMany({
    where: {
      sourceId: source.id,
      value: { not: null },
    },
    orderBy: { periodDate: "asc" },
    select: {
      period: true,
      periodDate: true,
      value: true,
      dimensions: true,
    },
  });

  // Filter to seasonally adjusted
  const seasonal = allDatapoints.filter((r) => {
    const dims = r.dimensions as Record<string, string> | null;
    if (!dims) return true;
    for (const [key, value] of Object.entries(dims)) {
      if (key.toUpperCase().includes("SAESON")) {
        const valUpper = value.toUpperCase();
        return valUpper.includes("SAESON") && !valUpper.includes("FAKTISK");
      }
    }
    return true;
  });

  // Get actual (non-seasonal) for history chart secondary line
  const actual = allDatapoints.filter((r) => {
    const dims = r.dimensions as Record<string, string> | null;
    if (!dims) return false;
    for (const [key, value] of Object.entries(dims)) {
      if (key.toUpperCase().includes("SAESON")) {
        const valUpper = value.toUpperCase();
        return valUpper.includes("FAKTISK") || !valUpper.includes("SAESON");
      }
    }
    return false;
  });

  const latestSeasonal = seasonal[seasonal.length - 1] ?? null;

  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

  const seasonalHistory = seasonal.filter((p) => p.periodDate >= fiveYearsAgo);
  const actualHistory = actual.filter((p) => p.periodDate >= fiveYearsAgo);

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
                  Antallet af erklærede konkurser pr. måned. Sort linje viser sæsonkorrigerede tal (sammenligningen mellem måneder), den lysere viser de faktiske tal.
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

        {/* Note about scope */}
        <section className="mt-20 pt-10 border-t border-ink/10 mb-12">
          <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-3">
            Note
          </div>
          <p className="text-[14px] leading-[1.6] text-stone max-w-[640px]">
            Tallene viser konkurser i aktive virksomheder — altså virksomheder med omsætning eller medarbejdere. Det er det måltal, der bedst beskriver erhvervslivets sundhed, og det medierne typisk rapporterer.
          </p>
          <p className="text-[14px] leading-[1.6] text-stone max-w-[640px] mt-3">
            Vi viser tal på landsplan i denne første version. Geografisk fordeling og branchefordeling kommer i en senere udvidelse.
          </p>
        </section>

        {/* Source */}
        <section className="mt-12 pt-10 border-t border-ink/10 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-3">
              Kilde
            </div>
            <p className="text-[14px] leading-[1.6] text-stone mb-3">
              Tallene er hentet fra Danmarks Statistik, tabel KONK3 (Erklærede konkurser efter nøgletal). Opdateres månedligt af DST omkring den første hverdag i hver måned.
            </p>
            <a
              href={`https://www.statistikbanken.dk/${source.tableId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[12px] tracking-[0.2em] uppercase text-moss hover:text-ink transition-colors"
            >
              Se kilde hos DST &rarr;
            </a>
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

        {/* CTA */}
        <section className="mt-16 p-10 md:p-16 bg-ink text-parchment">
          <div className="text-[11px] tracking-[0.3em] uppercase text-moss-light mb-4">
            For virksomheder
          </div>
          <h3 className="font-fraunces font-light text-[36px] md:text-[44px] leading-[1.1] mb-6">
            Vil I have data{" "}
            <em className="italic text-[#B8C9C1]">tilpasset jeres marked?</em>
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
