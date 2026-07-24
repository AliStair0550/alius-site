import type { Metadata } from "next";
import { PrioritizerApp } from "./PrioritizerApp";

export const metadata: Metadata = {
  alternates: { canonical: "/prioritizer" },
  title: "Prioriteringsværktøj · Alius",
  description:
    "Prioritér initiativer og projekter med evidensbaseret scoring. Impact/Effort-matrix, prioriteret roadmap og ledelsesrapport, bygget til ledelser og konsulentholdene.",
};

export default function PrioritizerPage() {
  return <PrioritizerApp />;
}
