// ============================================================
// Nyheder fra RSS-feeds: overskrift, dato og link. Intet andet.
//
// Beskrivelsen i et feed er artiklens tekst eller et uddrag af den.
// Den læses ikke og gemmes ikke. Agenten skriver alt i egne ord og
// bruger mediet som kilde, ikke som tekst.
//
// robots.txt tjekkes ved hver hentning (se robots.ts). Blokerer et
// medie os, er svaret "blokeret" med grunden, ikke en tom liste.
//
// UDVALGTE FEEDS, 21. oktober 2026
//
// DR, Børsen, Politiken, Information og Altinget er fravalgt, fordi
// deres robots.txt udelukker Anthropics agenter. Tilbage er de medier
// der tillader os.
// ============================================================

import { BRUGERAGENT, type Kilde, type KildeSvar, type NyhedPost } from "./typer";
import { maaHente } from "./robots";

export type FeedDef = { id: string; navn: string; url: string; beskrivelse: string };

export const FEEDS: FeedDef[] = [
  {
    id: "rss.berlingske",
    navn: "Berlingske",
    url: "https://www.berlingske.dk/content/rss",
    beskrivelse: "Berlingskes seneste nyheder, alle sektioner. Kun overskrift, dato og link.",
  },
  {
    id: "rss.ritzau",
    navn: "Ritzau Via",
    url: "https://via.ritzau.dk/rss/releases/latest",
    beskrivelse: "Pressemeddelelser fra danske virksomheder og organisationer via Ritzau. Afsenderens egne udmeldinger.",
  },
  {
    id: "rss.nationalbanken.statistik",
    navn: "Nationalbanken, statistiknyheder",
    url: "https://www.nationalbanken.dk/api/rssfeed?topic=Statistiknyhed&lang=da",
    beskrivelse: "Nationalbankens statistiknyheder om renter, udlån, betalingsbalance og forventninger.",
  },
  {
    id: "rss.nationalbanken.presse",
    navn: "Nationalbanken, pressemeddelelser",
    url: "https://www.nationalbanken.dk/api/rssfeed?topic=Pressemeddelelse&lang=da",
    beskrivelse: "Nationalbankens pressemeddelelser, herunder rentebeslutninger og månedsbalancen.",
  },
];

/**
 * Medierne bruger lange tankestreger i overskrifter. Alius' sider må
 * ikke vise dem (CLAUDE.md), så de bliver til almindelig bindestreg.
 */
export function udenTankestreg(t: string): string {
  return t.replace(/\s*[\u2014\u2013]\s*/g, " - ");
}

function tag(blok: string, navn: string): string | null {
  const m = blok.match(new RegExp(`<${navn}(?:\\s[^>]*)?>([\\s\\S]*?)</${navn}>`, "i"));
  if (!m) return null;
  return m[1]
    .replace(/^\s*<!\[CDATA\[/, "")
    .replace(/\]\]>\s*$/, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .trim();
}

/**
 * Læser <item>-elementer til overskrift, link og dato. Et punkt uden
 * gyldig dato springes over og tælles: uden dato kan 48-timers-reglen
 * ikke håndhæves, og et gæt ville være en påstand om noget ukendt.
 */
export function laesFeed(xml: string, kilde: string): { poster: NyhedPost[]; udenDato: number } {
  const poster: NyhedPost[] = [];
  let udenDato = 0;
  for (const m of xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)) {
    const blok = m[0];
    const titel = tag(blok, "title");
    const link = tag(blok, "link") ?? tag(blok, "guid");
    const raaDato = tag(blok, "pubDate") ?? tag(blok, "dc:date");
    if (!titel || !link) continue;
    const dato = raaDato ? new Date(raaDato) : null;
    if (!dato || Number.isNaN(dato.getTime())) {
      udenDato++;
      continue;
    }
    const renTitel = udenTankestreg(titel);
    poster.push({ type: "nyhed", id: `${kilde}:${link}`, kilde, titel: renTitel, url: link, dato: dato.toISOString() });
  }
  return { poster, udenDato };
}

async function hentTekst(url: string): Promise<{ ok: boolean; status: number; tekst: string }> {
  const res = await fetch(url, {
    headers: { "user-agent": BRUGERAGENT, accept: "application/rss+xml, application/xml, text/xml, */*" },
    signal: AbortSignal.timeout(20_000),
  });
  return { ok: res.ok, status: res.status, tekst: res.ok ? await res.text() : "" };
}

export function rssKilde(def: FeedDef): Kilde {
  return {
    id: def.id,
    navn: def.navn,
    beskrivelse: def.beskrivelse,
    async hent(): Promise<KildeSvar> {
      const base = { kilde: def.id, navn: def.navn, url: def.url, hentet: new Date().toISOString(), poster: [] };
      const u = new URL(def.url);

      const robots = await hentTekst(`${u.origin}/robots.txt`);
      // En manglende robots.txt (404) betyder ingen begrænsninger. Kan den
      // ikke hentes af andre grunde, ved vi ikke om vi må, og så henter vi ikke.
      if (!robots.ok && robots.status !== 404) {
        return { ...base, status: "fejl", besked: `robots.txt kunne ikke hentes (HTTP ${robots.status}), feedet er ikke hentet` };
      }
      const dom = maaHente(robots.tekst, u.pathname + u.search);
      if (!dom.tilladt) return { ...base, status: "blokeret", besked: dom.grund };

      const feed = await hentTekst(def.url);
      if (!feed.ok) return { ...base, status: "fejl", besked: `HTTP ${feed.status}` };

      const { poster, udenDato } = laesFeed(feed.tekst, def.id);
      const besked = udenDato > 0 ? `${udenDato} punkter uden læsbar dato sprunget over` : undefined;
      return { ...base, status: poster.length ? "ok" : "tom", poster, besked };
    },
  };
}
