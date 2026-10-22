// ============================================================
// Temaet for et briefpunkt, ud fra hvad dets første kilde måler
//
// Specifikt med vilje. Indtil 22. oktober 2026 stod både løn og
// ledighed som "Arbejde", og både inflation og producentpriser som
// "Priser". To felter med samme etiket og forskellige tal ligner en
// fejl.
//
// Beregnes når siden vises, ud fra kildens id, så også briefs der er
// skrevet før en ændring her, får det rigtige tema.
// ============================================================

const REGLER: [RegExp, string][] = [
  [/^dst\.ej56:/, "Boligpriser"],
  [/^(pulse:)?dst\.omsaetning\./, "Omsætning"],
  [/^regnskab:/, "Regnskaber"],
  [/^kalender:/, "Regnskabskalender"],
  [/pris\.forbruger/, "Inflation"],
  [/pris\.producent/, "Producentpriser"],
  [/ledighed/, "Ledighed"],
  [/loen/, "Løn"],
  [/konkurs/, "Konkurser"],
  [/distress/, "Tvangsauktioner"],
  [/forbrug\.forventning/, "Forbrugertillid"],
  [/konjunktur|eurostat/, "Erhvervstillid"],
  [/detail/, "Detailhandel"],
  [/byg\./, "Byggeri"],
  [/rente\./, "Renter"],
  [/valuta/, "Kronen"],
  [/eds\.el/, "Elpris"],
];

export function temaForKilde(id: string, type: "tal" | "nyhed"): string {
  if (type === "nyhed") return "Nyhed";
  return REGLER.find(([re]) => re.test(id))?.[1] ?? "Økonomi";
}
