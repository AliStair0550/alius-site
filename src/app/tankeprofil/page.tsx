import type { Metadata } from "next";
import { TankeprofilClient } from "@/components/tankeprofil/TankeprofilClient";

export const metadata: Metadata = {
  title: "Tankeprofil · Alius",
  description:
    "Lær dine præferencer at kende. Fire måder at tænke på, tre situationer at vælge imellem. En personlighedsprofil fra Alius.",
  openGraph: {
    title: "Tankeprofil · Alius",
    description:
      "Fire måder at tænke på. Tre situationer at vælge imellem. En personlighedsprofil, der giver et klart billede af, hvor du naturligt finder energi.",
    type: "website",
    locale: "da_DK",
    siteName: "Alius",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tankeprofil · Alius",
    description:
      "Fire måder at tænke på. Tre situationer at vælge imellem. En personlighedsprofil, der giver et klart billede af, hvor du naturligt finder energi.",
  },
};

export default function TankeprofilPage() {
  return <TankeprofilClient />;
}
