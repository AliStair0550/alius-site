import type { Metadata } from "next";
import "./globals.css";

const DESC =
  "Agentic AI, automatisering og systemer, der fjerner manuelt arbejde og skaber overblik i danske virksomheder.";

export const metadata: Metadata = {
  title: "ALIUS - digitale maskiner",
  description: DESC,
  metadataBase: new URL("https://alius.dk"),
  applicationName: "ALIUS",
  authors: [{ name: "Ali Al-Farhan" }],
  creator: "Ali Al-Farhan",
  robots: { index: true, follow: true },
  openGraph: {
    title: "ALIUS - digitale maskiner",
    description: DESC,
    url: "https://alius.dk",
    siteName: "ALIUS",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "ALIUS - digitale maskiner",
      },
    ],
    locale: "da_DK",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ALIUS - digitale maskiner",
    description: DESC,
    images: ["/og.png"],
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
    <html lang="da">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Jost:wght@100;200;300;400;500&family=Cormorant+Garamond:ital,wght@1,500&family=Fraunces:ital,wght@0,200;0,300;0,400;1,200;1,300;1,400&family=Bricolage+Grotesque:wght@700;800&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
