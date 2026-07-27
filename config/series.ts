// ============================================================
// Seriedefinitioner for Pulse fase 1
//
// Datakataloget beder om `config/series.yaml`. Vi bruger TypeScript
// af én grund: tabel-ID'er og dimensionskoder er den slags der stille
// bliver forkerte, og en typefejl fanges ved oversættelse frem for
// under en natlig kørsel. Intentionen bag kataloget, at mappingen
// ligger i config og ikke i adapterkoden, er den samme.
//
// Alle sourceRef og dimensionskoder er verificeret mod levende API'er
// med scripts/verify-sources.ts. Kør det igen før ændringer.
// ============================================================

import type { SeriesDef } from "../src/lib/adapters/types";

const DST = (tableId: string) =>
  `Danmarks Statistik, tabel ${tableId}. CC 4.0 BY`;

export const SERIES: SeriesDef[] = [
  // ==========================================================
  // LEADING
  // ==========================================================
  {
    id: "dst.konjunktur.tillid.samlet",
    nameDa: "Erhvervstillidsindikator",
    source: "DST",
    sourceRef: "ETILLID",
    unit: "indeks",
    frequency: "MONTHLY",
    layer: "LEADING",
    revisionPolicy: "MINOR",
    expectedLagDays: 2,
    attribution: DST("ETILLID"),
    zTransform: "level",
    dst: { filters: { INDIKATOR: ["TE"] } },
  },
  {
    id: "dst.konjunktur.tillid.industri",
    nameDa: "Tillidsindikator for industri",
    source: "DST",
    sourceRef: "ETILLID",
    unit: "indeks",
    frequency: "MONTHLY",
    layer: "LEADING",
    revisionPolicy: "MINOR",
    expectedLagDays: 2,
    attribution: DST("ETILLID"),
    zTransform: "level",
    dst: { filters: { INDIKATOR: ["KBI"] } },
  },
  {
    id: "dst.konjunktur.tillid.byggeri",
    nameDa: "Tillidsindikator for bygge og anlæg",
    source: "DST",
    sourceRef: "ETILLID",
    unit: "indeks",
    frequency: "MONTHLY",
    layer: "LEADING",
    revisionPolicy: "MINOR",
    expectedLagDays: 2,
    attribution: DST("ETILLID"),
    zTransform: "level",
    dst: { filters: { INDIKATOR: ["KBB"] } },
  },
  {
    // BYGFASE=1 Tilladt, ikke Påbegyndt. Se byggebriefens afsnit 3c.
    id: "dst.byg.tilladt.bolig",
    nameDa: "Byggetilladelser, beboelse, etageareal",
    source: "DST",
    sourceRef: "BYGV88",
    unit: "m2",
    frequency: "MONTHLY",
    layer: "LEADING",
    // BYGV88 er DST's egen korrektion for efterindberetninger til BBR.
    revisionPolicy: "MINOR",
    expectedLagDays: 60,
    attribution: DST("BYGV88"),
    zTransform: "yoy",
    dst: {
      filters: {
        BYGFASE: ["1"],
        ANVENDELSE: ["10100"],
        BYGHERRE: ["TOT"],
        SÆSON: ["SÆSON"],
      },
    },
  },
  {
    id: "dst.byg.tilladt.erhverv",
    nameDa: "Byggetilladelser, erhverv, etageareal",
    source: "DST",
    sourceRef: "BYGV88",
    unit: "m2",
    frequency: "MONTHLY",
    layer: "LEADING",
    revisionPolicy: "MINOR",
    expectedLagDays: 60,
    attribution: DST("BYGV88"),
    zTransform: "yoy",
    dst: {
      filters: {
        BYGFASE: ["1"],
        ANVENDELSE: ["10200"],
        BYGHERRE: ["TOT"],
        SÆSON: ["SÆSON"],
      },
    },
  },

  // ==========================================================
  // REALISED
  // ==========================================================
  {
    id: "dst.distress.tvangsauktion",
    nameDa: "Bekendtgjorte tvangsauktioner",
    source: "DST",
    sourceRef: "TVANG1",
    unit: "antal",
    frequency: "MONTHLY",
    layer: "REALISED",
    revisionPolicy: "MINOR",
    expectedLagDays: 25,
    attribution: DST("TVANG1"),
    zTransform: "yoy",
    dst: { filters: { TYPE: ["5520010001"] } },
  },

  // ==========================================================
  // COST
  // ==========================================================
  {
    id: "dst.pris.producent.industri",
    nameDa: "Producentprisindeks, industri",
    source: "DST",
    sourceRef: "PRIS4221",
    unit: "indeks",
    frequency: "MONTHLY",
    layer: "COST",
    revisionPolicy: "MINOR",
    expectedLagDays: 25,
    attribution: DST("PRIS4221"),
    zTransform: "yoy",
    dst: { filters: { STANDGRP: ["C"], TAL: ["100"] } },
  },
  {
    id: "dst.loen.privat",
    nameDa: "Lønindeks, virksomheder og organisationer",
    source: "DST",
    sourceRef: "SBLON1",
    unit: "indeks",
    frequency: "QUARTERLY",
    layer: "COST",
    revisionPolicy: "MINOR",
    expectedLagDays: 70,
    attribution: DST("SBLON1"),
    zTransform: "yoy",
    dst: { filters: { BRANCHE07: ["TOT"], SEKTOR: ["1046"], VARIA1: ["100"] } },
  },
  {
    id: "eds.el.dk1",
    nameDa: "Elpris day-ahead, DK1, døgngennemsnit",
    source: "EDS",
    sourceRef: "DayAheadPrices+Elspotprices",
    unit: "dkk_mwh",
    frequency: "DAILY",
    layer: "COST",
    revisionPolicy: "NONE",
    expectedLagDays: 1,
    attribution: "Energinet, Energi Data Service",
    zTransform: "level",
    eds: {
      priceArea: "DK1",
      aggregateToDaily: true,
      datasets: [
        {
          name: "Elspotprices",
          timeField: "HourUTC",
          valueField: "SpotPriceDKK",
          toInclusive: "2025-09-30T21:59:59",
        },
        {
          name: "DayAheadPrices",
          timeField: "TimeUTC",
          valueField: "DayAheadPriceDKK",
          fromInclusive: "2025-09-30T22:00:00",
        },
      ],
    },
  },
  {
    id: "eds.el.dk2",
    nameDa: "Elpris day-ahead, DK2, døgngennemsnit",
    source: "EDS",
    sourceRef: "DayAheadPrices+Elspotprices",
    unit: "dkk_mwh",
    frequency: "DAILY",
    layer: "COST",
    revisionPolicy: "NONE",
    expectedLagDays: 1,
    attribution: "Energinet, Energi Data Service",
    zTransform: "level",
    eds: {
      priceArea: "DK2",
      aggregateToDaily: true,
      datasets: [
        {
          name: "Elspotprices",
          timeField: "HourUTC",
          valueField: "SpotPriceDKK",
          toInclusive: "2025-09-30T21:59:59",
        },
        {
          name: "DayAheadPrices",
          timeField: "TimeUTC",
          valueField: "DayAheadPriceDKK",
          fromInclusive: "2025-09-30T22:00:00",
        },
      ],
    },
  },

  // ==========================================================
  // CAPITAL
  // ==========================================================
  {
    id: "dst.rente.erhverv.nye",
    nameDa: "Pengeinstitutters udlånsrente, erhverv, nye forretninger",
    source: "DST",
    sourceRef: "DNRUGPI",
    unit: "pct",
    frequency: "MONTHLY",
    layer: "CAPITAL",
    revisionPolicy: "MINOR",
    expectedLagDays: 35,
    attribution: DST("DNRUGPI") + ". Kilde: Danmarks Nationalbank",
    zTransform: "level",
    dst: {
      filters: {
        INSTRNAT: ["AL00ALLERENTENF"],
        INSTITYPE: ["ALLE"],
        INDSEK: ["1100"],
        VALUTA: ["Z01"],
        FORMÅL: ["ALLE"],
      },
    },
  },
  {
    id: "dst.rente.realkredit.erhverv",
    nameDa: "Realkreditrente inkl. bidrag, erhverv, udestående",
    source: "DST",
    sourceRef: "DNRUURI",
    unit: "pct",
    frequency: "MONTHLY",
    layer: "CAPITAL",
    revisionPolicy: "MINOR",
    expectedLagDays: 35,
    attribution: DST("DNRUURI") + ". Kilde: Danmarks Nationalbank",
    zTransform: "level",
    dst: {
      filters: { DATA: ["AL51EFFR"], INDSEK: ["1100"], VALUTA: ["Z01"] },
    },
  },
  {
    id: "dst.rente.realkredit.husholdning",
    nameDa: "Realkreditrente inkl. bidrag, husholdninger, udestående",
    source: "DST",
    sourceRef: "DNRUURI",
    unit: "pct",
    frequency: "MONTHLY",
    layer: "CAPITAL",
    revisionPolicy: "MINOR",
    expectedLagDays: 35,
    attribution: DST("DNRUURI") + ". Kilde: Danmarks Nationalbank",
    zTransform: "level",
    dst: {
      filters: { DATA: ["AL51EFFR"], INDSEK: ["1400"], VALUTA: ["Z01"] },
    },
  },
  {
    // Nævner for dst.rente.erhverv.nye. Marginen mellem de to skiller
    // "centralbanken flyttede sig" fra "din bank strammede".
    id: "dst.rente.nationalbank.udlaan",
    nameDa: "Nationalbankens udlånsrente",
    source: "DST",
    sourceRef: "DNRENTD",
    unit: "pct",
    frequency: "DAILY",
    layer: "CAPITAL",
    revisionPolicy: "NONE",
    expectedLagDays: 1,
    attribution: DST("DNRENTD") + ". Kilde: Danmarks Nationalbank",
    zTransform: "level",
    rankable: false,
    rankableReason:
      "Policyrente. En direktør kender den i forvejen fra pressen. " +
      "Den er nævner for udlånsrenten til erhverv, ikke et selvstændigt signal.",
    dst: {
      filters: { INSTRUMENT: ["OIRNAA"], LAND: ["DK"], OPGOER: ["E"] },
    },
  },
  {
    // Nævner for de fire valutapar, og det bedre signal af de to.
    // Et bilateralt par kan ikke skelne "dollaren er stærk" fra
    // "kronen er svag". Den effektive kurs kan.
    id: "dst.valuta.effektiv",
    nameDa: "Nominel effektiv kronekurs",
    source: "DST",
    sourceRef: "DNVALD",
    unit: "indeks_1980",
    frequency: "DAILY",
    layer: "CAPITAL",
    revisionPolicy: "NONE",
    expectedLagDays: 1,
    attribution: DST("DNVALD") + ". Kilde: Danmarks Nationalbank",
    zTransform: "level",
    dst: { filters: { VALUTA: ["DKK"], KURTYP: ["INX"] } },
  },
  // DNVALD leverer DKK pr. 100 enheder. valueScale gør det til DKK pr. 1.
  //
  // De fire par er sat til ikke-rangerbare. Se byggebriefens afsnit 3l:
  // den effektive kurs er signalet, parrene er opdelingen der forklarer
  // hvilken valuta der trak. Fire par på ranglisten ville desuden give
  // fire chancer for at trække en høj z ud af næsten samme fordeling.
  ...(["USD", "SEK", "NOK", "GBP"] as const).map(
    (ccy): SeriesDef => ({
      id: `dst.valuta.${ccy.toLowerCase()}`,
      nameDa: `Valutakurs ${ccy}/DKK`,
      source: "DST",
      sourceRef: "DNVALD",
      unit: "dkk_per_enhed",
      frequency: "DAILY",
      layer: "CAPITAL",
      revisionPolicy: "NONE",
      expectedLagDays: 1,
      attribution: DST("DNVALD") + ". Kilde: Danmarks Nationalbank",
      zTransform: "level",
      rankable: false,
      rankableReason:
        "Opdeling af den effektive kronekurs. Vises på dashboardet, " +
        "konkurrerer ikke på forsiden.",
      dst: { filters: { VALUTA: [ccy], KURTYP: ["KBH"] }, valueScale: 0.01 },
    })
  ),

  // ==========================================================
  // EXTERNAL
  // ==========================================================
  // Tre serier fra samme dataflow. Marginal omkostning er ét HTTP-kald
  // per serie. Norge, UK, USA og Kina findes ikke i Eurostats
  // erhvervstillidsundersøgelse; fire af Danmarks ti største
  // eksportmarkeder kan altså ikke dækkes herfra.
  ...(
    [
      ["de", "DE", "Tysk erhvervstillid, industri", null],
      ["se", "SE", "Svensk erhvervstillid, industri", null],
      [
        "eu27",
        "EU27_2020",
        "Erhvervstillid, EU27, industri",
        // Referencelinjen. Uden den kan "tysk tillid faldt 8 point" ikke
        // skelnes fra "europæisk tillid faldt 8 point", og det er to
        // forskellige historier for en dansk eksportør.
        "Referencelinje for DE og SE. En nævner skal ikke konkurrere med det den forklarer.",
      ],
    ] as const
  ).map(
    ([slug, geo, navn, ikkeRangerbar]): SeriesDef => ({
      id: `eurostat.${slug}.tillid.industri`,
      nameDa: navn,
      source: "EUROSTAT",
      sourceRef: "ei_bsin_m_r2",
      unit: "nettotal",
      frequency: "MONTHLY",
      layer: "EXTERNAL",
      revisionPolicy: "MINOR",
      expectedLagDays: 2,
      attribution: "Eurostat, ei_bsin_m_r2",
      zTransform: "level",
      rankable: ikkeRangerbar ? false : undefined,
      rankableReason: ikkeRangerbar ?? undefined,
      eurostat: {
        dataflow: "ei_bsin_m_r2",
        params: { geo, indic: "BS-ICI", s_adj: "SA", unit: "BAL", freq: "M" },
      },
    })
  ),

  // ==========================================================
  // Udvidelse af eksisterende kilde: PRIS01 COICOP-hovedgrupper
  // Totalen ligger allerede som dst.pris.forbruger.indeks fra
  // migrationen. Her tilføjes de tre grupper kataloget beder om.
  // ==========================================================
  ...(
    [
      ["01", "foedevarer", "Fødevarer og ikke-alkoholiske drikkevarer"],
      ["04", "bolig", "Bolig, vand, elektricitet og brændsel"],
      ["07", "transport", "Transport"],
    ] as const
  ).map(
    ([code, slug, navn]): SeriesDef => ({
      id: `dst.pris.forbruger.${slug}`,
      nameDa: `Forbrugerprisindeks: ${navn}`,
      source: "DST",
      sourceRef: "PRIS01",
      unit: "indeks",
      frequency: "MONTHLY",
      layer: "COST",
      revisionPolicy: "NONE",
      expectedLagDays: 12,
      attribution: DST("PRIS01"),
      zTransform: "yoy",
      dst: { filters: { VAREGR: [code], ENHED: ["100"] } },
    })
  ),
];

export function seriesById(id: string): SeriesDef | undefined {
  return SERIES.find((s) => s.id === id);
}
