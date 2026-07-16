import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ALIUS - digitale maskiner",
  description:
    "Agentic AI, automatisering og systemer, der fjerner manuelt arbejde og skaber overblik i danske virksomheder.",
  metadataBase: new URL("https://alius.dk"),
  openGraph: {
    title: "ALIUS - digitale maskiner",
    description:
      "Agentic AI, automatisering og systemer, der fjerner manuelt arbejde og skaber overblik i danske virksomheder.",
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
    description:
      "Agentic AI, automatisering og systemer, der fjerner manuelt arbejde og skaber overblik i danske virksomheder.",
    images: ["/og.png"],
  },
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
        <link
          href="https://fonts.googleapis.com/css2?family=Jost:wght@100;200;300;400;500&family=Cormorant+Garamond:ital,wght@1,500&family=Fraunces:ital,wght@0,200;0,300;0,400;1,200;1,300;1,400&family=Bricolage+Grotesque:wght@700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
