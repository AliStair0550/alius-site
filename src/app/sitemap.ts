import type { MetadataRoute } from "next";
import { getAllKommuner } from "@/lib/areas";
import { THINKERS } from "@/lib/frihedstaenkere";

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
    url("/pulse", 0.9),
    url("/værktøjer", 0.8),
    url("/frihedstænkere", 0.7),
    url("/beregner", 0.7),
    url("/prioritizer", 0.7),
    url("/tankeprofil", 0.7),
    url("/tankeprofil/teori", 0.6),
    url("/tankeprofil/hold", 0.6),
    url("/cv", 0.6),

    // Pulse-oversigter
    url("/pulse/ledighed", 0.8),
    url("/pulse/konkurser", 0.8),
    url("/pulse/forbrug", 0.8),
    url("/pulse/kommuner", 0.8),
    url("/pulse/kommuner/danmark", 0.8),

    // Kommunesider - de vigtigste long-tail-sider (98 kommuner x 2 routes)
    ...kommuner.map((k) => url(`/pulse/kommuner/${k.slug}`, 0.6)),
    ...kommuner.map((k) => url(`/pulse/ledighed/${k.slug}`, 0.6)),

    // Frihedstænkere
    ...THINKERS.map((t) => url(`/frihedstænkere/${t.slug}`, 0.5)),
  ];
}
