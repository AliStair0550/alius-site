import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-metadata";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { hentRangliste, MAX_KORT } from "@/lib/pulse-rangliste";
import { hentNoegletal } from "@/lib/pulse-noegletal";
import { kildeOgLicens, type SerieInfo } from "@/lib/pulse-model";
import {
  Statuslinje,
  Signalkort,
  Noegletalsgitter,
  Dashboardlinks,
  type Gitterraekke,
} from "@/components/pulse/Forside";

export const metadata: Metadata = pageMetadata({
  title: "Pulse · Alius",
  description:
    "Overblik over dansk økonomi: hvad der er usædvanligt lige nu, og hvor nøgletallene står. Tjekket for nye tal hver dag.",
  path: "/pulse",
});

// Det daglige hentejob kalder /api/revalidate/pulse når det har skrevet
// nye tal. Timen her er sikkerhedsnettet hvis kaldet ikke når frem.
export const revalidate = 3600;

/**
 * Scanningsfladen. Ti serier på tværs af lagene.
 *
 * Navnene er korte og redaktionelle. Seriernes egne navne er præcise og
 * for lange til et gitter: "Forbrugerforventninger:
 * Forbrugertillidsindikatoren" fylder to linjer og siger ikke mere end
 * "Forbrugertillid" gør i den sammenhæng.
 */
const GITTER: Array<{ id: string; navn: string; forklaring: string }> = [
  {
    id: "dst.konjunktur.tillid.samlet",
    navn: "Erhvervstillid",
    forklaring:
      "Hvor mange virksomheder der ser lyst på det, minus hvor mange der ser mørkt.",
  },
  {
    id: "dst.forbrug.forventning.f1",
    navn: "Forbrugertillid",
    forklaring:
      "Samme spørgsmål stillet til forbrugerne. Bevæger sig typisk før forbruget gør.",
  },
  {
    id: "dst.pris.forbruger.aarsaendring",
    navn: "Inflation",
    forklaring: "Hvor meget dyrere forbrugerpriserne er end for et år siden.",
  },
  {
    id: "dst.rente.realkredit.husholdning",
    navn: "Realkreditrente",
    forklaring:
      "Den rente husholdninger faktisk betaler på deres udestående lån, bidrag medregnet.",
  },
  {
    id: "dst.ledighed.sasonkorrigeret",
    navn: "Ledighed",
    forklaring:
      "Fuldtidsledige som andel af arbejdsstyrken, renset for de sæsonudsving der gentager sig hvert år.",
  },
  {
    id: "dst.konkurs.total",
    navn: "Konkurser",
    forklaring: "Erklærede konkurser om måneden, renset for sæson.",
  },
  {
    id: "eds.el.dk1",
    navn: "Elpris DK1",
    forklaring:
      "Døgngennemsnit på elmarkedet vest for Storebælt, sat dagen før levering.",
  },
  {
    id: "dst.valuta.effektiv",
    navn: "Kronekurs",
    forklaring:
      "Kronen vejet mod Danmarks handelspartnere. Et fald gør dansk eksport billigere.",
  },
  {
    id: "dst.byg.tilladt.bolig",
    navn: "Byggetilladelser",
    forklaring:
      "Etageareal der er givet tilladelse til. Byggeri der er besluttet, men ikke udført.",
  },
  {
    id: "dst.loen.privat",
    navn: "Løn, privat",
    forklaring: "Lønudviklingen i private virksomheder og organisationer.",
  },
];

const VEJE = [
  { navn: "Konjunktur", href: "/pulse/konjunktur" },
  { navn: "Priser og renter", href: "/pulse/priser" },
  { navn: "Energi", href: "/pulse/energi" },
  { navn: "Ledighed", href: "/pulse/ledighed" },
  { navn: "Konkurser", href: "/pulse/konkurser" },
  { navn: "Forbrug", href: "/pulse/forbrug" },
  { navn: "Kommuner", href: "/pulse/kommuner" },
];

/**
 * Ugens sætning, indtil fortolkningslaget kan levere den.
 *
 * En optælling, ikke en fortolkning. "Tre serier ligger usædvanligt
 * langt fra det normale" er talt og kan efterprøves mod kortene
 * nedenunder. "Renterne stiger, byggeriet bremser" er en påstand om
 * sammenhæng, og den må ikke stå her før nogen kan holde den.
 *
 * Pladsen er bygget. Sætningen kommer efter kalibreringen.
 */
function overskrift(antalKort: number, antalSerier: number): string {
  if (antalKort === 0) {
    return `Ingen af de ${antalSerier} serier ligger usædvanligt langt fra det normale lige nu.`;
  }
  if (antalKort === 1) {
    return "Én serie ligger usædvanligt langt fra det normale lige nu.";
  }
  const ord = ["", "én", "to", "tre", "fire", "fem"][antalKort] ?? String(antalKort);
  return `${ord[0].toUpperCase()}${ord.slice(1)} serier ligger usædvanligt langt fra det normale lige nu.`;
}

export default async function PulseHubPage() {
  const nu = new Date();

  const [rangliste, gitter] = await Promise.all([
    hentRangliste(prisma, nu),
    hentNoegletal(prisma, GITTER.map((g) => g.id), nu),
  ]);

  const kort = rangliste.kort.slice(0, MAX_KORT);
  const antalSerier = rangliste.kort.length + rangliste.rolige.length;

  const raekker: Gitterraekke[] = GITTER.map((g) => {
    const tal = gitter.tal.find((t) => t.serie.id === g.id);
    return tal ? { navn: g.navn, tal, forklaring: g.forklaring } : null;
  }).filter((r): r is Gitterraekke => r !== null);

  // Kilderne skrives ud fra det siden faktisk viser. Licensen nævnes
  // kun hvor vi kan dokumentere den; se pulse-model.ts.
  const serier: SerieInfo[] = [
    ...gitter.tal.map((t) => t.serie),
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
  ];

  return (
    <div className="min-h-screen bg-parchment text-ink font-sans font-light overflow-x-hidden">
      <div className="max-w-[1120px] mx-auto px-5 py-8 md:px-8 md:py-12">
        <header className="flex justify-between items-baseline gap-4 mb-10 md:mb-14">
          <Link
            href="/værktøjer"
            className="font-extralight text-sm tracking-[0.3em] uppercase text-ink no-underline hover:text-moss transition-colors"
          >
            &larr; Værktøjer
          </Link>
          <span className="text-[11px] tracking-[0.3em] uppercase text-moss">
            Alius Pulse
          </span>
        </header>

        <Statuslinje
          hentet={rangliste.hentet}
          nu={nu}
          overskrift={overskrift(kort.length, antalSerier)}
        />

        <Signalkort kort={kort} />

        <Noegletalsgitter raekker={raekker} />

        <Dashboardlinks veje={VEJE} />

        {/*
          Bunden er ét afsnit, ikke to.

          Den sorte blok og kildelinjen sad som to løsrevne kasser med
          luft imellem. Nu deler de ramme: den sorte bærer tilbuddet,
          den lyse under bærer kilderne, og de støder op til hinanden.
          Samme kant, samme bredde, ingen luft der får dem til at ligne
          to sider der er stødt sammen ved et uheld.
        */}
        <section className="mt-4">
          <div className="p-7 md:p-10 bg-forest text-parchment">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div className="max-w-[560px]">
                <h2 className="font-fraunces font-light text-[24px] md:text-[30px] leading-[1.2] mb-3">
                  Vil I have de her tal for{" "}
                  <em className="italic text-[#B8C9C1]">jeres marked?</em>
                </h2>
                <p className="opacity-65 text-[14px] leading-[1.65]">
                  Vi kombinerer offentlige data med jeres egne og leverer det
                  som rapport, dashboard eller månedlig indsigt.
                </p>
              </div>
              <a
                href="mailto:hej@alius.dk?subject=Data-arbejde for [firmanavn]"
                className="shrink-0 inline-flex items-center gap-3 bg-parchment text-ink px-8 py-4 text-[12px] font-normal tracking-[0.25em] uppercase no-underline hover:bg-[#4A7D68] hover:text-parchment transition-colors group"
              >
                Tag fat
                <span className="transition-transform group-hover:translate-x-1">
                  &rarr;
                </span>
              </a>
            </div>
          </div>

          <footer className="px-7 md:px-10 py-6 md:py-7 bg-fog/50">
            <div className="grid grid-cols-1 md:grid-cols-[110px_1fr] gap-2 md:gap-8">
              <span className="text-[10px] tracking-[0.3em] uppercase text-stone opacity-55">
                Kilder
              </span>
              <div className="text-[12px] text-stone leading-[1.7] max-w-[720px]">
                <p>{kildeOgLicens(serier)}</p>
                {gitter.udeladte.length > 0 && (
                  <p className="mt-2 opacity-70">
                    Ikke vist:{" "}
                    {gitter.udeladte
                      .map((u) => `${u.navn ?? u.seriesId} (${u.grund})`)
                      .join("; ")}
                  </p>
                )}
              </div>
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}
