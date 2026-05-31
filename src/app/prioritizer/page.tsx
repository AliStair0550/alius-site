import type { Metadata } from "next";
import { PrioritizerApp } from "./PrioritizerApp";

export const metadata: Metadata = {
  title: "Alius Prioritizer · Strategisk prioriteringsværktøj",
  description:
    "Prioritér initiativer og projekter med evidensbaseret scoring. Impact/Effort-matrix, prioriteret roadmap og ledelsesrapport — bygget til ledelser og konsulentholdene.",
};

export default function PrioritizerPage() {
  return <PrioritizerApp />;
}
