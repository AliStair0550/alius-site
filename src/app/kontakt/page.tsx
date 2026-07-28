import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-metadata";
import Link from "next/link";
import AliusLogo from "@/components/AliusLogo";
import KontaktFormular from "@/components/KontaktFormular";

export const metadata: Metadata = pageMetadata({
  title: "Tag en snak · Alius",
  description:
    "Skriv til os om det I gerne vil have automatiseret. Vi svarer som regel samme dag.",
  path: "/kontakt",
});

export default function KontaktPage() {
  return (
    <div className="min-h-screen bg-parchment text-ink font-sans">
      <div className="max-w-[1100px] mx-auto px-6 md:px-8 py-8 md:py-12">
        <header className="flex justify-between items-center pb-10 md:pb-14 mb-12 md:mb-16 border-b border-fog">
          <Link href="/" aria-label="Alius, til forsiden">
            <AliusLogo width={80} />
          </Link>
          <span className="font-[300] text-[0.72rem] tracking-[0.15em] uppercase text-slate">
            Kontakt
          </span>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.1fr] gap-12 md:gap-20 items-start">
          <div className="animate-fade-up">
            <h1 className="font-[300] text-[1.8rem] md:text-[2.2rem] text-ink leading-[1.35] tracking-[0.01em] mb-5">
              Lad os tage en snak.
            </h1>
            <p className="font-[200] text-[1.05rem] text-slate leading-[1.8] max-w-[420px] mb-10">
              Fortæl hvad der tager tid hos jer. Vi svarer som regel samme dag,
              og den første samtale koster ingenting.
            </p>

            <dl className="border-t border-fog">
              <Linje etiket="Skriv" vaerdi="hej@alius.dk" href="mailto:hej@alius.dk" />
              <Linje
                etiket="Regn selv"
                vaerdi="Find jeres gevinster"
                href="/beregner"
              />
            </dl>
          </div>

          <div className="animate-fade-up delay-200">
            <KontaktFormular />
          </div>
        </div>

        <footer className="mt-24 pt-8 border-t border-fog font-[200] text-[0.7rem] text-stone tracking-[0.05em]">
          Alius &#183; Den anden vej til vækst
        </footer>
      </div>
    </div>
  );
}

function Linje({
  etiket,
  vaerdi,
  href,
}: {
  etiket: string;
  vaerdi: string;
  href: string;
}) {
  const klasse =
    "font-[300] text-[0.95rem] text-ink no-underline hover:text-moss transition-colors";
  // Interne sider gennem Link, mailto gennem <a>. Link kan ikke
  // håndtere mailto, og <a> til en side springer klient-navigationen
  // over.
  const intern = href.startsWith("/");
  return (
    <div className="flex justify-between items-baseline gap-4 py-4 border-b border-fog">
      <dt className="font-[300] text-[0.72rem] tracking-[0.12em] uppercase text-slate">
        {etiket}
      </dt>
      <dd className="m-0">
        {intern ? (
          <Link href={href} className={klasse}>
            {vaerdi}
          </Link>
        ) : (
          <a href={href} className={klasse}>
            {vaerdi}
          </a>
        )}
      </dd>
    </div>
  );
}
