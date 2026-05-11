// ============================================================
// Tankeprofil data: arketyper og spørgsmålskort
// Udviklet af Alius, inspireret af tænkningen bag Whole Brain
// Thinking (Dr. Kobus Neethling). Ord og fortolkning er Alius' egne.
// ============================================================

export type QuadrantKey = "A" | "B" | "C" | "D";

export type Archetype = {
  name: string;
  color: string;
  short: string;
  quote: string;
  room: string;
  description: string;
  strengths: [string, string][];
  blindspots: [string, string][];
};

export const ARCHETYPES: Record<QuadrantKey, Archetype> = {
  A: {
    name: "Analytiker",
    color: "#2D5F4A",
    short: "klar, rationel, faktaorienteret",
    quote: "Hvis det ikke kan måles, kan det ikke ledes.",
    room: "Et rum med store vinduer, et bord ryddet for unødvendigheder, og en notesbog hvor kun det vigtigste står tilbage. Du sidder her ofte, fordi det er her du tænker klarest.",
    description:
      "Du tænker i logik, beviser og struktur. Du stoler på det der kan måles, og du har sans for at skære gennem støj og finde det essentielle. Din styrke er præcision. Du ser tingene som de er, ikke som vi håber de er.",
    strengths: [
      ["Skarp analyse", "Du gennemskuer hurtigt komplekse problemer og finder kernen."],
      ["Objektivitet", "Du lader ikke følelser sløre dømmekraften."],
      ["Datadrevet", "Du baserer beslutninger på fakta, ikke fornemmelser."],
      ["Kritisk tænkning", "Du stiller de spørgsmål andre ikke tør."],
      ["Effektivitet", "Du går direkte mod målet uden omveje."],
    ],
    blindspots: [
      ["Kan virke kølig", "Andre kan opleve dig som distanceret eller utålmodig med følelser."],
      ["Overser nuancer", "Det menneskelige aspekt kan smutte når logikken tager over."],
      ["Analyseparalyse", "Risiko for at ville have al data før beslutning, og dermed udskyde."],
    ],
  },
  B: {
    name: "Bygmester",
    color: "#8B7355",
    short: "struktureret, disciplineret, detaljeret",
    quote: "Det der ikke står på en liste, sker ikke.",
    room: "Et rum med planer på væggen, farvede mapper, og et skab hvor alt har en plads. Du går ind her når noget skal færdiggøres, og du går ud igen med noget der virker.",
    description:
      "Du tænker i systemer, processer og holdbar kvalitet. Du elsker når tingene er på plads, og du er den der gør idéer til virkelighed. Din styrke er pålidelighed. Det du lover, leverer du.",
    strengths: [
      ["Planlægning", "Du tænker i trin, deadlines og leverancer."],
      ["Detaljeorientering", "Du fanger de små fejl andre overser."],
      ["Disciplin", "Du holder fast i kursen, også når det er kedeligt."],
      ["Struktur", "Du skaber overblik ud af kaos."],
      ["Pålidelighed", "Andre kan regne med dig."],
    ],
    blindspots: [
      ["Modstand mod forandring", "Du kan blive bundet til processer der ikke længere virker."],
      ["Over-planlægning", "Risiko for at planlægge i stedet for at handle."],
      ["Mister overblikket", "Du kan fortabe dig i detaljer og glemme det store billede."],
    ],
  },
  C: {
    name: "Forbinder",
    color: "#C8956D",
    short: "relationel, empatisk, kommunikerende",
    quote: "Det er aldrig kun en sag. Det er altid også mennesker.",
    room: "Et rum med varmt lys, en sofa der er blød af brug, og kaffekopper for to. Folk taler ærligt her, fordi du har gjort det muligt.",
    description:
      "Du tænker i mennesker, relationer og betydning. Du fornemmer hvad der sker mellem linjerne, og du skaber sammenhold der får ting til at lykkes. Din styrke er forbindelse. Du gør samarbejdet muligt.",
    strengths: [
      ["Empati", "Du forstår intuitivt hvad andre tænker og føler."],
      ["Kommunikation", "Du finder ord til det svære."],
      ["Samarbejde", "Du får grupper til at fungere."],
      ["Mentorering", "Du udvikler mennesker omkring dig."],
      ["Atmosfære", "Du skaber rum hvor folk tør være sig selv."],
    ],
    blindspots: [
      ["Konfliktsky", "Du kan undgå nødvendige svære samtaler for at bevare harmonien."],
      ["Tager for meget på dig", "Risiko for at bære andres følelser og brænde ud."],
      ["Personliggør kritik", "Du kan have svært ved at adskille feedback fra dig selv."],
    ],
  },
  D: {
    name: "Visionær",
    color: "#5B7C9D",
    short: "intuitiv, visionær, eksperimenterende",
    quote: "Det vi ikke kan se endnu, er det vi skal arbejde mod.",
    room: "Et rum med højt til loftet, ufærdige skitser på bordet, og et vindue der vender mod horisonten. Du går ind her når noget kalder, og du går ud med en ny retning.",
    description:
      "Du tænker i muligheder, billeder og helheder. Du ser hvor tingene kan bevæge sig hen længe før andre ser det. Din styrke er forestillingsevne. Du åbner døre andre ikke vidste fandtes.",
    strengths: [
      ["Vision", "Du ser det store billede og fremtiden."],
      ["Kreativitet", "Du tænker uden for de givne rammer."],
      ["Intuition", "Du mærker hvad der er rigtigt før du kan forklare hvorfor."],
      ["Risikovillighed", "Du tør gå nye veje uden at vide hvor de fører hen."],
      ["Innovation", "Du forbinder idéer der ikke plejer at høre sammen."],
    ],
    blindspots: [
      ["Mangler opfølgning", "Du starter mere end du afslutter."],
      ["Utålmodighed med detaljer", "Du springer over hvor gærdet er lavest."],
      ["Kan virke flyvsk", "Andre kan have svært ved at følge dine spring."],
    ],
  },
};

export type Card = {
  id: string;
  title: string;
  subtitle: string;
  instruction: string;
  words: Record<QuadrantKey, string[]>;
};

export const CARDS: Card[] = [
  {
    id: "kommunikation",
    title: "Kommunikation",
    subtitle: "Kort 1 af 3",
    instruction: "Vælg de otte ord der bedst beskriver dig når du taler med andre.",
    words: {
      A: ["Præcis", "Saglig", "Faktabaseret", "Logisk", "Velbegrundet", "Spørgende", "Direkte", "Konkret"],
      B: ["Forberedt", "Struktureret", "Punktlig", "Velordnet", "Detaljeret", "Pålidelig", "Metodisk", "Grundig"],
      C: ["Lyttende", "Varm", "Inkluderende", "Empatisk", "Tålmodig", "Anerkendende", "Åben", "Personlig"],
      D: ["Visionær", "Billedrig", "Inspirerende", "Konceptuel", "Modig", "Strategisk", "Metaforisk", "Intuitiv"],
    },
  },
  {
    id: "problemlosning",
    title: "Problemløsning",
    subtitle: "Kort 2 af 3",
    instruction: "Vælg de otte ord der bedst beskriver dig når du løser et problem.",
    words: {
      A: ["Analyserer årsager", "Søger data", "Stiller kritiske spørgsmål", "Vejer fordele og ulemper", "Identificerer mønstre", "Tester antagelser", "Måler resultater", "Fokuserer på det vigtigste"],
      B: ["Laver en plan", "Bryder ned i trin", "Holder styr på fremdrift", "Følger en proces", "Tjekker detaljer", "Bruger afprøvede metoder", "Dokumenterer undervejs", "Holder deadlines"],
      C: ["Lytter til de involverede", "Mærker stemningen", "Tænker på menneskelige konsekvenser", "Inddrager andre", "Søger fælles forståelse", "Værdsætter intuition", "Forbinder med erfaringer", "Spørger hvorfor det betyder noget"],
      D: ["Ser det store billede", "Genererer alternativer", "Bryder rammerne", "Stoler på fornemmelser", "Springer i nye retninger", "Forestiller mig fremtiden", "Forbinder fjerne idéer", "Tør tage risici"],
    },
  },
  {
    id: "laering",
    title: "Læring",
    subtitle: "Kort 3 af 3",
    instruction: "Vælg de otte ord der bedst beskriver dig når du skal lære noget nyt.",
    words: {
      A: ["Læser kilder grundigt", "Stiller spørgsmål til materialet", "Foretrækker at arbejde alene", "Skriver korte præcise noter", "Tester min forståelse", "Søger den underliggende logik", "Holder af klare definitioner", "Bygger viden lag for lag"],
      B: ["Følger en fast struktur", "Repeterer indtil det sidder", "Holder af klare instruktioner", "Arbejder i stabile rammer", "Tager omfattende noter", "Lærer bedst trin for trin", "Holder mig til planen", "Foretrækker praktisk anvendelse"],
      C: ["Lærer bedst sammen med andre", "Taler stoffet igennem", "Knytter det til egne oplevelser", "Foretrækker uformelle rammer", "Læser stemningen i rummet", "Finder mening i emnet", "Husker bedst når jeg fortæller videre", "Lader følelser være med"],
      D: ["Søger det nye og uprøvede", "Keder mig hurtigt", "Forbinder med fremtidige muligheder", "Bruger visuelle hjælpemidler", "Stiller spørgsmålstegn ved indholdet", "Springer mellem emner", "Foretrækker ustruktureret udforskning", "Finder mine egne veje"],
    },
  },
];

export type Totals = Record<QuadrantKey, number>;
export type Selections = Record<QuadrantKey, string[]>[];

export function emptySelections(): Selections {
  return [
    { A: [], B: [], C: [], D: [] },
    { A: [], B: [], C: [], D: [] },
    { A: [], B: [], C: [], D: [] },
  ];
}

export function getTotals(selections: Selections): Totals {
  const totals: Totals = { A: 0, B: 0, C: 0, D: 0 };
  for (const s of selections) {
    totals.A += s.A.length;
    totals.B += s.B.length;
    totals.C += s.C.length;
    totals.D += s.D.length;
  }
  return totals;
}

export function getRanking(selections: Selections) {
  const totals = getTotals(selections);
  const sum = totals.A + totals.B + totals.C + totals.D;
  const pct: Totals = {
    A: sum > 0 ? totals.A / sum : 0,
    B: sum > 0 ? totals.B / sum : 0,
    C: sum > 0 ? totals.C / sum : 0,
    D: sum > 0 ? totals.D / sum : 0,
  };
  const ranked = (Object.entries(totals) as [QuadrantKey, number][]).sort(
    (a, b) => b[1] - a[1]
  );
  return {
    totals,
    pct,
    ranked,
    primary: ranked[0][0],
    secondary: ranked[1][0],
    weakest: ranked[3][0],
  };
}
