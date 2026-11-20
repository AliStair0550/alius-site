// ============================================================
// Finn holder pause fra et fastsat tidspunkt
//
// ÉT TIDSPUNKT. Sat 20. november 2026.
//
// HVORFOR
//
// Kreditten der betaler for Finn, kommer fra en kampagne hos Anthropic
// der slutter 2. december 2026 kl. 01.00 dansk tid, og nøglen
// alius-agenter-prod udløber med den. Uden kredit må Finn ikke kalde
// Anthropic; budgetloftet i budget.ts ville ellers være det eneste der
// stod mellem Finn og en regning.
//
// HVAD PAUSEN GØR
//
// Fra tidspunktet herunder kalder intet Anthropic:
//   - scripts/agent-finn.ts og scripts/finn-kvalitet.ts stopper før
//     klienten oprettes og skriver PAUSE i loggen
//   - Vercels cron (/api/cron/agenter) udløser ikke kørslen
//   - Spørg Finn tager ikke imod spørgsmål, og feltet vises ikke
//   - driftsalarmen sender ikke "dagens brief mangler", men melder pause
//
// Siderne siger det: Finn holder pause, her er den seneste brief.
// Tidspunktet læses når siden renderes, så det slår til af sig selv
// inden for sidernes levetid (en time), uden deploy.
//
// HVAD PAUSEN IKKE GØR
//
// Den sletter ingenting. Briefs, arkiv, replay, områdesider og
// regnskabstal bliver stående; tallene kommer fra Pulse og regnskaberne,
// ikke fra Finn, og bliver ved med at blive opdateret.
//
// SÅDAN TÆNDES DER IGEN
//
//   1. Ny nøgle i GitHub-hemmeligheden ANTHROPIC_API_KEY og på Vercel
//   2. Sæt FINN_PAUSE_FRA til null her (eller til et nyt tidspunkt)
//   3. Push. Næste morgen kl. 6 kører Finn igen.
// ============================================================

/** null betyder ingen planlagt pause. */
export const FINN_PAUSE_FRA: Date | null = new Date("2026-12-02T00:00:00Z");

/** Datoen som den står på siden og i loggen. Dansk tid. */
export const FINN_PAUSE_TEKST = "2. december 2026";

export function finnPaaPause(nu: Date = new Date()): boolean {
  return FINN_PAUSE_FRA !== null && nu.getTime() >= FINN_PAUSE_FRA.getTime();
}
