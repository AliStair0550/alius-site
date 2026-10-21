import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-metadata";
import Ramme from "@/components/agenter/Ramme";
import BriefVisning from "@/components/agenter/BriefVisning";
import { hentArkiv, hentBrief, hentSenesteKoersel } from "@/lib/agenter/laes";
import { danskDag } from "@/lib/agenter/finn/pipeline";
import { danskTimeNu, dagensStatus } from "@/lib/agenter/dato";

export const metadata: Metadata = pageMetadata({
  title: "Finn Finans · Alius Agenter",
  description: "Dagens brief om dansk økonomi. Fem til syv punkter, hvert tal med kilde, skrevet hver morgen kl. 6.",
  path: "/agenter/finn",
});

export const revalidate = 3600;

export default async function FinnSide() {
  const [brief, seneste, arkiv] = await Promise.all([
    hentBrief("finn", null),
    hentSenesteKoersel("finn"),
    hentArkiv("finn"),
  ]);
  const status = dagensStatus(danskDag(new Date()), danskTimeNu(), brief, seneste);
  return (
    <Ramme etiket="Agenter">
      <BriefVisning brief={brief} statuslinje={status} arkiv={arkiv} kanSpoerge />
    </Ramme>
  );
}
