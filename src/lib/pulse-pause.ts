// ============================================================
// Pulse er sat på pause
//
// ÉN KONTAKT. Sat 11. august 2026.
//
// HVORFOR
//
// Pulse delte database og hosting med resten af alius.dk. Neons
// månedskvote på 5 GB netværkstrafik blev brændt på ti dage, og
// Vercels CPU-kvote stod på 75 procent. Når kvoten er opbrugt, holder
// basen op med at svare for ALT, ikke kun for Pulse: også
// tankeprofilen og alt andet der rører den.
//
// Pulse skaber ikke værdi i dag. Konsulentydelserne og værkstedet gør.
// Så Pulse holder pause, indtil enten trafikken er værd at betale for
// eller basen ligger for sig selv.
//
// HVAD PAUSEN GØR
//
// Siderne rører ikke databasen. Konstanten her er kendt ved oversættelse,
// så Next renderer kun beskeden og kalder aldrig Prisma, heller ikke
// under byggetiden. Nul forespørgsler, nul trafik.
//
// De planlagte kørsler er slået fra i .github/workflows og i
// vercel.json. Ingen hentning, ingen skrivning, ingen genskabelse.
//
// HVAD PAUSEN IKKE GØR
//
// Den sletter ingenting. 193.000 observationer, 90 serier og hele
// revisionshistorikken bliver stående. Data holder op med at komme ind,
// ikke med at findes.
//
// SÅDAN TÆNDES DER IGEN
//
//   1. Sæt PAA_PAUSE til false her
//   2. Sæt schedule tilbage i .github/workflows/sync-series.yml
//   3. Sæt de to cron-poster tilbage i vercel.json
//   4. Kør sync-series i hånden for at hente det der er sket imens.
//      Tilbageblikket i pulse-incremental.ts er 60 til 1100 dage
//      afhængigt af frekvens, så en pause på under to måneder henter
//      sig selv ind. Bliver den længere, så kør backfill.
//
// Punkt 4 er det eneste der kræver eftertanke. De øvrige tre er
// omvendinger af det her commit.
// ============================================================

/**
 * Kendt ved oversættelse med vilje.
 *
 * Var det en miljøvariabel, ville siderne stadig være dynamiske og
 * skulle spørge om noget ved hver forespørgsel. En konstant lader
 * Next skære databasekaldene helt væk.
 */
export const PAA_PAUSE = true;

/** Datoen står ét sted, så beskeden og dokumentationen ikke skrider. */
export const PAUSE_FRA = "11. august 2026";
