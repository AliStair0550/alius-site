import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/page-metadata";
import Ramme from "@/components/agenter/Ramme";
import { AgentAvatar, Silhuet } from "@/components/agenter/Avatar";
import { hentAgenter, hentBrief, hentSenesteKoersel, type AgentKort } from "@/lib/agenter/laes";
import { danskDag } from "@/lib/agenter/finn/pipeline";
import { langDato } from "@/lib/agenter/dato";

export const metadata: Metadata = pageMetadata({
  title: "Alius Agenter",
  description: "Agenter der læser åbne kilder hver morgen og skriver det vigtigste kort. Finn Finans læser dansk økonomi.",
  path: "/agenter",
});

// Jobbet rydder cachen, når en brief er færdig. Timen er sikkerhedsnettet.
export const revalidate = 3600;

const PLADSER = 3;

async function Taeller({ agent }: { agent: AgentKort }) {
  const [seneste, brief] = await Promise.all([hentSenesteKoersel(agent.id), hentBrief(agent.id, null)]);
  const idag = danskDag(new Date());
  // Tallene er fra seneste FÆRDIGE brief. En senere kørsel der blev
  // stoppet eller fejlede, ændrer ikke hvad Finn læste til briefen.
  if (brief && brief.dato === idag && brief.sourcesRead !== null) {
    return <>Har læst {brief.sourcesRead} kilder i dag.</>;
  }
  if (seneste && seneste.dato === idag && seneste.status === "RUNNING") {
    return <>Læser dagens kilder lige nu.</>;
  }
  if (brief && brief.sourcesRead !== null) {
    return <>Læste {brief.sourcesRead} kilder {langDato(brief.dato)}.</>;
  }
  return <>Har ikke læst noget endnu.</>;
}

export default async function AgenterSide() {
  const agenter = (await hentAgenter()).filter((a) => a.status === "ACTIVE");
  const ledige = Math.max(0, PLADSER - agenter.length);

  return (
    <Ramme etiket="Agenter">
      <div className="animate-fade-up max-w-[620px]">
        <h1 className="font-[300] text-[1.8rem] md:text-[2.2rem] text-ink leading-[1.35] tracking-[0.01em] mb-5">
          Alius Agenter
        </h1>
        <p className="font-[200] text-[1.05rem] text-slate leading-[1.8] mb-14">
          Agenter der læser åbne kilder hver morgen og skriver det vigtigste kort. Hvert tal har en kilde. Én er i gang.
          To er på vej.
        </p>
      </div>

      <ul className="list-none p-0 m-0 grid grid-cols-1 sm:grid-cols-3 gap-5">
        {agenter.map((a, i) => (
          <li key={a.id} className="animate-fade-up" style={{ animationDelay: `${120 + i * 90}ms` }}>
            <Link
              href={`/agenter/${a.id}`}
              className="group flex flex-col h-full p-6 border border-moss no-underline hover:bg-moss/5 transition-colors"
            >
              <div className="mb-5 -ml-1 transition-transform duration-500 group-hover:-translate-y-0.5">
                <AgentAvatar noegle={a.avatar} size={96} />
              </div>
              <div className="font-[400] text-[0.95rem] text-ink mb-1">{a.name}</div>
              <div className="font-[200] text-[0.85rem] text-stone leading-[1.7] mb-2">{a.tagline}</div>
              <div className="font-[300] text-[0.78rem] text-stone leading-[1.6] mb-5">{a.notDoing}</div>
              <div className="mt-auto pt-4 border-t border-fog font-[300] text-[0.72rem] text-moss tracking-[0.02em]">
                <Taeller agent={a} />
              </div>
              <div className="font-[300] text-[0.72rem] tracking-[0.1em] uppercase text-moss mt-4 group-hover:opacity-70 transition-opacity">
                Læs dagens brief &rarr;
              </div>
            </Link>
          </li>
        ))}
        {Array.from({ length: ledige }, (_, i) => (
          <li
            key={`ledig-${i}`}
            className="animate-fade-up flex flex-col p-6 border border-dashed border-clay"
            style={{ animationDelay: `${120 + (agenter.length + i) * 90}ms` }}
            aria-label="Ledig plads, kommer snart"
          >
            <div className="mb-5 -ml-1">
              <Silhuet size={96} />
            </div>
            <div className="font-[300] text-[0.72rem] tracking-[0.15em] uppercase text-stone">Kommer snart</div>
          </li>
        ))}
      </ul>
    </Ramme>
  );
}
