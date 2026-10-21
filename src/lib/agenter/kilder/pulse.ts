// ============================================================
// Pulse som kilde: de tal Pulse allerede har hentet og tjekket
//
// Tallene er hentet fra DST, Energinet og Eurostat af Pulses daglige
// job, med enhedsværn og revisionslog. Agenten læser dem herfra i
// stedet for at spørge kilderne igen.
//
// SAMMENLIGNING
//
// Et tal uden sammenligning siger ikke meget. Hvilken sammenligning der
// er ærlig, afhænger af sæsonkorrektionen:
//   - Sæsonkorrigeret eller en sats/kurs: mod forrige periode.
//   - Rå eller ukendt: mod samme periode året før. Ellers ville et
//     almindeligt sæsonudsving, fx flere konkurser i januar, ligne en
//     udvikling.
// ============================================================

import type { PrismaClient } from "@prisma/client";
import { enhed } from "../../pulse-enheder";
import type { FinnSerie } from "../finn/serier";
import type { Kilde, KildeSvar, Sammenligning, Saeson, TalPost } from "./typer";

const MAANEDER = ["januar", "februar", "marts", "april", "maj", "juni", "juli", "august", "september", "oktober", "november", "december"];

export function periodeTekst(d: Date, frekvens: string): string {
  const aar = d.getUTCFullYear();
  const md = d.getUTCMonth();
  switch (frekvens) {
    case "DAILY":
      return `${d.getUTCDate()}. ${MAANEDER[md]} ${aar}`;
    case "QUARTERLY":
      return `${Math.floor(md / 3) + 1}. kvartal ${aar}`;
    case "YEARLY":
      return `${aar}`;
    default:
      return `${MAANEDER[md]} ${aar}`;
  }
}

function daTal(v: number, dec: number): string {
  return v.toLocaleString("da-DK", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function rund(v: number, dec: number): number {
  const f = 10 ** dec;
  return Math.round(v * f) / f;
}

/** Perioden et år før, i samme frekvens. */
function aaretFoer(d: Date): number {
  return Date.UTC(d.getUTCFullYear() - 1, d.getUTCMonth(), d.getUTCDate());
}

export type Punkt = { period: Date; value: number };

/**
 * Vælger og regner sammenligningen. Ren funktion.
 * `punkter` er nyeste først.
 */
export function sammenlign(
  punkter: Punkt[],
  frekvens: string,
  saeson: Saeson,
  enhedsnavn: string
): Sammenligning | null {
  if (punkter.length < 2) return null;
  const [nyeste] = punkter;
  const e = enhed(enhedsnavn);

  let slags: Sammenligning["slags"];
  let mod: Punkt | undefined;
  if (frekvens === "DAILY") {
    slags = "forrige notering";
    mod = punkter[1];
  } else if (saeson === "korrigeret" || saeson === "ikke relevant") {
    slags = "forrige periode";
    mod = punkter[1];
  } else {
    slags = "samme periode året før";
    const maal = aaretFoer(nyeste.period);
    mod = punkter.find((p) => p.period.getTime() === maal);
  }
  if (!mod) return null;

  const forskel = nyeste.value - mod.value;
  let aendring: number;
  let aendringEnhed: string;
  if (e.erSats) {
    aendring = rund(forskel, e.decimaler);
    aendringEnhed = e.forskelsnavn ?? "point";
  } else {
    if (Math.abs(mod.value) < 1e-9) return null;
    aendring = rund((forskel / Math.abs(mod.value)) * 100, 1);
    aendringEnhed = "procent";
  }
  const dec = e.erSats ? e.decimaler : 1;

  return {
    slags,
    periode: periodeTekst(mod.period, frekvens),
    vaerdi: mod.value,
    vaerdiTekst: daTal(mod.value, e.decimaler),
    aendring,
    aendringEnhed,
    aendringTekst: `${aendring > 0 ? "+" : ""}${daTal(aendring, dec)} ${aendringEnhed}`,
  };
}

const ENHEDSORD: Record<string, [string, string]> = {
  DAILY: ["notering", "noteringer"],
  MONTHLY: ["måned", "måneder"],
  QUARTERLY: ["kvartal", "kvartaler"],
  YEARLY: ["år", "år"],
};

/**
 * Antal perioder i træk med samme retning, fra den nyeste og bagud.
 * Kun meningsfuldt mellem nabo-perioder, altså for sæsonkorrigerede
 * serier og satser. Ren funktion. `punkter` er nyeste først.
 */
export function tendens(punkter: Punkt[], frekvens: string): string | null {
  if (punkter.length < 3) return null;
  const retning = (a: number, b: number) => (a > b ? 1 : a < b ? -1 : 0);
  const foerste = retning(punkter[0].value, punkter[1].value);
  let antal = 0;
  for (let i = 0; i < punkter.length - 1; i++) {
    if (retning(punkter[i].value, punkter[i + 1].value) !== foerste) break;
    antal++;
  }
  if (antal < 2) return null;
  const [en, flere] = ENHEDSORD[frekvens] ?? ["periode", "perioder"];
  const ord = foerste > 0 ? "steget" : foerste < 0 ? "faldet" : "uændret";
  return `${ord} ${antal} ${antal === 1 ? en : flere} i træk`;
}

const KILDEURL: Record<string, (ref: string, id: string) => string> = {
  DST: (ref) => `https://www.statbank.dk/${ref.split(/[ +/]/)[0]}`,
  EDS: () => "https://www.energidataservice.dk/tso-electricity/DayAheadPrices",
  EUROSTAT: (ref) => `https://ec.europa.eu/eurostat/databrowser/view/${ref}/default/table`,
  DERIVED: (_ref, id) => `https://alius.dk/pulse/serie/${encodeURIComponent(id)}`,
};

export function pulseKilde(prisma: PrismaClient, serier: FinnSerie[]): Kilde {
  return {
    id: "pulse",
    navn: "Pulse (Danmarks Statistik, Energinet, Eurostat)",
    beskrivelse:
      "Danske nøgletal som Pulse henter dagligt og tjekker for enhed og størrelsesorden: forbrugerpriser, " +
      "ledighed, løn, konkurser, tillid, detailhandel, byggeri, renter, valutakurser og elpriser. " +
      "Hvert tal har periode, enhed, sæsonkorrektion og en sammenligning valgt ud fra den.",
    async hent(): Promise<KildeSvar> {
      const poster: TalPost[] = [];
      const mangler: string[] = [];

      for (const s of serier) {
        const serie = await prisma.series.findUnique({ where: { id: s.id } });
        if (!serie) {
          mangler.push(`${s.id}: findes ikke i Pulse`);
          continue;
        }
        const raekker = await prisma.observation.findMany({
          where: { seriesId: s.id, areaCode: s.omraade, isCurrent: true, value: { not: null } },
          orderBy: { period: "desc" },
          take: serie.frequency === "DAILY" ? 10 : 15,
          select: { period: true, value: true },
        });
        if (raekker.length === 0) {
          mangler.push(`${s.id}: ingen tal for område ${s.omraade}`);
          continue;
        }
        const punkter: Punkt[] = raekker.map((r) => ({ period: r.period, value: Number(r.value) }));
        const nyeste = punkter[0];

        const foerst = await prisma.observation.findFirst({
          where: { seriesId: s.id, areaCode: s.omraade, period: nyeste.period },
          orderBy: { retrievedAt: "asc" },
          select: { retrievedAt: true },
        });

        // Rækken findes (den er lige læst), så en manglende første hentning
        // er en fejl i basen, ikke en tom tilstand.
        if (!foerst) throw new Error(`${s.id}: nyeste periode har ingen retrieved_at`);
        const sml = sammenlign(punkter, serie.frequency, s.saeson, serie.unit);
        const e = enhed(serie.unit);
        const visForloeb = sml?.slags !== "samme periode året før";
        poster.push({
          type: "tal",
          id: `pulse:${s.id}`,
          kilde: "pulse",
          navn: s.navn ?? serie.nameDa,
          enhed: e.efter || serie.unit,
          saeson: s.saeson,
          url: (KILDEURL[serie.source] ?? (() => `https://alius.dk/pulse/serie/${s.id}`))(serie.sourceRef, s.id),
          periode: periodeTekst(nyeste.period, serie.frequency),
          vaerdi: nyeste.value,
          vaerdiTekst: daTal(nyeste.value, e.decimaler),
          sammenligning: sml,
          forloeb: visForloeb
            ? punkter.slice(0, 4).map((p) => ({ periode: periodeTekst(p.period, serie.frequency), vaerdi: p.value }))
            : [],
          tendens: visForloeb ? tendens(punkter, serie.frequency) : null,
          foersteGangSet: foerst!.retrievedAt.toISOString(),
        });
      }

      return {
        kilde: "pulse",
        navn: this.navn,
        url: "https://alius.dk/pulse",
        hentet: new Date().toISOString(),
        status: poster.length ? "ok" : "tom",
        poster,
        besked: mangler.length ? `Ikke med: ${mangler.join("; ")}` : undefined,
      };
    },
  };
}
