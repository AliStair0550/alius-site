import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-metadata";
import { prisma } from "@/lib/db";
import { hentNoegletal } from "@/lib/pulse-noegletal";
import { NoegletalSide } from "@/components/pulse/NoegletalSide";

export const metadata: Metadata = pageMetadata({
  title: "Konjunktur · Alius Pulse",
  description:
    "Erhvervstillid, byggetilladelser, konkurser og stemningen i Tyskland og Sverige. Retningen i dansk økonomi, tjekket hver dag.",
  path: "/pulse/konjunktur",
});

export const revalidate = 3600;

// Rækkefølgen er redaktionel og sorteres ikke om. Stemningen først,
// fordi den vender før tallene gør, og det realiserede sidst, fordi
// det bekræfter frem for at varsle.
const STEMNING = [
  "dst.konjunktur.tillid.samlet",
  "dst.konjunktur.tillid.industri",
  "dst.konjunktur.tillid.byggeri",
  "dst.forbrug.forventning.f1",
];

const ORDREBOEGER = ["dst.byg.tilladt.bolig", "dst.byg.tilladt.erhverv"];

const REALISERET = ["dst.konkurs.total", "dst.distress.tvangsauktion"];

const UDLANDET = [
  "eurostat.de.tillid.industri",
  "eurostat.se.tillid.industri",
  "eurostat.eu27.tillid.industri",
];

export default async function KonjunkturPage() {
  const [stemning, ordreboeger, realiseret, udlandet] = await Promise.all([
    hentNoegletal(prisma, STEMNING),
    hentNoegletal(prisma, ORDREBOEGER),
    hentNoegletal(prisma, REALISERET),
    hentNoegletal(prisma, UDLANDET),
  ]);

  return (
    <NoegletalSide
      etikét="Konjunktur"
      overskrift="Hvor er økonomien"
      kursiv="på vej hen?"
      indledning="Stemningen vender før tallene gør. Her er de indikatorer der plejer at bevæge sig først, sammen med det der allerede er sket."
      afsnit={[
        {
          titel: "Stemningen",
          beskrivelse:
            "Tillidsindikatorer er nettotal og indeks: hvor mange der ser lyst på det, minus hvor mange der ser mørkt. De siger ikke hvor meget der bliver produceret, men hvad virksomheder og forbrugere venter sig.",
          data: stemning,
        },
        {
          titel: "Ordrebøgerne",
          beskrivelse:
            "Byggetilladelser er arbejde der er besluttet, men ikke udført. De ligger typisk et par kvartaler foran byggeriet selv.",
          data: ordreboeger,
        },
        {
          titel: "Det der allerede er sket",
          beskrivelse:
            "Konkurser og tvangsauktioner bekræfter frem for at varsle. De stiger når det er gået galt, ikke når det er ved at gå galt.",
          data: realiseret,
        },
        {
          titel: "Udlandet",
          beskrivelse:
            "Tysk og svensk erhvervstillid mod EU27. Ligger Tyskland under EU27, er faldet tysk og rammer danske eksportører til Tyskland. Følges de ad, er det europæisk.",
          data: udlandet,
        },
      ]}
      noteOmDaekning="Byggetilladelser fra BYGV88 har ikke haft nye tal fra Danmarks Statistik siden 13. maj 2026. Tabellen står som aktiv, så vi henter den fortsat hver dag."
    />
  );
}
