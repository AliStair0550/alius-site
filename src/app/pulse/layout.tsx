import type { Metadata } from "next";

import { PAA_PAUSE } from "@/lib/pulse-pause";

// ============================================================
// Pulse skal ikke kunne findes mens den holder pause
//
// Siderne er fjernet fra forsiden, fra vaerktoejssiden og fra
// sitemap'et. Uden det her ville de stadig staa i Google fra dengang
// de var i drift, og en soegning paa "ledighed kommune" kunne foere en
// besoegende direkte ind paa en pausebesked.
//
// At fjerne en side fra sitemap'et siger kun "hold op med at foreslaa
// den". noindex siger "tag den ud". Det er de to forskellige ting, og
// der skal bruges begge.
//
// Layoutet sender bare sine boern videre. Det findes udelukkende for
// at baere det her felt et sted, hvor det daekker alle tolv sider i
// stedet for at skulle gentages paa hver.
//
// follow: true med vilje. Pausebeskeden linker til /kontakt og
// /vaerktoejer, og de links skal stadig taelle.
// ============================================================

export const metadata: Metadata = PAA_PAUSE
  ? { robots: { index: false, follow: true } }
  : {};

export default function PulseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
