// ============================================================
// Finns analyseudgave: typerne, og det der beregnes i kode
//
// Fra 22. oktober 2026 skriver Finn ikke længere 5 til 7 punkter om de
// samme månedstal hver dag. Han skriver:
//
//   - Dagens analyse: ét område, valgt ud fra hvad der faktisk har
//     bevæget sig. Hvad tallene siger, hvad det betyder, hvad der ville
//     ændre billedet. (Model, men hvert tal kontrolleres i kode.)
//   - Elprisen time for time, det usædvanlige og nyt i dag. (Kode.)
//   - Medietemaer: dagens økonomiske nyheder samlet og koblet til tal.
//   - En kort analyse per område, til områdesiderne.
//
// Det der kan beregnes, beregnes. En model bruges kun til at forbinde og
// forklare, og den får aldrig det sidste ord om et tal.
// ============================================================

import type { Post, TalPost } from "../kilder/typer";
import { OMRAADER, postIOmraade, type OmraadeNoegle } from "./omraader";
import { temaForKilde } from "../tema";

export type KildeRef = { id: string; navn: string; url: string; type: "tal" | "nyhed" };

/** Et afsnit med de kilder det bygger på. Selvtjekket holder tallene op mod netop dem. */
export type Afsnit = { tekst: string; kilder: KildeRef[] };

export type DagensAnalyse = {
  omraade: OmraadeNoegle;
  overskrift: string;
  tese: string;
  hvadTalleneSiger: Afsnit[];
  hvadDetBetyder: { virksomhed: string; husholdning: string };
  holdOeje: Afsnit[];
};

export type Medietema = {
  titel: string;
  omraade: OmraadeNoegle | null;
  kommentar: Afsnit | null;
  artikler: { titel: string; url: string; kilde: string }[];
};

export type Omraadeanalyse = { overskrift: string; afsnit: Afsnit[] };

export type Felt = {
  id: string;
  tema: string;
  omraade: OmraadeNoegle;
  vaerdi: string;
  etiket: string;
  url: string;
};

export type ElprisDag = {
  kode: "DK2" | "DK1";
  navn: string;
  timer: { time: number; pris: number }[];
  billigst: { time: number; pris: number };
  dyrest: { time: number; pris: number };
  snit: number;
};

export type Usaedvanligt = {
  id: string;
  navn: string;
  omraade: OmraadeNoegle | null;
  vaerdi: string;
  periode: string;
  tekst: string;
  opad: boolean;
  z: number;
  url: string;
};

export type NytTal = { id: string; navn: string; omraade: OmraadeNoegle | null; vaerdi: string; periode: string; aendring: string | null; url: string };

export type Analyse = {
  udgave: 1;
  dagens: DagensAnalyse | null;
  overblik: Felt[];
  elpris: ElprisDag[];
  usaedvanligt: Usaedvanligt[];
  nyt: NytTal[];
  medier: Medietema[];
  omraader: Partial<Record<OmraadeNoegle, Omraadeanalyse>>;
};

export function omraadeFor(postId: string): OmraadeNoegle | null {
  return OMRAADER.find((o) => postIOmraade(postId, o))?.noegle ?? null;
}

export function kildeRef(p: Post): KildeRef {
  return p.type === "tal"
    ? { id: p.id, navn: `${p.navn}, ${p.periode}`, url: p.url, type: "tal" }
    : { id: p.id, navn: p.titel, url: p.url, type: "nyhed" };
}

const vis = (p: TalPost) => `${p.vaerdiTekst}${p.enhed ? ` ${p.enhed}` : ""}`.trim();

/**
 * Overblikkets felter, valgt i kode. Samme tal hver dag, så man kan
 * sammenligne dag for dag. Elprisen er Øst (brugerens valg 22/10).
 */
const OVERBLIK: { id: string; etiket: (p: TalPost) => string }[] = [
  { id: "pulse:dst.pris.forbruger.aarsaendring", etiket: (p) => `inflation, ${p.periode}` },
  { id: "eds.timer:DK2", etiket: () => "elpris Østdanmark i dag, gennemsnit" },
  { id: "pulse:dst.rente.nationalbank.udlaan", etiket: () => "Nationalbankens udlånsrente" },
  { id: "pulse:dst.ledighed.sasonkorrigeret", etiket: (p) => `ledighed, ${p.periode}` },
  { id: "pulse:dst.konkurs.total", etiket: (p) => `konkurser, ${p.periode}` },
  { id: "pulse:dst.valuta.usd", etiket: () => "kroner for en dollar" },
  { id: "dst.ej56:0111", etiket: (p) => `huspriser år/år, ${p.periode}` },
  { id: "pulse:dst.forbrug.forventning.f1", etiket: (p) => `forbrugertillid, ${p.periode}` },
];

export function bygOverblik(poster: Post[]): Felt[] {
  const efterId = new Map(poster.map((p) => [p.id, p]));
  const felter: Felt[] = [];
  for (const o of OVERBLIK) {
    const p = efterId.get(o.id);
    if (!p || p.type !== "tal") continue;
    const omr = omraadeFor(p.id) ?? (p.id.startsWith("eds.timer") ? "energi" : null);
    if (!omr) continue;
    // Huspriserne vises som DST's ændring år/år; indekset alene siger ikke meget.
    const vaerdi = o.id === "dst.ej56:0111" && p.sammenligning ? p.sammenligning.aendringTekst : vis(p);
    felter.push({ id: p.id, tema: temaForKilde(p.id.startsWith("eds.timer") ? "eds.el" : p.id, "tal"), omraade: omr, vaerdi, etiket: o.etiket(p), url: p.url });
  }
  return felter;
}

export function bygElpris(poster: Post[]): ElprisDag[] {
  const ud: ElprisDag[] = [];
  for (const kode of ["DK2", "DK1"] as const) {
    const p = poster.find((x) => x.id === `eds.timer:${kode}`);
    if (!p || p.type !== "tal" || !p.timer?.length) continue;
    const billigst = p.timer.reduce((a, b) => (b.pris < a.pris ? b : a));
    const dyrest = p.timer.reduce((a, b) => (b.pris > a.pris ? b : a));
    ud.push({ kode, navn: kode === "DK2" ? "Østdanmark" : "Vestdanmark", timer: p.timer, billigst, dyrest, snit: p.vaerdi });
  }
  return ud;
}

/** De mest usædvanlige tal mod deres egne ti år, efter |z|. Kun |z| >= 1. */
export function bygUsaedvanligt(poster: Post[], antal = 4): Usaedvanligt[] {
  return poster
    .filter((p): p is TalPost => p.type === "tal" && !!p.usaedvanlighed && Math.abs(p.usaedvanlighed.z) >= 1)
    .sort((a, b) => Math.abs(b.usaedvanlighed!.z) - Math.abs(a.usaedvanlighed!.z))
    .slice(0, antal)
    .map((p) => ({
      id: p.id,
      navn: p.navn,
      omraade: omraadeFor(p.id),
      vaerdi: vis(p),
      periode: p.periode,
      tekst: p.usaedvanlighed!.tekst,
      opad: p.usaedvanlighed!.opad,
      z: p.usaedvanlighed!.z,
      url: p.url,
    }));
}

/** Tal udgivet inden for de seneste 48 timer. Daglige noteringer tæller ikke som "nyt". */
export function bygNyt(poster: Post[], nu: Date): NytTal[] {
  return poster
    .filter(
      (p): p is TalPost =>
        p.type === "tal" &&
        !p.id.startsWith("eds.timer") &&
        !/\d{1,2}\. [a-zæøå]+ \d{4}/.test(p.periode) &&
        nu.getTime() - new Date(p.foersteGangSet).getTime() < 48 * 3_600_000
    )
    .map((p) => ({
      id: p.id,
      navn: p.navn,
      omraade: omraadeFor(p.id),
      vaerdi: vis(p),
      periode: p.periode,
      aendring: p.sammenligning ? `${p.sammenligning.aendringTekst} mod ${p.sammenligning.slags}` : null,
      url: p.url,
    }));
}

/** Analysen som ren tekst, til Spørg Finn. Kun det der holdt selvtjekket. */
export function analyseSomTekst(a: Analyse): string {
  const linjer: string[] = [];
  if (a.dagens) {
    const d = a.dagens;
    linjer.push(`Dagens analyse (${d.omraade}): ${d.overskrift}. ${d.tese}`);
    for (const x of d.hvadTalleneSiger) linjer.push(`- ${x.tekst}`);
    linjer.push(`- For virksomheder: ${d.hvadDetBetyder.virksomhed}`, `- For husholdninger: ${d.hvadDetBetyder.husholdning}`);
    for (const x of d.holdOeje) linjer.push(`- Hold øje med: ${x.tekst}`);
  }
  for (const [noegle, o] of Object.entries(a.omraader)) {
    if (!o) continue;
    linjer.push(`Område ${noegle}: ${o.overskrift}`);
    for (const x of o.afsnit) linjer.push(`- ${x.tekst}`);
  }
  for (const m of a.medier) if (m.kommentar) linjer.push(`Medietema ${m.titel}: ${m.kommentar.tekst}`);
  return linjer.join("\n");
}
