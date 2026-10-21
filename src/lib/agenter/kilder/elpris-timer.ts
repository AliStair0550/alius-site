// ============================================================
// Elprisen i dag, time for time (Energi Data Service, DayAheadPrices)
//
// Pulse gemmer døgngennemsnittet. Her hentes dagens kvarterpriser for
// Øst og Vest, og de samles til timer. Det er det tal der ændrer sig
// hver dag, og det en husholdning eller virksomhed kan handle på.
//
// TIDSZONE: timen læses direkte af feltet TimeDK ("2026-10-21T13:15:00")
// som tekst. Ingen Date-parsing, så maskinens zone kan ikke flytte en
// time. Det var præcis den fejl der i juli gjorde elpriserne 5 til 15
// procent forkerte (se CLAUDE.md).
//
// Enheden er kr. per MWh, samme som Pulses elpris. Ingen omregning til
// kWh, så der ikke opstår en faktor der kan anvendes forkert.
// ============================================================

import { BRUGERAGENT, type Kilde, type KildeSvar, type TalPost } from "./typer";

type Raekke = { TimeDK: string; PriceArea: string; DayAheadPriceDKK: number | null };

const OMRAADER = [
  { kode: "DK2", navn: "Elpris Østdanmark (DK2) i dag, time for time", serie: "eds.el.dk2" },
  { kode: "DK1", navn: "Elpris Vestdanmark (DK1) i dag, time for time", serie: "eds.el.dk1" },
];

const daTal = (v: number) => Math.round(v).toLocaleString("da-DK");
const tt = (t: number) => String(t).padStart(2, "0");

/** Ren funktion: kvarterpriser til timer. Timer uden priser udelades og tælles. */
export function tilTimer(raekker: Raekke[], omraade: string): { timer: { time: number; pris: number }[]; mangler: number } {
  const spande = new Map<number, number[]>();
  for (const r of raekker) {
    if (r.PriceArea !== omraade || r.DayAheadPriceDKK === null) continue;
    const time = Number(r.TimeDK.slice(11, 13));
    if (!Number.isInteger(time) || time < 0 || time > 23) continue;
    spande.set(time, [...(spande.get(time) ?? []), r.DayAheadPriceDKK]);
  }
  const timer = [...spande.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([time, p]) => ({ time, pris: Math.round(p.reduce((s, x) => s + x, 0) / p.length) }));
  return { timer, mangler: 24 - timer.length };
}

export const elprisTimer: Kilde = {
    id: "eds.timer",
    navn: "Energi Data Service, elpris i dag time for time",
    beskrivelse:
      "Dagens elpris for Øst- og Vestdanmark time for time, i kr. per MWh før afgifter og nettarif. " +
      "Med dagens billigste og dyreste time og døgnets gennemsnit.",
    async hent(dag: string): Promise<KildeSvar> {
      const naeste = new Date(`${dag}T12:00:00Z`);
      naeste.setUTCDate(naeste.getUTCDate() + 1);
      const slut = naeste.toISOString().slice(0, 10);
      const url =
        `https://api.energidataservice.dk/dataset/DayAheadPrices?start=${dag}T00:00&end=${slut}T00:00` +
        `&filter=${encodeURIComponent(JSON.stringify({ PriceArea: ["DK1", "DK2"] }))}&sort=TimeDK%20ASC&limit=500`;
      const base = { kilde: "eds.timer", navn: this.navn, url: "https://www.energidataservice.dk/tso-electricity/DayAheadPrices", hentet: new Date().toISOString() };
      const res = await fetch(url, { headers: { "user-agent": BRUGERAGENT }, signal: AbortSignal.timeout(20_000) });
      if (!res.ok) return { ...base, status: "fejl", poster: [], besked: `HTTP ${res.status}` };
      const data = (await res.json()) as { records?: Raekke[] };
      const raekker = data.records ?? [];

      const poster: TalPost[] = [];
      const huller: string[] = [];
      for (const o of OMRAADER) {
        const { timer, mangler } = tilTimer(raekker, o.kode);
        if (timer.length === 0) continue;
        if (mangler > 0) huller.push(`${o.kode}: ${mangler} timer uden pris`);
        const billigst = timer.reduce((a, b) => (b.pris < a.pris ? b : a));
        const dyrest = timer.reduce((a, b) => (b.pris > a.pris ? b : a));
        const snit = Math.round(timer.reduce((s, t) => s + t.pris, 0) / timer.length);
        poster.push({
          type: "tal",
          id: `eds.timer:${o.kode}`,
          kilde: "eds.timer",
          navn: o.navn,
          enhed: "kr. per MWh",
          saeson: "ikke relevant",
          url: base.url,
          periode: dag,
          vaerdi: snit,
          vaerdiTekst: daTal(snit),
          sammenligning: null,
          forloeb: [],
          tendens: null,
          foersteGangSet: base.hentet,
          kontekst:
            `Billigste time i dag er ${tt(billigst.time)}-${tt(billigst.time + 1)} med ${daTal(billigst.pris)} kr. per MWh. ` +
            `Dyreste er ${tt(dyrest.time)}-${tt(dyrest.time + 1)} med ${daTal(dyrest.pris)} kr. per MWh. ` +
            `Døgnets gennemsnit er ${daTal(snit)} kr. per MWh.`,
          timer,
        });
      }
      return {
        ...base,
        status: poster.length ? "ok" : "tom",
        poster,
        besked: huller.length ? huller.join("; ") : poster.length ? undefined : "ingen priser for dagen endnu",
      };
    },
};
