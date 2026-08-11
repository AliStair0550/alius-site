import type { MetadataRoute } from "next";
import { getAllKommuner } from "@/lib/areas";
import { THINKERS } from "@/lib/frihedstaenkere";
import { ARTICLES } from "@/lib/vaerksted";
import { PAA_PAUSE } from "@/lib/pulse-pause";

const BASE = "https://alius.dk";

// Christiansø (kode 411) er ikke en rigtig kommune og har intet datagrundlag
// i DST-kilderne, så den holdes ude - vi melder ikke tomme sider ind til Google.
const EXCLUDED_KOMMUNE_CODES = new Set(["411"]);

function url(path: string, priority: number) {
  return {
    url: `${BASE}${encodeURI(path)}`,
    changeFrequency: "monthly" as const,
    priority,
  };
}

// Bevidst uden DB-opslag: sitemap'et genereres fra statisk kode, så en
// kortvarig databasefejl aldrig kan gøre sitemap.xml utilgængeligt for Googlebot.
export default function sitemap(): MetadataRoute.Sitemap {
  const kommuner = getAllKommuner().filter(
    (k) => !EXCLUDED_KOMMUNE_CODES.has(k.code)
  );

  return [
    // Forside
    url("", 1),

    // Hovedsektioner
    // Kontaktsiden er den vej en kunde skal kunne finde. Den manglede
    // her indtil 11. august 2026, mens 196 kommunesider stod meldt ind.
    url("/kontakt", 0.9),

    // Pulse holder pause. Kun forsiden staar tilbage, med lav vaegt:
    // undersiderne viser alle den samme pausebesked, og der er ingen
    // grund til at bede nogen indeksere kopier af den.
    url("/pulse", 0.3),
    url("/værktøjer", 0.8),
    url("/frihedstænkere", 0.7),
    url("/beregner", 0.7),
    url("/prioritizer", 0.7),
    url("/tankeprofil", 0.7),
    url("/tankeprofil/teori", 0.6),
    url("/tankeprofil/hold", 0.6),
    url("/cv", 0.6),

    // Værkstedet - oversigt + artikler
    url("/værksted", 0.7),
    ...ARTICLES.map((a) => url(a.href, 0.6)),

    // Kommunesider - de vigtigste long-tail-sider (98 kommuner x 2 routes).
    //
    // Kommentaren ovenfor sagde fra 11. august 2026 at undersiderne var
    // ude af sitemap'et, mens de to linjer her stadig meldte 196 URL'er
    // ind. En paastand og dens kode skal staa samme sted, ellers bliver
    // de uenige uden at nogen opdager det.
    //
    // Under pausen viser alle 196 den samme besked. At bede Google
    // gennemgaa dem er spildt gennemgang hos dem og spildte kald hos os,
    // og duplikeret indhold hjaelper ingen af delene. De kommer tilbage
    // af sig selv naar PAA_PAUSE bliver falsk.
    ...(PAA_PAUSE
      ? []
      : [
          ...kommuner.map((k) => url(`/pulse/kommuner/${k.slug}`, 0.6)),
          ...kommuner.map((k) => url(`/pulse/ledighed/${k.slug}`, 0.6)),
        ]),

    // Frihedstænkere
    ...THINKERS.map((t) => url(`/frihedstænkere/${t.slug}`, 0.5)),
  ];
}
