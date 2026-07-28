import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-metadata";
import { prisma } from "@/lib/db";
import { hentNoegletal } from "@/lib/pulse-noegletal";
import { NoegletalSide } from "@/components/pulse/NoegletalSide";

export const metadata: Metadata = pageMetadata({
  title: "Priser og renter · Alius Pulse",
  description:
    "Inflation, producentpriser, løn, renter og kronekursen. Hvad varer og penge koster, tjekket hver dag.",
  path: "/pulse/priser",
});

export const revalidate = 3600;

const FORBRUGERPRISER = [
  "dst.pris.forbruger.aarsaendring",
  "dst.pris.forbruger.foedevarer",
  "dst.pris.forbruger.bolig",
  "dst.pris.forbruger.transport",
];

// Producentpriser og løn er de to sider af en margin: hvad man kan tage
// for varen, og hvad det koster at lave den.
const OMKOSTNINGER = ["dst.pris.producent.industri", "dst.loen.privat"];

const RENTER = [
  "dst.rente.erhverv.nye",
  "dst.rente.realkredit.erhverv",
  "dst.rente.realkredit.husholdning",
  "dst.rente.nationalbank.udlaan",
];

const VALUTA = [
  "dst.valuta.effektiv",
  "dst.valuta.usd",
  "dst.valuta.sek",
  "dst.valuta.nok",
  "dst.valuta.gbp",
];

export default async function PriserPage() {
  const [forbrugerpriser, omkostninger, renter, valuta] = await Promise.all([
    hentNoegletal(prisma, FORBRUGERPRISER),
    hentNoegletal(prisma, OMKOSTNINGER),
    hentNoegletal(prisma, RENTER),
    hentNoegletal(prisma, VALUTA),
  ]);

  return (
    <NoegletalSide
      etikét="Priser og renter"
      overskrift="Hvad koster"
      kursiv="varer og penge?"
      indledning="Inflationen på forsiden er ét tal. Fødevarer, bolig og transport bevæger sig sjældent ens, og det er som regel dér forskellen mærkes."
      afsnit={[
        {
          titel: "Forbrugerpriser",
          beskrivelse:
            "Årsændringen er det tal der citeres som inflationen. De tre grupper under den viser hvor den kommer fra. En samlet inflation på to procent kan dække over fødevarer der stiger fem og transport der falder tre.",
          data: forbrugerpriser,
        },
        {
          titel: "Omkostninger",
          beskrivelse:
            "Producentpriser er hvad industrien kan tage for varen. Lønindekset er en stor del af hvad det koster at lave den. Løber lønnen fra priserne, presses marginen.",
          data: omkostninger,
        },
        {
          titel: "Renter",
          beskrivelse:
            "Renter virksomheder og husholdninger faktisk betaler, ikke referencerenter. Nationalbankens udlånsrente står nederst som den pris alt det andet regnes ud fra.",
          data: renter,
        },
        {
          titel: "Kronen",
          beskrivelse:
            "Den effektive kronekurs vejer Danmarks handelspartnere sammen til ét tal og er det der betyder noget for konkurrenceevnen. De enkelte par under den er til dem der handler i netop den valuta.",
          data: valuta,
        },
      ]}
    />
  );
}
