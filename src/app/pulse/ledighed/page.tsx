import type { Metadata } from "next";
import Link from "next/link";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { humanizePeriod } from "@/lib/signals/types";
import { getAllKommuner } from "@/lib/areas";
import { PulseSignalCard } from "@/components/pulse/SignalCard";
import { PulseHero } from "@/components/pulse/Hero";
import { NationalHistoryChart } from "@/components/pulse/NationalHistoryChart";
import { KommuneRankings } from "@/components/pulse/KommuneRankings";
import { KommunePicker } from "@/components/pulse/KommunePicker";
import { MapWithMobileFallback } from "@/components/pulse/MapWithMobileFallback";

export const metadata: Metadata = {
  alternates: { canonical: "/pulse/ledighed" },
  title: "Ledighedspuls · Alius Pulse",
  description:
    "Et opdateret billede af ledigheden i Danmark, kommune for kommune. Opdateres månedligt med data fra Danmarks Statistik.",
};

export const dynamic = "force-dynamic";

type Direction = "UP" | "DOWN" | "STABLE";

function toDirection(s: string | null): Direction | null {
  if (s === "UP" || s === "DOWN" || s === "STABLE") return s;
  return null;
}

async function loadGeoData() {
  const filePath = path.join(process.cwd(), "public", "data", "kommuner.geojson");
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default async function LedighedsPulsPage() {
  const source = await prisma.dataSource.findUnique({
    where: { slug: "dst-aus08" },
  });

  if (!source) {
    return <NoDataView />;
  }

  const latestNational = await prisma.dataPoint.findFirst({
    where: {
      sourceId: source.id,
      areaCode: "000",
      value: { not: null },
    },
    orderBy: { periodDate: "desc" },
  });

  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
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

  const latestPeriod = latestNational?.period;
  const allKommuner = latestPeriod
    ? await prisma.dataPoint.findMany({
        where: {
          sourceId: source.id,
          areaType: "KOMMUNE",
          period: latestPeriod,
          value: { not: null },
        },
        orderBy: { value: "desc" },
        select: { areaCode: true, areaName: true, value: true },
      })
    : [];

  const kommuneData = allKommuner.map((k) => ({
    areaCode: k.areaCode!,
    areaName: k.areaName!,
    value: k.value!,
  }));

  const topHighest = kommuneData.slice(0, 5);
  const topLowest = kommuneData.slice(-5).reverse();

  const geoData = await loadGeoData();

  const allSignals = await prisma.signal.findMany({
    where: { sourceId: source.id },
    orderBy: [{ severity: "desc" }, { magnitude: "desc" }],
  });

  const importantSignals = allSignals.filter((s) => s.severity === "important");
  const noteSignals = allSignals.filter((s) => s.severity === "note");
  const infoSignals = allSignals.filter((s) => s.severity === "info");

  const headlineSignal = importantSignals[0] ?? allSignals[0] ?? null;
  const otherSignals = [
    ...importantSignals.slice(1),
    ...noteSignals,
    ...infoSignals,
  ];

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
            href="/"
            className="font-extralight text-sm tracking-[0.3em] uppercase text-ink no-underline hover:text-moss transition-colors"
          >
            Alius &#183; Pulse
          </Link>
          <div className="text-[11px] tracking-[0.2em] uppercase text-stone opacity-60">
            Ledighed
          </div>
        </header>

        <PulseHero
          latestValue={latestNational?.value ?? null}
          latestPeriod={latestNational?.period ?? null}
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

        {/* Map */}
        {geoData && kommuneData.length > 0 && (
          <section className="mt-16 md:mt-20 mb-20">
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-16 mb-10">
              <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60">
                Geografi
              </div>
              <div>
                <h2 className="font-fraunces font-light text-[36px] md:text-[44px] leading-[1.1] tracking-[-0.01em] mb-4">
                  Hvor i landet?
                </h2>
                <p className="text-stone text-[15px] leading-[1.6] max-w-[640px]">
                  Danmark fordelt på kommuner. Mørkere farve betyder højere
                  ledighed. Hold musen henover for at se tal, klik for at åbne
                  kommunens detaljer.
                </p>
              </div>
            </div>
            <div className="bg-fog/30 p-4 md:p-8">
              <MapWithMobileFallback
                geoData={geoData}
                kommuneData={kommuneData}
                nationalValue={latestNational?.value ?? null}
              />
            </div>
          </section>
        )}

        {/* Kommune picker */}
        <section className="mb-20">
          <KommunePicker kommuner={getAllKommuner()} />
        </section>

        {/* National history chart */}
        {nationalHistory.length > 12 && (
          <section className="mb-20">
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-16 mb-10">
              <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60">
                Historik
              </div>
              <div>
                <h2 className="font-fraunces font-light text-[36px] md:text-[44px] leading-[1.1] tracking-[-0.01em] mb-4">
                  Hvor er vi i forhold til de sidste 5 år?
                </h2>
                <p className="text-stone text-[15px] leading-[1.6] max-w-[640px]">
                  Den sæsonkorrigerede ledighed på landsplan, måned for måned.
                  Det sorte punkt markerer den aktuelle måling.
                </p>
              </div>
            </div>
            <div className="bg-fog/40 p-4 md:p-8">
              <NationalHistoryChart
                points={nationalHistory.map((p) => ({
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

        {/* Kommune rankings */}
        {topHighest.length > 0 && (
          <section className="mb-20">
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-16 mb-10">
              <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60">
                Kommuner
              </div>
              <div>
                <h2 className="font-fraunces font-light text-[36px] md:text-[44px] leading-[1.1] tracking-[-0.01em] mb-4">
                  Top og bund.
                </h2>
                <p className="text-stone text-[15px] leading-[1.6] max-w-[640px]">
                  De fem kommuner med højest og lavest ledighed i{" "}
                  {latestNational
                    ? humanizePeriod(latestNational.period)
                    : "seneste måned"}
                  . Klik for at se kommunens udvikling.
                </p>
              </div>
            </div>
            <KommuneRankings
              highest={topHighest}
              lowest={topLowest}
              nationalValue={latestNational?.value ?? null}
            />
          </section>
        )}

        {/* Source */}
        <section className="mt-20 pt-10 border-t border-ink/10 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-3">
              Kilde
            </div>
            <p className="text-[14px] leading-[1.6] text-stone mb-3">
              Tallene er hentet fra Danmarks Statistik, tabel AUS08
              (Fuldtidsledige sæsonkorrigeret). Kortet bygger på åbne
              kommunegrænser. Begge opdateres månedligt.
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
              {latestNational
                ? `Seneste datapunkt: ${humanizePeriod(latestNational.period)}.`
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
            Vi laver custom data-analyser for virksomheder der vil forstå deres
            marked dybere. Kombinerer offentlige data med jeres egne tal, og
            leverer rapporter, dashboards eller månedlige indsigter.
          </p>
          <a
            href="mailto:hej@alius.dk?subject=Data-arbejde for [firmanavn]"
            className="inline-flex items-center gap-4 bg-parchment text-ink px-9 py-[22px] text-[13px] font-normal tracking-[0.25em] uppercase no-underline hover:bg-[#4A7D68] hover:text-parchment transition-colors group"
          >
            Tag fat
            <span className="transition-transform group-hover:translate-x-1">
              &rarr;
            </span>
          </a>
        </section>

        <footer className="mt-24 pt-8 border-t border-ink/10 text-[11px] text-stone opacity-50 tracking-[0.05em] leading-[1.6]">
          Alius Pulse er udviklet af Alius og bygger på åbne data fra Danmarks
          Statistik. Tal benyttes under licens CC 4.0 BY. Kommunegrænser fra{" "}
          <a
            href="https://github.com/magnuslarsen/geoJSON-Danish-municipalities"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-ink"
          >
            Geodatastyrelsen via GeoJSON
          </a>
          .
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
          Pulse er ved at samles.
        </h1>
        <p className="text-stone text-[15px] leading-[1.6]">
          Vi henter de seneste tal fra Danmarks Statistik. Kom tilbage om lidt.
        </p>
      </div>
    </div>
  );
}
