import type { MetadataRoute } from "next";

const BASE = "https://alius.dk";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "",
    "/beregner",
    "/prioritizer",
    "/pulse",
    "/frihedstænkere",
    "/værktøjer",
    "/tankeprofil",
    "/tankeprofil/teori",
    "/cv",
  ];
  return paths.map((p) => ({
    url: `${BASE}${encodeURI(p)}`,
    changeFrequency: "monthly" as const,
    priority: p === "" ? 1 : 0.7,
  }));
}
