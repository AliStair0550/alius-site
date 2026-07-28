// ============================================================
// Enheder: hvordan et tal skrives ud
//
// HVORFOR ÉT STED
//
// Formateringen lå som en switch i både Rangliste.tsx og
// Noegletal.tsx. Begge havde en default-gren, og fire af basens ti
// enheder faldt igennem til den: indeks, indeks_1980, dkk og per_1000.
//
// To af dem var reelt forkerte. Ejendomsværdier stod som
// "2.662.528,0" med en decimal og uden "kr.", og demografital stod som
// et bart tal uden at sige per hvad. Ingen af delene fejlede noget.
// Det er samme fejlklasse som m2 der fik en decimal: en gren nogen
// glemte, som gav et tal der så rigtigt ud.
//
// EN UKENDT ENHED KASTER
//
// Alternativet er en default, og en default er netop det der skjulte
// fejlen. Kaster den, opdages en ny enhed på den første side der viser
// den, og testen nedenfor fanger den før det: hver enhed i config og i
// legacy-mapping skal stå her.
//
// Se CLAUDE.md om plausible forkerte værdier. Et tal med forkert eller
// manglende enhed er præcis den slags der citeres videre og bliver
// forkert et sted vi ikke kan se.
// ============================================================

export type Enhed = {
  /** Decimaler i visningen. Hele tal har nul, ikke "cirka nul". */
  decimaler: number;
  /** Skrives efter tallet. Tom når enheden er et bart tal. */
  efter: string;
  /**
   * Er enheden selv en sats.
   *
   * En sats sammenlignes i point: en rente der går fra 3,0 til 3,4 er
   * steget 0,4 procentpoint, ikke 0,4 procent. Alt andet, hvor
   * niveauet er en mængde eller et beløb, sammenlignes i procent.
   */
  erSats: boolean;
  /** Hvad en forskel i denne enhed hedder. Kun for satser. */
  forskelsnavn?: string;
};

export const ENHEDER: Record<string, Enhed> = {
  pct: { decimaler: 2, efter: "procent", erSats: true, forskelsnavn: "procentpoint" },
  nettotal: { decimaler: 1, efter: "", erSats: true, forskelsnavn: "point" },

  // Et indeks er et bart tal. Basisåret hører til i seriens navn, ikke
  // efter tallet: "105,4 indeks" siger intet, "Erhvervstillidsindikator
  // 105,4" siger det hele.
  indeks: { decimaler: 1, efter: "", erSats: false },
  indeks_1980: { decimaler: 1, efter: "", erSats: false },

  antal: { decimaler: 0, efter: "", erSats: false },
  m2: { decimaler: 0, efter: "m2", erSats: false },

  // Beløb rundes til hele kroner. En gennemsnitlig ejendomsværdi med
  // decimaler foregiver en præcision der ikke findes i et gennemsnit.
  dkk: { decimaler: 0, efter: "kr.", erSats: false },
  dkk_mwh: { decimaler: 0, efter: "kr. per MWh", erSats: false },
  dkk_per_enhed: { decimaler: 2, efter: "kr.", erSats: false },

  // Demografi. Uden "per 1.000 indbyggere" er tallet ikke en oplysning,
  // det er et ciffer.
  per_1000: { decimaler: 1, efter: "per 1.000 indbyggere", erSats: false },
};

/**
 * Slår enheden op. Kaster hvis den ikke er erklæret.
 *
 * Med vilje. En ukendt enhed skal opdages, ikke formateres på et gæt.
 */
export function enhed(navn: string): Enhed {
  const e = ENHEDER[navn];
  if (!e) {
    throw new Error(
      `Ukendt enhed "${navn}". Tilføj den i src/lib/pulse-enheder.ts med ` +
        `decimaler, efterskrift og om den er en sats. Uden det ville tallet ` +
        `blive formateret på et gæt, og et tal med forkert enhed er værre ` +
        `end intet tal.`
    );
  }
  return e;
}

function daTal(v: number, decimaler: number): string {
  return v.toLocaleString("da-DK", {
    minimumFractionDigits: decimaler,
    maximumFractionDigits: decimaler,
  });
}

/** Værdien med sin enhed, klar til at stå på en side. */
export function formatVaerdi(v: number, enhedsnavn: string): string {
  const e = enhed(enhedsnavn);
  const t = daTal(v, e.decimaler);
  return e.efter ? `${t} ${e.efter}` : t;
}

/** Kun tallet, uden enhed. Til steder hvor enheden allerede står. */
export function formatTal(v: number, enhedsnavn: string): string {
  return daTal(v, enhed(enhedsnavn).decimaler);
}

/**
 * En ændring mod en tidligere periode, som en sætning uden fortegn.
 *
 * Satser sammenlignes i point, mængder i procent. Procenten kræver et
 * grundlag; er grundlaget nul eller nær nul, er den procentvise ændring
 * enten uendelig eller vildt ustabil, og så er det absolutte tal det
 * ærlige svar.
 */
export function formatAendring(
  forskel: number,
  grundlag: number | null,
  enhedsnavn: string,
  haleTekst: string
): string {
  const e = enhed(enhedsnavn);
  const retning = forskel > 0 ? "højere" : "lavere";
  const a = Math.abs(forskel);

  if (e.erSats) {
    const graense = e.decimaler === 2 ? 0.005 : 0.05;
    if (a < graense) return `Uændret ${haleTekst}`;
    return `${daTal(a, e.decimaler)} ${e.forskelsnavn} ${retning} end ${haleTekst}`;
  }

  if (grundlag === null || Math.abs(grundlag) < 1) {
    return [daTal(a, e.decimaler), e.efter, retning, "end", haleTekst]
      .filter(Boolean)
      .join(" ");
  }

  const pct = (a / Math.abs(grundlag)) * 100;
  if (pct < 0.5) return `Nogenlunde som ${haleTekst}`;
  return `${daTal(pct, 0)} procent ${retning} end ${haleTekst}`;
}
