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
import { hentRangliste, type Kandidat } from "../../pulse-rangliste";
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
  return beregn(nyeste, mod, slags, frekvens, e);
}

/**
 * Altid samme periode året før, også for en sæsonkorrigeret serie.
 *
 * Til serier hvor året er det der betyder noget, fx firmaernes salg:
 * "1,9 procent mere end juli" siger mindre end "6,3 procent mere end
 * august sidste år". Kommer OVENI den almindelige sammenligning, ikke i
 * stedet for. Mangler perioden året før, er svaret null, og kalderen
 * skal sige det.
 */
export function sammenlignAaretFoer(punkter: Punkt[], frekvens: string, enhedsnavn: string): Sammenligning | null {
  if (punkter.length < 2 || frekvens === "DAILY") return null;
  const [nyeste] = punkter;
  const maal = aaretFoer(nyeste.period);
  const mod = punkter.find((p) => p.period.getTime() === maal);
  if (!mod) return null;
  return beregn(nyeste, mod, "samme periode året før", frekvens, enhed(enhedsnavn));
}

function beregn(
  nyeste: Punkt,
  mod: Punkt,
  slags: Sammenligning["slags"],
  frekvens: string,
  e: ReturnType<typeof enhed>
): Sammenligning | null {
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

/**
 * Samme ordvalg som ranglistens forklaring på /pulse
 * (src/components/pulse/Forside.tsx), så Finn og Pulse siger det samme
 * om det samme tal.
 */
export function usaedvanlighedTekst(k: Pick<Kandidat, "vaerdi" | "normal" | "sjaeldenhed" | "maaneder">): string {
  const opad = k.vaerdi >= k.normal;
  if (k.sjaeldenhed <= 1) return `Ingen måned i de seneste ti år har ligget ${opad ? "højere" : "lavere"}.`;
  if (k.sjaeldenhed <= 3) {
    return `Kun ${k.sjaeldenhed} af ${k.maaneder} måneder i de seneste ti år har ligget lige så ${opad ? "højt" : "lavt"}.`;
  }
  return `Ligger ${opad ? "over" : "under"} det normale for de seneste ti år, målt på ${k.maaneder} måneder.`;
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
    // 2: feltet tendens, og konkursserien er sæsonkorrigeret (C1).
    // 3: usædvanlighed fra Pulses rangliste.
    version: 4,
    navn: "Pulse (Danmarks Statistik, Energinet, Eurostat)",
    beskrivelse:
      "Danske nøgletal som Pulse henter dagligt og tjekker for enhed og størrelsesorden: forbrugerpriser, " +
      "ledighed, løn, konkurser, tillid, detailhandel, byggeri, renter, valutakurser og elpriser. " +
      "Hvert tal har periode, enhed, sæsonkorrektion og en sammenligning valgt ud fra den.",
    async hent(): Promise<KildeSvar> {
      const poster: TalPost[] = [];
      const mangler: string[] = [];

      // Ranglisten regner hvert tal mod seriens egne seneste ti år. Kan den
      // ikke regnes, leveres tallene uden, og det siges i beskeden.
      let rangliste = new Map<string, Kandidat>();
      try {
        const r = await hentRangliste(prisma);
        rangliste = new Map([...r.kort, ...r.rolige].filter((k) => k.areaCode === "DK" || k.areaCode === "000").map((k) => [k.seriesId, k]));
      } catch (e) {
        mangler.push(`ranglisten kunne ikke beregnes (${(e as Error).message.slice(0, 120)})`);
      }

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
        // Året før oveni, når serien beder om det og ikke allerede har det.
        const smlAar =
          s.ogsaaAaretFoer && sml?.slags !== "samme periode året før"
            ? sammenlignAaretFoer(punkter, serie.frequency, serie.unit)
            : null;
        if (s.ogsaaAaretFoer && sml?.slags !== "samme periode året før" && !smlAar) {
          mangler.push(`${s.id}: samme periode året før findes ikke i Pulse, så kun forrige periode er med`);
        }
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
          ...(smlAar ? { sammenligningAar: smlAar } : {}),
          forloeb: visForloeb
            ? punkter.slice(0, 4).map((p) => ({ periode: periodeTekst(p.period, serie.frequency), vaerdi: p.value }))
            : [],
          tendens: visForloeb ? tendens(punkter, serie.frequency) : null,
          ...(rangliste.has(s.id)
            ? (() => {
                const k = rangliste.get(s.id)!;
                return {
                  usaedvanlighed: {
                    tekst: usaedvanlighedTekst(k),
                    z: Math.round(k.z * 100) / 100,
                    sjaeldenhed: k.sjaeldenhed,
                    maaneder: k.maaneder,
                    opad: k.vaerdi >= k.normal,
                  },
                };
              })()
            : {}),
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
