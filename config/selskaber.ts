// ============================================================
// Børsnoterede selskaber hvis regnskaber hentes fra Erhvervsstyrelsen
//
// EFTERPRØVET 22. oktober 2026: hvert CVR blev slået op, seneste
// ESEF-regnskab hentet, og navnet i selskabets eget regnskab sammenlignet
// med navnet her. Et forkert CVR ville give et andet selskabs tal, og de
// ville se fuldt plausible ud. Kørslen tjekker navnet igen hver gang.
//
// VALUTA er den selskabet aflægger regnskab i, som læst fra regnskabet.
// Den er erklæret her, og kørslen stopper hvis regnskabet siger noget
// andet. Skifter et selskab regnskabsvaluta, skal det besluttes, ikke
// glide igennem.
//
// Banker og forsikring er ikke med. De har ingen omsætning i IFRS'
// forstand (renteindtægter og præmier er noget andet), og at stille dem
// op ved siden af ville sammenligne to forskellige ting.
// ============================================================

import type { Valuta } from "../src/lib/regnskaber/esef";

export type Selskab = {
  cvr: string;
  /** Det navn vi viser. */
  navn: string;
  /**
   * Navnet som det står i selskabets eget regnskab. null betyder at
   * regnskabet ikke angiver et navn; så skal `udenNavn` sige hvorfor vi
   * alligevel stoler på CVR'et.
   */
  navnIRegnskab: string | null;
  udenNavn?: string;
  valuta: Valuta;
  /** Første måned i regnskabsåret, når det ikke er januar. */
  regnskabsaarStart?: number;
  /**
   * Selskabet skiftede regnskabsvaluta. Indleveringer for perioder der
   * slutter før `fraPeriodeSlut` er i den gamle valuta og springes over
   * med besked. Den første indlevering i den nye valuta har
   * sammenligningstallene omregnet, så året før er der alligevel.
   */
  valutaskifte?: { fraPeriodeSlut: string; foer: Valuta };
  /**
   * Indleveringer der er kendt forkerte i selskabets egen fil, med grund.
   * Springes over med besked. Skal være fundet og forklaret, ikke gættet.
   */
  springOver?: { sagsNummer: string; grund: string }[];
};

export const SELSKABER: Selskab[] = [
  { cvr: "24256790", navn: "Novo Nordisk", navnIRegnskab: "Novo Nordisk A/S", valuta: "DKK" },
  { cvr: "58233528", navn: "DSV", navnIRegnskab: "DSV A/S", valuta: "DKK" },
  { cvr: "22756214", navn: "A.P. Møller - Mærsk", navnIRegnskab: "A.P. Møller - Mærsk A/S", valuta: "USD" },
  { cvr: "10403782", navn: "Vestas", navnIRegnskab: "Vestas Wind Systems A/S", valuta: "EUR" },
  { cvr: "61056416", navn: "Carlsberg", navnIRegnskab: "Carlsberg A/S", valuta: "DKK" },
  { cvr: "36213728", navn: "Ørsted", navnIRegnskab: "Ørsted A/S", valuta: "DKK" },
  { cvr: "28505116", navn: "Pandora", navnIRegnskab: "Pandora A/S", valuta: "DKK" },
  { cvr: "69749917", navn: "Coloplast", navnIRegnskab: "Coloplast A/S", valuta: "DKK", regnskabsaarStart: 10 },
  // Novonesis indleverer stadig under det juridiske navn Novozymes A/S.
  {
    cvr: "10007127",
    navn: "Novonesis",
    navnIRegnskab: "Novozymes A/S",
    valuta: "EUR",
    valutaskifte: { fraPeriodeSlut: "2024-06-30", foer: "DKK" },
  },
  { cvr: "21023884", navn: "Genmab", navnIRegnskab: "Genmab A/S", valuta: "USD", valutaskifte: { fraPeriodeSlut: "2025-03-31", foer: "DKK" } },
  { cvr: "71186911", navn: "Demant", navnIRegnskab: "Demant A/S", valuta: "DKK" },
  { cvr: "24257843", navn: "GN Store Nord", navnIRegnskab: "GN Store Nord", valuta: "DKK" },
  { cvr: "54879415", navn: "ROCKWOOL", navnIRegnskab: "ROCKWOOL A/S", valuta: "EUR" },
  { cvr: "20045078", navn: "Zealand Pharma", navnIRegnskab: "Zealand Pharma A/S", valuta: "DKK" },
  {
    cvr: "62725214",
    navn: "NKT",
    navnIRegnskab: "NKT A/S",
    valuta: "EUR",
    springOver: [{ sagsNummer: "X25-EB-09-KG", grund: "Halvårsrapporten 2025 har ingen omsætning i ESEF-filen, kun et udvidelseselement om sikring. Uden omsætning kan skalaen ikke efterprøves. Fundet 22/10 2026." }],
  },
  { cvr: "58180912", navn: "FLSmidth", navnIRegnskab: "FLSmidth & Co. A/S", valuta: "DKK" },
  { cvr: "28504799", navn: "ISS", navnIRegnskab: "ISS A/S", valuta: "DKK" },
  {
    cvr: "63644919",
    navn: "Ambu",
    navnIRegnskab: null,
    udenNavn:
      "Ambus ESEF-instans angiver ikke NameOfReportingEntity. CVR'et er tjekket 22/10 2026 mod indleveringen i Erhvervsstyrelsens arkiv, og omsætningen (1.640 mio. kr. i 3. kvartal 2025/26) passer med Ambus størrelse.",
    valuta: "DKK",
    regnskabsaarStart: 10,
  },
  { cvr: "16271187", navn: "Bavarian Nordic", navnIRegnskab: "Bavarian Nordic A/S", valuta: "DKK" },
  { cvr: "41956712", navn: "Royal Unibrew", navnIRegnskab: "Royal Unibrew A/S", valuta: "DKK" },
  {
    cvr: "39488914",
    navn: "Netcompany",
    navnIRegnskab: "Netcompany Group A/S",
    valuta: "DKK",
    // Netcompanys ÅRSRAPPORTER indleveres i tusinder men mærket som hele
    // kroner: balancen 2025 står som 9.903.600 kr. i stedet for 9,9 mia.
    // Gælder 2023, 2024 og 2025, og Q4-meddelelsen 2023. Delårsrapporterne
    // er rigtige, og Q4-meddelelserne 2024 og 2025 har samme helårstal
    // rigtigt, så intet går tabt. Fundet af skalaværnet 22/10 2026.
    // Årsrapporten 2026 (indleveres cirka februar 2027) vil sandsynligvis
    // have samme fejl; så stopper kørslen, og den skal tilføjes her.
    springOver: [
      { sagsNummer: "X24-AG-63-CN", grund: "Q4-meddelelsen 2023 i tusinder mærket som kroner (aktiver 8.159.800 kr.)." },
      { sagsNummer: "X24-GM-68-RZ", grund: "Årsrapporten 2023 i tusinder mærket som kroner (aktiver 8.159.800 kr.)." },
      { sagsNummer: "X25-AZ-73-CJ", grund: "Årsrapporten 2024 i tusinder mærket som kroner (aktiver 8.072.300 kr.). Q4-meddelelsen X25-AZ-73-UD er rigtig." },
      { sagsNummer: "X26-BG-26-EA", grund: "Årsrapporten 2025 i tusinder mærket som kroner (aktiver 9.903.600 kr.). Q4-meddelelsen X26-AW-78-SY er rigtig." },
    ],
  },
];

/**
 * Skalaankeret: samlede aktiver på balancedagen, i hele valutaenheder.
 * Det mindste selskab på listen har aktiver i milliardklassen. En fil med
 * beløb i tusinder eller mio. mærket som hele enheder lander under
 * bunden. Netcompanys Q4-meddelelse 2023 er sådan en fil.
 */
export const AKTIVER = { min: 500_000_000, max: 20_000_000_000_000 };

/**
 * Yderste grænser per begreb, i hele valutaenheder. Fanger kun det
 * absurde; skalaen afgøres af aktiverne. Omsætningen kan reelt være lille:
 * Zealand Pharmas 3. kvartal 2024 var 4,4 mio. kr.
 */
export const STOERRELSE: Record<"omsaetning" | "driftsresultat" | "resultat", { min: number; max: number }> = {
  omsaetning: { min: 0, max: 2_000_000_000_000 },
  driftsresultat: { min: -500_000_000_000, max: 500_000_000_000 },
  resultat: { min: -500_000_000_000, max: 500_000_000_000 },
};
