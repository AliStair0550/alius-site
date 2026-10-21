"use client";

// Spørg Finn: øverst i Finns rum. Hver udveksling bliver stående i
// samtalen under feltet, så man kan spørge videre. Hver status fra
// serveren vises for sig, så "budgettet er brugt" aldrig ligner et svar.

import { useRef, useState } from "react";
import { FinnAvatar } from "@/components/agenter/Avatar";

type Svar = {
  status: "svaret" | "ikke_sporbar" | "budget" | "graense" | "kredit" | "fejl" | "ugyldig";
  tekst: string;
  kilder: { navn: string; url: string }[];
  tilbage: number;
};
type Udveksling = { spoergsmaal: string; svar: Svar | null };

const MAKS = 300;

export default function SpoergFinn({ forslag }: { forslag: string[] }) {
  const [tekst, setTekst] = useState("");
  const [samtale, setSamtale] = useState<Udveksling[]>([]);
  const [tilbage, setTilbage] = useState<number | null>(null);
  const feltRef = useRef<HTMLInputElement>(null);
  const venter = samtale.some((u) => u.svar === null);

  async function send(spoergsmaal: string) {
    const s = spoergsmaal.trim();
    if (s.length < 3 || venter) return;
    setTekst("");
    setSamtale((x) => [...x, { spoergsmaal: s, svar: null }]);
    let svar: Svar;
    try {
      const res = await fetch("/api/agenter/finn/spoerg", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ spoergsmaal: s }),
      });
      svar = (await res.json()) as Svar;
    } catch {
      svar = { status: "fejl", tekst: "Forbindelsen til Finn svigtede. Prøv igen om lidt.", kilder: [], tilbage: -1 };
    }
    if (svar.tilbage >= 0) setTilbage(svar.tilbage);
    setSamtale((x) => x.map((u, i) => (i === x.length - 1 ? { ...u, svar } : u)));
    feltRef.current?.focus();
  }

  return (
    <section aria-labelledby="spoerg-titel" className="rounded-[28px] bg-parchment border border-fog p-5 sm:p-7">
      <div className="flex items-center gap-3 mb-5">
        <FinnAvatar size={48} />
        <div>
          <h1 id="spoerg-titel" className="font-[300] text-[1.35rem] sm:text-[1.6rem] text-ink leading-[1.15] tracking-[-0.01em]">
            Spørg Finn om økonomien
          </h1>
          <p className="font-[300] text-[0.82rem] text-stone leading-[1.5]">
            Han svarer ud fra dagens tal og kilder. Ingen investeringsråd.
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(tekst);
        }}
        className="flex items-center gap-2 rounded-full border border-clay bg-sand/60 pl-5 pr-1.5 py-1.5 focus-within:border-moss transition-colors"
      >
        <label htmlFor="spoerg-felt" className="sr-only">
          Dit spørgsmål til Finn
        </label>
        <input
          id="spoerg-felt"
          ref={feltRef}
          value={tekst}
          onChange={(e) => setTekst(e.target.value.slice(0, MAKS))}
          placeholder="Hvad betyder inflationen for min virksomhed?"
          autoComplete="off"
          className="flex-1 min-w-0 bg-transparent py-2 font-[300] text-[1rem] text-ink placeholder:text-stone/70 focus:outline-none"
        />
        <button
          type="submit"
          disabled={venter || tekst.trim().length < 3}
          aria-label="Send spørgsmålet"
          className="shrink-0 w-10 h-10 rounded-full bg-moss text-parchment flex items-center justify-center active:scale-[0.94] transition-[transform,opacity] duration-100 disabled:opacity-30"
        >
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden>
            <path d="M10 15V5M10 5l-4.5 4.5M10 5l4.5 4.5" className="stroke-parchment" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>

      <div className="mt-2 px-2 flex justify-between font-[300] text-[0.7rem] text-stone tabular-nums">
        <span>{tilbage !== null ? `${tilbage} spørgsmål tilbage i dag` : "5 spørgsmål om dagen"}</span>
        <span>
          {tekst.length}/{MAKS}
        </span>
      </div>

      {samtale.length === 0 && forslag.length > 0 && (
        <ul className="list-none p-0 m-0 mt-4 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none]">
          {forslag.map((f) => (
            <li key={f} className="shrink-0">
              <button
                type="button"
                onClick={() => send(f)}
                className="py-2 px-3.5 rounded-full border border-fog bg-parchment font-[300] text-[0.8rem] text-stone whitespace-nowrap hover:border-moss hover:text-ink active:scale-[0.97] transition-[transform,border-color,color] duration-100"
              >
                {f}
              </button>
            </li>
          ))}
        </ul>
      )}

      {samtale.length > 0 && (
        <ol className="list-none p-0 m-0 mt-6 flex flex-col gap-5" aria-live="polite">
          {samtale.map((u, i) => (
            <li key={i} className="flex flex-col gap-2">
              <div className="self-end max-w-[85%] rounded-2xl rounded-br-md bg-sand px-4 py-2 font-[300] text-[0.9rem] text-ink">
                {u.spoergsmaal}
              </div>
              {u.svar === null ? (
                <p className="font-[300] text-[0.9rem] text-stone">
                  Finn læser dagens tal<span className="inline-block w-6 motion-safe:animate-pulse">...</span>
                </p>
              ) : (
                <div className="animate-fade-up max-w-[680px]">
                  <p
                    className={`font-[300] text-[0.98rem] leading-[1.7] ${
                      u.svar.status === "svaret" ? "text-ink" : "text-stone border-l-2 border-clay pl-3"
                    }`}
                  >
                    {u.svar.tekst}
                  </p>
                  {u.svar.kilder.length > 0 && (
                    <ul className="list-none p-0 m-0 mt-2 flex flex-wrap gap-1.5">
                      {u.svar.kilder.map((k) => (
                        <li key={k.url + k.navn}>
                          <a
                            href={k.url}
                            rel="noopener"
                            className="inline-block rounded-full border border-fog px-2.5 py-0.5 font-[300] text-[0.68rem] text-stone no-underline hover:border-moss hover:text-moss"
                          >
                            {k.navn}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
