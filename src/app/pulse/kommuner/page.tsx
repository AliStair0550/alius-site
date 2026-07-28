import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-metadata";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { hentSerieInfoFlere, hentSenesteePerOmraade } from "@/lib/pulse-model";
import { getAllKommuner } from "@/lib/areas";
import { humanizePeriod } from "@/lib/signals/types";
import { KommunerList, type KommuneRow } from "@/components/pulse/KommunerList";

export const metadata: Metadata = pageMetadata({
  title: "Kommuneprofiler · Alius Pulse",
  description:
    "Befolkning, indkomst og ledighed for alle 98 danske kommuner. Data fra Danmarks Statistik opdateret månedligt.",
  path: "/pulse/kommuner",
});

// DST-data opdateres månedligt, og cron-jobbet kalder revalidatePath når nye
// tal lander. Derfor caches siden i stedet for at rendere ved hver forespørgsel.
const LEDIGHED = "dst.ledighed.sasonkorrigeret";
const BEFOLKNING = "dst.befolkning.antal";
const INDKOMST = "dst.indkomst.disponibel";
const BOLIGVAERDI = "dst.ejendom.markedsvaerdi.enfamiliehuse";

export const revalidate = 3600;

export default async function KommunerHubPage() {
  const kommuner = getAllKommuner();

  const serier = await hentSerieInfoFlere(prisma, [
    LEDIGHED,
    BEFOLKNING,
    INDKOMST,
    BOLIGVAERDI,
  ]);

  // En serie der mangler i basen er ikke en kolonne uden tal. Siden
  // skal ikke vise en tom kolonne som var den målt til ingenting.
  const manglende = [LEDIGHED, BEFOLKNING, INDKOMST, BOLIGVAERDI].filter(
    (id) => !serier.has(id)
  );
  if (manglende.length > 0) {
    throw new Error(
      `Kommuneoversigten mangler serierne [${manglende.join(", ")}] i basen. ` +
        `Kør migrate-to-series for dem frem for at vise tomme kolonner.`
    );
  }

  const [unemploymentByCode, populationByCode, incomeByCode, houseValueByCode] =
    await Promise.all([
      hentSenesteePerOmraade(prisma, LEDIGHED, serier.get(LEDIGHED)!.frequency),
      hentSenesteePerOmraade(prisma, BEFOLKNING, serier.get(BEFOLKNING)!.frequency),
      hentSenesteePerOmraade(prisma, INDKOMST, serier.get(INDKOMST)!.frequency),
      hentSenesteePerOmraade(prisma, BOLIGVAERDI, serier.get(BOLIGVAERDI)!.frequency),
    ]);

  const kommuneRows: KommuneRow[] = kommuner.map((k) => ({
    code: k.code,
    name: k.name,
    slug: k.slug,
    ledighed: unemploymentByCode.get(k.code)?.value ?? null,
    befolkning: populationByCode.get(k.code)?.value ?? null,
    indkomst: incomeByCode.get(k.code)?.value ?? null,
    boligvaerdi: houseValueByCode.get(k.code)?.value ?? null,
  }));

  // Nyeste ledighedsperiode blandt kommunerne. Bruges kun til teksten.
  const latestUnemploymentPeriod =
    [...unemploymentByCode.values()].sort(
      (a, b) => b.periodDate.getTime() - a.periodDate.getTime()
    )[0]?.period ?? null;

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
            Kommuner
          </div>
        </header>

        <section className="py-8 md:py-16 mb-16">
          <div className="text-[11px] tracking-[0.4em] uppercase text-moss mb-8">
            Kommuneprofiler
          </div>
          <h1 className="font-fraunces font-light italic text-[clamp(48px,8vw,100px)] leading-[0.95] tracking-[-0.03em] mb-8 max-w-[900px]">
            Din kommune, <em>i tal</em>.
          </h1>
          <p className="text-[18px] leading-[1.6] text-stone max-w-[640px]">
            Befolkning, indkomst og ledighed samlet for alle 98 kommuner. Klik på en kommune for at se dens profil.
          </p>
          {latestUnemploymentPeriod && (
            <p className="text-[13px] text-stone opacity-60 mt-4">
              Ledighedstal: {humanizePeriod(latestUnemploymentPeriod)}
            </p>
          )}
        </section>

        {/* Featured: Danmark */}
        <section className="mb-8">
          <Link
            href="/pulse/kommuner/danmark"
            className="block p-8 md:p-10 bg-ink text-parchment no-underline group hover:bg-ink/90 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] tracking-[0.3em] uppercase text-moss-light mb-6 font-normal">
                  Landsprofil
                </div>
                <h2 className="font-fraunces font-light italic text-[clamp(40px,7vw,80px)] leading-[0.9] tracking-[-0.03em] mb-6 text-parchment">
                  Danmark
                </h2>
                <p className="text-parchment/60 text-[14px] leading-[1.6] max-w-[480px]">
                  Danmarks samlede nøgletal: befolkning, disponibel indkomst og ledighed. Referencepunktet for alle 98 kommuneprofiler.
                </p>
              </div>
              <span className="text-parchment/40 group-hover:text-parchment/80 transition-colors text-[13px] tracking-[0.2em] uppercase mt-1">
                &rarr;
              </span>
            </div>
          </Link>
        </section>

        <section>
          <KommunerList rows={kommuneRows} />
        </section>

        <section className="mt-20 pt-10 border-t border-ink/10 mb-12">
          <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-3">
            Om profilerne
          </div>
          <p className="text-[14px] leading-[1.6] text-stone max-w-[640px]">
            Kommuneprofilerne samler data fra fire DST-tabeller: FOLK1AM (befolkning, månedlig), INDKP101 (disponibel indkomst, årlig), AUS08 (ledighed, månedlig) og EJDFOE1 (ejendomsværdi, årlig). Alle tal fra Danmarks Statistik under licens CC 4.0 BY.
          </p>
        </section>

        <footer className="mt-16 pt-8 border-t border-ink/10 text-[11px] text-stone opacity-50 tracking-[0.05em] leading-[1.6]">
          Alius Pulse er udviklet af Alius og bygger på åbne data fra Danmarks Statistik. Tal benyttes under licens CC 4.0 BY.
        </footer>
      </div>
    </div>
  );
}
