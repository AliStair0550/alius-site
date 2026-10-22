import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/page-metadata";
import FinnRum from "@/components/agenter/FinnRum";
import BriefVisning from "@/components/agenter/BriefVisning";
import { hentArkiv, hentBrief } from "@/lib/agenter/laes";
import { langDato } from "@/lib/agenter/dato";

type Props = { params: Promise<{ dato: string }> };

export const revalidate = 3600;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { dato } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dato)) return {};
  return pageMetadata({
    title: `Finn Finans, ${langDato(dato)} · Agenter · Alius`,
    description: `Finns brief om dansk økonomi den ${langDato(dato)}.`,
    path: `/agenter/finn/arkiv/${dato}`,
    image: "/agenter/finn/opengraph-image",
  });
}

export default async function FinnArkivSide({ params }: Props) {
  const { dato } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dato)) notFound();
  const [brief, arkiv] = await Promise.all([hentBrief("finn", dato), hentArkiv("finn")]);
  if (!brief) notFound();
  return (
    <FinnRum undertitel={`Arkiv, ${langDato(dato)}`}>
      <BriefVisning brief={brief} statuslinje={null} arkiv={arkiv} />
    </FinnRum>
  );
}
