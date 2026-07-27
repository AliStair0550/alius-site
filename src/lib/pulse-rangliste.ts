// ============================================================
// Ranglisten
//
// Byggebriefens afsnit 4. Erstatter signalfeedet på /pulse.
//
//   1. Beregn z for alle rangerbare serier mod samme ti-års vindue
//   2. Sortér faldende efter |z|
//   3. Vis kun |z| >= 1,5
//   4. Maks fire kort
//   5. Resten foldes sammen i en rolig liste
//
// Tærsklerne er IKKE kalibrerede. Byggebriefens punkt 6 sætter dem
// efter fire ugers målt publiceringshistorik. Indtil da står de her
// som ét sted, ikke spredt i visningen.
// ============================================================

import type { PrismaClient } from "@prisma/client";
import type { ZTransform } from "./adapters/types";
import { computeZ, WINDOW_YEARS, type Obs, type ZResult } from "./pulse-zscore";

/** Under denne er bevægelsen ikke usædvanlig nok til et kort. */
export const MIN_Z = 1.5;

/** Maks kort. Fylder færre kriteriet, vises færre. */
export const MAX_KORT = 4;

/**
 * Områder ranglisten regner på.
 *
 * KOMMUNETAL RANGERES IKKE I DENNE UDGAVE, og det er en beslutning, ikke
 * en forglemmelse.
 *
 * Byggebriefens afsnit 4 forudsatte en kvote på ét kommunesignal. Den
 * kvote løser pladsproblemet, men ikke det her:
 *
 *   BYGV33 for Brøndby, seneste tolv kvartaler:
 *   15, 3, 5, 5, 1, 3, 15, 7, 187, 14, 2, 5
 *
 * Årsændringen fra 1 til 15 boliger er plus 1400 procent, og z bliver
 * 10,3. Tallet er regnet rigtigt. Det er bare ikke en oplysning om
 * noget, fordi en procentvis ændring på en base på én bolig ikke måler
 * en konjunktur. Den lå øverst på ranglisten ved første kørsel.
 *
 * Det er den fejlklasse CLAUDE.md kalder plausible forkerte værdier:
 * ingen alarm ville fange den, og kortet ville se ud som alle de andre.
 * Kommunetal hører til på kommunedashboardet, hvor niveauet står ved
 * siden af og en læser kan se at der er tale om enkeltbyggerier.
 *
 * Skal kommuner med senere, kræver det et gulv under basen, ikke en
 * kvote. Det er en beslutning der skal træffes på indholdet.
 */
export const NATIONALE_OMRAADER = new Set(["DK", "000"]);

/**
 * Maks ét kort fra ikke-nationale områder.
 *
 * Står ved magt for den dag kommunetal kommer med igen. Så længe
 * NATIONALE_OMRAADER filtrerer dem fra, når ingen kandidat hertil.
 */
export const MAX_KOMMUNEKORT = 1;

/**
 * Maks ét kort per kildetabel.
 *
 * ETILLID leverer tre rangerbare serier, DNRUURI to. De bevæger sig
 * sammen, fordi de er samme undersøgelse. Uden kvoten kan tre af fire
 * pladser gå til tre udgaver af den samme kendsgerning.
 *
 * Dette er korrelation INDEN FOR en kilde. Korrelation PÅ TVÆRS af
 * kilder løses af series.rankGroup, som allerede har slukket taberne
 * før de når hertil.
 */
export const MAX_PER_KILDE = 1;

/**
 * Hvad z skal beregnes på for serier hvor meta.zTransform mangler.
 *
 * De fem kom ind ved migreringen fra den gamle model og har aldrig
 * fået en transformation. De står her frem for som en default, fordi
 * valget ændrer tallet:
 *
 *   level på en serie med trend måler hvor langt fremme i tiden vi er
 *   yoy på en serie der allerede er en årsændring måler ingenting
 *
 * Begge producerer et tal der ser rimeligt ud. Se CLAUDE.md om
 * plausible forkerte værdier. En serie uden erklæret transformation
 * rangeres ikke; den siger hvorfor.
 */
export const ERKLAEREDE_TRANSFORMATIONER: Record<string, ZTransform> = {
  // Sæsonkorrigeret ledighedsprocent. Middelsøgende omkring et niveau,
  // ikke trendende. Spørgsmålet er "er ledigheden usædvanlig nu".
  "dst.ledighed.sasonkorrigeret": "level",

  // Nettotal, afgrænset mellem -100 og 100 af sin egen konstruktion.
  // Kan ikke trende ud af sit interval.
  "dst.forbrug.forventning.f1": "level",

  // Serien ER en årsændring. yoy ovenpå ville være årsændringen af en
  // årsændring, hvilket ikke svarer på noget nogen spørger om.
  "dst.pris.forbruger.aarsaendring": "level",

  // Sæsonkorrigeret antal per måned. Bestanden af virksomheder vokser
  // over ti år, men langsomt nok til at MAD'en tåler det, og niveauet
  // er det en direktør reagerer på: "hvor mange går konkurs nu".
  "dst.konkurs.total": "level",

  // Antal boliger påbegyndt, kvartalsvis, IKKE sæsonkorrigeret. Både
  // trend og sæson skal ud, og yoy fjerner begge på én gang.
  "dst.byg.paabegyndt": "yoy",
};

/**
 * Link til kilden bag serien.
 *
 * Null når vi ikke kan bygge en adresse vi ved er rigtig. Et link der
 * peger et forkert sted er værre end ingen link, og attributionsteksten
 * står under kortet uanset hvad. EDS' sourceRef er sammensat af to
 * datasæt for at dække hele historikken, så der findes ingen enkelt
 * side at pege på. Afledte serier har ingen ekstern kilde; deres
 * bestanddele har.
 */
export function kildeUrl(kilde: string, kildeRef: string): string | null {
  if (kildeRef.includes("+") || kildeRef.includes("/")) return null;
  if (kilde === "DST") return `https://www.statistikbanken.dk/${kildeRef}`;
  if (kilde === "EUROSTAT") {
    return `https://ec.europa.eu/eurostat/databrowser/view/${kildeRef}/default/table`;
  }
  if (kilde === "EDS") {
    return `https://www.energidataservice.dk/tso-electricity/${kildeRef}`;
  }
  return null;
}

export type Kandidat = {
  seriesId: string;
  navn: string;
  enhed: string;
  kilde: string;
  kildeRef: string;
  attribution: string;
  lag: string;
  areaCode: string;
  /** Nyeste hentetidspunkt for de observationer der indgår. */
  hentet: Date;
  z: number;
  /** Seneste værdi, efter transformation. */
  vaerdi: number;
  /** Seneste værdi i seriens egen enhed, utransformeret. */
  raaVaerdi: number;
  periode: Date;
  /** Midten af vinduet. Sammenligningsgrundlaget. */
  normal: number;
  transform: ZTransform;
  /**
   * Hvor mange måneder i vinduet der var mindst lige så yderligtgående
   * i samme retning, inklusive denne. 1 betyder "ikke set før i vinduet".
   *
   * Bruges i stedet for at skrive sigma på skærmen. En læser kan afgøre
   * om 1 ud af 121 er meget; de færreste kan afgøre om 2,3 sigma er.
   */
  sjaeldenhed: number;
  /** Antal måneder vinduet faktisk indeholdt. */
  maaneder: number;
  /** 24 seneste månedsværdier til kurven, ældst først. */
  kurve: Array<{ periode: Date; vaerdi: number }>;
};

/** En serie der ikke kunne rangeres, og hvorfor. Aldrig bare udeladt. */
export type Udeladt = {
  seriesId: string;
  navn: string;
  areaCode: string;
  grund: string;
};

export type Rangliste = {
  kort: Kandidat[];
  rolige: Kandidat[];
  udeladte: Udeladt[];
  /** Nyeste hentetidspunkt på tværs af alt der indgår. */
  hentet: Date | null;
  /** Vinduets længde i år. Vises som sammenligningsgrundlag. */
  vinduesAar: number;
};

/**
 * Hvor sjælden den seneste værdi er inden for vinduet.
 *
 * Tæller måneder mindst lige så langt fra midten i samme retning.
 * Retningen er med vilje: en usædvanlig lav rente og en usædvanlig høj
 * er to forskellige begivenheder, og at slå dem sammen ville gøre en
 * rekordlav værdi til "set 14 gange før".
 */
export function beregnSjaeldenhed(
  vaerdier: number[],
  seneste: number,
  normal: number
): number {
  const opad = seneste >= normal;
  return vaerdier.filter((v) => (opad ? v >= seneste : v <= seneste)).length;
}

/**
 * Rangordner og skærer til.
 *
 * Kvoterne anvendes efter sorteringen, så den stærkeste kandidat i en
 * gruppe altid er den der optager pladsen. En kandidat der ryger på en
 * kvote forsvinder ikke; den falder ned i den rolige liste.
 */
export function rangordn(kandidater: Kandidat[]): {
  kort: Kandidat[];
  rolige: Kandidat[];
} {
  const sorteret = [...kandidater].sort((a, b) => Math.abs(b.z) - Math.abs(a.z));

  const kort: Kandidat[] = [];
  const rolige: Kandidat[] = [];
  let kommuner = 0;
  const brugteKilder = new Map<string, number>();

  for (const k of sorteret) {
    if (Math.abs(k.z) < MIN_Z) {
      rolige.push(k);
      continue;
    }
    if (kort.length >= MAX_KORT) {
      rolige.push(k);
      continue;
    }
    const erKommune = k.areaCode !== "DK";
    if (erKommune && kommuner >= MAX_KOMMUNEKORT) {
      rolige.push(k);
      continue;
    }
    const brugt = brugteKilder.get(k.kildeRef) ?? 0;
    if (brugt >= MAX_PER_KILDE) {
      rolige.push(k);
      continue;
    }

    kort.push(k);
    if (erKommune) kommuner++;
    brugteKilder.set(k.kildeRef, brugt + 1);
  }

  return { kort, rolige };
}

/** Hvorfor en serie ikke kunne rangeres, i almindelige ord. */
function forklarUdeladelse(r: Extract<ZResult, { rankable: false }>, nyeste: Date | null): string {
  const til = nyeste ? ` Nyeste tal er fra ${nyeste.toISOString().slice(0, 7)}.` : "";
  switch (r.reason) {
    case "ingen_observationer":
      return `Ingen tal i de seneste ${WINDOW_YEARS} år.${til}`;
    case "for_lidt_daekning":
      return (
        `Dækker ${Math.round(r.coverage * 100)} procent af de seneste ` +
        `${WINDOW_YEARS} år. Der skal 80 til.${til}`
      );
    case "ingen_spredning":
      return `Serien har ikke bevæget sig i de seneste ${WINDOW_YEARS} år.${til}`;
  }
}

const maanedNoegle = (d: Date) => d.getUTCFullYear() * 12 + d.getUTCMonth();

/**
 * Bygger ranglisten fra databasen.
 *
 * Læser kun series.rankable. Den udleder aldrig selv hvem der må
 * konkurrere, fordi to steder der beregner det samme før eller siden
 * er uenige.
 */
export async function hentRangliste(
  prisma: PrismaClient,
  now: Date = new Date()
): Promise<Rangliste> {
  const serier = await prisma.series.findMany({
    where: { rankable: true, status: "ACTIVE" },
    select: {
      id: true,
      nameDa: true,
      unit: true,
      source: true,
      sourceRef: true,
      attribution: true,
      layer: true,
      breakAt: true,
      meta: true,
    },
    orderBy: { id: "asc" },
  });

  const kandidater: Kandidat[] = [];
  const udeladte: Udeladt[] = [];
  let nyesteHentning: Date | null = null;

  const vinduesStart = new Date(
    Date.UTC(now.getUTCFullYear() - WINDOW_YEARS - 1, now.getUTCMonth(), 1)
  );

  for (const s of serier) {
    const meta = (s.meta ?? {}) as { zTransform?: ZTransform };
    const transform = meta.zTransform ?? ERKLAEREDE_TRANSFORMATIONER[s.id];

    if (!transform) {
      // Ikke en default. En serie uden erklæret transformation er en
      // serie ingen har taget stilling til, og det er ikke det samme
      // som en serie der ikke bevægede sig.
      udeladte.push({
        seriesId: s.id,
        navn: s.nameDa,
        areaCode: "DK",
        grund:
          "Ingen erklæret beregningsform. Tilføj den i " +
          "ERKLAEREDE_TRANSFORMATIONER i src/lib/pulse-rangliste.ts.",
      });
      continue;
    }

    const rows = await prisma.observation.findMany({
      where: {
        seriesId: s.id,
        isCurrent: true,
        value: { not: null },
        period: { gte: vinduesStart },
      },
      select: { areaCode: true, period: true, value: true, retrievedAt: true },
      orderBy: { period: "asc" },
    });

    if (rows.length === 0) {
      udeladte.push({
        seriesId: s.id,
        navn: s.nameDa,
        areaCode: "DK",
        grund: `Ingen tal hentet for de seneste ${WINDOW_YEARS} år.`,
      });
      continue;
    }

    const perOmraade = new Map<string, typeof rows>();
    for (const r of rows) {
      const liste = perOmraade.get(r.areaCode) ?? [];
      liste.push(r);
      perOmraade.set(r.areaCode, liste);
    }

    // Ét notat per serie, ikke 116. En liste med samme sætning hundrede
    // gange skjuler de udeladelser der er værd at læse.
    const fravalgte = [...perOmraade.keys()].filter(
      (a) => !NATIONALE_OMRAADER.has(a)
    );
    if (fravalgte.length > 0) {
      udeladte.push({
        seriesId: s.id,
        navn: s.nameDa,
        areaCode: `${fravalgte.length} områder`,
        grund:
          `${fravalgte.length} kommuner rangeres ikke. Tallene er små nok til ` +
          "at en procentvis ændring svinger vildt uden at noget er sket. " +
          "De vises på kommunedashboardet, hvor niveauet står ved siden af.",
      });
    }

    for (const [areaCode, liste] of perOmraade) {
      if (!NATIONALE_OMRAADER.has(areaCode)) continue;
      const obs: Obs[] = liste.map((r) => ({
        period: r.period,
        value: Number(r.value),
      }));
      const nyestePeriode = obs[obs.length - 1]?.period ?? null;

      const z = computeZ(obs, transform, { now, breakAt: s.breakAt });

      if (!z.rankable) {
        udeladte.push({
          seriesId: s.id,
          navn: s.nameDa,
          areaCode,
          grund: forklarUdeladelse(z, nyestePeriode),
        });
        continue;
      }

      const hentet = liste.reduce<Date>(
        (m, r) => (r.retrievedAt > m ? r.retrievedAt : m),
        liste[0].retrievedAt
      );
      if (!nyesteHentning || hentet > nyesteHentning) nyesteHentning = hentet;

      // Kurven vises altid på niveau, også når z er beregnet på
      // årsændring. En læser skal se serien, ikke transformationen.
      const maanedlig = new Map<number, { sum: number; n: number }>();
      for (const o of obs) {
        const k = maanedNoegle(o.period);
        const b = maanedlig.get(k) ?? { sum: 0, n: 0 };
        b.sum += o.value;
        b.n += 1;
        maanedlig.set(k, b);
      }
      const kurve = [...maanedlig.entries()]
        .sort((a, b) => a[0] - b[0])
        .slice(-24)
        .map(([k, b]) => ({
          periode: new Date(Date.UTC(Math.floor(k / 12), k % 12, 1)),
          vaerdi: b.sum / b.n,
        }));

      const raaVaerdi = obs[obs.length - 1].value;

      kandidater.push({
        seriesId: s.id,
        navn: s.nameDa,
        enhed: s.unit,
        kilde: s.source,
        kildeRef: s.sourceRef,
        attribution: s.attribution,
        lag: s.layer,
        areaCode,
        hentet,
        z: z.z,
        vaerdi: z.latest,
        raaVaerdi,
        periode: z.latestPeriod,
        normal: z.center,
        transform,
        // Regnes på z.values, ikke på kurven. Kurven er niveauer, og z
        // kan være regnet på årsændring; at tælle den ene op mod den
        // anden ville give et tal der lyder præcist og ikke betyder
        // noget.
        sjaeldenhed: beregnSjaeldenhed(z.values, z.latest, z.center),
        maaneder: z.monthsUsed,
        kurve,
      });
    }
  }

  const { kort, rolige } = rangordn(kandidater);
  return {
    kort,
    rolige,
    udeladte,
    hentet: nyesteHentning,
    vinduesAar: WINDOW_YEARS,
  };
}
