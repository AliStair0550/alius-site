// ============================================================
// Regnskabsmeddelelser fra Nasdaq Copenhagen, samme dag
//
// Erhvervsstyrelsen modtager regnskaberne dage til uger efter selskabets
// børsmeddelelse; DSV offentliggjorde 3. kvartal 2026 den 21. oktober kl.
// 7.31. Denne kilde giver Finn meddelelsen samme dag, som en nyhed: kun
// selskab, overskrift, tidspunkt og link. Tallene kommer først, når
// regnskabet er hos Erhvervsstyrelsen og kan læses og efterprøves.
//
// UDOKUMENTERET API. api.news.eu.nasdaq.com er bagenden af Nasdaqs egen
// nyhedsside. Den har ingen robots.txt (404, undersøgt 22/10 2026), og
// den kan ændre sig uden varsel. Ændrer svaret form, siger kilden det som
// en fejl i stedet for at levere en tom liste.
// ============================================================

import { BRUGERAGENT, type Kilde, type KildeSvar, type NyhedPost } from "./typer";
import { maaHente } from "./robots";
import { udenTankestreg } from "./rss";

const API = "https://api.news.eu.nasdaq.com/news/query.action";

/** Meddelelser der er regnskaber: delårs-, halvårs- og årsrapporter. Ikke finanskalendere. */
const REGNSKAB = /rapport|regnskab|periodemeddelelse/i;
const SPROG = ["da", "en"];

type Item = {
  disclosureId?: string | number;
  releaseTime?: string;
  company?: string;
  cnsCategory?: string;
  headline?: string;
  messageUrl?: string;
  language?: string;
};

/**
 * Regnskabsmeddelelser fra danske selskaber (navn på "A/S"), én per
 * selskab og tidspunkt, dansk frem for engelsk. Ren funktion.
 * Kaster hvis svaret ikke har den form vi kender.
 */
export function laesNasdaq(json: unknown): NyhedPost[] {
  const items = (json as { results?: { item?: Item[] } })?.results?.item;
  if (!Array.isArray(items)) throw new Error("Nasdaqs svar har ikke results.item. API'et har sandsynligvis ændret form.");
  const valgt = new Map<string, Item>();
  for (const x of items) {
    if (!x.company || !x.headline || !x.messageUrl || !x.releaseTime || !x.cnsCategory) continue;
    if (!REGNSKAB.test(x.cnsCategory) || !/\bA\/S\b/.test(x.company)) continue;
    if (!SPROG.includes(x.language ?? "")) continue;
    const noegle = `${x.company}|${x.releaseTime}`;
    const foer = valgt.get(noegle);
    if (!foer || SPROG.indexOf(x.language!) < SPROG.indexOf(foer.language!)) valgt.set(noegle, x);
  }
  return [...valgt.values()].map((x) => {
    // Bedt om i UTC (timeZone=UTC), leveret uden zone: "2026-10-21 05:31:47".
    const dato = new Date(`${x.releaseTime!.replace(" ", "T")}Z`);
    if (Number.isNaN(dato.getTime())) throw new Error(`Nasdaq: tidspunktet "${x.releaseTime}" kan ikke læses`);
    return {
      type: "nyhed",
      id: `nasdaq:${x.disclosureId ?? x.messageUrl}`,
      kilde: "nasdaq",
      titel: udenTankestreg(`${x.company}: ${x.headline}`),
      url: x.messageUrl!,
      dato: dato.toISOString(),
    };
  });
}

export const nasdaqRegnskaber: Kilde = {
  id: "nasdaq",
  navn: "Nasdaq Copenhagen, regnskabsmeddelelser",
  version: 1,
  beskrivelse:
    "Danske børsnoterede selskabers regnskabsmeddelelser (delårs-, halvårs- og årsrapporter) samme dag som de " +
    "offentliggøres. Kun selskab, overskrift, tidspunkt og link; tallene står ikke her og må ikke gættes. " +
    "Regnskabstallene kommer i kilden fra Erhvervsstyrelsen, når regnskabet er indleveret.",
  async hent(): Promise<KildeSvar> {
    const base = { kilde: this.id, navn: this.navn, url: "https://www.nasdaq.com/european-market-activity/news", hentet: new Date().toISOString(), poster: [] };
    const robots = await fetch("https://api.news.eu.nasdaq.com/robots.txt", { headers: { "user-agent": BRUGERAGENT }, signal: AbortSignal.timeout(15_000) });
    if (!robots.ok && robots.status !== 404) return { ...base, status: "fejl", besked: `robots.txt kunne ikke hentes (HTTP ${robots.status})` };
    const dom = maaHente(robots.ok ? await robots.text() : "", "/news/query.action");
    if (!dom.tilladt) return { ...base, status: "blokeret", besked: dom.grund };

    const q = new URLSearchParams({
      type: "json",
      showAttachments: "false",
      showCnsSpecific: "true",
      showCompany: "true",
      countResults: "false",
      market: "Main Market, Copenhagen",
      globalGroup: "exchangeNotice",
      globalName: "NordicAllMarkets",
      displayLanguage: "da",
      timeZone: "UTC",
      dateMask: "yyyy-MM-dd HH:mm:ss",
      limit: "200",
      start: "0",
      dir: "DESC",
    });
    const res = await fetch(`${API}?${q}`, { headers: { "user-agent": BRUGERAGENT }, signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return { ...base, status: "fejl", besked: `HTTP ${res.status}` };
    let poster: NyhedPost[];
    try {
      poster = laesNasdaq(await res.json());
    } catch (e) {
      return { ...base, status: "fejl", besked: (e as Error).message };
    }
    return { ...base, status: poster.length ? "ok" : "tom", poster };
  },
};
