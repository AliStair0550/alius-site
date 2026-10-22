// ============================================================
// Læser omsætning og resultat fra et ESEF-regnskab (XBRL-instans)
//
// Børsnoterede selskaber indleverer deres års-, halvårs- og
// delårsrapporter til Erhvervsstyrelsen som XBRL. Hvert beløb står med
// en kontekst (periode, eventuelle dimensioner) og en enhed (valuta).
//
// VALUTAEN LÆSES, DEN ANTAGES ALDRIG. Maersk aflægger regnskab i dollar,
// Vestas i euro. En omsætning på 13 mia. dollar læst som kroner ligner
// en almindelig dansk virksomhed og er syv gange for lav. Se CLAUDE.md
// om plausible forkerte værdier. En enhed vi ikke kender, kaster.
//
// Kun beløb UDEN dimensioner bruges: det er koncernens tal. Med en
// dimension er det et segment, en region eller en egenkapitalpost.
//
// Ren funktion på en streng. Henter intet, skriver intet.
// ============================================================

/** De begreber vi læser. Omsætning har to navne i IFRS-taksonomien. */
export const BEGREBER = {
  omsaetning: ["Revenue", "RevenueFromContractsWithCustomers"],
  driftsresultat: ["ProfitLossFromOperatingActivities"],
  resultat: ["ProfitLoss"],
} as const;

export type Begreb = keyof typeof BEGREBER;

/** Valutaer vi kender. En anden valuta stopper kørslen; den skal tages stilling til. */
export const KENDTE_VALUTAER = ["DKK", "EUR", "USD", "SEK", "NOK", "GBP"] as const;
export type Valuta = (typeof KENDTE_VALUTAER)[number];

export type Fakta = {
  begreb: Begreb;
  /** Det IFRS-element tallet stod under, fx "RevenueFromContractsWithCustomers". */
  element: string;
  start: string; // YYYY-MM-DD
  slut: string; // YYYY-MM-DD
  vaerdi: number; // i hele valutaenheder, som indleveret
  valuta: Valuta;
};

export type Laest = {
  /** Navnet selskabet selv har skrevet i regnskabet. Bruges til at efterprøve CVR. */
  navn: string | null;
  fakta: Fakta[];
  /**
   * Tal regnskabet selv modsiger: samme begreb og periode med to værdier
   * der ikke kan forklares med afrunding. De er IKKE i `fakta`, og det
   * står her hvilke, så kalderen kan sige det.
   */
  konflikter: string[];
  /**
   * Samlede aktiver på balancedagene, uden dimensioner. Skalaankeret: et
   * børsnoteret selskab har altid aktiver i milliardklassen, og balancen
   * er obligatorisk. Omsætningen kan ikke bruges: Zealand Pharmas
   * omsætning i 3. kvartal 2024 var reelt 4,4 mio. kr.
   */
  aktiver: { dato: string; vaerdi: number; valuta: string }[];
};

const IFRS_NS = /^https?:\/\/xbrl\.ifrs\.org\/taxonomy\/[^"]+\/ifrs-full$/;

function attrs(s: string): Record<string, string> {
  return Object.fromEntries([...s.matchAll(/([\w:-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
}

export function laesEsef(xml: string): Laest {
  // Præfikset for IFRS-taksonomien. Det er næsten altid "ifrs-full", men
  // det er navnerummet der afgør det, ikke præfikset.
  const praefikser = [...xml.matchAll(/xmlns:([\w-]+)="([^"]+)"/g)].filter((m) => IFRS_NS.test(m[2])).map((m) => m[1]);
  if (praefikser.length === 0) throw new Error("Regnskabet bruger ikke IFRS-taksonomien. Det er ikke et ESEF-regnskab vi kan læse.");

  const kontekster = new Map<string, { start: string; slut: string } | null>();
  const oejeblikke = new Map<string, string>();
  for (const m of xml.matchAll(/<(?:[\w-]+:)?context\b([^>]*)>([\s\S]*?)<\/(?:[\w-]+:)?context>/g)) {
    const id = attrs(m[1]).id;
    const krop = m[2];
    const start = krop.match(/<(?:[\w-]+:)?startDate>\s*([^<\s]+)/)?.[1];
    const slut = krop.match(/<(?:[\w-]+:)?endDate>\s*([^<\s]+)/)?.[1];
    const harDimension = /explicitMember|typedMember/.test(krop);
    const instant = krop.match(/<(?:[\w-]+:)?instant>\s*([^<\s]+)/)?.[1];
    if (instant && !harDimension) oejeblikke.set(id, instant.slice(0, 10));
    kontekster.set(id, start && slut && !harDimension ? { start: start.slice(0, 10), slut: slut.slice(0, 10) } : null);
  }

  const enheder = new Map<string, string>();
  for (const m of xml.matchAll(/<(?:[\w-]+:)?unit\b([^>]*)>([\s\S]*?)<\/(?:[\w-]+:)?unit>/g)) {
    const maal = [...m[2].matchAll(/<(?:[\w-]+:)?measure>\s*([^<\s]+)/g)].map((x) => x[1]);
    enheder.set(attrs(m[1]).id, maal.join("/"));
  }

  const navnMatch = praefikser
    .map((p) => xml.match(new RegExp(`<${p}:NameOfReportingEntityOrOtherMeansOfIdentification\\b[^>]*>([\\s\\S]*?)</${p}:NameOfReportingEntityOrOtherMeansOfIdentification>`)))
    .find(Boolean);
  // Afkodet, markup fjernet og mellemrum samlet. FLSmidth har et <span>
  // midt i navnet, i ældre filer dobbelt kodet som "&lt;span .../&gt;" og
  // "&amp;amp;". Pandora skriver "Pandora  A/S".
  const afkod = (t: string) =>
    t.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
  const navn = navnMatch
    ? (() => {
        let t = navnMatch[1];
        for (let i = 0; i < 3 && /&(amp|lt|gt|quot|apos);/.test(t); i++) t = afkod(t);
        return t.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
      })()
    : null;

  // Passiver i alt er lig aktiver i alt per definition. NKT's Q3 2025 og
  // Ambus Q4 2024/25 har kun passiverne tagget.
  const aktiver: Laest["aktiver"] = [];
  for (const p of praefikser) {
    for (const m of xml.matchAll(new RegExp(`<${p}:(?:Assets|EquityAndLiabilities)\\b([^>]*?)>([^<]*)</${p}:(?:Assets|EquityAndLiabilities)>`, "g"))) {
      const a = attrs(m[1]);
      const dato = oejeblikke.get(a.contextRef);
      const v = Number(m[2].trim());
      if (!dato || !Number.isFinite(v)) continue;
      const iso = enheder.get(a.unitRef ?? "")?.match(/^iso4217:([A-Z]{3})$/)?.[1] ?? enheder.get(a.unitRef ?? "") ?? "ukendt";
      if (!aktiver.some((x) => x.dato === dato && x.vaerdi === v)) aktiver.push({ dato, vaerdi: v, valuta: iso });
    }
  }

  const fakta: Fakta[] = [];
  const set = new Map<string, { vaerdi: number; decimaler: number }>();
  const konfliktNoegler = new Map<string, string>();
  for (const [begreb, elementer] of Object.entries(BEGREBER) as [Begreb, readonly string[]][]) {
    for (const p of praefikser) {
      for (const el of elementer) {
        const re = new RegExp(`<${p}:${el}\\b([^>]*?)(?:/>|>([^<]*)</${p}:${el}>)`, "g");
        for (const m of xml.matchAll(re)) {
          const a = attrs(m[1]);
          if (a["xsi:nil"] === "true" || m[2] === undefined) continue;
          const k = kontekster.get(a.contextRef);
          if (k === undefined) throw new Error(`${el}: konteksten "${a.contextRef}" findes ikke i regnskabet`);
          if (k === null) continue; // segment eller øjebliksværdi, ikke koncernens periodetal
          const enhed = enheder.get(a.unitRef ?? "");
          if (!enhed) throw new Error(`${el} ${k.start}..${k.slut}: beløbet mangler en enhed. Valutaen kan ikke læses, og den gættes ikke.`);
          const iso = enhed.match(/^iso4217:([A-Z]{3})$/)?.[1];
          if (!iso || !(KENDTE_VALUTAER as readonly string[]).includes(iso)) {
            throw new Error(
              `${el} ${k.start}..${k.slut}: ukendt enhed "${enhed}". Kendte valutaer er ${KENDTE_VALUTAER.join(", ")}. ` +
                `Tag stilling til den, før tallet skrives. Se CLAUDE.md om plausible forkerte værdier.`
            );
          }
          const vaerdi = Number(m[2].trim());
          if (!Number.isFinite(vaerdi)) throw new Error(`${el} ${k.start}..${k.slut}: "${m[2]}" er ikke et tal`);
          // XBRL's "decimals": -3 betyder rundet til tusinder. INF eller intet er eksakt.
          const decimaler = a.decimals === undefined || a.decimals === "INF" ? Infinity : Number(a.decimals);
          // Samme tal kan stå flere gange (resultatopgørelse og noter), og to
          // tabeller kan være rundet forskelligt: Zealand Pharma har
          // -228.647.000 og -228.648.000 for samme kvartal. Inden for den
          // groveste afrunding er det samme tal, og det mest præcise bruges.
          // Uden for er det en modsigelse i regnskabet, og vi ved ikke
          // hvilket der er rigtigt: Vestas' halvår 2024 har både halvårets
          // -231 mio. og kvartalets -156 mio. under halvårets periode.
          const noegle = `${begreb}|${el}|${k.start}|${k.slut}|${iso}`;
          const foer = set.get(noegle);
          if (foer !== undefined) {
            const groveste = Math.min(foer.decimaler, decimaler);
            const tolerance = Number.isFinite(groveste) ? 10 ** -groveste : 0;
            if (Math.abs(foer.vaerdi - vaerdi) > tolerance + 1e-9) {
              konfliktNoegler.set(noegle, `${el} ${k.start}..${k.slut}: ${foer.vaerdi} og ${vaerdi} ${iso}`);
            } else if (decimaler > foer.decimaler) {
              set.set(noegle, { vaerdi, decimaler });
              const f = fakta.find((x) => `${x.begreb}|${x.element}|${x.start}|${x.slut}|${x.valuta}` === noegle)!;
              f.vaerdi = vaerdi;
            }
            continue;
          }
          set.set(noegle, { vaerdi, decimaler });
          fakta.push({ begreb, element: el, start: k.start, slut: k.slut, vaerdi, valuta: iso as Valuta });
        }
      }
    }
  }

  // Omsætning under begge navne for samme periode: brug "Revenue", som er
  // den samlede linje. Står kun det andet, bruges det.
  const ud = fakta.filter(
    (f) =>
      !konfliktNoegler.has(`${f.begreb}|${f.element}|${f.start}|${f.slut}|${f.valuta}`) &&
      !(
        f.begreb === "omsaetning" &&
        f.element !== "Revenue" &&
        fakta.some((g) => g.begreb === "omsaetning" && g.element === "Revenue" && g.start === f.start && g.slut === f.slut)
      )
  );
  return { navn, fakta: ud, konflikter: [...konfliktNoegler.values()], aktiver };
}

/** Antal måneder en periode dækker, afrundet. 3 er et kvartal, 6 et halvår, 12 et år. */
export function maaneder(start: string, slut: string): number {
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${slut}T00:00:00Z`);
  return Math.round((e.getTime() - s.getTime()) / (86_400_000 * 30.44));
}
