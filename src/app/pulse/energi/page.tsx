import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-metadata";
import { prisma } from "@/lib/db";
import { hentNoegletal } from "@/lib/pulse-noegletal";
import { NoegletalSide } from "@/components/pulse/NoegletalSide";

export const metadata: Metadata = pageMetadata({
  title: "Energi · Alius Pulse",
  description:
    "Elprisen øst og vest for Storebælt, døgn for døgn siden 1999. Tjekket hver dag.",
  path: "/pulse/energi",
});

export const revalidate = 3600;

// DK1 er vest for Storebælt, DK2 øst. To prisområder, to markeder, og
// forskellen mellem dem er sin egen historie.
const ELPRIS = ["eds.el.dk1", "eds.el.dk2"];

export default async function EnergiPage() {
  const elpris = await hentNoegletal(prisma, ELPRIS);

  return (
    <NoegletalSide
      etikét="Energi"
      overskrift="Hvad koster"
      kursiv="strømmen?"
      indledning="Elprisen sættes på døgnmarkedet dagen før levering. Danmark er to prisområder, og de er ikke altid enige."
      afsnit={[
        {
          titel: "Elpris",
          beskrivelse:
            "Døgngennemsnit i kroner per MWh, vest og øst for Storebælt. Kurven er månedsgennemsnit, fordi et enkelt døgn kan svinge voldsomt uden at der er sket noget med prisniveauet. Det store tal er seneste hele døgn.",
          data: elpris,
        },
      ]}
      noteOmDaekning="Energi er den tyndeste af de tre sider. Vi har elprisen tilbage til 1999, men hverken gas, fjernvarme eller forbrug. Det er en afgrænsning, ikke en mangel vi har overset: de kilder er ikke bygget endnu."
    />
  );
}
