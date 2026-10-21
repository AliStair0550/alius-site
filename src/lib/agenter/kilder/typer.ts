// ============================================================
// Fælles form for alle agenternes kilder
//
// Hver kilde er sit eget modul med samme grænseflade. Pipelinen kalder
// dem, og deres beskrivelser står i agentens systemprompt, så agenten
// ved hvad hver kilde kan og ikke kan.
//
// En kilde svarer ALTID med en status. "Kilden afviste os", "robots.txt
// forbyder det" og "kilden havde intet nyt" er tre forskellige svar og
// må aldrig ende som den samme tomme liste. Se CLAUDE.md om tilstande.
// ============================================================

/** Hvordan et tal er renset for sæsonudsving. Efterprøvet per serie. */
export type Saeson = "korrigeret" | "ikke korrigeret" | "ikke relevant" | "ukendt";

export type Sammenligning = {
  /** Hvad tallet holdes op imod. Valgt ud fra sæsonkorrektionen. */
  slags: "forrige periode" | "samme periode året før" | "forrige notering";
  periode: string;
  /** null når kilden selv har regnet ændringen og ikke leverer niveauet. */
  vaerdi: number | null;
  vaerdiTekst: string | null;
  /** Satser i point, mængder i procent. Afrundet som Finn må citere dem. */
  aendring: number;
  aendringEnhed: string;
  aendringTekst: string;
};

export type TalPost = {
  type: "tal";
  id: string;
  kilde: string;
  navn: string;
  enhed: string;
  saeson: Saeson;
  url: string;
  periode: string;
  vaerdi: number;
  vaerdiTekst: string;
  sammenligning: Sammenligning | null;
  /** De seneste værdier, nyeste først. */
  forloeb: { periode: string; vaerdi: number }[];
  /**
   * Hvor mange perioder i træk serien er gået samme vej, talt i kode over
   * hele den hentede historik. Agenten må kun bruge dette felt til "i træk":
   * da den talte selv, skrev den "fire måneder" ud fra fire værdier.
   */
  tendens: string | null;
  /** Hvornår vi første gang så den nyeste periode. Bruges som udgivelsestid. */
  foersteGangSet: string;
};

export type NyhedPost = {
  type: "nyhed";
  id: string;
  kilde: string;
  titel: string;
  url: string;
  /** ISO-tid fra feedet. */
  dato: string;
};

export type Post = TalPost | NyhedPost;

export type KildeStatus = "ok" | "tom" | "fejl" | "blokeret";

export type KildeSvar = {
  kilde: string;
  navn: string;
  url: string;
  hentet: string;
  status: KildeStatus;
  poster: Post[];
  /** Hvorfor status ikke er ok. Påkrævet for fejl og blokeret. */
  besked?: string;
  /** Kom svaret fra dagens cache i stedet for fra kilden. */
  fraCache?: boolean;
};

export interface Kilde {
  id: string;
  navn: string;
  /** Står i systemprompten. Hvad kilden er, og hvad den ikke kan. */
  beskrivelse: string;
  hent(dag: string): Promise<KildeSvar>;
}

/** Brugeragenten agenterne præsenterer sig med. */
export const BRUGERAGENT = "AliusAgenter/1.0 (+https://alius.dk/agenter)";
