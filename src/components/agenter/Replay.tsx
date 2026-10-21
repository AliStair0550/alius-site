"use client";

// ============================================================
// Replay af en agents arbejdslog
//
// Læser kun den gemte trace. Ingen API-kald, ingen data hentet. Hvert
// trin i loggen er ét billede; tilstanden ved billede i er alt der er
// sket til og med trin i.
// ============================================================

import { useEffect, useMemo, useState } from "react";
import type { TraceTrin } from "@/lib/agenter/finn/pipeline";

const TEMPO = [1, 2, 4] as const;
const MS = 420;

function beskriv(t: TraceTrin): string {
  switch (t.type) {
    case "start":
      return "Finn begynder dagens kørsel.";
    case "kilde":
      return t.beslutning === "ok"
        ? `Læser ${t.kilde}: ${(t.data?.antal as number) ?? 0} poster.`
        : `${t.kilde} leverede ikke: ${t.beslutning}${t.grund ? `, ${t.grund}` : ""}.`;
    case "afvist":
      return `Afvist: ${t.grund}. ${t.titel ?? ""}`;
    case "rangeret":
      return `Beholdt, ${t.beslutning}: ${t.titel}`;
    case "skriver":
      return "Skriver briefen.";
    case "punkt":
      return `Punkt skrevet: ${t.titel}`;
    case "fjernet":
      return `Punkt fjernet: ${t.grund}.`;
    case "selvtjek":
      return "Selvtjek: hvert tal er sporet til sin kilde.";
    case "budget":
      return `Stoppet af budgetloftet. ${t.grund ?? ""}`;
    case "fejl":
      return `Kørslen fejlede: ${t.grund}`;
    case "slut":
      return "Briefen er færdig.";
    default:
      return "";
  }
}

export default function Replay({ trin }: { trin: TraceTrin[] }) {
  const sidste = trin.length - 1;
  const [i, setI] = useState(0);
  const [spiller, setSpiller] = useState(false);
  const [tempo, setTempo] = useState<(typeof TEMPO)[number]>(1);

  // Afspilning starter kun af sig selv, hvis brugeren ikke har bedt om
  // mindre bevægelse.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setSpiller(true), 600);
    return () => clearTimeout(t);
  }, []);

  // Afspilningen holder op af sig selv ved sidste trin.
  const korer = spiller && i < sidste;

  useEffect(() => {
    if (!korer) return;
    const t = setTimeout(() => setI((x) => Math.min(sidste, x + 1)), MS / tempo);
    return () => clearTimeout(t);
  }, [korer, i, sidste, tempo]);

  const tilstand = useMemo(() => {
    const vist = trin.slice(0, i + 1);
    const kilder = vist.filter((t) => t.type === "kilde");
    const afviste = vist.filter((t) => t.type === "afvist");
    const rangeret = vist.filter((t) => t.type === "rangeret");
    const punkter = vist.filter((t) => t.type === "punkt" || t.type === "fjernet");
    const laest = kilder.reduce((s, k) => s + ((k.data?.antal as number) ?? 0), 0);
    return { kilder, afviste, rangeret, punkter, laest };
  }, [trin, i]);

  const nu = trin[i];

  return (
    <div className="max-w-[760px]">
      {/* Tællere */}
      <dl className="grid grid-cols-3 gap-3 mb-6">
        {[
          ["Læst", tilstand.laest],
          ["Afvist", tilstand.afviste.length],
          ["Beholdt", tilstand.rangeret.length],
        ].map(([navn, tal]) => (
          <div key={navn} className="p-4 border border-fog">
            <dt className="font-[300] text-[0.62rem] tracking-[0.15em] uppercase text-slate mb-1">{navn}</dt>
            <dd className="m-0 font-[300] text-[1.5rem] text-ink tabular-nums">{tal}</dd>
          </div>
        ))}
      </dl>

      {/* Det der sker lige nu */}
      <p
        key={i}
        className="animate-fade-up min-h-[3.4rem] mb-6 py-3 px-4 border-l-2 border-moss bg-sand font-[300] text-[0.88rem] text-ink leading-[1.6]"
        aria-live="polite"
      >
        {nu ? beskriv(nu) : ""}
      </p>

      {/* Afspiller */}
      <div className="flex flex-wrap items-center gap-3 mb-10">
        <button
          type="button"
          onClick={() => setI((x) => Math.max(0, x - 1))}
          className="w-11 h-11 border border-clay text-ink hover:border-ink"
          aria-label="Et trin tilbage"
        >
          &lsaquo;
        </button>
        <button
          type="button"
          onClick={() => {
            if (i >= sidste) {
              setI(0);
              setSpiller(true);
            } else setSpiller(!korer);
          }}
          className="h-11 px-5 bg-ink text-parchment font-[300] text-[0.78rem] tracking-[0.08em] uppercase hover:bg-moss"
        >
          {korer ? "Pause" : i >= sidste ? "Afspil igen" : "Afspil"}
        </button>
        <button
          type="button"
          onClick={() => setI((x) => Math.min(sidste, x + 1))}
          className="w-11 h-11 border border-clay text-ink hover:border-ink"
          aria-label="Et trin frem"
        >
          &rsaquo;
        </button>
        <button
          type="button"
          onClick={() => setTempo((t) => TEMPO[(TEMPO.indexOf(t) + 1) % TEMPO.length])}
          className="h-11 px-3 border border-clay font-[300] text-[0.78rem] text-ink tabular-nums hover:border-ink"
          aria-label={`Tempo ${tempo} gange`}
        >
          {tempo}x
        </button>
        <label className="flex-1 min-w-[160px] flex items-center gap-3">
          <span className="sr-only">Spol</span>
          <input
            type="range"
            min={0}
            max={sidste}
            value={i}
            onChange={(e) => {
              setSpiller(false);
              setI(Number(e.target.value));
            }}
            className="w-full accent-moss"
          />
          <span className="font-[200] text-[0.72rem] text-slate tabular-nums whitespace-nowrap">
            {i + 1}/{trin.length}
          </span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-10">
        <section>
          <h2 className="font-[300] text-[0.68rem] tracking-[0.15em] uppercase text-slate mb-3">Kilder</h2>
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
            {tilstand.kilder.map((k, n) => (
              <li key={n} className="animate-fade-up flex justify-between gap-3 py-2 border-b border-fog">
                <span className="font-[300] text-[0.85rem] text-ink">{k.kilde}</span>
                <span className={`font-[200] text-[0.78rem] tabular-nums ${k.beslutning === "ok" ? "text-slate" : "text-moss"}`}>
                  {k.beslutning === "ok" ? `${(k.data?.antal as number) ?? 0} poster` : k.beslutning}
                </span>
              </li>
            ))}
          </ul>

          <h2 className="font-[300] text-[0.68rem] tracking-[0.15em] uppercase text-slate mt-8 mb-3">Afvist</h2>
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
            {tilstand.afviste.slice(-6).map((a) => (
              <li key={`${a.ts}-${a.postId ?? a.titel}`} className="animate-fade-up py-1">
                <div className="font-[200] text-[0.8rem] text-slate line-through decoration-clay leading-[1.5]">{a.titel ?? a.postId}</div>
                <div className="font-[300] text-[0.72rem] text-stone">Afvist: {a.grund}</div>
              </li>
            ))}
          </ul>
          {tilstand.afviste.length > 6 && (
            <p className="mt-2 font-[200] text-[0.72rem] text-slate">og {tilstand.afviste.length - 6} til</p>
          )}
        </section>

        <section>
          <h2 className="font-[300] text-[0.68rem] tracking-[0.15em] uppercase text-slate mb-3">Rangeret</h2>
          <ol className="list-none p-0 m-0 flex flex-col gap-2">
            {tilstand.rangeret.map((r) => (
              <li key={`${r.ts}-${r.postId}`} className="animate-fade-up flex gap-3 py-1">
                <span className="font-[300] text-[0.72rem] text-moss tabular-nums whitespace-nowrap pt-[2px]">
                  {(r.beslutning ?? "").replace("betydning ", "")}/10
                </span>
                <span className="font-[300] text-[0.82rem] text-ink leading-[1.5]">{r.titel}</span>
              </li>
            ))}
          </ol>

          <h2 className="font-[300] text-[0.68rem] tracking-[0.15em] uppercase text-slate mt-8 mb-3">Briefen</h2>
          <ol className="list-none p-0 m-0 flex flex-col gap-3">
            {tilstand.punkter.map((p) => (
              <li
                key={`${p.ts}-${p.titel}`}
                className={`animate-fade-up py-2 border-l-2 pl-3 ${p.type === "punkt" ? "border-moss" : "border-clay"}`}
              >
                <div className={`font-[300] text-[0.88rem] leading-[1.5] ${p.type === "punkt" ? "text-ink" : "text-slate line-through decoration-clay"}`}>
                  {p.titel}
                </div>
                {p.type === "fjernet" && <div className="font-[300] text-[0.72rem] text-stone mt-1">Fjernet: {p.grund}</div>}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
