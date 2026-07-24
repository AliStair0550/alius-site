import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  alternates: { canonical: "/værktøjer" },
  title: "Værktøjer · Alius",
  description:
    "Værktøjer udviklet af Alius. Gratis at bruge. Designet til at give indsigt og fungere som lead magneter til konsulentydelser.",
};

type SubLink = {
  name: string;
  href: string;
  status?: "live" | "coming";
  meta?: string;
};

type Vaerktoj = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  audience: string;
  href: string;
  accentLabel: string;
  subLinks?: SubLink[];
};

const VAERKTOEJER: Vaerktoj[] = [
  {
    slug: "pulse",
    name: "Pulse",
    tagline: "Danske data, fortolket til indsigt.",
    description:
      "Hver måned henter Pulse de seneste danske erhvervs- og samfundsdata fra åbne kilder og forvandler dem til signaler, kort og grafer. Ingen abonnement. Ingen login. Bare et levende billede af Danmark.",
    audience: "For ledere, journalister og virksomheder der vil følge med markedet.",
    href: "/pulse",
    accentLabel: "Data · Opdateres automatisk",
    subLinks: [
      { name: "Ledighed", href: "/pulse/ledighed", status: "live", meta: "kommune for kommune" },
      { name: "Konkurser", href: "/pulse/konkurser", status: "live", meta: "månedlig udvikling" },
      { name: "Forbrug", href: "#", status: "coming", meta: "kommer 2026" },
    ],
  },
  {
    slug: "tankeprofil",
    name: "Personlighedsprofil",
    tagline: "Hvordan tænker du, og dem du arbejder med?",
    description:
      "En personlighedsanalyse inspireret af Whole Brain Thinking. Tag testen alene eller med dit team. Få indsigt i jeres tænkestile og blinde vinkler.",
    audience: "For ledere, team og hold der vil forstå hinanden bedre.",
    href: "/tankeprofil",
    accentLabel: "Personlig · Gratis test",
  },
  {
    slug: "frihedstaenkere",
    name: "Frihedstænkere",
    tagline: "De tænkere der formede vores forståelse af frihed.",
    description:
      "Et kuratoreret univers af klassiske og moderne tænkere om frihed - politisk, okonomisk og filosofisk. Locke, Hayek, Mill, Rawls og flere. Alle tekster på dansk, skrevet til at tænke med.",
    audience: "For ledere, studerende og nysgerrige der vil forstå idéernes verden.",
    href: "/frihedstænkere",
    accentLabel: "Idéhistorie · 38 tænkere",
  },
  {
    slug: "prioritizer",
    name: "Prioriteringsværktøj",
    tagline: "Prioritér det der rent faktisk rykker.",
    description:
      "Scoringsmodel, effekt/indsats-matrix og prioriteret handlingsplan. Opret initiativer, scorer dem på effekt, indsats, strategi, risiko og tidshorisont, og få øjeblikkeligt overblik over hvad der skal gøres nu.",
    audience: "For ledelser, projektkontorer og konsulenter der vil prioritere strategisk frem for intuitivt.",
    href: "/prioritizer",
    accentLabel: "Strategi · Gratis",
  },
];

export default function VaerktoejerPage() {
  return (
    <div className="min-h-screen bg-parchment text-ink font-sans font-light overflow-x-hidden relative">
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(26,26,26,0.04) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="max-w-[1200px] mx-auto px-5 py-8 md:px-8 md:py-12 relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-baseline gap-4 pb-8 md:pb-12 border-b border-ink/10 mb-12 md:mb-16">
          <Link
            href="/"
            className="font-extralight text-sm tracking-[0.3em] uppercase text-ink no-underline hover:text-moss transition-colors"
          >
            &larr; Alius
          </Link>
          <div className="text-[11px] tracking-[0.2em] uppercase text-stone opacity-60">
            Værktøjer
          </div>
        </header>

        <section className="py-8 md:py-16 mb-16">
          <div className="text-[11px] tracking-[0.4em] uppercase text-moss mb-8">
            Værktøjer fra Alius
          </div>

          <h1 className="font-fraunces font-light italic text-[clamp(38px,8vw,110px)] leading-[0.95] tracking-[-0.03em] mb-8 max-w-[900px]">
            Bygget til at tænke med.
          </h1>

          <p className="text-[18px] leading-[1.6] text-stone max-w-[640px]">
            Vi udvikler værktøjer der styrker din forretning. Brug dem gratis.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-16 md:gap-24">
          {VAERKTOEJER.map((v) => (
            <article
              key={v.slug}
              className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-16 pb-12 md:pb-16 border-b border-ink/10 last:border-b-0"
            >
              <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60">
                {v.accentLabel}
              </div>
              <div>
                <h2 className="font-fraunces font-light text-[44px] md:text-[64px] leading-[1.05] tracking-[-0.02em] mb-4">
                  {v.name}
                </h2>
                <p className="font-fraunces font-light italic text-[22px] md:text-[28px] leading-[1.25] text-moss mb-6 max-w-[640px]">
                  {v.tagline}
                </p>
                <p className="text-[16px] leading-[1.6] text-ink/75 max-w-[600px] mb-3">
                  {v.description}
                </p>
                <p className="text-[13px] text-stone opacity-60 mb-8">
                  {v.audience}
                </p>

                {v.subLinks ? (
                  <SubLinkGrid links={v.subLinks} />
                ) : (
                  <Link
                    href={v.href}
                    className="inline-flex items-center gap-3 text-[13px] tracking-[0.2em] uppercase text-ink no-underline border-b border-ink pb-1 hover:text-moss hover:border-moss transition-colors group"
                  >
                    Åbn {v.name.toLowerCase()}
                    <span className="transition-transform group-hover:translate-x-1">
                      &rarr;
                    </span>
                  </Link>
                )}
              </div>
            </article>
          ))}
        </section>

        <section className="mt-24 p-10 md:p-16 bg-ink text-parchment">
          <div className="text-[11px] tracking-[0.3em] uppercase text-moss-light mb-4">
            For virksomheder
          </div>
          <h3 className="font-fraunces font-light text-[36px] md:text-[44px] leading-[1.1] mb-6">
            Skal vi bygge <em className="italic text-[#B8C9C1]">noget sammen?</em>
          </h3>
          <p className="opacity-70 max-w-[560px] mb-10 text-[16px] leading-[1.6]">
            Vores værktøjer er glimt af hvad vi laver til virksomheder hver dag. Strategi, brand og teknologi der hænger sammen.
          </p>
          <a
            href="mailto:hej@alius.dk"
            className="inline-flex items-center gap-4 bg-parchment text-ink px-9 py-[22px] text-[13px] font-normal tracking-[0.25em] uppercase no-underline hover:bg-[#4A7D68] hover:text-parchment transition-colors group"
          >
            Tag fat
            <span className="transition-transform group-hover:translate-x-1">
              &rarr;
            </span>
          </a>
        </section>

        <footer className="mt-24 pt-8 border-t border-ink/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="text-[11px] text-stone opacity-50 tracking-[0.05em]">
            Alius &middot; Vi bygger digitale maskiner.
          </div>
          <div className="flex gap-6">
            <a href="https://www.linkedin.com/in/alialfarhan/" target="_blank" rel="noopener noreferrer"
              className="text-[11px] text-stone opacity-50 tracking-[0.05em] hover:opacity-100 hover:text-moss transition-all no-underline">
              LinkedIn
            </a>
            <a href="mailto:hej@alius.dk"
              className="text-[11px] text-stone opacity-50 tracking-[0.05em] hover:opacity-100 hover:text-moss transition-all no-underline">
              hej@alius.dk
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}

function SubLinkGrid({ links }: { links: SubLink[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-[640px]">
      {links.map((link) => {
        if (link.status === "coming") {
          return (
            <div
              key={link.name}
              className="border border-ink/10 px-4 py-4 bg-fog/20"
            >
              <div className="text-[13px] tracking-[0.05em] text-stone/50 mb-1">
                {link.name}
              </div>
              <div className="text-[11px] tracking-[0.05em] uppercase text-stone/40">
                {link.meta}
              </div>
            </div>
          );
        }
        return (
          <Link
            key={link.name}
            href={link.href}
            className="border border-ink/15 px-4 py-4 bg-fog/40 hover:bg-fog/70 no-underline transition-colors group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px] tracking-[0.05em] text-ink">
                {link.name}
              </span>
              <span className="text-stone opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-[12px]">
                &rarr;
              </span>
            </div>
            {link.meta && (
              <div className="text-[11px] tracking-[0.05em] text-stone/70">
                {link.meta}
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
