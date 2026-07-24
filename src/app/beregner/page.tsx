import type { Metadata } from "next";
import { BeregnerApp } from "./BeregnerApp";

export const metadata: Metadata = {
  alternates: { canonical: "/beregner" },
  title: "Hvad koster manuelt arbejde jer? Beregn det | Alius",
  description:
    "Tre tal, ét svar: hvad manuelt arbejde koster jeres virksomhed om året. Gratis beregner fra Alius.",
};

export default function BeregnerPage() {
  return <BeregnerApp />;
}
