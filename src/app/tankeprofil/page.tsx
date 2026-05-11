import type { Metadata } from "next";
import { TankeprofilClient } from "@/components/tankeprofil/TankeprofilClient";

export const metadata: Metadata = {
  title: "Tankeprofil · Alius",
  description:
    "Lær din tænkning at kende. Fire måder at tænke på, tre situationer at vælge i. Et personligt værktøj fra Alius.",
  openGraph: {
    title: "Tankeprofil · Alius",
    description:
      "Lær din tænkning at kende. Fire måder at tænke på, tre situationer at vælge i.",
    type: "website",
    locale: "da_DK",
    siteName: "Alius",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tankeprofil · Alius",
    description:
      "Lær din tænkning at kende. Fire måder at tænke på, tre situationer at vælge i.",
  },
};

export default function TankeprofilPage() {
  return <TankeprofilClient />;
}
