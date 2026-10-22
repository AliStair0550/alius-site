// ============================================================
// Selskabernes finanskalendere fra Nasdaq Copenhagen
//
// Finder hvert selskabs seneste "Finanskalender"-meddelelse de seneste 15
// måneder, henter teksten og læser datoerne med laesKalender(). Henter
// kun; skriver intet.
//
// Hvert selskab ender i én tilstand, og den siges:
//   kalender      datoer læst fra meddelelsen
//   kun_pdf       meddelelsen henviser til en vedhæftet PDF, som ikke læses
//   ingen_datoer  meddelelsen fandtes, men ingen fremtidig regnskabsdato
//   ingen         selskabet har ikke udsendt en finanskalender i perioden
//   fejl          hentningen fejlede
// ============================================================

import { SELSKABER } from "../../../config/selskaber";
import { BRUGERAGENT } from "../agenter/kilder/typer";
import { sammeNavn } from "./plan";
import { laesKalender, type KalenderPunkt } from "./kalender";

const API = "https://api.news.eu.nasdaq.com/news/query.action";

export type SelskabsKalender = {
  cvr: string;
  navn: string;
  status: "kalender" | "kun_pdf" | "ingen_datoer" | "ingen" | "fejl";
  besked?: string;
  udgivet?: string;
  url?: string;
  punkter: KalenderPunkt[];
};

type Item = { company?: string; releaseTime?: string; messageUrl?: string; language?: string; cnsCategory?: string };

/** Meddelelsens tekst uden markup. */
export function tekstFraHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function finanskalenderMeddelelser(nu: Date): Promise<Item[]> {
  const fra = new Date(nu.getTime() - 15 * 31 * 86_400_000).toISOString().slice(0, 10);
  const ud: Item[] = [];
  for (let start = 0; start < 1000; start += 200) {
    const q = new URLSearchParams({
      type: "json",
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
      start: String(start),
      dir: "DESC",
      cnscategory: "Finanskalender",
      fromDate: fra,
      toDate: nu.toISOString().slice(0, 10),
    });
    const res = await fetch(`${API}?${q}`, { headers: { "user-agent": BRUGERAGENT }, signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`Nasdaq svarede ${res.status}`);
    const items = ((await res.json()) as { results?: { item?: Item[] } })?.results?.item;
    if (!Array.isArray(items)) throw new Error("Nasdaqs svar har ikke results.item. API'et har sandsynligvis ændret form.");
    // Hverken kategori- eller datofilteret er skarpt (set 22/10 2026:
    // kalendere fra 2021 kom med). Begge håndhæves her.
    ud.push(...items.filter((x) => x.cnsCategory === "Finanskalender" && (x.releaseTime ?? "") >= fra));
    if (items.length < 200) break;
  }
  return ud;
}

export async function hentKalendere(nu = new Date()): Promise<SelskabsKalender[]> {
  const alle = await finanskalenderMeddelelser(nu);
  const ud: SelskabsKalender[] = [];
  for (const s of SELSKABER) {
    const egne = alle
      .filter((x) => x.company && x.messageUrl && x.releaseTime && (sammeNavn(x.company, s.navnIRegnskab ?? s.navn) || sammeNavn(x.company, s.navn)))
      .sort((a, b) => b.releaseTime!.localeCompare(a.releaseTime!));
    if (egne.length === 0) {
      ud.push({ cvr: s.cvr, navn: s.navn, status: "ingen", punkter: [] });
      continue;
    }
    // Den nyeste; dansk og engelsk udgave af samme meddelelse giver samme datoer.
    const m = egne[0];
    try {
      const res = await fetch(m.messageUrl!, { headers: { "user-agent": BRUGERAGENT }, signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw new Error(`meddelelsen svarede ${res.status}`);
      const tekst = tekstFraHtml(await res.text());
      const punkter = laesKalender(tekst, m.releaseTime!).filter((p) => p.dato >= nu.toISOString().slice(0, 10));
      const status = punkter.length ? "kalender" : /\bpdf\b/i.test(tekst) && laesKalender(tekst, m.releaseTime!).length === 0 ? "kun_pdf" : "ingen_datoer";
      ud.push({ cvr: s.cvr, navn: s.navn, status, udgivet: m.releaseTime!.slice(0, 10), url: m.messageUrl!, punkter });
    } catch (e) {
      ud.push({ cvr: s.cvr, navn: s.navn, status: "fejl", besked: (e as Error).message, url: m.messageUrl!, punkter: [] });
    }
  }
  return ud;
}
