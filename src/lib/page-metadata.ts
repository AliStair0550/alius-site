import type { Metadata } from "next";

// Bygger ensartet metadata for en side: canonical, Open Graph og Twitter.
//
// Baggrund: Next.js fletter ikke openGraph dybt. Definerer en side sit eget
// openGraph-objekt, erstatter det forældrenes helt - og så forsvinder billedet
// fra opengraph-image.tsx. Derfor sætter denne helper altid images eksplicit.
//
// Uden en per-side url arvede alle sider forsidens og:url, så et delt link til
// fx /pulse/konkurser blev tilskrevet forsiden hos Facebook og LinkedIn.

const SITE_NAME = "ALIUS";
const DEFAULT_OG_IMAGE = "/opengraph-image";

type PageMetaInput = {
  title: string;
  description: string;
  /** Sti fra roden, fx "/pulse". Bruges til både canonical og og:url. */
  path: string;
  type?: "website" | "article";
  /** Overskriv delings-billedet, fx for et sektionsspecifikt OG-billede. */
  image?: string;
};

export function pageMetadata({
  title,
  description,
  path,
  type = "website",
  image = DEFAULT_OG_IMAGE,
}: PageMetaInput): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: "da_DK",
      type,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
