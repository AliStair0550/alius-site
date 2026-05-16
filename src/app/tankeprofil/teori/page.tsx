import type { Metadata } from "next";
import Link from "next/link";
import { ARCHETYPES } from "@/components/tankeprofil/data";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Teorien bag · Personlighedsprofil · Alius",
  description:
    "Hvorfor fire måder at tænke på, og hvad det betyder for samarbejde. En kort introduktion til tænkningen bag Alius' Personlighedsprofil.",
  openGraph: {
    title: "Teorien bag · Personlighedsprofil · Alius",
    description:
      "Hvorfor fire måder at tænke på, og hvad det betyder for samarbejde.",
    type: "article",
    locale: "da_DK",
    siteName: "Alius",
  },
};

export default function TeoriPage() {
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

      <div className="max-w-[900px] mx-auto px-5 py-8 md:px-8 md:py-12 relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-baseline gap-4 pb-8 md:pb-16 border-b border-ink/10 mb-10 md:mb-20">
          <Link
            href="/tankeprofil"
            className="font-extralight text-sm tracking-[0.3em] uppercase text-ink no-underline hover:text-moss transition-colors"
          >
            &larr; Alius &#183; Tankeprofil
          </Link>
          <div className="font-extralight text-xs tracking-[0.2em] uppercase text-stone opacity-60">
            Teorien bag
          </div>
        </header>

        {/* Hero */}
        <section className="mb-24">
          <div className="text-[11px] tracking-[0.3em] uppercase text-moss font-normal mb-8">
            En kort introduktion
          </div>
          <h1 className="font-fraunces font-light text-[clamp(48px,7vw,104px)] leading-[0.95] tracking-[-0.02em] mb-10">
            Fire måder at <em className="italic text-moss">tænke</em> på.
          </h1>
          <p className="text-[21px] font-light leading-[1.5] text-stone max-w-[640px]">
            Vi siger ofte at folk er forskellige. Færre kan forklare hvordan. Tankeprofilen er et forsøg på at sætte sprog på de mønstre vi alle har, men sjældent ser hos os selv.
          </p>
        </section>

        {/* 01 - Oprindelsen */}
        <section className="py-16 border-t border-ink/10">
          <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-6 md:gap-16">
            <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60 pt-2">
              01 &#183; Oprindelsen
            </div>
            <div>
              <h2 className="font-fraunces font-light text-[36px] md:text-[44px] leading-[1.1] mb-8 tracking-[-0.01em]">
                Hjernen som fire rum.
              </h2>
              <p className="text-[17px] leading-[1.65] text-stone mb-5 max-w-[640px]">
                I 1970'erne arbejdede den amerikanske ingeniør Ned Herrmann med spørgsmålet: hvorfor er nogle mennesker tiltrukket af tal og struktur, mens andre er tiltrukket af mennesker og muligheder? Han forenede neurovidenskab og psykologi i en model med fire dominerende tænkemåder.
              </p>
              <p className="text-[17px] leading-[1.65] text-stone mb-5 max-w-[640px]">
                Senere udvidede den sydafrikanske forsker Kobus Neethling modellen til det vi kender som Whole Brain Thinking. Vi har taget den tænkning, oversat den til dansk virkelighed, og givet den vores eget sprog.
              </p>
              <p className="text-[17px] leading-[1.65] text-stone max-w-[640px]">
                Vi er ikke psykologer, og Personlighedsprofilen er ikke en diagnose. Det er et redskab til selvindsigt, og til at forstå dem du arbejder med.
              </p>
            </div>
          </div>
        </section>

        {/* 02 - De fire kvadranter */}
        <section className="py-16 border-t border-ink/10">
          <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-6 md:gap-16">
            <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60 pt-2">
              02 &#183; Kvadranterne
            </div>
            <div>
              <h2 className="font-fraunces font-light text-[36px] md:text-[44px] leading-[1.1] mb-8 tracking-[-0.01em]">
                Fire kvadranter, fire spørgsmål.
              </h2>
              <p className="text-[17px] leading-[1.65] text-stone mb-10 max-w-[640px]">
                Hver kvadrant svarer på et grundlæggende spørgsmål når noget skal afgøres. Vi har dem alle fire i os, men vi henter sjældent lige meget fra hver.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 mt-12">
                {(["A", "B", "C", "D"] as const).map((key) => {
                  const a = ARCHETYPES[key];
                  const question: Record<typeof key, string> = {
                    A: "Hvad er sandt?",
                    B: "Hvordan får vi det gjort?",
                    C: "Hvad betyder det for os?",
                    D: "Hvor kan det bevæge sig hen?",
                  };
                  return (
                    <div key={key} className="border-l-2 pl-6" style={{ borderColor: a.color }}>
                      <div
                        className="text-[10px] tracking-[0.3em] uppercase mb-3 font-normal"
                        style={{ color: a.color }}
                      >
                        Kvadrant {key} &#183; {a.short.split(",")[0]}
                      </div>
                      <h3 className="font-fraunces italic font-light text-[32px] leading-none mb-3 tracking-[-0.01em]">
                        {a.name}
                      </h3>
                      <p className="font-fraunces italic text-[18px] text-stone mb-4 font-light">
                        &ldquo;{question[key]}&rdquo;
                      </p>
                      <p className="text-[14px] leading-[1.55] text-stone opacity-90">
                        {a.short.charAt(0).toUpperCase() + a.short.slice(1)}.
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* 03 - Mørk sektion: hvorfor det betyder noget */}
        <section className="my-16 -mx-5 md:-mx-8 px-6 py-20 md:px-16 md:py-28 bg-ink text-parchment relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(249,247,242,0.06) 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="relative max-w-[760px]">
            <div className="text-[10px] tracking-[0.4em] uppercase opacity-50 mb-8">
              03 &#183; Hvorfor det betyder noget
            </div>
            <h2 className="font-fraunces font-extralight italic text-[clamp(34px,4.5vw,56px)] leading-[1.15] mb-10 tracking-[-0.01em]">
              De fleste konflikter handler ikke om uenighed.
              <br />
              De handler om at vi tænker forskelligt.
            </h2>
            <p className="text-[17px] leading-[1.7] opacity-80 mb-6">
              Når en Analytiker beder om data, og en Forbinder beder om at vente til folk er klar, er det ikke modstand. Det er to forskellige spørgsmål om det samme. Den ene spørger om det er rigtigt. Den anden spørger om vi er klar.
            </p>
            <p className="text-[17px] leading-[1.7] opacity-80 mb-6">
              Hold der ved det her, taler bedre sammen. De holder op med at antage at den andens måde at tænke på er en fejl. De begynder at se den som en ressource.
            </p>
            <p className="text-[17px] leading-[1.7] opacity-80">
              Et komplet team har alle fire kvadranter med. Et stærkt team ved hvem der bærer hvad.
            </p>
          </div>
        </section>

        {/* 04 - Brug det */}
        <section className="py-16 border-t border-ink/10">
          <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-6 md:gap-16">
            <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60 pt-2">
              04 &#183; I praksis
            </div>
            <div>
              <h2 className="font-fraunces font-light text-[36px] md:text-[44px] leading-[1.1] mb-8 tracking-[-0.01em]">
                Tre ting du kan gøre.
              </h2>

              <div className="space-y-8 mt-10">
                <div className="grid grid-cols-[60px_1fr] gap-6 items-baseline border-t border-ink/10 pt-6">
                  <span className="font-fraunces font-light text-2xl text-moss">01</span>
                  <div>
                    <div className="font-normal text-base mb-2">
                      Kend dit eget mønster.
                    </div>
                    <p className="text-[15px] leading-[1.6] text-stone">
                      Hvor henter du naturligt din energi, og hvor bruger du den hurtigere end den vokser tilbage? Det er forskellen mellem at vide hvad du er god til, og at vide hvad der koster dig.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-[60px_1fr] gap-6 items-baseline border-t border-ink/10 pt-6">
                  <span className="font-fraunces font-light text-2xl text-moss">02</span>
                  <div>
                    <div className="font-normal text-base mb-2">
                      Læs dine kolleger med nye briller.
                    </div>
                    <p className="text-[15px] leading-[1.6] text-stone">
                      Den kollega der altid stiller flere spørgsmål, før der bliver besluttet, er ikke besværlig. Hen henter fra en kvadrant du måske underprioriterer. Den indsigt ændrer hvordan I møder hinanden.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-[60px_1fr] gap-6 items-baseline border-t border-ink/10 pt-6">
                  <span className="font-fraunces font-light text-2xl text-moss">03</span>
                  <div>
                    <div className="font-normal text-base mb-2">
                      Sæt hold bevidst.
                    </div>
                    <p className="text-[15px] leading-[1.6] text-stone">
                      Et team af fire der ligner hinanden, har ét blindt felt. Et team af fire der dækker alle kvadranter, har til gengæld brug for nogen der kan oversætte. Det er den rolle vi ofte hjælper kunder med at finde og forme.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-16 p-10 md:p-16 bg-sand text-center">
          <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-4">
            Næste skridt
          </div>
          <h3 className="font-fraunces font-light text-[36px] md:text-[44px] leading-[1.1] mb-6 tracking-[-0.01em]">
            Find din egen <em className="italic text-moss">personlighedsprofil</em>.
          </h3>
          <p className="text-stone max-w-[480px] mx-auto mb-10 text-[16px] leading-[1.6]">
            Fire minutter, tre kort, ét billede af hvordan du naturligt tænker. Resultatet kommer med det samme.
          </p>
          <Link
            href="/tankeprofil"
            className="inline-flex items-center gap-4 bg-ink text-parchment px-9 py-[22px] text-[13px] font-normal tracking-[0.25em] uppercase cursor-pointer transition-all duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-moss hover:gap-6 no-underline group"
          >
            Start testen
            <span className="transition-transform duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1">
              &rarr;
            </span>
          </Link>
        </section>

        <footer className="mt-24 pt-8 border-t border-ink/10 text-[11px] text-stone opacity-50 tracking-[0.05em] leading-[1.6] max-w-[720px]">
          Personlighedsprofil er udviklet af Alius som et selvstændigt værktøj, inspireret af tænkningen bag Whole Brain Thinking, oprindeligt formuleret af Dr. Kobus Neethling (Neethling Brain Instruments) og bygget videre på Ned Herrmanns Brain Dominance-model. Ord, arketyper og fortolkninger er Alius&apos; egne. Vil du arbejde med den oprindelige metode, kan du kontakte Implement Consulting Group.
        </footer>
      </div>
    </div>
  );
}
