// ============================================================
// Kontrol og revision af regnskabstal, før noget skrives
//
// Rene funktioner. Scriptet henter, disse beslutter, scriptet skriver.
// ============================================================

import type { Selskab } from "../../../config/selskaber";
import { AKTIVER, STOERRELSE } from "../../../config/selskaber";
import type { Fakta, Laest } from "./esef";

/**
 * Kaster hvis regnskabet ikke er det selskab og den valuta vi tror.
 *
 * Tre værn, alle mod tal der ville se rigtige ud:
 *   1. Navnet i regnskabet skal være det forventede (forkert CVR).
 *   2. Valutaen skal være den erklærede (dollar læst som kroner).
 *   3. Omsætningen skal findes og have en rimelig størrelse. Den er
 *      ankeret for hele indleveringen: står den i mio. i stedet for hele
 *      kroner, gør resultatet det også, men et resultat kan lovligt være
 *      lille, så det kan ikke fange fejlen selv.
 */
/** En fil hvis skala ikke holder. Egen klasse, så en kendt fejl kan genkendes præcist. */
export class SkalaFejl extends Error {}

/**
 * Navne sammenlignes på bogstaver og tal alene. Selskaberne skriver deres
 * eget navn forskelligt fra fil til fil: "PANDORAA/S", "DSV A/S,DSV A/S",
 * "GN Store Nord" og "GN Store Nord A/S". Et ANDET selskabs navn falder
 * stadig igennem.
 */
export function sammeNavn(iRegnskab: string, forventet: string): boolean {
  const n = (t: string) => t.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]/gu, "");
  const a = n(iRegnskab);
  const b = n(forventet);
  const kerne = a.replace(/as$/, "");
  // Kernen skal have substans; et bart "A/S" må ikke matche alt.
  return b.length >= 3 && (a.includes(b) || (kerne.length >= 3 && b.includes(kerne)));
}

/**
 * `navnBekraeftet` er sand, når selskabets nyeste regnskab i samme kørsel
 * har bekræftet navnet. Så kan en ældre fil uden navn godtages: CVR'et er
 * det samme, og det er efterprøvet.
 */
export function kontroller(s: Selskab, l: Laest, navnBekraeftet = false): void {
  if (s.navnIRegnskab === null && !s.udenNavn) {
    throw new Error(`${s.navn} (${s.cvr}): intet forventet navn og ingen begrundelse for at undvære det`);
  }
  if (s.navnIRegnskab !== null) {
    if (l.navn === null && !navnBekraeftet) {
      throw new Error(`${s.navn} (${s.cvr}): regnskabet angiver intet navn, og navnet er ikke bekræftet af et nyere regnskab. CVR'et kan ikke efterprøves.`);
    }
    if (l.navn !== null && !sammeNavn(l.navn, s.navnIRegnskab)) {
      throw new Error(`${s.navn} (${s.cvr}): regnskabet siger "${l.navn}", ikke "${s.navnIRegnskab}". Forkert CVR, eller et navneskifte der skal besluttes.`);
    }
  }
  const andre = [...new Set(l.fakta.map((f) => f.valuta))].filter((v) => v !== s.valuta);
  if (andre.length) {
    throw new Error(`${s.navn} (${s.cvr}): regnskabet er i ${andre.join(", ")}, erklæret er ${s.valuta}. Tag stilling til det i config/selskaber.ts.`);
  }
  // Skalaen afgøres af aktiverne, ikke af omsætningen. Se AKTIVER.
  const aktiver = l.aktiver.filter((a) => a.valuta === s.valuta);
  if (aktiver.length === 0) {
    throw new Error(`${s.navn} (${s.cvr}): regnskabet har ingen samlede aktiver i ${s.valuta}. Uden dem kan skalaen ikke efterprøves, og intet skrives.`);
  }
  for (const a of aktiver) {
    if (a.vaerdi < AKTIVER.min || a.vaerdi > AKTIVER.max) {
      throw new SkalaFejl(
        `${s.navn} (${s.cvr}): samlede aktiver ${a.dato} er ${a.vaerdi} ${a.valuta}, uden for ${AKTIVER.min} til ${AKTIVER.max}. ` +
          `Filen har sandsynligvis en forkert skala, og intet fra den skrives. Se CLAUDE.md om plausible forkerte værdier.`
      );
    }
  }
  const oms = l.fakta.filter((f) => f.begreb === "omsaetning");
  if (oms.length === 0) throw new Error(`${s.navn} (${s.cvr}): regnskabet har ingen omsætning.`);
  for (const f of l.fakta) {
    const g = STOERRELSE[f.begreb];
    if (f.vaerdi < g.min || f.vaerdi > g.max) {
      throw new Error(
        `${s.navn} (${s.cvr}): ${f.element} ${f.start}..${f.slut} er ${f.vaerdi} ${f.valuta}, uden for ${g.min} til ${g.max}. ` +
          `Sandsynligvis en forkert skala. Se CLAUDE.md om plausible forkerte værdier.`
      );
    }
  }
}

export type Gaeldende = { begreb: string; start: string; slut: string; vaerdi: number; valuta: string; decimaler: number | null };

/**
 * Er to tal det samme, givet hvor præcist hvert er angivet. Selskaberne
 * skifter præcision fra fil til fil: Zealand Pharmas 2. kvartal 2025 stod
 * som 9.088.284.000 kr. i én rapport og 9.088.000.000 kr. i den næste.
 * Det er ikke en revision. Første kørsel 22/10 2026 skrev det som én, og
 * et præcist tal blev erstattet af et groft.
 */
export function sammeTal(a: { vaerdi: number; decimaler: number | null }, b: { vaerdi: number; decimaler: number | null }): boolean {
  const groveste = Math.min(a.decimaler ?? Infinity, b.decimaler ?? Infinity);
  const tolerance = Number.isFinite(groveste) ? 0.5 * 10 ** -groveste : 0.5;
  return Math.abs(a.vaerdi - b.vaerdi) <= tolerance + 1e-9;
}

export type Plan = {
  nye: Fakta[];
  revideret: { fakta: Fakta; foer: number }[];
  uaendret: number;
};

const noegle = (x: { begreb: string; start: string; slut: string }) => `${x.begreb}|${x.start}|${x.slut}`;

/**
 * Hvad der skal skrives. Samme regel som observations: en værdi
 * opdateres aldrig. Et nyt tal for en kendt periode er en revision og
 * tilføjes som ny række; et ens tal skrives ikke igen.
 */
export function planlaeg(gaeldende: Gaeldende[], fakta: Fakta[]): Plan {
  const kendt = new Map(gaeldende.map((g) => [noegle(g), g]));
  const plan: Plan = { nye: [], revideret: [], uaendret: 0 };
  for (const f of fakta) {
    const g = kendt.get(noegle(f));
    if (!g) {
      plan.nye.push(f);
      continue;
    }
    if (g.valuta !== f.valuta) {
      throw new Error(`${f.begreb} ${f.start}..${f.slut}: stod i ${g.valuta}, står nu i ${f.valuta}. Et valutaskifte skrives ikke som en revision.`);
    }
    if (sammeTal(g, f)) plan.uaendret++;
    else plan.revideret.push({ fakta: f, foer: g.vaerdi });
  }
  return plan;
}
