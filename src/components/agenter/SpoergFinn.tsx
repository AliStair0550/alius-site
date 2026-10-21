"use client";

// Spørg Finn. Sender spørgsmålet til /api/agenter/finn/spoerg og viser
// svaret, eller en ærlig besked om hvorfor der ikke er et.

import { useState } from "react";

type Svar = {
  status: "svaret" | "ikke_sporbar" | "budget" | "graense" | "kredit" | "fejl" | "ugyldig";
  tekst: string;
  kilder: { navn: string; url: string }[];
  tilbage: number;
};

const MAKS = 300;

export default function SpoergFinn({ forslag }: { forslag: string[] }) {
  const [tekst, setTekst] = useState("");
  const [venter, setVenter] = useState(false);
  const [svar, setSvar] = useState<Svar | null>(null);
  const [spurgt, setSpurgt] = useState("");

  async function send(spoergsmaal: string) {
    const s = spoergsmaal.trim();
    if (s.length < 3 || venter) return;
    setVenter(true);
    setSvar(null);
    setSpurgt(s);
    try {
      const res = await fetch("/api/agenter/finn/spoerg", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ spoergsmaal: s }),
      });
      setSvar((await res.json()) as Svar);
      setTekst("");
    } catch {
      setSvar({ status: "fejl", tekst: "Forbindelsen til Finn svigtede. Prøv igen om lidt.", kilder: [], tilbage: -1 });
    } finally {
      setVenter(false);
    }
  }

  const erSvar = svar?.status === "svaret";

  return (
    <section id="spoerg" className="mt-10 p-6 md:p-8 border border-moss bg-parchment scroll-mt-8" aria-labelledby="spoerg-titel">
      <div className="flex items-center gap-2 mb-2 font-[300] text-[0.66rem] tracking-[0.18em] uppercase text-moss">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-moss" />
        Spørg Finn
      </div>
      <h2 id="spoerg-titel" className="font-[300] text-[1.25rem] text-ink leading-[1.4] mb-2">
        Noget du vil vide om dagens tal?
      </h2>
      <p className="font-[200] text-[0.9rem] text-stone leading-[1.7] mb-5 max-w-[560px]">
        Finn svarer ud fra dagens brief og dagens kilder. Han giver ikke investeringsråd, og kan han ikke underbygge et
        svar, siger han det.
      </p>

      {forslag.length > 0 && !svar && !venter && (
        <ul className="list-none p-0 m-0 flex flex-wrap gap-2 mb-4">
          {forslag.map((f) => (
            <li key={f}>
              <button
                type="button"
                onClick={() => send(f)}
                className="text-left py-2 px-3 border border-fog font-[300] text-[0.8rem] text-stone hover:border-moss hover:text-ink transition-colors"
              >
                {f}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(tekst);
        }}
        className="flex flex-col gap-3"
      >
        <label htmlFor="spoerg-felt" className="sr-only">
          Dit spørgsmål til Finn
        </label>
        <textarea
          id="spoerg-felt"
          value={tekst}
          onChange={(e) => setTekst(e.target.value.slice(0, MAKS))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(tekst);
            }
          }}
          rows={2}
          placeholder="Hvad betyder den højere inflation for en lille virksomhed?"
          className="w-full p-3 border border-clay bg-parchment font-[300] text-[1rem] text-ink leading-[1.6] placeholder:text-stone/60 focus:outline-none focus:border-moss resize-none"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="font-[200] text-[0.72rem] text-stone tabular-nums">
            {tekst.length}/{MAKS}
            {svar && svar.tilbage >= 0 ? ` · ${svar.tilbage} spørgsmål tilbage i dag` : ""}
          </span>
          <button
            type="submit"
            disabled={venter || tekst.trim().length < 3}
            className="h-11 px-6 bg-ink text-parchment font-[300] text-[0.78rem] tracking-[0.08em] uppercase hover:bg-moss disabled:opacity-40 disabled:hover:bg-ink transition-colors"
          >
            {venter ? "Finn læser" : "Spørg"}
          </button>
        </div>
      </form>

      <div aria-live="polite">
        {venter && (
          <p className="mt-6 font-[300] text-[0.9rem] text-stone">
            Finn læser dagens tal<span className="inline-block w-6 animate-pulse">...</span>
          </p>
        )}
        {svar && !venter && (
          <div className="animate-fade-up mt-6 pt-6 border-t border-fog">
            <p className="font-[300] text-[0.78rem] text-stone mb-2">Du spurgte: {spurgt}</p>
            <p
              className={`font-[300] text-[1rem] leading-[1.75] ${
                erSvar ? "text-ink" : "py-3 px-4 border-l-2 border-clay bg-sand text-stone"
              }`}
            >
              {svar.tekst}
            </p>
            {svar.kilder.length > 0 && (
              <ul className="list-none p-0 m-0 mt-3 flex flex-col gap-1">
                {svar.kilder.map((k) => (
                  <li key={k.url + k.navn} className="font-[300] text-[0.72rem] text-stone">
                    Kilde:{" "}
                    <a href={k.url} rel="noopener" className="text-stone underline decoration-clay underline-offset-2 hover:text-moss">
                      {k.navn}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
