// ============================================================
// Værkstedet - artikler om vores arbejde, eksperimenter og læringer.
// Tilføj en ny artikel ved at lægge et objekt her (nyeste øverst) og
// oprette den tilhørende side under src/app/værksted/<slug>/page.tsx.
// ============================================================

export type Article = {
  slug: string;
  href: string;
  title: string;
  excerpt: string;
  category: string;
  date: string; // ISO 8601 - bruges til schema og sortering
  /** Hvornår artiklen sidst er ændret, når det ikke er udgivelsesdatoen. */
  updated?: string;
  dateLabel: string; // vises på siden
};

export const ARTICLES: Article[] = [
  {
    slug: "folka",
    href: "/værksted/folka",
    title: "Ingen downloader en app for en kop kaffe",
    excerpt:
      "Pap bliver smidt ud, og apps er for meget. Så jeg byggede noget midt imellem.",
    category: "Eksperiment",
    date: "2026-07-27",
    updated: "2026-11-02",
    dateLabel: "Juli 2026",
  },
];

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}
