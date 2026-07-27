// ============================================================
// Sammenlignelige z-scores på tværs af serier
//
// PROBLEMET
//
// Serierne har vidt forskellig historik: elprisen har 27 år,
// realkreditrenten 23, tvangsauktioner 33, byggetilladelser 28.
// Beregnes z mod hver series egen fulde historik, måler de ikke det
// samme, og ranglisten rangerer noget andet end den påstår.
//
// Det er samme fejl som at boligbyggeri vandt rangeringen fordi boliger
// tælles i større enheder end procentpoint. Dengang var det enheden.
// Her er det vinduet.
//
// Tre ting gør vinduet skævt, og de skal alle tre lukkes:
//
//   1. REGIME. Et langt vindue rummer flere kriser. Elprisens 27 år
//      indeholder 2022, hvor prisen tidobledes. Det gør spredningen
//      enorm, og enhver senere bevægelse ser lille ud. En serie med
//      et roligt tiår får omvendt store z-scores af små udsving.
//   2. FREKVENS. En daglig serie svinger mere per observation end en
//      kvartalsvis. Sammenlignes z beregnet på dagsdata med z beregnet
//      på kvartalsdata, vinder dagsdata altid.
//   3. TREND. En indeksserie stiger over tid. z på niveau måler så
//      hvor langt fremme i tiden vi er, ikke om noget er usædvanligt.
//
// LØSNINGEN
//
//   1. Samme kalendervindue for alle. Ikke samme antal observationer,
//      men samme periode, så alle serier har set de samme regimer.
//   2. Alt resamples til månedlig frekvens før beregning.
//   3. Serier med trend beregnes på årsændring, ikke på niveau.
//      Serier der er middelsøgende i sig selv (renter, nettotal)
//      beregnes på niveau. Valget står i config som zTransform.
//   4. Robust spredning (median og MAD) frem for gennemsnit og
//      standardafvigelse, så ét kriseår ikke døver alt bagefter.
//   5. Dækningskrav: en serie skal have data i mindst 80 procent af
//      vinduet for at være rangerbar. Ellers vises den, men konkurrerer
//      ikke.
// ============================================================

import type { ZTransform } from "./adapters/types";

/**
 * Fælles vindue. Ti år er valgt fordi det er datakatalogets krav til
 * backfill og fordi alle rangerbare serier kan dække det. Historikken
 * i basen er længere; vinduet er kun til beregning.
 */
export const WINDOW_YEARS = 10;

/** Andel af vinduets måneder der skal have en observation. */
export const MIN_COVERAGE = 0.8;

/**
 * 0.6745 er den normalfordelte 75-percentil. Ganges MAD med 1/0.6745
 * bliver den sammenlignelig med en standardafvigelse, så en z på 2
 * betyder omtrent det samme som med den klassiske formel.
 */
const MAD_TO_SIGMA = 1 / 0.6745;

export type Obs = { period: Date; value: number };

export type ZResult =
  | {
      rankable: true;
      z: number;
      latest: number;
      latestPeriod: Date;
      center: number;
      scale: number;
      monthsUsed: number;
      coverage: number;
      transform: ZTransform;
    }
  | {
      rankable: false;
      /** Hvorfor den ikke kan rangeres. Aldrig bare "ingen z". */
      reason: "for_lidt_daekning" | "ingen_spredning" | "ingen_observationer";
      coverage: number;
      monthsUsed: number;
    };

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Median absolute deviation. Robust mod enkeltstående kriseperioder. */
function mad(xs: number[], center: number): number {
  return median(xs.map((x) => Math.abs(x - center)));
}

const monthKey = (d: Date) => d.getUTCFullYear() * 12 + d.getUTCMonth();

/**
 * Resampler til månedlig frekvens.
 *
 * Daglige serier midles inden for måneden; det er det rigtige for
 * priser og kurser. Serier der allerede er månedlige eller sjældnere
 * bliver båret frem, så en kvartalsserie fylder sine tre måneder.
 * Uden det ville en kvartalsserie have en tredjedel af observationerne
 * og dermed kunstigt lav dækning.
 */
export function toMonthly(obs: Obs[]): Map<number, number> {
  const buckets = new Map<number, { sum: number; n: number }>();
  for (const o of obs) {
    const k = monthKey(o.period);
    const b = buckets.get(k) ?? { sum: 0, n: 0 };
    b.sum += o.value;
    b.n += 1;
    buckets.set(k, b);
  }
  const monthly = new Map<number, number>();
  for (const [k, b] of buckets) monthly.set(k, b.sum / b.n);

  // Bær frem over huller, men kun inden for et år. Længere huller er
  // ikke en lav frekvens, det er manglende data.
  //
  // Afstanden måles fra den seneste ÆGTE observation, ikke fra den
  // seneste udfyldte. Ellers kaskaderer udfyldningen en måned ad gangen
  // og lukker et hul på seks år uden at nogen opdager det.
  const keys = [...monthly.keys()].sort((a, b) => a - b);
  if (keys.length === 0) return monthly;
  const filled = new Map(monthly);
  let lastRealKey: number | null = null;
  for (let k = keys[0]; k <= keys[keys.length - 1]; k++) {
    if (monthly.has(k)) { lastRealKey = k; continue; }
    if (lastRealKey !== null && k - lastRealKey <= 12) {
      filled.set(k, monthly.get(lastRealKey)!);
    }
  }
  return filled;
}

/** Årsændring i procent. Kræver samme måned året før. */
function toYoY(monthly: Map<number, number>): Map<number, number> {
  const out = new Map<number, number>();
  for (const [k, v] of monthly) {
    const prev = monthly.get(k - 12);
    if (prev === undefined || prev === 0) continue;
    out.set(k, ((v - prev) / Math.abs(prev)) * 100);
  }
  return out;
}

/**
 * Beregner z for én serie inden for det fælles vindue.
 *
 * `breakAt` afkorter vinduet yderligere: en definitionsændring gør tal
 * før den usammenlignelige med tal efter, uanset hvor lang historikken
 * ellers er.
 */
export function computeZ(
  obs: Obs[],
  transform: ZTransform,
  opts: { now?: Date; breakAt?: Date | null; windowYears?: number } = {}
): ZResult {
  const now = opts.now ?? new Date();
  const years = opts.windowYears ?? WINDOW_YEARS;

  const windowStart = new Date(
    Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), 1)
  );
  const effectiveStart =
    opts.breakAt && opts.breakAt > windowStart ? opts.breakAt : windowStart;

  const inWindow = obs
    .filter((o) => o.period >= effectiveStart && o.period <= now && Number.isFinite(o.value))
    .sort((a, b) => a.period.getTime() - b.period.getTime());

  const expectedMonths =
    (now.getUTCFullYear() - effectiveStart.getUTCFullYear()) * 12 +
    (now.getUTCMonth() - effectiveStart.getUTCMonth()) +
    1;

  if (inWindow.length === 0) {
    return { rankable: false, reason: "ingen_observationer", coverage: 0, monthsUsed: 0 };
  }

  const monthly = toMonthly(inWindow);
  const series = transform === "yoy" ? toYoY(monthly) : monthly;

  const coverage = series.size / Math.max(expectedMonths, 1);
  const values = [...series.values()];

  if (values.length < 12 || coverage < MIN_COVERAGE) {
    return {
      rankable: false,
      reason: "for_lidt_daekning",
      coverage,
      monthsUsed: values.length,
    };
  }

  const center = median(values);
  const rawScale = mad(values, center) * MAD_TO_SIGMA;

  if (rawScale === 0) {
    // En helt flad serie har ingen usædvanlige bevægelser. At kalde det
    // z = 0 ville være rigtigt, men at kalde det rangerbart ville lade
    // den konkurrere om en plads uden nogensinde at kunne vinde.
    return { rankable: false, reason: "ingen_spredning", coverage, monthsUsed: values.length };
  }

  const latestKey = Math.max(...series.keys());
  const latest = series.get(latestKey)!;
  const latestPeriod = new Date(
    Date.UTC(Math.floor(latestKey / 12), latestKey % 12, 1)
  );

  return {
    rankable: true,
    z: (latest - center) / rawScale,
    latest,
    latestPeriod,
    center,
    scale: rawScale,
    monthsUsed: values.length,
    coverage,
    transform,
  };
}
