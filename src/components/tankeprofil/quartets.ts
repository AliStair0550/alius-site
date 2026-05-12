import type { QuadrantKey } from "./data";

export type Quartet = {
  id: string;
  cardId: number;
  theme?: string;
  words: Record<QuadrantKey, string>;
};

export const QUARTETS: Quartet[] = [
  // ──────────────────────────────────────────
  // Kort 0 · Kommunikation (8 quartets)
  // ──────────────────────────────────────────
  {
    id: "k0-q0",
    cardId: 0,
    theme: "naturlig stil",
    words: { A: "Præcis", B: "Metodisk", C: "Lyttende", D: "Visionær" },
  },
  {
    id: "k0-q1",
    cardId: 0,
    theme: "tilgang til samtalen",
    words: { A: "Logisk", B: "Forberedt", C: "Varm", D: "Strategisk" },
  },
  {
    id: "k0-q2",
    cardId: 0,
    theme: "dybde",
    words: { A: "Faktabaseret", B: "Detaljeret", C: "Empatisk", D: "Konceptuel" },
  },
  {
    id: "k0-q3",
    cardId: 0,
    theme: "tone",
    words: { A: "Saglig", B: "Struktureret", C: "Inkluderende", D: "Inspirerende" },
  },
  {
    id: "k0-q4",
    cardId: 0,
    theme: "måde at vurdere",
    words: { A: "Velbegrundet", B: "Grundig", C: "Anerkendende", D: "Intuitiv" },
  },
  {
    id: "k0-q5",
    cardId: 0,
    theme: "orientering mod andre",
    words: { A: "Spørgende", B: "Pålidelig", C: "Tålmodig", D: "Modig" },
  },
  {
    id: "k0-q6",
    cardId: 0,
    theme: "udtryk og form",
    words: { A: "Konkret", B: "Velordnet", C: "Åben", D: "Billedrig" },
  },
  {
    id: "k0-q7",
    cardId: 0,
    theme: "kommunikationsstil",
    words: { A: "Direkte", B: "Punktlig", C: "Personlig", D: "Metaforisk" },
  },

  // ──────────────────────────────────────────
  // Kort 1 · Problemløsning (8 quartets)
  // ──────────────────────────────────────────
  {
    id: "k1-q0",
    cardId: 1,
    theme: "første skridt",
    words: {
      A: "Identificerer mønstre",
      B: "Laver en plan",
      C: "Lytter til de involverede",
      D: "Ser det store billede",
    },
  },
  {
    id: "k1-q1",
    cardId: 1,
    theme: "informationsindsamling",
    words: {
      A: "Søger data",
      B: "Bryder ned i trin",
      C: "Forbinder med erfaringer",
      D: "Genererer alternativer",
    },
  },
  {
    id: "k1-q2",
    cardId: 1,
    theme: "beslutningsgrundlag",
    words: {
      A: "Vejer fordele og ulemper",
      B: "Bruger afprøvede metoder",
      C: "Søger fælles forståelse",
      D: "Stoler på fornemmelser",
    },
  },
  {
    id: "k1-q3",
    cardId: 1,
    theme: "tilgang undervejs",
    words: {
      A: "Tester antagelser",
      B: "Følger en proces",
      C: "Inddrager andre",
      D: "Bryder rammerne",
    },
  },
  {
    id: "k1-q4",
    cardId: 1,
    theme: "fremdrift",
    words: {
      A: "Måler resultater",
      B: "Holder styr på fremdrift",
      C: "Mærker stemningen",
      D: "Springer i nye retninger",
    },
  },
  {
    id: "k1-q5",
    cardId: 1,
    theme: "dybde og konsekvenser",
    words: {
      A: "Analyserer årsager",
      B: "Dokumenterer undervejs",
      C: "Tænker på menneskelige konsekvenser",
      D: "Forestiller mig fremtiden",
    },
  },
  {
    id: "k1-q6",
    cardId: 1,
    theme: "prioritering og retning",
    words: {
      A: "Fokuserer på det vigtigste",
      B: "Holder deadlines",
      C: "Spørger hvorfor det betyder noget",
      D: "Tør tage risici",
    },
  },
  {
    id: "k1-q7",
    cardId: 1,
    theme: "hvad du trækker på",
    words: {
      A: "Stiller kritiske spørgsmål",
      B: "Tjekker detaljer",
      C: "Værdsætter intuition",
      D: "Forbinder fjerne idéer",
    },
  },

  // ──────────────────────────────────────────
  // Kort 2 · Læring (7 quartets)
  // ──────────────────────────────────────────
  {
    id: "k2-q0",
    cardId: 2,
    theme: "tilgang til nyt stof",
    words: {
      A: "Søger den underliggende logik",
      B: "Lærer bedst trin for trin",
      C: "Knytter det til egne oplevelser",
      D: "Forbinder med fremtidige muligheder",
    },
  },
  {
    id: "k2-q1",
    cardId: 2,
    theme: "notering og hukommelse",
    words: {
      A: "Skriver korte præcise noter",
      B: "Tager omfattende noter",
      C: "Husker bedst når jeg fortæller videre",
      D: "Bruger visuelle hjælpemidler",
    },
  },
  {
    id: "k2-q2",
    cardId: 2,
    theme: "foretrukne rammer",
    words: {
      A: "Foretrækker at arbejde alene",
      B: "Arbejder i stabile rammer",
      C: "Lærer bedst sammen med andre",
      D: "Foretrækker ustruktureret udforskning",
    },
  },
  {
    id: "k2-q3",
    cardId: 2,
    theme: "hvad der motiverer",
    words: {
      A: "Holder af klare definitioner",
      B: "Holder af klare instruktioner",
      C: "Finder mening i emnet",
      D: "Stiller spørgsmålstegn ved indholdet",
    },
  },
  {
    id: "k2-q4",
    cardId: 2,
    theme: "aktiv læreproces",
    words: {
      A: "Tester min forståelse",
      B: "Repeterer indtil det sidder",
      C: "Taler stoffet igennem",
      D: "Springer mellem emner",
    },
  },
  {
    id: "k2-q5",
    cardId: 2,
    theme: "strukturpræference",
    words: {
      A: "Bygger viden lag for lag",
      B: "Følger en fast struktur",
      C: "Foretrækker uformelle rammer",
      D: "Finder mine egne veje",
    },
  },
  {
    id: "k2-q6",
    cardId: 2,
    theme: "drivkraft i læring",
    words: {
      A: "Læser kilder grundigt",
      B: "Foretrækker praktisk anvendelse",
      C: "Læser stemningen i rummet",
      D: "Søger det nye og uprøvede",
    },
  },
];

export function getQuartetsForCard(cardId: number): Quartet[] {
  return QUARTETS.filter((q) => q.cardId === cardId);
}
