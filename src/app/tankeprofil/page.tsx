import type { Metadata } from "next";
import { TankeprofilClient } from "@/components/tankeprofil/TankeprofilClient";

export const metadata: Metadata = {
  title: "Tankeprofil · Alius",
  description:
    "Lær dine præferencer at kende. Fire måder at tænke på, tre situationer at vælge imellem. En personlighedsprofil fra Alius.",
  openGraph: {
    title: "Personlighedsprofil · Alius",
    description:
      "En personlighedsprofil, der giver et klart billede af, hvor du naturligt finder energi, og hvor du kan have blinde vinkler eller oversete muligheder.",
    type: "website",
    locale: "da_DK",
    siteName: "Alius",
  },
  twitter: {
    card: "summary_large_image",
    title: "Personlighedsprofil · Alius",
    description:
      "En personlighedsprofil, der giver et klart billede af, hvor du naturligt finder energi, og hvor du kan have blinde vinkler eller oversete muligheder.",
  },
};

export default function TankeprofilPage() {
  return <TankeprofilClient />;
}
