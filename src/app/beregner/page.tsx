import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-metadata";
import { BeregnerApp } from "./BeregnerApp";

export const metadata: Metadata = pageMetadata({
  title: "Hvad koster manuelt arbejde jer? Beregn det | Alius",
  description:
    "Tre tal, ét svar: hvad manuelt arbejde koster jeres virksomhed om året. Gratis beregner fra Alius.",
  path: "/beregner",
});

export default function BeregnerPage() {
  return <BeregnerApp />;
}
