// ============================================================
// Finns områder
//
// Ét sted. Analysen vælger et område, områdesiderne viser et område, og
// Spørg Finn kan afgrænses til et område. Serierne her er de samme som i
// FINN_SERIER; et område uden serier ville være en side uden tal.
// ============================================================

export type OmraadeNoegle = "priser" | "energi" | "renter" | "arbejde" | "virksomheder" | "bolig" | "forbrug";

export type Omraade = {
  noegle: OmraadeNoegle;
  navn: string;
  /** Én linje om hvad området dækker. Står på områdesiden. */
  beskrivelse: string;
  /** Pulse-serier i området. Den første er områdets hovedtal. */
  serier: string[];
  /** Andre kilder i området (ikke Pulse), fx DST EJ56. */
  andreKilder?: string[];
};

export const OMRAADER: Omraade[] = [
  {
    noegle: "priser",
    navn: "Priser",
    beskrivelse: "Inflation, forbrugerpriser og producentpriser.",
    serier: ["dst.pris.forbruger.aarsaendring", "dst.pris.forbruger.indeks", "dst.pris.producent.industri"],
  },
  {
    noegle: "energi",
    navn: "Energi",
    beskrivelse: "Elprisen i Øst- og Vestdanmark, døgn for døgn og time for time.",
    serier: ["eds.el.dk2", "eds.el.dk1"],
    andreKilder: ["eds.timer"],
  },
  {
    noegle: "renter",
    navn: "Renter og kronen",
    beskrivelse: "Nationalbankens rente, bankernes og realkreditinstitutternes renter, og kronens kurs.",
    serier: ["dst.rente.nationalbank.udlaan", "dst.rente.erhverv.nye", "dst.rente.realkredit.husholdning", "dst.valuta.usd", "dst.valuta.effektiv"],
  },
  {
    noegle: "arbejde",
    navn: "Arbejdsmarked",
    beskrivelse: "Ledighed og løn.",
    serier: ["dst.ledighed.sasonkorrigeret", "dst.loen.privat"],
  },
  {
    noegle: "virksomheder",
    navn: "Virksomheder",
    beskrivelse: "Konkurser, tvangsauktioner og erhvervstillid, herhjemme og i Tyskland.",
    serier: ["dst.konkurs.total", "dst.distress.tvangsauktion", "dst.konjunktur.tillid.samlet", "eurostat.de.tillid.industri"],
  },
  {
    noegle: "bolig",
    navn: "Bolig og byggeri",
    beskrivelse: "Boligpriser, byggetilladelser og boliglånsrenter.",
    serier: ["dst.byg.tilladt.bolig", "dst.rente.realkredit.husholdning"],
    andreKilder: ["dst.ej56"],
  },
  {
    noegle: "forbrug",
    navn: "Forbrug",
    beskrivelse: "Forbrugertillid og detailhandel.",
    serier: ["dst.forbrug.forventning.f1", "dst.detail.omsaetning.g47", "derived.detail.maengde"],
  },
];

export const OMRAADE_NOEGLER = OMRAADER.map((o) => o.noegle);

export function omraade(noegle: string): Omraade | undefined {
  return OMRAADER.find((o) => o.noegle === noegle);
}

/** Hører en post til området. Bruges til at afgrænse data og Spørg Finn. */
export function postIOmraade(postId: string, o: Omraade): boolean {
  const id = postId.replace(/^pulse:/, "");
  if (o.serier.includes(id)) return true;
  return (o.andreKilder ?? []).some((k) => postId.startsWith(`${k}:`) || postId === k);
}
