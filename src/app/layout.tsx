import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Analytics from "@/components/Analytics";

// GA kører kun i produktion. VERCEL_ENV er "production" | "preview" og er slet
// ikke sat lokalt, så preview-deployments og npm run dev sender ingen data.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const ANALYTICS_ENABLED =
  process.env.VERCEL_ENV === "production" && !!GA_ID;

// ============================================================
// Skrifttyperne ligger i repoet, ikke hos Google
//
// next/font/google serverer selv filerne i drift, men HENTER dem fra
// Google under byggeriet. Den 11. august 2026 fejlede en udrulning
// fordi Fraunces ikke kunne hentes:
//
//   Module not found: Can't resolve
//   '@vercel/turbopack-next/internal/font/google/font'
//
// Intet i koden fejlede. Byggeriet kan altså gå ned på et netværk vi
// ikke ejer, og det er en mærkelig afhængighed for en side der ellers
// klarer sig selv.
//
// HVILKE FILER
//
// Præcis dem Google leverede i forvejen, hentet én gang og lagt i
// fonts/. Samme bytes betyder at udseendet ikke kan skride.
//
// Det var ikke ligegyldigt hvilke. Fraunces' egen variabelfil fra
// Google Fonts' downloadknap har fire akser, og dens standardværdier
// er wght 900 og WONK 1, altså fed med de skæve alternativglyffer
// slået til. Google serverer en fil hvor opsz, SOFT og WONK er låst og
// kun wght er tilbage. Havde jeg brugt downloadfilen, ville
// overskrifterne have skiftet udseende uden at noget fejlede.
//
// UDSNIT
//
// Kun latin, som er hvad der blev serveret før. Det dækker æ, ø og å.
// Pilene og hakkene i prioritizeren ligger uden for alle udsnittene og
// faldt også tilbage på en systemskrift før; det er uændret.
//
// SKAL EN VÆGT MERE BRUGES
//
// De tre variable filer dækker wght 100-900 hver. Vægtintervallet
// nedenfor er det siden bruger, ikke det filen kan. Udvid tallet, ikke
// filen. Cormorant er statisk 500 og har kun den ene vægt.
// ============================================================

const jost = localFont({
  src: "./fonts/jost.woff2",
  weight: "100 500",
  style: "normal",
  variable: "--font-jost",
  display: "swap",
  adjustFontFallback: "Arial",
});

const fraunces = localFont({
  src: [
    { path: "./fonts/fraunces.woff2", weight: "200 400", style: "normal" },
    { path: "./fonts/fraunces-italic.woff2", weight: "200 400", style: "italic" },
  ],
  variable: "--font-fraunces-face",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

const cormorant = localFont({
  src: "./fonts/cormorant-garamond-italic.woff2",
  weight: "500",
  style: "italic",
  variable: "--font-cormorant",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

const bricolage = localFont({
  src: "./fonts/bricolage-grotesque.woff2",
  weight: "700 800",
  style: "normal",
  variable: "--font-bricolage",
  display: "swap",
  adjustFontFallback: "Arial",
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
