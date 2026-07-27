// ============================================================
// Afledte serier
//
// Datakatalogets afsnit 5: "Rådata sælger ikke. Beregn disse ved
// indlæsning og gem dem som selvstændige serier."
//
// En afledt serie henter intet. Den læser to serier der allerede står i
// basen og skriver en tredje. Derfor har den ingen adapter og ingen
// sourceRef, men den har samme livscyklus som alt andet: den skrives
// append-only og indgår i stale-tjekket.
// ============================================================

import type { Frequency, Layer, ZTransform } from "../src/lib/adapters/types";

export type DerivedDef = {
  id: string;
  nameDa: string;
  unit: string;
  frequency: Frequency;
  layer: Layer;
  zTransform: ZTransform;
  attribution: string;
  expectedLagDays: number;

  rankable?: boolean;
  rankableReason?: string;

  /**
   * `ratio`  a / b, ganget med scale. Til deflatering og indeksforhold.
   * `spread` a - b. Til marginer og differenser.
   */
  kind: "ratio" | "spread";
  /** Tælleren, eller den serie der trækkes fra. */
  a: string;
  /** Nævneren, eller den serie der trækkes. */
  b: string;
  scale?: number;
};

export const DERIVED: DerivedDef[] = [
  {
    // Nominel omsætning divideret med forbrugerpriser giver mængde.
    // Forskellen er præcis spørgsmålet "solgte de mere, eller kostede
    // det bare mere". I en inflationsperiode stiger værdiindekset selv
    // når mængden falder, og det er et systematisk misvisende signal.
    id: "derived.detail.maengde",
    nameDa: "Detailomsætning, mængdeindeks (deflateret)",
    unit: "indeks",
    frequency: "MONTHLY",
    layer: "REALISED",
    zTransform: "yoy",
    attribution:
      "Beregnet af Alius. Danmarks Statistik, DETA211A og PRIS01. CC 4.0 BY",
    expectedLagDays: 62,
    kind: "ratio",
    a: "dst.detail.omsaetning.g47",
    b: "dst.pris.forbruger.indeks",
    scale: 100,
  },
];
