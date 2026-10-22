// ============================================================
// De Pulse-serier Finn læser
//
// SÆSONKORREKTION ER EFTERPRØVET, IKKE ANTAGET. 21. oktober 2026 blev
// hver tabel slået op i DST's API, og de serier der hentes med et
// sæsonfilter, blev tjekket i config/series.ts og sync-scripterne:
//
//   korrigeret       Serien er hentet med DST's eller Eurostats
//                    sæsonfilter (AUS08 SAESONFAK, BYGV88 SÆSON, FIKS11 SÆSON,
//                    Eurostat s_adj=SA).
//   ikke korrigeret  Tabellen har ingen sæsondimension, og serien er
//                    rå. Sammenlignes derfor med samme periode året før.
//   ukendt           Tabellen har ingen sæsondimension, og DST siger
//                    ikke i tabellen om tallene er renset. Behandles som
//                    ikke korrigeret, og Finn skal sige det.
//   ikke relevant    Renter, kurser, priser og ændringer år/år.
//
// dst.konkurs.total indeholdt indtil 22. oktober 2026 KONK3's rå nøgle C
// under navnet "sæsonkorrigeret". Den henter nu C1, konkurser i aktive
// virksomheder, sæsonkorrigeret (se scripts/sync-konk3.ts).
// ============================================================

import type { Saeson } from "../kilder/typer";

export type FinnSerie = {
  id: string;
  /** Pulse gemmer landstal som "DK" i den nye model og "000" fra broen. */
  omraade: "DK" | "000";
  saeson: Saeson;
  /** Sættes kun når Pulses navn ikke dækker det tallet faktisk er. */
  navn?: string;
};

export const FINN_SERIER: FinnSerie[] = [
  // Priser
  { id: "dst.pris.forbruger.aarsaendring", omraade: "DK", saeson: "ikke relevant", navn: "Inflation, forbrugerpriser år/år" },
  { id: "dst.pris.forbruger.indeks", omraade: "DK", saeson: "ikke korrigeret" },
  { id: "dst.pris.producent.industri", omraade: "DK", saeson: "ikke korrigeret" },

  // Arbejdsmarked og løn
  { id: "dst.ledighed.sasonkorrigeret", omraade: "000", saeson: "korrigeret", navn: "Fuldtidsledige i pct. af arbejdsstyrken, sæsonkorrigeret" },
  { id: "dst.loen.privat", omraade: "DK", saeson: "ikke korrigeret" },

  // Virksomheder. Firmaernes salg er hentet med FIKS11's SÆSON-filter og
  // er i løbende priser; det står i navnet, så Finn ikke kan glemme det.
  { id: "dst.omsaetning.erhverv.ekskl_energi", omraade: "DK", saeson: "korrigeret", navn: "Firmaernes salg i alt eksklusive energi, løbende priser" },
  { id: "dst.omsaetning.erhverv.indenlandsk", omraade: "DK", saeson: "korrigeret", navn: "Firmaernes indenlandske salg, løbende priser" },
  { id: "dst.omsaetning.industri", omraade: "DK", saeson: "korrigeret", navn: "Salg i industrien, løbende priser" },
  { id: "dst.omsaetning.byggeri", omraade: "DK", saeson: "korrigeret", navn: "Salg i bygge og anlæg, løbende priser" },
  { id: "dst.omsaetning.handel", omraade: "DK", saeson: "korrigeret", navn: "Salg i handel, løbende priser" },
  { id: "dst.omsaetning.transport", omraade: "DK", saeson: "korrigeret", navn: "Salg i transport, løbende priser" },
  { id: "dst.omsaetning.hoteller_restauranter", omraade: "DK", saeson: "korrigeret", navn: "Salg i hoteller og restauranter, løbende priser" },
  { id: "dst.omsaetning.information", omraade: "DK", saeson: "korrigeret", navn: "Salg i information og kommunikation, løbende priser" },
  { id: "dst.omsaetning.erhvervsservice", omraade: "DK", saeson: "korrigeret", navn: "Salg i erhvervsservice, løbende priser" },
  { id: "dst.konkurs.total", omraade: "DK", saeson: "korrigeret" },
  { id: "dst.distress.tvangsauktion", omraade: "DK", saeson: "ikke korrigeret" },
  { id: "dst.konjunktur.tillid.samlet", omraade: "DK", saeson: "ukendt" },
  { id: "eurostat.de.tillid.industri", omraade: "DK", saeson: "korrigeret" },

  // Forbrug
  { id: "dst.forbrug.forventning.f1", omraade: "DK", saeson: "ukendt", navn: "Forbrugertillid" },
  { id: "dst.detail.omsaetning.g47", omraade: "DK", saeson: "ukendt" },
  { id: "derived.detail.maengde", omraade: "DK", saeson: "ukendt" },

  // Byggeri
  { id: "dst.byg.tilladt.bolig", omraade: "DK", saeson: "korrigeret" },

  // Renter
  { id: "dst.rente.nationalbank.udlaan", omraade: "DK", saeson: "ikke relevant" },
  { id: "dst.rente.erhverv.nye", omraade: "DK", saeson: "ikke relevant" },
  { id: "dst.rente.realkredit.husholdning", omraade: "DK", saeson: "ikke relevant" },

  // Kurser og energi
  { id: "dst.valuta.usd", omraade: "DK", saeson: "ikke relevant" },
  { id: "dst.valuta.effektiv", omraade: "DK", saeson: "ikke relevant" },
  { id: "eds.el.dk1", omraade: "DK", saeson: "ikke relevant", navn: "Elpris Vestdanmark (DK1), døgngennemsnit" },
  { id: "eds.el.dk2", omraade: "DK", saeson: "ikke relevant", navn: "Elpris Østdanmark (DK2), døgngennemsnit" },
];
