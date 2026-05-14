import type { Metadata } from "next";
import Link from "next/link";
import { TeamSessionForm } from "@/components/tankeprofil/TeamSessionForm";

export const metadata: Metadata = {
  title: "Hold · Personlighedsprofil · Alius",
  description:
    "Styrk samarbejdet og kommunikationen i dit hold med en fælles personlighedsprofil. Se hvor I tænker ens, og hvor I supplerer hinanden.",
};

export default function HoldPage() {
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

      <div className="max-w-[1100px] mx-auto px-5 py-8 md:px-8 md:py-12 relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-baseline gap-4 pb-8 md:pb-16 border-b border-ink/10 mb-10 md:mb-20">
          <Link
            href="/tankeprofil"
            className="font-extralight text-sm tracking-[0.3em] uppercase text-ink no-underline hover:text-moss transition-colors"
          >
            &larr; Alius &middot; Personlighedsprofil
          </Link>
          <div className="font-extralight text-xs tracking-[0.2em] uppercase text-stone opacity-60">
            For hold
          </div>
        </header>

        {/* Hero */}
        <section className="mb-20 md:mb-28">
          <div className="text-[11px] tracking-[0.3em] uppercase text-moss font-normal mb-8">
            Fælles profil
          </div>
          <h1 className="font-fraunces font-light text-[clamp(38px,6vw,88px)] leading-[0.95] tracking-[-0.02em] mb-10 max-w-[800px]">
            Forstå hinanden.<br />
            <em className="italic text-moss">Arbejd bedre sammen.</em>
          </h1>
          <p className="text-[19px] font-light leading-[1.55] text-stone max-w-[560px]">
            Alle på holdet tager testen og I får en fælles rapport der viser
            hvem I er som gruppe, hvor I trækker i samme retning, og
            hvad der mangler naturligt i rummet.
          </p>
        </section>

        {/* Hvad I får */}
        <section className="mb-20 border-t border-ink/10 pt-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            {[
              {
                n: "01",
                title: "Individuelle profiler",
                desc: "Alle tager testen på fem minutter og får sin egen profil med det samme.",
              },
              {
                n: "02",
                title: "Fælles rapport",
                desc: "Holdrapporten viser jeres samlede mønster: styrker, blinde felter, spændinger og hvem I er som gruppe.",
              },
              {
                n: "03",
                title: "Stærkere samarbejde",
                desc: "Brug rapporten til at forstå hinanden bedre, fordele ansvar klogere og have de samtaler der ellers ikke sker.",
              },
            ].map(({ n, title, desc }) => (
              <div key={n}>
                <div className="font-fraunces font-light text-2xl text-moss mb-4">{n}</div>
                <div className="font-normal text-base mb-2">{title}</div>
                <p className="text-[14px] leading-[1.6] text-stone">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Form */}
        <section className="border-t border-ink/10 pt-16 mb-24">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-12 md:gap-20">
            <div>
              <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-6">
                Kom i gang
              </div>
              <h2 className="font-fraunces font-light text-[36px] md:text-[44px] leading-[1.1] mb-6 tracking-[-0.01em]">
                Linket er klar med det samme.
              </h2>
              <p className="text-[16px] leading-[1.65] text-stone max-w-[400px]">
                Udfyld formularen og du får et deltagerlink du kan sende rundt til holdet. Ingen konto, ingen ventetid.
              </p>
            </div>
            <div>
              <TeamSessionForm />
            </div>
          </div>
        </section>

        <footer className="pt-8 border-t border-ink/10 text-[11px] text-stone opacity-50 tracking-[0.05em] leading-[1.6] max-w-[720px]">
          Personlighedsprofil er udviklet af Alius som et selvstændigt værktøj,
          inspireret af tænkningen bag Whole Brain Thinking, oprindeligt formuleret af
          Dr. Kobus Neethling (Neethling Brain Instruments). Ord, arketyper og fortolkninger
          er Alius&apos; egne.
        </footer>
      </div>
    </div>
  );
}
