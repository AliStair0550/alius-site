import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/page-metadata";
import FinnRum from "@/components/agenter/FinnRum";
import OmraadeVisning from "@/components/agenter/OmraadeVisning";
import { hentBrief } from "@/lib/agenter/laes";
import { hentOmraadeTal, hentRegnskabskalender, hentRegnskabsoversigt } from "@/lib/agenter/omraade-data";
import { danskDag } from "@/lib/agenter/finn/pipeline";
import { OMRAADER, omraade } from "@/lib/agenter/finn/omraader";

// Områdesiderne. Kun de syv områder findes; alt andet er 404. Datoer
// under /agenter/finn/ omdirigeres til arkivet i next.config.ts, før de
// når hertil.

type Props = { params: Promise<{ omraade: string }> };

export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return OMRAADER.map((o) => ({ omraade: o.noegle }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const o = omraade((await params).omraade);
  if (!o) return {};
  return pageMetadata({
    title: `${o.navn} · Finn Finans · Agenter · Alius`,
    description: `${o.beskrivelse} Finns læsning af området og tallene de seneste fem år, hvert tal med kilde.`,
    path: `/agenter/finn/${o.noegle}`,
    image: "/agenter/finn/opengraph-image",
  });
}

export default async function OmraadeSide({ params }: Props) {
  const o = omraade((await params).omraade);
  if (!o) notFound();
  const erVirksomheder = o.noegle === "virksomheder";
  const [brief, tal, regnskaber, kalendere] = await Promise.all([
    hentBrief("finn", null),
    hentOmraadeTal(o.noegle),
    erVirksomheder ? hentRegnskabsoversigt() : Promise.resolve(undefined),
    // Nasdaq er udokumenteret; svarer den ikke, siger siden det i stedet for at fejle.
    erVirksomheder
      ? hentRegnskabskalender().catch((e: Error) => {
          console.error("Regnskabskalenderen:", e.message);
          return null;
        })
      : Promise.resolve(undefined),
  ]);
  return (
    <FinnRum undertitel={o.navn} tilbage={{ href: "/agenter/finn", tekst: "Finn" }}>
      <OmraadeVisning o={o} analyse={brief?.analyse ?? null} briefDato={brief?.dato ?? null} caveats={brief?.caveats ?? []} tal={tal} regnskaber={regnskaber} kalendere={kalendere} idag={danskDag(new Date())} />
    </FinnRum>
  );
}
