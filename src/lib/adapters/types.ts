// ============================================================
// Fælles interface for kildeadaptere
//
// Én adapter per kilde. Samme kontrakt, forskellig parsing.
//
// Adapteren har ét ansvar: hent rå observationer fra kilden og
// normalisér dem til (periode, område, værdi) i seriens endelige enhed.
// Den skriver ikke i basen, kender ikke til revisioner og ved ikke om
// serien findes i forvejen. Det hører til i skrivelaget.
// ============================================================

export type Frequency = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
export type Layer = "LEADING" | "COST" | "CAPITAL" | "EXTERNAL" | "REALISED" | "STRUCTURAL";
export type Revision = "NONE" | "MINOR" | "MAJOR";

/** Hvordan z-scoren skal beregnes for serien. Se pulse-zscore.ts. */
export type ZTransform = "level" | "yoy";

export type FetchedPoint = {
  /** Første dag i perioden, UTC-midnat. */
  period: Date;
  /** Kun geografi. "DK" for nationale serier. */
  areaCode: string;
  /** I seriens endelige enhed. Konvertering sker i adapteren. */
  value: number | null;
};

/** Definition af én serie. Bor i config/series.ts, ikke i kode. */
export type SeriesDef = {
  id: string;
  nameDa: string;
  source: "DST" | "EDS" | "EUROSTAT";
  /** Tabel-ID eller datasætnavn. Verificeret med scripts/verify-sources.ts. */
  sourceRef: string;
  unit: string;
  frequency: Frequency;
  layer: Layer;
  revisionPolicy: Revision;
  expectedLagDays: number;
  attribution: string;
  zTransform: ZTransform;

  /**
   * Manuelt fravalg fra ranglisten. Udeladt betyder "brug standarden",
   * som sætter CLOSED og STRUCTURAL til false og alt andet til true.
   * Sættes kun når en serie skal ud af rangeringen af en grund der ikke
   * følger af lag eller status.
   */
  rankable?: boolean;
  rankableReason?: string;

  /** Kildespecifikke parametre. Præcis én skal være sat. */
  dst?: DstParams;
  eds?: EdsParams;
  eurostat?: EurostatParams;
};

export type DstParams = {
  /**
   * Dimensioner der bindes. Alle obligatoriske dimensioner skal med,
   * ellers afviser DST udtrækket med EXTRACT-NOTALLOWED.
   * Tid tilføjes automatisk som "*".
   */
  filters: Record<string, string[]>;
  /**
   * Faktor der ganges på værdien. DNVALD leverer DKK pr. 100 enheder,
   * så den skal have 0.01 for at blive DKK pr. 1 enhed.
   */
  valueScale?: number;
  /**
   * Kilden koder "ingen notering i dag" som 0 i stedet for som tomt.
   * DNVALD gør det på bankhelligdage: 1977-05-20, skærtorsdag 2007 og
   * 318 andre dage står med kurs 0.
   *
   * Et nul der betyder "ingen kurs" er ikke en kurs. Lader man det stå,
   * trækker det medianen ned og puster MAD op, så z-scoren for hele
   * vinduet bliver forkert. Sættes dette, oversættes 0 til null, som er
   * det tilstanden faktisk er.
   */
  zeroIsMissing?: boolean;
};

export type EdsParams = {
  /**
   * Flere datasæt sammenføjes til én serie, ældste først.
   * Elprisen kræver det: Elspotprices udgik 30. september 2025 og
   * DayAheadPrices starter samme dag.
   */
  datasets: Array<{
    name: string;
    timeField: string;
    valueField: string;
    /** Observationer fra og med denne dato bruges. Undgår overlap. */
    fromInclusive?: string;
    /** Observationer til og med denne dato bruges. */
    toInclusive?: string;
  }>;
  priceArea: string;
  /**
   * Aggregér til døgn ved indlæsning. Besluttet i byggebriefens 3d:
   * rådata gemmes ikke, fordi de to datasæt har forskellig opløsning
   * (time mod kvarter) og et døgngennemsnit gør dem sammenlignelige.
   */
  aggregateToDaily: true;
};

export type EurostatParams = {
  dataflow: string;
  /** Faste dimensionsværdier, fx { geo: "DE", indic: "BS-ICI", s_adj: "SA" }. */
  params: Record<string, string>;
};

/**
 * Kaldes undervejs med færdige observationer, så en afbrudt kørsel ikke
 * mister alt. Kun kilder der henter meget lidt ad gangen bruger den;
 * EDS er rate-limitet til cirka én side per fire minutter, og et fuldt
 * backfill af 27 års timedata tager derfor timer.
 *
 * Adapteren må kun sende FÆRDIGE perioder. En periode der stadig kan få
 * flere observationer i næste side ville blive skrevet halv og derefter
 * "revideret", og revisionsloggen ville fyldes med noget der ikke er
 * revisioner.
 */
export type BatchSink = (points: FetchedPoint[]) => Promise<void>;

export interface SourceAdapter {
  readonly source: SeriesDef["source"];
  /**
   * Henter hele den historik kilden har. Ingen afkortning.
   * Vi kan altid vælge et kortere vindue til beregning, men vi kan ikke
   * hente historik der aldrig blev gemt.
   *
   * `resumeFrom` springer alt til og med den dato over, så en afbrudt
   * kørsel kan tages op igen uden at hente det samme to gange.
   *
   * `since` afkorter hentningen hos KILDEN til perioder fra og med den
   * dato. Bruges af det daglige job, så en tabel med 12.506 daglige
   * perioder ikke hentes i sin helhed hver morgen.
   *
   * De to ligner hinanden og gør ikke det samme. `resumeFrom` er
   * "spring over hvad vi allerede nåede at gemme i denne kørsel" og
   * springer også revisioner over. `since` er "spørg kun om det her
   * vindue" og henter alt i vinduet igen, netop for at se revisioner.
   * Sæt aldrig `since` når formålet er fuld historik.
   */
  fetchSeries(
    def: SeriesDef,
    opts?: { onBatch?: BatchSink; resumeFrom?: Date | null; since?: Date | null }
  ): Promise<FetchedPoint[]>;
}

// ----------------------------------------------------------------
// Periodeparsing, fælles for alle DST-baserede kilder
// ----------------------------------------------------------------

/**
 * DST-periode til første dag i perioden som UTC-dato.
 * Håndterer dags-, måneds-, kvartals- og årsperioder.
 *
 * Returnerer null hvis formatet er ukendt. Kalderen skal behandle det
 * som en fejl, ikke som "ingen data".
 */
export function dstPeriodToDate(period: string): Date | null {
  let m = period.match(/^(\d{4})M(\d{2})D(\d{2})$/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  m = period.match(/^(\d{4})M(\d{2})$/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, 1));
  m = period.match(/^(\d{4})K(\d)$/);
  if (m) return new Date(Date.UTC(+m[1], (+m[2] - 1) * 3, 1));
  m = period.match(/^(\d{4})U(\d{2})$/); // uge
  if (m) {
    const jan4 = new Date(Date.UTC(+m[1], 0, 4));
    const dow = (jan4.getUTCDay() + 6) % 7;
    return new Date(jan4.getTime() + ((+m[2] - 1) * 7 - dow) * 86400000);
  }
  m = period.match(/^(\d{4})$/);
  if (m) return new Date(Date.UTC(+m[1], 0, 1));
  return null;
}

/** Eurostat-periode ("2026-06", "2026") til første dag i perioden. */
export function eurostatPeriodToDate(period: string): Date | null {
  let m = period.match(/^(\d{4})-(\d{2})$/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, 1));
  m = period.match(/^(\d{4})-?Q(\d)$/);
  if (m) return new Date(Date.UTC(+m[1], (+m[2] - 1) * 3, 1));
  m = period.match(/^(\d{4})$/);
  if (m) return new Date(Date.UTC(+m[1], 0, 1));
  return null;
}

/**
 * Rimeligt interval per enhed, brugt EFTER omregning.
 *
 * Værnet mod plausible forkerte værdier. Se CLAUDE.md. En valutakurs der
 * er blevet ganget med 0,01 ved en fejl lander på 0,064 i stedet for 6,4
 * og ser stadig ud som et tal. Intervallet fanger den; øjnene gør ikke.
 *
 * Grænserne er med vilje brede. De skal fange en faktor 100, ikke en
 * usædvanlig måned.
 */
export const UNIT_RANGES: Record<string, { min: number; max: number }> = {
  pct: { min: -25, max: 50 },
  nettotal: { min: -100, max: 100 },
  indeks: { min: 5, max: 5000 },
  indeks_1980: { min: 5, max: 5000 },
  dkk_per_enhed: { min: 0.01, max: 100 },
  dkk_mwh: { min: -5000, max: 50000 },
  m2: { min: 0, max: 100_000_000 },
  antal: { min: 0, max: 100_000_000 },
  per_1000: { min: -500, max: 500 },
  dkk: { min: 0, max: 100_000_000 },
};

/**
 * Kaster hvis en omregnet værdi ligger uden for hvad enheden tillader.
 * Kaldes af adapterne efter skalering, før noget skrives.
 */
export function assertUnitRange(
  seriesId: string,
  unit: string,
  values: Array<number | null>
): void {
  const range = UNIT_RANGES[unit];
  if (!range) return; // ukendt enhed: intet værn, men heller ingen falsk tryghed
  for (const v of values) {
    if (v === null || !Number.isFinite(v)) continue;
    if (v < range.min || v > range.max) {
      throw new Error(
        `${seriesId}: værdien ${v} ligger uden for hvad enheden "${unit}" tillader ` +
          `(${range.min} til ${range.max}). Sandsynligvis en forkert anvendt ` +
          `omregningsfaktor. Se CLAUDE.md om plausible forkerte værdier.`
      );
    }
  }
}

/** ISO-tidsstempel til UTC-midnat samme dag. Til døgnaggregering. */
export function toUtcMidnight(iso: string): Date {
  const d = new Date(iso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
