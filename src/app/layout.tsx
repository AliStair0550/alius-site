import type { Metadata } from "next";
import { Jost, Fraunces, Cormorant_Garamond, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import Analytics from "@/components/Analytics";

// GA kører kun i produktion. VERCEL_ENV er "production" | "preview" og er slet
// ikke sat lokalt, så preview-deployments og npm run dev sender ingen data.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const ANALYTICS_ENABLED =
  process.env.VERCEL_ENV === "production" && !!GA_ID;

// Selv-hostede fonte (ingen render-blokerende Google-request, ingen layout shift)
const jost = Jost({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500"],
  variable: "--font-jost",
  display: "swap",
});
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["200", "300", "400"],
  style: ["normal", "italic"],
  variable: "--font-fraunces-google",
  display: "swap",
});
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500"],
  style: ["italic"],
  variable: "--font-cormorant",
  display: "swap",
});
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

const DESC =
  "Agentic AI, automatisering og systemer, der fjerner manuelt arbejde og skaber overblik i danske virksomheder.";

export const metadata: Metadata = {
  title: "ALIUS - Digitale Maskiner",
  description: DESC,
  metadataBase: new URL("https://alius.dk"),
  applicationName: "ALIUS",
  authors: [{ name: "Ali Al-Farhan" }],
  creator: "Ali Al-Farhan",
  robots: { index: true, follow: true },
  openGraph: {
    title: "ALIUS - Digitale Maskiner",
    description: DESC,
    url: "https://alius.dk",
    siteName: "ALIUS",
    locale: "da_DK",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ALIUS - Digitale Maskiner",
    description: DESC,
  },
};

// Struktureret data (ingen visuel effekt) - hjælper søgemaskiner
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "ALIUS",
  alternateName: "Alius",
  url: "https://alius.dk",
  description: DESC,
  email: "hej@alius.dk",
  image: "https://alius.dk/og.png",
  areaServed: { "@type": "Country", name: "Denmark" },
  founder: { "@type": "Person", name: "Ali Al-Farhan" },
  sameAs: ["https://www.linkedin.com/in/alialfarhan/"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="da"
      className={`${jost.variable} ${fraunces.variable} ${cormorant.variable} ${bricolage.variable}`}
    >
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased">
        {children}
        {ANALYTICS_ENABLED && <Analytics gaId={GA_ID!} />}
      </body>
    </html>
  );
}
