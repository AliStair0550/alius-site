import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Værktøjer · Alius",
  description:
    "Værktøjer udviklet af Alius. Gratis at bruge. Designet til at give indsigt og fungere som lead magneter til konsulentydelser.",
};

const VAERKTOEJER = [
  {
    slug: "tankeprofil",
    name: "Tankeprofil",
    tagline: "Hvordan tænker du, og dem du arbejder med?",
    description:
      "En personlighedsanalyse inspireret af Whole Brain Thinking. Tag testen alene eller med dit team. Få indsigt i jeres tænkestile og blinde vinkler.",
    audience: "For ledere, team og hold der vil forstå hinanden bedre.",
    href: "/tankeprofil",
    accentLabel: "Personlig",
  },
  {
    slug: "pulse",
    name: "Pulse",
    tagline: "Danske data, fortolket.",
    description:
      "Et opdateret billede af ledigheden i Danmark, kommune for kommune. Hver måned hentes nye tal fra Danmarks Statistik og forvandles til indsigt.",
    audience: "For virksomheder der vil følge med markedet.",
    href: "/pulse/ledighed",
    accentLabel: "Data",
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
        {/* Header */}
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

        {/* Hero */}
        <section className="py-8 md:py-16 mb-16">
          <div className="text-[11px] tracking-[0.4em] uppercase text-moss mb-8">
            Værktøjer fra Alius
          </div>

          <h1 className="font-fraunces font-light italic text-[clamp(56px,10vw,120px)] leading-[0.95] tracking-[-0.03em] mb-8 max-w-[900px]">
            Bygget til at <em>tænke med</em>.
          </h1>

          <p className="text-[18px] leading-[1.6] text-stone max-w-[640px]">
            Vi udvikler værktøjer der gør komplekse spørgsmål håndterbare.
            Alle er gratis, alle er bygget med samme æstetik som resten af Alius — og alle leder, hvis du vil, til en samtale med os.
          </p>
        </section>

        {/* List */}
        <section className="grid grid-cols-1 gap-12 md:gap-16">
          {VAERKTOEJER.map((v) => (
            <article
              key={v.slug}
              className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-16 pb-12 md:pb-16 border-b border-ink/10 last:border-b-0"
            >
              <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60">
                {v.accentLabel}
              </div>
              <div>
                <h2 className="font-fraunces font-light text-[36px] md:text-[44px] leading-[1.1] tracking-[-0.01em] mb-3">
                  {v.name}
                </h2>
                <p className="font-fraunces font-light italic text-[20px] md:text-[24px] leading-[1.3] text-moss mb-6">
                  {v.tagline}
                </p>
                <p className="text-[15px] leading-[1.6] text-stone max-w-[560px] mb-3">
                  {v.description}
                </p>
                <p className="text-[13px] text-stone opacity-60 mb-8">
                  {v.audience}
                </p>
                <Link
                  href={v.href}
                  className="inline-flex items-center gap-3 text-[13px] tracking-[0.2em] uppercase text-ink no-underline border-b border-ink pb-1 hover:text-moss hover:border-moss transition-colors group"
                >
                  Åbn {v.name.toLowerCase()}
                  <span className="transition-transform group-hover:translate-x-1">
                    &rarr;
                  </span>
                </Link>
              </div>
            </article>
          ))}
        </section>

        {/* CTA */}
        <section className="mt-24 p-10 md:p-16 bg-ink text-parchment">
          <div className="text-[11px] tracking-[0.3em] uppercase text-moss-light mb-4">
            For virksomheder
          </div>
          <h3 className="font-fraunces font-light text-[36px] md:text-[44px] leading-[1.1] mb-6">
            Skal vi bygge <em className="italic text-[#B8C9C1]">noget sammen?</em>
          </h3>
          <p className="opacity-70 max-w-[560px] mb-10 text-[16px] leading-[1.6]">
            Vores værktøjer er glimt af hvad vi laver til virksomheder hver dag — strategi, brand og teknologi der hænger sammen.
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

        <footer className="mt-24 pt-8 border-t border-ink/10 text-[11px] text-stone opacity-50 tracking-[0.05em] leading-[1.6]">
          Alius &middot; Strategi, brand og teknologi bygget som ét.
        </footer>
      </div>
    </div>
  );
}
