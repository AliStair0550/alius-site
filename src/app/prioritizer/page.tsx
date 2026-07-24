import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-metadata";
import { PrioritizerApp } from "./PrioritizerApp";

export const metadata: Metadata = pageMetadata({
  title: "Prioriteringsværktøj · Alius",
  description:
    "Prioritér initiativer og projekter med evidensbaseret scoring. Impact/Effort-matrix, prioriteret roadmap og ledelsesrapport, bygget til ledelser og konsulentholdene.",
  path: "/prioritizer",
});

export default function PrioritizerPage() {
  return <PrioritizerApp />;
}
