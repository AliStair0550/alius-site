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
    quote: "Gode systemer overlever dårlige dage.",
    room: "Et rum hvor lyset falder gennem fag på en reol. Der er styr på tingene, men ikke sterilt. En kalender på væggen, en blok med streger over det der er gjort. Du går ind her når noget skal igennem, ikke når noget skal opfindes.",
    description:
      "Du tænker i rækkefølge, ansvar og det der holder. Du elsker ikke regler for reglernes skyld, men fordi de gør det muligt at stole på en proces når presset er på. Din styrke er udførelse. Du gør forskellen mellem en god idé og en idé der overlever mødet med virkeligheden.",
    strengths: [
      ["Færdiggørelse", "Du følger det hjem som andre giver op på."],
      ["Pålidelighed", "Det du siger, gør du. Det folk regner med, holder."],
      ["Detaljen der vælter", "Du fanger den lille fejl der ville have kostet stort senere."],
      ["Tempo", "Du ved at jævnt, vedvarende arbejde slår sprint hver gang."],
      ["Standarder", "Du hæver kvaliteten omkring dig uden at sige det højt."],
    ],
    blindspots: [
      ["Holder fast for længe", "Du kan blive bundet til en proces der ikke længere giver mening."],
      ["Bygger før du spørger", "Du går i gang før alle har afklaret om I løser det rigtige problem."],
      ["Tager dit ansvar personligt", "Når noget vakler, tager du det på dig i stedet for at lade systemet fejle."],
    ],
  },
  C: {
    name: "Forbinder",
    color: "#C8956D",
    short: "relationel, empatisk, kommunikerende",
    quote: "Det vi laver sammen, er det det handler om.",
    room: "Et rum der dufter af det andre mennesker har efterladt. To kopper på bordet, en stol der er trukket tæt på en anden. Folk taler langsomt her, fordi du har givet dem tid. Der bliver sagt det der ikke kunne siges på mødet før.",
    description:
      "Du tænker i mennesker, mellemrum og den underforståede temperatur i et rum. Du opfanger hvad der bliver sagt mellem ordene, og du gør samtaler mulige som ellers ville være gået i ring. Din styrke er tillid. Du er den der får andre til at turde det de ikke turde alene.",
    strengths: [
      ["Læser rummet", "Du ved hvornår nogen er ved at miste fodfæste, før de selv ved det."],
      ["Skaber tryghed", "Folk siger sandheden til dig fordi du har vist at det er sikkert."],
      ["Bygger broer", "Du oversætter mellem mennesker der taler forbi hinanden."],
      ["Holder på folk", "Du husker hvad der betyder noget for dem, længe efter andre har glemt det."],
      ["Får hold til at hænge sammen", "Når noget er ved at falde fra hinanden, er du den der samler det."],
    ],
    blindspots: [
      ["Undgår det skarpe", "Du udskyder den nødvendige samtale fordi den koster relationen kortvarigt."],
      ["Bærer andres vægt", "Du tager andres uro med hjem og lader den vokse i dig."],
      ["Forveksler harmoni med løsning", "Når stemningen er god, tror du problemet er løst. Det er det ikke altid."],
    ],
  },
  D: {
    name: "Visionær",
    color: "#5B7C9D",
    short: "intuitiv, visionær, eksperimenterende",
    quote: "Det interessante er altid lige rundt om hjørnet.",
    room: "Et rum med højt til loftet og et bord der er for stort til kun én. Skitser oven på skitser, en bog der er åben på den forkerte side. Tre projekter i gang, et fjerde der lige er begyndt at lyse. Du går herfra med en retning, sjældent med en plan.",
    description:
      "Du tænker i muligheder, mønstre og det der endnu ikke er sket. Du forbinder ting der ikke plejer at høre sammen, og du kan se en retning før der findes en vej. Din styrke er åbning. Du udvider hvad gruppen tror er muligt, ofte uden at vide hvor langt det rækker.",
    strengths: [
      ["Ser tre træk frem", "Du opfanger en bevægelse mens andre stadig analyserer udgangspunktet."],
      ["Forbinder fjerne idéer", "Du tager noget fra ét felt og bruger det et andet sted hvor det giver ny mening."],
      ["Starter bevægelsen", "Du tør tage det første skridt før vejen er tegnet."],
      ["Stiller det rigtige spørgsmål", "Hvad nu hvis vi gjorde det modsatte? Det åbner mere end ti analyser."],
      ["Bærer billedet", "Når andre mister troen, holder du fast i hvad det kan blive til."],
    ],
    blindspots: [
      ["Mister motivation når det skal færdiggøres", "Du er bedst i starten. Slutspurten kalder ofte en anden type energi."],
      ["Glemmer hvem der skal med", "Du springer videre uden at tjekke om holdet er klar til springet."],
      ["Forveksler bevægelse med fremdrift", "Mange retninger er ikke det samme som én vej."],
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
