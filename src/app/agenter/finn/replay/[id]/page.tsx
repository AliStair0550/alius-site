import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import FinnRum from "@/components/agenter/FinnRum";
import Replay from "@/components/agenter/Replay";
import { hentTrace } from "@/lib/agenter/laes";
import { prisma } from "@/lib/db";
import { langDato } from "@/lib/agenter/dato";

type Props = { params: Promise<{ id: string }> };

export const revalidate = 86400;

// Replay er en side om hvordan en brief blev lavet, ikke en brief i
// sig selv. Den skal ikke stå i søgemaskiner ved siden af briefen.
export const metadata: Metadata = {
  title: "Sådan blev briefen lavet · Alius Agenter",
  robots: { index: false, follow: true },
};

export async function generateStaticParams() {
  return [];
}

export default async function ReplaySide({ params }: Props) {
  const { id } = await params;
  if (!/^[a-z0-9]{10,40}$/.test(id)) notFound();
  const [trin, brief] = await Promise.all([
    hentTrace(id),
    prisma.brief.findUnique({ where: { id }, select: { date: true } }),
  ]);
  if (!brief || trin.length === 0) notFound();
  const dato = brief.date.toISOString().slice(0, 10);

  return (
    <FinnRum undertitel={`Sådan blev briefen lavet, ${langDato(dato)}`}>
      <div className="animate-fade-up max-w-[680px] mb-10">
        <h1 className="font-[300] text-[1.6rem] md:text-[2rem] text-ink leading-[1.3] mb-3">Sådan blev briefen lavet</h1>
        <p className="font-[200] text-[0.95rem] text-slate leading-[1.75]">
          Finns arbejdslog fra {langDato(dato)}, afspillet trin for trin. Kilder lander, de fleste afvises med en grund, de
          overlevende rangeres, og briefen bygges op. Intet her hentes på ny.
        </p>
        <Link href={`/agenter/finn/${dato}`} className="inline-block mt-4 font-[300] text-[0.78rem] text-moss no-underline hover:opacity-70">
          &larr; Tilbage til briefen
        </Link>
      </div>
      <Replay trin={trin} />
    </FinnRum>
  );
}
