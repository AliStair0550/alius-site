import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-metadata";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { humanizePeriod } from "@/lib/signals/types";
import { hentRangliste } from "@/lib/pulse-rangliste";
import {
  hentSerieInfoFlere,
  hentNyestePeriode,
  datoTilPeriode,
  kildeOrganisationer,
  opremsning,
} from "@/lib/pulse-model";
import { RanglisteSektion } from "@/components/pulse/Rangliste";

export const metadata: Metadata = pageMetadata({
  title: "Pulse · Alius",
  description:
    "Et levende billede af Danmark gennem data. Ledighed, konkurser og mere, fortolket og tjekket for nye tal hver dag.",
  path: "/pulse",
});

// Det daglige hentejob kalder /api/revalidate/pulse når det har skrevet
// nye tal. Timen her er sikkerhedsnettet hvis kaldet ikke når frem.
export const revalidate = 3600;

type Dashboard = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  accentLabel: string;
  href: string;
  serieId: string | null;
  status: "live" | "coming";
};

const DASHBOARDS: Dashboard[] = [
  {
    slug: "ledighed",
    name: "Ledighed",
    tagline: "Hvor i landet, og hvor meget?",
    description:
      "Sæsonkorrigeret ledighed på landsplan og for alle 98 kommuner. Interaktivt kort, historik, og signaler om hvor det rykker.",
    accentLabel: "Arbejdsmarked",
    href: "/pulse/ledighed",
    serieId: "dst.ledighed.sasonkorrigeret",
    status: "live" as const,
  },
  {
    slug: "konkurser",
    name: "Konkurser",
    tagline: "Hvor sundt er erhvervslivet?",
    description:
      "Antal erklærede konkurser i danske virksomheder, måned for måned. Sæsonkorrigeret med historik over 5 år.",
    accentLabel: "Erhverv",
    href: "/pulse/konkurser",
    serieId: "dst.konkurs.total",
    status: "live" as const,
  },
  {
    slug: "kommuner",
    name: "Kommuner",
    tagline: "Hvad sker der i din kommune?",
    description:
      "Befolkning, indkomst, ledighed og boligværdi samlet for alle 98 kommuner. Sorterbart og klikbart, kommune for kommune.",
    accentLabel: "Profiler",
    href: "/pulse/kommuner",
    serieId: "dst.befolkning.antal",
    status: "live" as const,
  },
  {
    slug: "forbrug",
    name: "Forbrug",
    tagline: "Hvor varmt er forbrugerklimaet?",
    description:
      "Forbrugertillid, detailomsætning og købelyst: det danske forbrugsbillede måned for måned.",
    accentLabel: "Privatøkonomi",
    href: "/pulse/forbrug",
    serieId: "dst.forbrug.forventning.f1",
    status: "live" as const,
  },
];


export default async function PulseHubPage() {
  // Alt på siden læser series og observations. DataSource og DataPoint
  // røres ikke længere fra nogen side.
  const dashboardSerier = DASHBOARDS.map((d) => d.serieId).filter(
    (id): id is string => id !== null
  );

  const [serier, rangliste] = await Promise.all([
    hentSerieInfoFlere(prisma, dashboardSerier),
    hentRangliste(prisma),
  ]);

  // Nyeste periode per dashboard. Hentes fra observations, ikke fra
  // DataPoint, som ingen side læser længere.
  const nyeste = new Map<string, string>();
  await Promise.all(
    dashboardSerier.map(async (id) => {
      const s = serier.get(id);
      if (!s) return;
      const d = await hentNyestePeriode(prisma, id);
      if (d) nyeste.set(id, datoTilPeriode(d, s.frequency));
    })
  );

  const dashboardsWithFreshness = DASHBOARDS.map((d) => ({
    ...d,
    latestPeriod: d.serieId ? nyeste.get(d.serieId) ?? null : null,
    lastFetchedAt: d.serieId ? serier.get(d.serieId)?.hentet ?? null : null,
  }));

  // Kilderne skrives ud fra de serier siden faktisk viser, ikke fra en
  // fast tekst. Se byggebriefens afsnit 6.
  const organisationer = kildeOrganisationer([
    ...serier.values(),
    ...[...rangliste.kort, ...rangliste.rolige].map((k) => ({
      id: k.seriesId,
      nameDa: k.navn,
      unit: k.enhed,
      frequency: "MONTHLY" as const,
      attribution: k.attribution,
      source: k.kilde,
      sourceRef: k.kildeRef,
      hentet: k.hentet,
    })),
  ]);
  const kilder = opremsning(organisationer);

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
            href="/værktøjer"
            className="font-extralight text-sm tracking-[0.3em] uppercase text-ink no-underline hover:text-moss transition-colors"
          >
            &larr; Værktøjer
          </Link>
          <div className="text-[11px] tracking-[0.2em] uppercase text-stone opacity-60">
            Pulse
          </div>
        </header>

        {/* Hero */}
        <section className="py-8 md:py-16 mb-16 md:mb-20">
          <div className="text-[11px] tracking-[0.4em] uppercase text-moss mb-8">
            Alius Pulse
          </div>

          <h1 className="font-fraunces font-light italic text-[clamp(56px,10vw,120px)] leading-[0.95] tracking-[-0.03em] mb-10 max-w-[1000px]">
            Et levende billede af <em>Danmark</em>.
          </h1>

          <p className="text-[18px] md:text-[20px] leading-[1.55] text-ink/75 max-w-[680px]">
            Pulse henter de seneste tal fra {kilder}. Forvandler dem til signaler du kan handle på. Tjekker for nye tal hver dag.
          </p>
        </section>

        {/* Dashboards */}
        <section className="mt-20 mb-24">
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-16 mb-12">
            <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60">
              Dashboards
            </div>
            <div>
              <h2 className="font-fraunces font-light text-[36px] md:text-[44px] leading-[1.1] tracking-[-0.01em] mb-4">
                Vælg en vinkel.
              </h2>
              <p className="text-stone text-[15px] leading-[1.6] max-w-[640px]">
                Hvert dashboard fokuserer på ét aspekt af det danske samfund. Alle bygger på samme automatiske infrastruktur.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {dashboardsWithFreshness.map((d) => {
              if (d.status === "coming") {
                return (
                  <div
                    key={d.slug}
                    className="p-8 bg-fog/20 border border-ink/10"
                  >
                    <div className="text-[11px] tracking-[0.3em] uppercase text-stone/40 mb-6 font-normal">
                      {d.accentLabel}
                    </div>
                    <h3 className="font-fraunces font-light text-[28px] leading-[1.05] tracking-[-0.01em] mb-3 text-stone/60">
                      {d.name}
                    </h3>
                    <p className="font-fraunces font-light italic text-[16px] leading-[1.3] text-stone/50 mb-6">
                      {d.tagline}
                    </p>
                    <p className="text-[13px] leading-[1.6] text-stone/50 mb-8">
                      {d.description}
                    </p>
                    <div className="pt-6 border-t border-ink/10">
                      <span className="text-[11px] tracking-[0.2em] uppercase text-stone/40">
                        Kommer 2026
                      </span>
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={d.slug}
                  href={d.href}
                  className="block p-8 bg-fog/40 hover:bg-fog/70 transition-colors no-underline group"
                >
                  <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-6 font-normal">
                    {d.accentLabel}
                  </div>
                  <h3 className="font-fraunces font-light text-[28px] md:text-[32px] leading-[1.05] tracking-[-0.01em] mb-3 text-ink">
                    {d.name}
                  </h3>
                  <p className="font-fraunces font-light italic text-[16px] md:text-[18px] leading-[1.3] text-moss mb-6">
                    {d.tagline}
                  </p>
                  <p className="text-[13px] leading-[1.6] text-stone mb-8">
                    {d.description}
                  </p>
                  <div className="flex items-center justify-between pt-6 border-t border-ink/10">
                    <span className="text-[11px] tracking-[0.2em] uppercase text-stone opacity-60">
                      {d.latestPeriod
                        ? `Senest: ${humanizePeriod(d.latestPeriod)}`
                        : "Henter data…"}
                    </span>
                    <span className="text-[13px] tracking-[0.2em] uppercase text-ink group-hover:text-moss transition-colors">
                      Åbn &rarr;
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <RanglisteSektion data={rangliste} />

        {/* Openness note */}
        <section className="mt-20 pt-10 border-t border-ink/10 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-16">
            <div className="text-[11px] tracking-[0.3em] uppercase text-moss">
              Åbenhed
            </div>
            <div className="max-w-[640px]">
              <p className="text-[15px] leading-[1.6] text-ink/80 mb-4">
                Pulse er gratis at bruge. Vi krediterer altid kilden. Alle tal stammer fra offentlige datasæt hos {kilder} og benyttes under licens CC 4.0 BY.
              </p>
              <p className="text-[15px] leading-[1.6] text-ink/80">
                Har I brug for data tilpasset jeres marked, eller skal vi kombinere Pulse med jeres egne tal, så taler vi gerne.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-20 p-10 md:p-16 bg-ink text-parchment">
          <div className="text-[11px] tracking-[0.3em] uppercase text-moss-light mb-4">
            For virksomheder
          </div>
          <h3 className="font-fraunces font-light text-[36px] md:text-[44px] leading-[1.1] mb-6">
            Vil I have data <em className="italic text-[#B8C9C1]">tilpasset jeres marked?</em>
          </h3>
          <p className="opacity-70 max-w-[560px] mb-10 text-[16px] leading-[1.6]">
            Pulse er et glimt af hvad vi laver til virksomheder hver dag. Vi kombinerer offentlige data med jeres egne tal og leverer rapporter, dashboards eller månedlige indsigter tilpasset jer.
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
          Alius Pulse er udviklet af Alius og bygger på åbne data fra {kilder}. Tal benyttes under licens CC 4.0 BY.
        </footer>
      </div>
    </div>
  );
}
