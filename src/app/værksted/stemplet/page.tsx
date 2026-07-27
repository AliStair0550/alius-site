import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/page-metadata";
import { getArticle } from "@/lib/vaerksted";
import { Kaffekort } from "@/components/vaerksted/Kaffekort";

const article = getArticle("stemplet")!;

export const metadata: Metadata = pageMetadata({
  title: `${article.title} | Alius`,
  description: article.excerpt,
  path: article.href,
  type: "article",
});

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: article.title,
  description: article.excerpt,
  datePublished: article.date,
  dateModified: article.date,
  inLanguage: "da-DK",
  image: "https://alius.dk/opengraph-image",
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": `https://alius.dk${article.href}`,
  },
  author: { "@type": "Organization", name: "Alius", url: "https://alius.dk" },
  publisher: {
    "@type": "Organization",
    name: "Alius",
    url: "https://alius.dk",
    logo: { "@type": "ImageObject", url: "https://alius.dk/og.png" },
  },
};

export default function StempletArticle() {
  return (
    <div className="min-h-screen bg-parchment text-ink font-sans font-light overflow-x-hidden relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(26,26,26,0.04) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="max-w-[1100px] mx-auto px-5 py-8 md:px-8 md:py-12 relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-baseline gap-4 pb-8 md:pb-16 border-b border-ink/10 mb-12 md:mb-16">
          <Link
            href="/værksted"
            className="font-extralight text-sm tracking-[0.3em] uppercase text-ink no-underline hover:text-moss transition-colors"
          >
            &larr; Værkstedet
          </Link>
          <div className="font-extralight text-xs tracking-[0.2em] uppercase text-stone opacity-60">
            {article.category} · {article.dateLabel}
          </div>
        </header>

        <article className="mx-auto max-w-[680px]">
          {/* Titel + manchet */}
          <div className="mb-14 md:mb-16">
            <h1 className="font-fraunces font-light text-[clamp(34px,5.5vw,64px)] leading-[1.04] tracking-[-0.02em] text-ink mb-8">
              Ingen downloader en app for en kop kaffe
            </h1>
            <p className="font-fraunces font-light italic text-[clamp(20px,3vw,28px)] leading-[1.4] text-stone">
              {article.excerpt}
            </p>
          </div>

          {/* Brødtekst */}
          <div className="space-y-6 text-[1.075rem] md:text-[1.15rem] leading-[1.8] text-stone font-[300]">
            <p>
              Stempelkortet er verdens mest udbredte loyalitetsprogram. Det
              virker, fordi det er dumt nemt. Det fejler, fordi det er pap.
              Kortet bliver glemt i den anden jakke, vasket i baglommen eller
              smidt ud med kvitteringen. Og med kortet ryger kundens grund til at
              vælge din butik frem for den ved siden af.
            </p>
            <p>
              Standardsvaret hedder en app. Men vær ærlig: ingen downloader en app
              for en kop kaffe. Og for en lille butik er en app ikke en løsning,
              den er en ny afdeling. Opdateringer, logins, supporthenvendelser,
              persondata. For meget for kunden. For meget for butikken.
            </p>
          </div>

          {/* Interaktivt stempelkort */}
          <div className="my-14 md:my-16">
            <Kaffekort />
          </div>

          <div className="space-y-6 text-[1.075rem] md:text-[1.15rem] leading-[1.8] text-stone font-[300]">
            <h2 className="font-fraunces font-light text-[clamp(26px,4vw,38px)] leading-[1.15] tracking-[-0.01em] text-ink pt-4">
              Eksperimentet
            </h2>
            <p>
              Så vi prøvede noget midt imellem. Et stempelkort, der bor i kundens
              Apple Wallet. Ingen app, intet login, ingen oprettelse. Kunden
              scanner en QR-kode ved disken én gang, og kortet ligger i lommen for
              altid, ved siden af boardingpas og betalingskort.
            </p>
            <p>
              Stemplingen tager ét sekund. Personalet scanner kundens kort,
              stemplet lander på skærmen med det samme, og når kortet er fuldt,
              siger telefonen selv til. Butikken får et overblik, den aldrig har
              haft med pap: hvor mange kort er i omløb, hvor tit bliver der
              stemplet, hvor mange belønninger bliver hentet.
            </p>

            <h2 className="font-fraunces font-light text-[clamp(26px,4vw,38px)] leading-[1.15] tracking-[-0.01em] text-ink pt-6">
              Hvad vi lærte undervejs
            </h2>
            <p>
              Det svære var ikke teknikken. Det svære var at fjerne ting. Hver
              gang vi slettede et trin i flowet, steg chancen for, at nogen
              faktisk ville bruge det. Vi droppede kundens login. Vi droppede
              selv-scanning som standard. Vi droppede alt, der lignede en app.
            </p>
            <p>
              Og så lærte vi at respektere pappet. Det gamle stempelkort satte
              barren: hvis den digitale udgave er sværere at bruge end pap, taber
              den. Det er en god og hård målestok at bygge efter.
            </p>

            <h2 className="font-fraunces font-light text-[clamp(26px,4vw,38px)] leading-[1.15] tracking-[-0.01em] text-ink pt-6">
              Hvorfor vi bygger sådan noget
            </h2>
            <p>
              Alius bygger skarpe maskiner målrettet den enkelte virksomhed. Men
              når det samme problem dukker op hos bageren, frisøren og
              kaffebaren, eksperimenterer vi med løsninger, der kan skaleres.
              Stemplet er sådan et eksperiment. Det er live nu, og de første
              butikker stempler allerede.
            </p>
            <p>
              Prøv det selv på{" "}
              <a
                href="https://stemplet.dk"
                target="_blank"
                rel="noopener noreferrer"
                className="text-moss border-b border-moss/30 hover:border-moss transition-colors"
              >
                stemplet.dk
              </a>
              . Der er flere eksperimenter på bordet.
            </p>
          </div>

          {/* Afslutning */}
          <div className="mt-16 pt-10 border-t border-ink/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <Link
              href="/værksted"
              className="inline-flex items-center gap-3 text-[11px] tracking-[0.2em] uppercase text-stone hover:text-moss transition-colors no-underline group"
            >
              <span className="transition-transform duration-300 group-hover:-translate-x-1">
                &larr;
              </span>
              Tilbage til Værkstedet
            </Link>
            <a
              href="mailto:hej@alius.dk?subject=Stemplet"
              className="inline-flex justify-center font-[300] text-[0.8rem] tracking-[0.12em] uppercase px-7 py-3.5 bg-moss text-parchment border border-moss hover:bg-moss-light hover:border-moss-light transition-colors no-underline"
            >
              Lad os tale sammen
            </a>
          </div>
        </article>

        <footer className="mt-24 pt-8 border-t border-ink/10 text-[11px] text-stone opacity-50 tracking-[0.05em] leading-[1.6] max-w-[720px]">
          Skrevet af Alius. Vi bygger digitale maskiner til danske virksomheder.
        </footer>
      </div>
    </div>
  );
}
