// ============================================================
// Læselag over series og observations
//
// Dashboardene læste DataSource, DataPoint og Signal. Den model har
// ingen revisionshistorik, ingen attribution per serie og ingen
// is_current, så et rettet tal overskrev det gamle uden spor.
//
// Det her lag giver samme form som siderne allerede bruger, men henter
// fra den nye model. Rendering er urørt; det er kun kilden der skifter.
//
// TO TING DER IKKE FINDES I DEN NYE MODEL
//
//   areaName    DataPoint bar navnet med. observations har kun koden,
//               fordi et kommunenavn ikke er en observation. Navnet
//               slås op i src/lib/areas.ts, som er den ene sandhed.
//   areaType    Samme. Udledes af koden.
//
// SIGNALER
//
// Signal-tabellen hører til den gamle model og pegede på DataSource.
// Detektorerne i src/lib/signals er rene funktioner, så signalerne
// regnes nu ved rendering i stedet for at ligge i en tabel. Én kilde
// til tallet, og ingen tabel der kan komme bagud.
// ============================================================

import type { PrismaClient, SeriesFrequency } from "@prisma/client";
import { classifyAreaCode, getKommuneByCode } from "./areas";
import type { DataPoint } from "./signals/types";

/** Koder der betyder hele landet. De to modeller skriver den forskelligt. */
export const NATIONALE_KODER = new Set(["DK", "000"]);

export function erNationalKode(areaCode: string): boolean {
  return NATIONALE_KODER.has(areaCode);
}

/**
 * Dato til DST-periodestreng.
 *
 * Den gamle model gemte "2026M05" som tekst. Siderne formaterer stadig
 * på den streng gennem humanizePeriod, så den skal genskabes her frem
 * for at ændre visningen fjorten steder.
 */
export function datoTilPeriode(d: Date, frequency: SeriesFrequency): string {
  const aar = d.getUTCFullYear();
  const maaned = d.getUTCMonth() + 1;
  switch (frequency) {
    case "YEARLY":
      return String(aar);
    case "QUARTERLY":
      return `${aar}K${Math.floor((maaned - 1) / 3) + 1}`;
    case "WEEKLY":
    case "DAILY":
    case "MONTHLY":
    default:
      return `${aar}M${String(maaned).padStart(2, "0")}`;
  }
}

export function omraadeNavn(areaCode: string): string | null {
  if (erNationalKode(areaCode)) return "Hele landet";
  const k = getKommuneByCode(areaCode);
  return k ? k.name : null;
}

export type SerieInfo = {
  id: string;
  nameDa: string;
  unit: string;
  frequency: SeriesFrequency;
  attribution: string;
  source: string;
  sourceRef: string;
  /** Nyeste hentetidspunkt. Erstatter DataSource.lastFetchedAt. */
  hentet: Date | null;
};

/**
 * Serien og hvornår den sidst blev hentet.
 *
 * Null betyder at serien ikke findes. Kalderen skal behandle det som
 * "serien er ikke oprettet", ikke som "serien er tom". De to ser ens ud
 * på en side der bare viser ingenting.
 */
export async function hentSerieInfo(
  prisma: PrismaClient,
  seriesId: string
): Promise<SerieInfo | null> {
  const s = await prisma.series.findUnique({
    where: { id: seriesId },
    select: {
      id: true,
      nameDa: true,
      unit: true,
      frequency: true,
      attribution: true,
      source: true,
      sourceRef: true,
    },
  });
  if (!s) return null;

  const nyeste = await prisma.observation.findFirst({
    where: { seriesId, isCurrent: true },
    orderBy: { retrievedAt: "desc" },
    select: { retrievedAt: true },
  });

  return { ...s, hentet: nyeste?.retrievedAt ?? null };
}

export async function hentSerieInfoFlere(
  prisma: PrismaClient,
  ids: string[]
): Promise<Map<string, SerieInfo>> {
  const ud = new Map<string, SerieInfo>();
  const fundne = await Promise.all(ids.map((id) => hentSerieInfo(prisma, id)));
  for (const s of fundne) if (s) ud.set(s.id, s);
  return ud;
}

type HentOpts = {
  /** Tomt betyder alle områder. */
  areaCode?: string | string[];
  fra?: Date;
  til?: Date;
  /** Kun observationer med en værdi. Default true. */
  kunMedVaerdi?: boolean;
};

/**
 * Observationer i den form detektorerne og komponenterne kender.
 *
 * Læser kun is_current. En revideret række ligger stadig i basen med
 * sin oprindelige værdi, men det er ikke den der skal vises.
 */
export async function hentPunkter(
  prisma: PrismaClient,
  seriesId: string,
  frequency: SeriesFrequency,
  opts: HentOpts = {}
): Promise<DataPoint[]> {
  const rows = await prisma.observation.findMany({
    where: {
      seriesId,
      isCurrent: true,
      ...(opts.kunMedVaerdi === false ? {} : { value: { not: null } }),
      ...(opts.areaCode
        ? {
            areaCode: Array.isArray(opts.areaCode)
              ? { in: opts.areaCode }
              : opts.areaCode,
          }
        : {}),
      ...(opts.fra || opts.til
        ? { period: { ...(opts.fra ? { gte: opts.fra } : {}), ...(opts.til ? { lte: opts.til } : {}) } }
        : {}),
    },
    select: { areaCode: true, period: true, value: true },
    orderBy: { period: "asc" },
  });

  return rows.map((r) => ({
    period: datoTilPeriode(r.period, frequency),
    periodDate: r.period,
    areaCode: r.areaCode,
    areaName: omraadeNavn(r.areaCode),
    areaType: omraadeType(r.areaCode),
    value: r.value === null ? null : Number(r.value),
  }));
}

/**
 * Områdetype til detektorerne.
 *
 * En kode vi ikke genkender bliver OTHER, aldrig KOMMUNE. Den ville
 * ellers indgå i kommunerangeringer, og et signal om "højeste ledighed"
 * kunne pege på noget der ikke er et sted. AUS08's 997 og 998 er DST's
 * restkategorier og er præcis den slags.
 */
function omraadeType(areaCode: string): DataPoint["areaType"] {
  if (erNationalKode(areaCode)) return "NATIONAL";
  return classifyAreaCode(areaCode);
}

/**
 * Nationale punkter. Slår begge kodninger op, fordi serier fra
 * migreringen bruger DST's "000" og serier fra config bruger "DK".
 */
export async function hentNationale(
  prisma: PrismaClient,
  seriesId: string,
  frequency: SeriesFrequency,
  opts: Omit<HentOpts, "areaCode"> = {}
): Promise<DataPoint[]> {
  return hentPunkter(prisma, seriesId, frequency, {
    ...opts,
    areaCode: [...NATIONALE_KODER],
  });
}

/** Seneste periode med en værdi. Null når serien ikke har nogen. */
export async function hentNyestePeriode(
  prisma: PrismaClient,
  seriesId: string,
  areaCode?: string | string[]
): Promise<Date | null> {
  const r = await prisma.observation.findFirst({
    where: {
      seriesId,
      isCurrent: true,
      value: { not: null },
      ...(areaCode
        ? { areaCode: Array.isArray(areaCode) ? { in: areaCode } : areaCode }
        : {}),
    },
    orderBy: { period: "desc" },
    select: { period: true },
  });
  return r?.period ?? null;
}

export type OmraadeVaerdi = { areaCode: string; areaName: string; value: number };

/**
 * Alle kommuner for én periode, sorteret faldende.
 *
 * Kun rigtige kommuner. AUS08 leverer også 997 og 998, som er DST's
 * restkategorier, og de ville ellers stå i rangeringen som var de et
 * sted på kortet.
 */
export async function hentKommuner(
  prisma: PrismaClient,
  seriesId: string,
  periode: Date
): Promise<OmraadeVaerdi[]> {
  const rows = await prisma.observation.findMany({
    where: { seriesId, isCurrent: true, period: periode, value: { not: null } },
    select: { areaCode: true, value: true },
  });

  return rows
    .filter((r) => classifyAreaCode(r.areaCode) === "KOMMUNE")
    .map((r) => ({
      areaCode: r.areaCode,
      areaName: omraadeNavn(r.areaCode) ?? r.areaCode,
      value: Number(r.value),
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Seneste værdi per område, uanset om områderne er lige langt fremme.
 *
 * Erstatter den gamle models distinct-på-areaCode. Nødvendig fordi
 * kommunerne ikke altid har samme nyeste periode: en enkelt kommune kan
 * mangle en måned uden at de andre gør, og at binde alle til samme
 * periode ville så vise den som tom frem for som forsinket.
 */
export async function hentSenesteePerOmraade(
  prisma: PrismaClient,
  seriesId: string,
  frequency: SeriesFrequency
): Promise<Map<string, { value: number; period: string; periodDate: Date }>> {
  const rows = await prisma.observation.findMany({
    where: { seriesId, isCurrent: true, value: { not: null } },
    orderBy: { period: "desc" },
    distinct: ["areaCode"],
    select: { areaCode: true, value: true, period: true },
  });

  return new Map(
    rows.map((r) => [
      r.areaCode,
      {
        value: Number(r.value),
        period: datoTilPeriode(r.period, frequency),
        periodDate: r.period,
      },
    ])
  );
}

/**
 * Kildelinje for de serier en side faktisk viser.
 *
 * Byggebriefens afsnit 6: attribution genereres fra serierne, ikke som
 * en fast tekst i bunden. Vi henter fra fire kilder nu, og "Danmarks
 * Statistik" alene er ikke længere sandt.
 */
export function kildelinje(serier: Array<SerieInfo | null | undefined>): string {
  const set = new Set<string>();
  for (const s of serier) if (s) set.add(s.attribution);
  return [...set].sort().join(" ");
}

/**
 * Hvilke organisationer der faktisk står bag de viste serier.
 *
 * Udledes af data, ikke skrevet i hånden. En fast liste i bunden af
 * siden bliver forkert den dag en kilde kommer til eller falder fra, og
 * ingen opdager det, fordi teksten ser rigtig ud.
 *
 * Nationalbanken er et særtilfælde: DNVALD, DNRUGPI og DNRUURI ligger i
 * DST's statistikbank, men tallene er Nationalbankens. Det står i
 * seriens attribution, og derfor læses det derfra.
 */
export function kildeOrganisationer(serier: Array<SerieInfo | null | undefined>): string[] {
  const navne: Record<string, string> = {
    DST: "Danmarks Statistik",
    EDS: "Energinet",
    EUROSTAT: "Eurostat",
  };
  const set = new Set<string>();
  for (const s of serier) {
    if (!s) continue;
    // DERIVED har ingen egen kilde. Bestanddelene har, og de er med i
    // listen i forvejen.
    const n = navne[s.source];
    if (n) set.add(n);
    if (s.attribution.includes("Danmarks Nationalbank")) {
      set.add("Danmarks Nationalbank");
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, "da"));
}

/** "A, B, C og D". Tom liste giver tom streng, ikke "og". */
export function opremsning(dele: string[]): string {
  if (dele.length === 0) return "";
  if (dele.length === 1) return dele[0];
  return `${dele.slice(0, -1).join(", ")} og ${dele[dele.length - 1]}`;
}

/**
 * Kilder med dokumenteret licens.
 *
 * Vi skrev "CC 4.0 BY" på alt indtil 28. juli 2026. For Energinet og
 * Eurostat kan påstanden dokumenteres: begge oplyser CC BY 4.0 i deres
 * egne vilkår, og begge tillader kommerciel brug.
 *
 * For Danmarks Statistik kan den ikke. DST's tableinfo-API leverer
 * intet licensfelt, og der findes ingen offentlig vilkårsside vi har
 * kunnet finde. Påstanden er formentlig rigtig, men den stod i vores
 * egen kode og ingen andres.
 *
 * En licenspåstand vi ikke kan dokumentere er værre end ingen: den
 * ser ud som en oplysning og er et gæt. Indtil skriftlig bekræftelse
 * foreligger, krediteres DST uden licens. Se byggebriefens afsnit 6a.
 */
export const DOKUMENTEREDE_LICENSER: Record<string, string> = {
  Energinet: "CC BY 4.0",
  Eurostat: "CC BY 4.0",
};

/**
 * Kildelinjen til bunden af en side.
 *
 * Nævner alle kilder, men kun de licenser vi kan stå inde for.
 */
export function kildeOgLicens(serier: Array<SerieInfo | null | undefined>): string {
  const orgs = kildeOrganisationer(serier);
  if (orgs.length === 0) return "";

  const medLicens = orgs.filter((o) => DOKUMENTEREDE_LICENSER[o]);
  const linje = `Alius Pulse er udviklet af Alius og bygger på åbne data fra ${opremsning(orgs)}.`;
  if (medLicens.length === 0) return linje;

  // Licenserne er de samme i dag, men listen skal kunne bære to
  // forskellige uden at blive omskrevet.
  const unikke = [...new Set(medLicens.map((o) => DOKUMENTEREDE_LICENSER[o]))];
  const navn = unikke.length === 1 ? unikke[0] : unikke.join(" henholdsvis ");
  return `${linje} ${opremsning(medLicens)} under ${navn}.`;
}
