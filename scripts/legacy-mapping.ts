// ============================================================
// Oversættelse fra den gamle model til series og observations
//
// CONFIG stod i scripts/migrate-to-series.ts, som var et engangsscript.
// Den er flyttet hertil fordi to ting nu bruger den:
//
//   migrate-to-series.ts   engangsflytningen af historikken
//   sync-legacy-bridge.ts  den løbende bro, så observations følger med
//                          når det gamle månedsjob henter nye tal
//
// To kopier af en mapning bliver før eller siden uenige, og uenigheden
// ville vise sig som en serie der stille holdt op med at blive
// opdateret.
// ============================================================

export type Layer = "LEADING" | "COST" | "CAPITAL" | "EXTERNAL" | "REALISED" | "STRUCTURAL";
export type Freq = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
export type Revision = "NONE" | "MINOR" | "MAJOR";
export type Status = "ACTIVE" | "CLOSED";

/** Hvordan areaCode i den gamle model skal forstås. */
export type AreaRule =
  /** areaCode er geografi -> én serie, areaCode bæres over på observationen */
  | { kind: "geo" }
  /** areaCode er ikke geografi -> én serie per areaCode, observation får "DK" */
  | { kind: "areaCodeIsIdentity"; label: (code: string, name: string | null) => string; suffix: (code: string) => string }
  /** identitet ligger i dimensions-JSON -> én serie per nøgle, observation får "DK" */
  | { kind: "dimensionIsIdentity"; dimKey: string; labelKey: string; suffix: (code: string) => string }
  /** national enkeltserie */
  | { kind: "single" };

export type SourceConfig = {
  slug: string;
  seriesBase: string;
  nameDa: string;
  /**
   * Enheden for kildens serier.
   *
   * En kilde kan levere flere enheder. PRIS01 leverer både et indeks og
   * en årsændring i procent fra samme tabel, og de er ikke det samme
   * tal. Sæt `unitPerCode` når det er tilfældet; `unit` er så kun
   * standarden.
   */
  unit: string;
  /**
   * Enhed per serie, når kilden leverer flere.
   *
   * Koden er den der bruges til at danne serie-id'et: areaCode ved
   * `areaCodeIsIdentity`, dimensionsværdien ved `dimensionIsIdentity`.
   * Returnér undefined for at falde tilbage på `unit`.
   *
   * Findes fordi enheden ellers var bundet til HVOR tallet kom fra i
   * stedet for HVAD det måler. Det er samme fejl som valueScale-
   * nærmisset i CLAUDE.md: årsændringen på forbrugerpriser stod som
   * "indeks" og blev vist som "1,9" uden enhed. Seriens navn reddede
   * den, men den dag tallet citeres uden navnet er redningen væk.
   */
  unitPerCode?: (code: string) => string | undefined;
  frequency: Freq;
  layer: Layer;
  revisionPolicy: Revision;
  expectedLagDays: number;
  status: Status;
  breakAt?: string | null;
  breakReason?: string | null;
  area: AreaRule;
};

export const CONFIG: SourceConfig[] = [
  // ---- REALISED: det der allerede er sket ----
  {
    slug: "dst-aus08",
    seriesBase: "dst.ledighed.sasonkorrigeret",
    nameDa: "Fuldtidsledige, sæsonkorrigeret",
    unit: "pct",
    frequency: "MONTHLY",
    layer: "REALISED",
    revisionPolicy: "MINOR", // sæsonkorrektion genberegnes
    expectedLagDays: 35,
    status: "ACTIVE",
    area: { kind: "geo" },
  },
  {
    slug: "dst-konk3",
    seriesBase: "dst.konkurs.total",
    nameDa: "Erklærede konkurser i alt, sæsonkorrigeret",
    unit: "antal",
    frequency: "MONTHLY",
    layer: "REALISED",
    revisionPolicy: "MINOR",
    expectedLagDays: 12,
    status: "ACTIVE",
    area: { kind: "single" },
  },
  {
    slug: "dst-konk25",
    seriesBase: "dst.konkurs.branche",
    nameDa: "Erklærede konkurser i aktive virksomheder",
    unit: "antal",
    frequency: "MONTHLY",
    layer: "REALISED",
    revisionPolicy: "MINOR",
    expectedLagDays: 12,
    status: "ACTIVE",
    // Ingen break_at. KONK25 er DB25 i hele sin længde tilbage til
    // 2009M01, fordi DST har tilbageregnet historikken. Se rapportens
    // afsnit 9.6.
    area: {
      kind: "dimensionIsIdentity",
      dimKey: "BRANCHE_CODE",
      labelKey: "BRANCHE_LABEL",
      suffix: (c) => c.toLowerCase(),
    },
  },
  {
    slug: "dst-konk4",
    seriesBase: "dst.konkurs.branche.db07",
    nameDa: "Erklærede konkurser i aktive virksomheder (DB07, lukket)",
    unit: "antal",
    frequency: "MONTHLY",
    layer: "REALISED",
    revisionPolicy: "MINOR",
    expectedLagDays: 12,
    // DST lukkede KONK4 7. januar 2026. Bevares i fuld længde, men
    // CLOSED holder den ude af ranglisten permanent.
    status: "CLOSED",
    area: {
      kind: "dimensionIsIdentity",
      dimKey: "BRANCHE_CODE",
      labelKey: "BRANCHE_LABEL",
      suffix: (c) => c.toLowerCase(),
    },
  },
  {
    slug: "dst-deta211a",
    seriesBase: "dst.detail.omsaetning",
    nameDa: "Detailomsætningsindeks",
    unit: "indeks",
    frequency: "MONTHLY",
    layer: "REALISED",
    revisionPolicy: "MINOR",
    expectedLagDays: 62,
    status: "ACTIVE",
    area: {
      kind: "areaCodeIsIdentity",
      label: (_c, n) => n ?? "Detailhandel",
      suffix: (c) => c.toLowerCase(),
    },
  },

  // ---- LEADING: handl nu ----
  {
    slug: "dst-forv1",
    seriesBase: "dst.forbrug.forventning",
    nameDa: "Forbrugerforventninger",
    unit: "nettotal",
    frequency: "MONTHLY",
    layer: "LEADING",
    revisionPolicy: "NONE",
    expectedLagDays: 5,
    status: "ACTIVE",
    area: {
      kind: "areaCodeIsIdentity",
      label: (c, n) => n ?? c,
      suffix: (c) => c.toLowerCase(),
    },
  },
  {
    slug: "dst-bygv33",
    seriesBase: "dst.byg.paabegyndt",
    nameDa: "Påbegyndte boliger",
    unit: "antal",
    frequency: "QUARTERLY",
    layer: "LEADING",
    revisionPolicy: "MAJOR", // efterindberetninger til BBR
    expectedLagDays: 70,
    status: "ACTIVE",
    area: { kind: "geo" },
  },

  // ---- COST ----
  {
    slug: "dst-pris01",
    seriesBase: "dst.pris.forbruger",
    nameDa: "Forbrugerprisindeks",
    unit: "indeks",
    // "100" er selve indekset. Alt andet fra PRIS01 er årsændringen,
    // som er en procent og ikke et indeks.
    unitPerCode: (c) => (c === "100" ? "indeks" : "pct"),
    frequency: "MONTHLY",
    layer: "COST",
    revisionPolicy: "NONE",
    expectedLagDays: 12,
    status: "ACTIVE",
    area: {
      kind: "areaCodeIsIdentity",
      label: (_c, n) => n ?? "Forbrugerprisindeks",
      suffix: (c) => (c === "100" ? "indeks" : "aarsaendring"),
    },
  },

  // ---- STRUCTURAL: ingenting i dette kvartal ----
  {
    slug: "dst-folk1am",
    seriesBase: "dst.befolkning.antal",
    nameDa: "Befolkningstal",
    unit: "antal",
    frequency: "MONTHLY",
    layer: "STRUCTURAL",
    revisionPolicy: "NONE",
    expectedLagDays: 14,
    status: "ACTIVE",
    area: { kind: "geo" },
  },
  {
    slug: "dst-indkp101",
    seriesBase: "dst.indkomst.disponibel",
    nameDa: "Disponibel indkomst, gennemsnit",
    unit: "dkk",
    frequency: "YEARLY",
    layer: "STRUCTURAL",
    revisionPolicy: "MINOR",
    expectedLagDays: 380,
    status: "ACTIVE",
    area: { kind: "geo" },
  },
  {
    slug: "dst-ejdfoe1-huse",
    seriesBase: "dst.ejendom.markedsvaerdi.enfamiliehuse",
    nameDa: "Markedsværdi, enfamiliehuse, gennemsnit",
    unit: "dkk",
    frequency: "YEARLY",
    layer: "STRUCTURAL",
    revisionPolicy: "MINOR",
    expectedLagDays: 500,
    status: "ACTIVE",
    area: { kind: "geo" },
  },
  {
    slug: "dst-ejdfoe1-lejl",
    seriesBase: "dst.ejendom.markedsvaerdi.ejerlejligheder",
    nameDa: "Markedsværdi, ejerlejligheder, gennemsnit",
    unit: "dkk",
    frequency: "YEARLY",
    layer: "STRUCTURAL",
    revisionPolicy: "MINOR",
    expectedLagDays: 500,
    status: "ACTIVE",
    area: { kind: "geo" },
  },
  {
    slug: "dst-laby01-b04",
    seriesBase: "dst.demografi.foedselsoverskud",
    nameDa: "Fødselsoverskud per 1.000 indbyggere",
    unit: "per_1000",
    frequency: "YEARLY",
    layer: "STRUCTURAL",
    revisionPolicy: "NONE",
    expectedLagDays: 60,
    status: "ACTIVE",
    area: { kind: "geo" },
  },
  {
    slug: "dst-laby01-b07",
    seriesBase: "dst.demografi.nettotilflytning",
    nameDa: "Nettotilflyttede per 1.000 indbyggere",
    unit: "per_1000",
    frequency: "YEARLY",
    layer: "STRUCTURAL",
    revisionPolicy: "NONE",
    expectedLagDays: 60,
    status: "ACTIVE",
    area: { kind: "geo" },
  },
  {
    slug: "dst-laby01-b10",
    seriesBase: "dst.demografi.nettoindvandring",
    nameDa: "Nettoindvandrede per 1.000 indbyggere",
    unit: "per_1000",
    frequency: "YEARLY",
    layer: "STRUCTURAL",
    revisionPolicy: "NONE",
    expectedLagDays: 60,
    status: "ACTIVE",
    area: { kind: "geo" },
  },
  {
    slug: "dst-laby01-b11",
    seriesBase: "dst.demografi.befolkningstilvaekst",
    nameDa: "Befolkningstilvækst per 1.000 indbyggere",
    unit: "per_1000",
    frequency: "YEARLY",
    layer: "STRUCTURAL",
    revisionPolicy: "NONE",
    expectedLagDays: 60,
    status: "ACTIVE",
    area: { kind: "geo" },
  },
];

/**
 * Hvilken serie og hvilket område en gammel DataPoint-række hører til.
 *
 * Null betyder at rækken ikke kan mappes. Kalderen skal sige hvilken
 * række det var, ikke springe den over i stilhed: en række der ikke kan
 * mappes er en serie der mangler tal, og det ser ud som en serie kilden
 * ikke har publiceret.
 */
export function mapRaekke(
  cfg: SourceConfig,
  r: {
    areaCode: string | null;
    areaName: string | null;
    dimensions: unknown;
  }
): { seriesId: string; areaCode: string } | null {
  if (cfg.area.kind === "geo") {
    return { seriesId: cfg.seriesBase, areaCode: r.areaCode ?? "DK" };
  }
  if (cfg.area.kind === "single") {
    return { seriesId: cfg.seriesBase, areaCode: "DK" };
  }
  if (cfg.area.kind === "areaCodeIsIdentity") {
    if (!r.areaCode) return null;
    return {
      seriesId: `${cfg.seriesBase}.${cfg.area.suffix(r.areaCode)}`,
      areaCode: "DK",
    };
  }
  const dims = r.dimensions as Record<string, string> | null;
  const code = dims?.[cfg.area.dimKey];
  if (!code) return null;
  return { seriesId: `${cfg.seriesBase}.${cfg.area.suffix(code)}`, areaCode: "DK" };
}

/**
 * Enheden for én serie under en kilde.
 *
 * Koden er den der danner serie-id'et. Null-koden betyder at kilden
 * kun har én serie, og så gælder `unit`.
 */
export function enhedFor(cfg: SourceConfig, code: string | null): string {
  if (code === null || !cfg.unitPerCode) return cfg.unit;
  return cfg.unitPerCode(code) ?? cfg.unit;
}
