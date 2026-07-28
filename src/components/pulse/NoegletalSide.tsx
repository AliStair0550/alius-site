// ============================================================
// Sidestellet til de tre nøgletalssider
//
// Konjunktur, priser og renter, og energi er den samme side med
// forskellige serier. Ét stel frem for tre, fordi tre kopier af en
// side bliver tre forskellige sider så snart nogen retter den ene.
// ============================================================

import Link from "next/link";
import { NoegletalSektion } from "./Noegletal";
import {
  kildeOrganisationer,
  opremsning,
  type SerieInfo,
} from "@/lib/pulse-model";
import type { NoegletalResultat } from "@/lib/pulse-noegletal";

const MAANEDER = [
  "januar", "februar", "marts", "april", "maj", "juni",
  "juli", "august", "september", "oktober", "november", "december",
];

export type Afsnit = {
  titel: string;
  beskrivelse: string;
  data: NoegletalResultat;
};

export function NoegletalSide({
  etikét,
  overskrift,
  kursiv,
  indledning,
  afsnit,
  noteOmDaekning,
}: {
  etikét: string;
  overskrift: string;
  kursiv: string;
  indledning: string;
  afsnit: Afsnit[];
  /** Sæt når siden bevidst mangler noget. Tomt betyder intet at sige. */
  noteOmDaekning?: string;
}) {
  const alleSerier: SerieInfo[] = afsnit.flatMap((a) => a.data.tal.map((t) => t.serie));
  const kilder = opremsning(kildeOrganisationer(alleSerier));

  const hentet = afsnit
    .map((a) => a.data.hentet)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => b.getTime() - a.getTime())[0];

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
            href="/pulse"
            className="font-extralight text-sm tracking-[0.3em] uppercase text-ink no-underline hover:text-moss transition-colors"
          >
            &larr; Alius &#183; Pulse
          </Link>
          <div className="text-[11px] tracking-[0.2em] uppercase text-stone opacity-60">
            {etikét}
          </div>
        </header>

        <section className="py-4 md:py-10 mb-12 md:mb-16">
          <h1 className="font-fraunces font-light italic text-[clamp(42px,8vw,84px)] leading-[1] tracking-[-0.03em] mb-8 max-w-[900px]">
            {overskrift} <em>{kursiv}</em>
          </h1>
          <p className="text-[17px] md:text-[19px] leading-[1.55] text-ink/75 max-w-[660px]">
            {indledning}
          </p>
          {hentet && (
            <p className="text-stone text-[13px] leading-[1.6] mt-4 opacity-70">
              Tallene er hentet {hentet.getUTCDate()}.{" "}
              {MAANEDER[hentet.getUTCMonth()]} {hentet.getUTCFullYear()}. Vi
              tjekker for nye tal hver dag.
            </p>
          )}
        </section>

        {afsnit.map((a) => (
          <NoegletalSektion
            key={a.titel}
            titel={a.titel}
            beskrivelse={a.beskrivelse}
            data={a.data}
          />
        ))}

        <section className="mt-8 pt-10 border-t border-ink/10 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-16">
            <div className="text-[11px] tracking-[0.3em] uppercase text-moss">
              Sådan læses det
            </div>
            <div className="max-w-[640px]">
              <p className="text-[15px] leading-[1.6] text-ink/80 mb-4">
                Hvert kort viser det seneste tal, kurven over fem år og hvor
                længe udviklingen har holdt samme retning. Farven betyder
                usædvanlig, ikke dårlig: en høj rente er skidt for en låntager
                og god for en opsparer.
              </p>
              <p className="text-[15px] leading-[1.6] text-ink/80">
                Kurven er månedsværdier. Daglige serier som valuta og elpris
                midles inden for måneden, så en enkelt handelsdag ikke ligner en
                udvikling. Det store tal er derimod den seneste faktiske
                måling.
              </p>
              {noteOmDaekning && (
                <p className="text-[15px] leading-[1.6] text-ink/80 mt-4">
                  {noteOmDaekning}
                </p>
              )}
            </div>
          </div>
        </section>

        <footer className="mt-16 pt-8 border-t border-ink/10 text-[11px] text-stone opacity-50 tracking-[0.05em] leading-[1.6]">
          Alius Pulse er udviklet af Alius og bygger på åbne data fra {kilder}.
          Tal benyttes under licens CC 4.0 BY.
        </footer>
      </div>
    </div>
  );
}
