import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ALIUS - Brand. Strategi. Teknologi.",
  description:
    "Vi bygger stærke løsninger for virksomheder der vil vokse, skille sig ud og skabe kundeoplevelser, der huskes.",
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
