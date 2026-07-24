import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-metadata";
import { TankeprofilClient } from "@/components/tankeprofil/TankeprofilClient";

export const dynamic = "force-static";

export const metadata: Metadata = pageMetadata({
  title: "Tankeprofil · Alius",
  description:
    "Lær dine præferencer at kende. Fire måder at tænke på, tre situationer at vælge imellem. En personlighedsprofil fra Alius.",
  path: "/tankeprofil",
  image: "/tankeprofil/opengraph-image",
});

export default function TankeprofilPage() {
  return <TankeprofilClient />;
}
