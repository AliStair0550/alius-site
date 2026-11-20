import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-metadata";
import FinnRum from "@/components/agenter/FinnRum";
import BriefVisning from "@/components/agenter/BriefVisning";
import { hentArkiv, hentBrief, hentSenesteKoersel } from "@/lib/agenter/laes";
import { danskDag } from "@/lib/agenter/finn/pipeline";
import { danskTimeNu, dagensStatus, langDato } from "@/lib/agenter/dato";
import { finnPaaPause } from "@/lib/agenter/pause";

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: "Finn Finans · Agenter · Alius",
    description: finnPaaPause()
      ? "Finns analyser af dansk økonomi. Finn holder pause; arkivet og tallene står, hvert tal med kilde."
      : "Dagens brief om dansk økonomi. Fem til syv punkter, hvert tal med kilde, skrevet hver morgen kl. 6.",
    path: "/agenter/finn",
    image: "/agenter/finn/opengraph-image",
  });
}

export const revalidate = 3600;

export default async function FinnSide() {
  const [brief, seneste, arkiv] = await Promise.all([
    hentBrief("finn", null),
    hentSenesteKoersel("finn"),
    hentArkiv("finn"),
  ]);
  const pause = finnPaaPause();
  const status = dagensStatus(danskDag(new Date()), danskTimeNu(), brief, seneste, pause);
  return (
    <FinnRum undertitel={brief ? `Brief, ${langDato(brief.dato)}` : "Ingen brief endnu"}>
      <BriefVisning brief={brief} statuslinje={status} arkiv={arkiv} kanSpoerge={!pause} />
    </FinnRum>
  );
}
