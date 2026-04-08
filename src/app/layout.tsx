import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ALIUS - Den anden vej til vaekst",
  description:
    "Vi hjaelper smaa og mellemstore virksomheder med at skabe fundament for vaekst - gennem positionering, branding og teknisk eksekvering.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="da">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Jost:wght@100;200;300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
