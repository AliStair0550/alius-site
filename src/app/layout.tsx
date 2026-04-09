import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ALIUS - Brand. Strategi. Teknologi.",
  description:
    "Vi bygger stærke løsninger for virksomheder, der vil vokse, skille sig ud og skabe kundeoplevelser, der huskes.",
  metadataBase: new URL("https://alius.dk"),
  openGraph: {
    title: "ALIUS - Brand. Strategi. Teknologi. Bygget som ét.",
    description:
      "Vi bygger stærke løsninger for virksomheder, der vil vokse, skille sig ud og skabe kundeoplevelser, der huskes.",
    url: "https://alius.dk",
    siteName: "ALIUS",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "ALIUS - Brand. Strategi. Teknologi. Bygget som ét.",
      },
    ],
    locale: "da_DK",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ALIUS - Brand. Strategi. Teknologi. Bygget som ét.",
    description:
      "Vi bygger stærke løsninger for virksomheder, der vil vokse, skille sig ud og skabe kundeoplevelser, der huskes.",
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
          href="https://fonts.googleapis.com/css2?family=Jost:wght@100;200;300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
