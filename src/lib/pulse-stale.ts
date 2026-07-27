// ============================================================
// Stale-detektion for Pulse
//
// Datakatalogets afsnit 4: "Ingen serie må fejle stille. Hvis en serie
// ikke er opdateret inden for sit forventede vindue plus to dage, skal
// der gå en alarm til superadmin."
//
// Der er to måder en serie kan dø på, og de skal begge fanges:
//
//   1. Data er forældet. Kilden har ikke publiceret, eller vi opdager
//      det ikke. Måles på nyeste periode i DataPoint.
//   2. Kørslen fejler. Det var det der skete 25. juni og 25. juli 2026,
//      hvor workflowet blev afbrudt på timeout midt i BYGV33 og
//      efterlod en FetchLog-række uden completedAt og uden fejlbesked.
//      Ingen mail blev sendt, fordi ingen kiggede på FetchLog.
//
// Denne fil læser begge dele og returnerer ét samlet resultat.
// ============================================================

import type { PrismaClient } from "@prisma/client";

export const GRACE_DAYS = 2;

/**
 * Forventet forsinkelse fra periodeslut til kilden har publiceret, i dage.
 *
 * Tallene er sat efter DST's faktiske publiceringsmønster. De er med
 * vilje konservative: en for høj værdi giver en sen alarm, en for lav
 * giver falske alarmer hver måned, og falske alarmer bliver ignoreret.
 * Justér her, ikke i kaldende kode.
 */
const EXPECTED_LAG_DAYS: Record<string, number> = {
  "dst-forv1": 5,          // publiceres i selve måneden, omkring den 20.
  "dst-konk3": 12,         // første uge i måneden efter
  "dst-pris01": 12,        // den 10. eller førstkommende hverdag
  "dst-folk1am": 14,
  "dst-aus08": 35,         // ~4 uger
  // DETA211A publicerede 2026M04 den 24. juni 2026, altså 55 dage efter
  // periodeslut. Den oprindelige værdi på 35 var for stram og gav en
  // falsk alarm 27. juli. Målt lag plus margin.
  "dst-deta211a": 62,
  "dst-konk25": 12,        // som KONK3, første uge i måneden efter
  "dst-bygv33": 70,        // kvartalsvis, 6 til 8 uger
  "dst-laby01-b04": 60,    // årlig, publiceres i februar
  "dst-laby01-b07": 60,
  "dst-laby01-b10": 60,
  "dst-laby01-b11": 60,
  "dst-ejdfoe1-huse": 500, // årlig, ~1,5 år efter referenceåret
  "dst-ejdfoe1-lejl": 500,
  "dst-indkp101": 380,     // årlig, publiceres december året efter
};

const DEFAULT_LAG_BY_FREQUENCY: Record<string, number> = {
  WEEKLY: 14,
  MONTHLY: 45,
  QUARTERLY: 75,
  YEARLY: 400,
};

/**
 * En kørsel der er startet men aldrig lukket, og som er ældre end dette,
 * regnes som afbrudt. Den længste sync tager under et minut efter
 * batch-omlægningen, så to timer er rigelig margin.
 */
const INCOMPLETE_RUN_HOURS = 2;

/**
 * En serie der er så mange dage over sit forventede vindue regnes som
 * nedlagt frem for forsinket. Grænsen er sat efter den længste rimelige
 * publiceringsforsinkelse i porteføljen: EJDFOE1 udkommer halvandet år
 * efter referenceåret, så noget under det ville give falske dødsdomme.
 */
const LIKELY_DISCONTINUED_DAYS = 180;

export type StaleKind =
  | "SOURCE_CLOSED"
  | "DATA_STALE"
  | "PUBLICATION_LATE"
  | "SYNC_FAILED"
  | "SYNC_INCOMPLETE"
  | "NEVER_FETCHED";

/**
 * Hvad fundet kræver af modtageren. Uden dette behandles alt som samme
 * hastesag, og så bliver alarmen til støj.
 *
 *   BESLUTNING       Der er ikke noget at reparere. Kilden er væk, og
 *                    nogen skal vælge en afløser eller lukke serien.
 *                    Skal ikke prøves igen.
 *   JUSTER_TAERSKEL  Vi har hentet, kilden svarer, og den har ikke
 *                    nyere tal. Så er det forventningen der er forkert,
 *                    ikke pipelinen. Ret expected_lag_days.
 *   UNDERSOEG        Noget er faktisk gået galt.
 */
export type StaleAction = "BESLUTNING" | "JUSTER_TAERSKEL" | "UNDERSOEG";

export const ACTION_LABEL: Record<StaleAction, string> = {
  BESLUTNING: "Kræver en beslutning",
  JUSTER_TAERSKEL: "Justér tærskel",
  UNDERSOEG: "Undersøg",
};

export const KIND_LABEL: Record<StaleKind, string> = {
  SOURCE_CLOSED: "Kilden er lukket hos DST",
  DATA_STALE: "Data forældet",
  PUBLICATION_LATE: "Publicering forsinket",
  SYNC_FAILED: "Kørsel fejlede",
  SYNC_INCOMPLETE: "Kørsel afbrudt",
  NEVER_FETCHED: "Aldrig hentet",
};

export type StaleFinding = {
  slug: string;
  name: string;
  kind: StaleKind;
  action: StaleAction;
  headline: string;
  detail: string;
  latestPeriod: string | null;
  expectedBy: Date | null;
  daysOverdue: number | null;
  lastFetchedAt: Date | null;
};

export type StaleReport = {
  checkedAt: Date;
  sourcesChecked: number;
  findings: StaleFinding[];
  /** Kilder uden et eneste datapunkt. Aldrig sat i drift, ikke en fejl. */
  notInService: string[];
  /** Kilder DST har lukket. Historikken beholdes, men de opdateres aldrig igen. */
  retired: string[];
};

/**
 * En kilde er pensioneret når DST har sat tabellen til active: false.
 * Markeres i DataSource.meta som { "retired": true, ... } af det script
 * der opdager det. Pensionerede kilder alarmerer ikke, for de bliver
 * aldrig opdateret igen, og en alarm der aldrig kan lukkes bliver
 * ignoreret og tager de rigtige alarmer med sig.
 */
function isRetired(meta: unknown): boolean {
  return (
    !!meta &&
    typeof meta === "object" &&
    !Array.isArray(meta) &&
    (meta as Record<string, unknown>).retired === true
  );
}

// ----------------------------------------------------------------
// Perioder
// ----------------------------------------------------------------

/** Sidste dag i perioden, som UTC-dato. "2026M05" → 2026-05-31. */
export function periodEnd(period: string): Date | null {
  const monthly = period.match(/^(\d{4})M(\d{2})$/);
  if (monthly) {
    const y = parseInt(monthly[1], 10);
    const m = parseInt(monthly[2], 10);
    return new Date(Date.UTC(y, m, 0)); // dag 0 i næste måned = sidste dag
  }
  const quarterly = period.match(/^(\d{4})K(\d)$/);
  if (quarterly) {
    const y = parseInt(quarterly[1], 10);
    const q = parseInt(quarterly[2], 10);
    return new Date(Date.UTC(y, q * 3, 0));
  }
  const yearly = period.match(/^(\d{4})$/);
  if (yearly) {
    return new Date(Date.UTC(parseInt(yearly[1], 10), 12, 0));
  }
  return null;
}

function expectedLagDays(slug: string, frequency: string | null): number {
  const override = EXPECTED_LAG_DAYS[slug];
  if (override !== undefined) return override;
  return DEFAULT_LAG_BY_FREQUENCY[frequency ?? ""] ?? 45;
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ----------------------------------------------------------------

/**
 * Gennemgår alle datakilder og finder dem der ikke er opdateret
 * inden for deres forventede vindue plus GRACE_DAYS.
 *
 * Rækkefølgen af tjek er bevidst: en fejlet eller afbrudt kørsel
 * rapporteres frem for forældet data, fordi den er årsagen og
 * det forældede data er symptomet.
 */
export async function findStaleSources(
  prisma: PrismaClient,
  now: Date = new Date(),
  opts: { inactiveTableIds?: Set<string> } = {}
): Promise<StaleReport> {
  const inactive = opts.inactiveTableIds ?? new Set<string>();
  const sources = await prisma.dataSource.findMany({
    orderBy: { slug: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      tableId: true,
      updateFrequency: true,
      lastFetchedAt: true,
      meta: true,
      _count: { select: { dataPoints: true } },
      fetchLogs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          createdAt: true,
          completedAt: true,
          success: true,
          error: true,
        },
      },
    },
  });

  const findings: StaleFinding[] = [];
  const notInService: string[] = [];
  const retired: string[] = [];
  let sourcesChecked = 0;

  for (const source of sources) {
    // Kilder uden data har aldrig været i drift. dst-aus09 er sådan en:
    // DST afviser udtrækket. Den skal ikke alarmere hver dag.
    if (source._count.dataPoints === 0) {
      notInService.push(source.slug);
      continue;
    }
    // Allerede erkendt lukket: beslutningen er taget, afløseren noteret.
    // Skal ikke alarmere igen.
    if (isRetired(source.meta)) {
      retired.push(source.slug);
      continue;
    }
    sourcesChecked++;

    // ---- 0. DST har lukket tabellen, og vi behandler den stadig som levende ----
    // Det er øjeblikket hvor det er værd at sige noget. Der er ikke
    // noget at reparere, og der er ingen grund til at prøve igen.
    if (inactive.has(source.tableId)) {
      findings.push({
        slug: source.slug,
        name: source.name,
        kind: "SOURCE_CLOSED",
        action: "BESLUTNING",
        headline: `DST har lukket tabel ${source.tableId}`,
        detail:
          `Tabellen står med active: false i DST's register. Den får aldrig nye tal. ` +
          `Find afløseren, migrér til den, og markér denne som lukket. Indtil da vises forældede tal.`,
        latestPeriod: null,
        expectedBy: null,
        daysOverdue: null,
        lastFetchedAt: source.lastFetchedAt,
      });
      continue;
    }

    const lastRun = source.fetchLogs[0] ?? null;

    // ---- 1. Kørsel afbrudt: startet, aldrig lukket ----
    if (lastRun && !lastRun.completedAt) {
      const ageHours =
        (now.getTime() - lastRun.createdAt.getTime()) / (60 * 60 * 1000);
      if (ageHours > INCOMPLETE_RUN_HOURS) {
        findings.push({
          slug: source.slug,
          name: source.name,
          kind: "SYNC_INCOMPLETE",
          action: "UNDERSOEG",
          headline: "Kørslen blev afbrudt",
          detail:
            `Sidste kørsel startede ${formatDate(lastRun.createdAt)} og blev aldrig afsluttet. ` +
            `Processen døde før den kunne skrive en fejlbesked, typisk en timeout.`,
          latestPeriod: null,
          expectedBy: null,
          daysOverdue: Math.floor(ageHours / 24),
          lastFetchedAt: source.lastFetchedAt,
        });
        continue;
      }
    }

    // ---- 2. Kørsel fejlede med besked ----
    if (lastRun && lastRun.completedAt && !lastRun.success) {
      findings.push({
        slug: source.slug,
        name: source.name,
        kind: "SYNC_FAILED",
        action: "UNDERSOEG",
        headline: "Sidste kørsel fejlede",
        detail:
          `Kørslen ${formatDate(lastRun.createdAt)} fejlede: ` +
          `${lastRun.error ?? "ingen fejlbesked"}`,
        latestPeriod: null,
        expectedBy: null,
        daysOverdue: daysBetween(now, lastRun.createdAt),
        lastFetchedAt: source.lastFetchedAt,
      });
      continue;
    }

    // ---- 3. Aldrig hentet ----
    if (!source.lastFetchedAt) {
      findings.push({
        slug: source.slug,
        name: source.name,
        kind: "NEVER_FETCHED",
        action: "UNDERSOEG",
        headline: "Aldrig hentet",
        detail: "Kilden har datapunkter, men lastFetchedAt er tom.",
        latestPeriod: null,
        expectedBy: null,
        daysOverdue: null,
        lastFetchedAt: null,
      });
      continue;
    }

    // ---- 4. Data forældet i forhold til forventet vindue ----
    const newest = await prisma.dataPoint.findFirst({
      where: { sourceId: source.id, value: { not: null } },
      orderBy: { periodDate: "desc" },
      select: { period: true },
    });
    if (!newest) continue;

    const end = periodEnd(newest.period);
    if (!end) continue;

    const lag = expectedLagDays(source.slug, source.updateFrequency);
    // Næste periode slutter én periodelængde efter den nyeste vi har.
    // Vi forventer den publiceret lag dage efter dens slutning.
    const nextEnd = nextPeriodEnd(newest.period, end);
    if (!nextEnd) continue;

    const expectedBy = addDays(nextEnd, lag + GRACE_DAYS);
    if (now > expectedBy) {
      // Skelnen der afgør hvad modtageren skal gøre:
      //
      // Har vi hentet for nylig, og gik hentningen godt, så har vi
      // spurgt DST og fået at vide at der ikke er nyere tal. Så er
      // pipelinen rask, og det er enten en forsinket publicering eller
      // en for stram expected_lag_days. Det er præcis den fejl jeg selv
      // lavede med DETA211A: 35 dage sat, 55 dage faktisk.
      //
      // Er hentningen derimod gammel, ved vi ikke om DST har noget.
      // Det skal undersøges.
      const hoursSinceFetch = source.lastFetchedAt
        ? (now.getTime() - source.lastFetchedAt.getTime()) / (60 * 60 * 1000)
        : Infinity;
      const checkedRecently = hoursSinceFetch <= 48;

      findings.push({
        slug: source.slug,
        name: source.name,
        kind: checkedRecently ? "PUBLICATION_LATE" : "DATA_STALE",
        action: checkedRecently ? "JUSTER_TAERSKEL" : "UNDERSOEG",
        headline: `Ingen nye tal siden ${newest.period}`,
        detail: checkedRecently
          ? `Vi hentede for ${Math.round(hoursSinceFetch)} timer siden, og kørslen gik godt. ` +
            `DST har ikke nyere tal end ${newest.period}. Enten er publiceringen forsinket, ` +
            `eller også er expected_lag_days på ${lag} for lav. Tjek DST's udgivelseskalender ` +
            `før du ændrer noget i pipelinen.`
          : `Næste periode sluttede ${formatDate(nextEnd)} og burde have været publiceret ` +
            `senest ${formatDate(expectedBy)} (${lag} dages forventet lag plus ${GRACE_DAYS} dages nåde). ` +
            `Seneste hentning er ${source.lastFetchedAt ? formatDate(source.lastFetchedAt) : "ukendt"}.`,
        latestPeriod: newest.period,
        expectedBy,
        daysOverdue: daysBetween(now, expectedBy),
        lastFetchedAt: source.lastFetchedAt,
      });
    }
  }

  // Sortér efter hvad der kræves, ikke efter hvor gammelt det er.
  // Et fund der kræver en beslutning skal ikke ligge under fem fund
  // der bare betyder "justér en konstant".
  const actionRank: Record<StaleAction, number> = {
    BESLUTNING: 0,
    UNDERSOEG: 1,
    JUSTER_TAERSKEL: 2,
  };
  findings.sort(
    (a, b) =>
      actionRank[a.action] - actionRank[b.action] ||
      (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0)
  );

  return { checkedAt: now, sourcesChecked, findings, notInService, retired };
}

// ----------------------------------------------------------------
// Den nye model: series / observations
//
// Fase 1-serierne har ingen DataSource-række og ville derfor være
// usynlige for tjekket ovenfor. De har til gengæld expectedLagDays
// på selve serien, så vinduet kan læses direkte i stedet for at slås
// op i en tabel i kode.
// ----------------------------------------------------------------

/**
 * Slutdatoen for perioden EFTER den givne.
 *
 * Lag måles fra periodeslut, ikke fra periodestart. Juni-tal publiceres
 * ikke tolv dage efter 1. juni, men tolv dage efter 30. juni. Regnes der
 * fra starten, ser hver eneste månedsserie forsinket ud med en måned,
 * og alarmen bliver til støj præcis som den ikke må.
 */
function nextPeriodEndFromDate(periodStart: Date, frequency: string): Date {
  const y = periodStart.getUTCFullYear();
  const m = periodStart.getUTCMonth();
  const d = periodStart.getUTCDate();
  switch (frequency) {
    case "DAILY":
      return new Date(Date.UTC(y, m, d + 1));
    case "WEEKLY":
      return new Date(Date.UTC(y, m, d + 13));
    case "QUARTERLY":
      return new Date(Date.UTC(y, m + 6, 0));
    case "YEARLY":
      return new Date(Date.UTC(y + 2, 0, 0));
    case "MONTHLY":
    default:
      return new Date(Date.UTC(y, m + 2, 0));
  }
}

export async function findStaleSeries(
  prisma: PrismaClient,
  now: Date = new Date()
): Promise<StaleReport> {
  const series = await prisma.series.findMany({
    where: { status: "ACTIVE" },
    orderBy: { id: "asc" },
    select: {
      id: true,
      nameDa: true,
      frequency: true,
      expectedLagDays: true,
      sourceRef: true,
    },
  });

  const findings: StaleFinding[] = [];
  const notInService: string[] = [];
  let sourcesChecked = 0;

  for (const s of series) {
    const newest = await prisma.observation.findFirst({
      where: { seriesId: s.id, isCurrent: true, value: { not: null } },
      orderBy: { period: "desc" },
      select: { period: true, retrievedAt: true },
    });

    if (!newest) {
      notInService.push(s.id);
      continue;
    }
    sourcesChecked++;

    // Næste periode skal være publiceret sit lag efter at den sluttede.
    const dueEnd = nextPeriodEndFromDate(newest.period, s.frequency);
    const expectedBy = addDays(dueEnd, s.expectedLagDays + GRACE_DAYS);

    if (now <= expectedBy) continue;

    const overdue = daysBetween(now, expectedBy);

    // En serie der er et halvt år over tiden er ikke forsinket. Den er
    // holdt op. F11 i FORV1 var sådan en: DST nedlagde delspørgsmålet i
    // april 2025, og der er intet at reparere og ingen tærskel at rette.
    // Det kræver en beslutning, præcis som KONK4 gjorde.
    if (overdue > LIKELY_DISCONTINUED_DAYS) {
      findings.push({
        slug: s.id,
        name: s.nameDa,
        kind: "SOURCE_CLOSED",
        action: "BESLUTNING",
        headline: `Ingen nye tal i ${Math.floor(overdue / 30)} måneder`,
        detail:
          `Seneste værdi er ${formatDate(newest.period)}, ${overdue} dage efter det forventede. ` +
          `Så langt over tiden er det ikke en forsinkelse. Kilden har sandsynligvis nedlagt serien. ` +
          `Afgør om den skal sættes til CLOSED og bevares som historik, eller udgå.`,
        latestPeriod: formatDate(newest.period),
        expectedBy,
        daysOverdue: overdue,
        lastFetchedAt: newest.retrievedAt,
      });
      continue;
    }

    const hoursSinceFetch =
      (now.getTime() - newest.retrievedAt.getTime()) / (60 * 60 * 1000);
    const checkedRecently = hoursSinceFetch <= 48;

    findings.push({
      slug: s.id,
      name: s.nameDa,
      kind: checkedRecently ? "PUBLICATION_LATE" : "DATA_STALE",
      action: checkedRecently ? "JUSTER_TAERSKEL" : "UNDERSOEG",
      headline: `Ingen nye tal siden ${formatDate(newest.period)}`,
      detail: checkedRecently
        ? `Hentet for ${Math.round(hoursSinceFetch)} timer siden uden nyere tal fra ${s.sourceRef}. ` +
          `Enten er publiceringen forsinket, eller også er expected_lag_days på ${s.expectedLagDays} for lav.`
        : `Næste periode sluttede ${formatDate(dueEnd)} og var forventet senest ` +
          `${formatDate(expectedBy)} (${s.expectedLagDays} dages lag plus ${GRACE_DAYS} dages nåde). ` +
          `Seneste hentning ${formatDate(newest.retrievedAt)}.`,
      latestPeriod: formatDate(newest.period),
      expectedBy,
      daysOverdue: daysBetween(now, expectedBy),
      lastFetchedAt: newest.retrievedAt,
    });
  }

  const actionRank: Record<StaleAction, number> = {
    BESLUTNING: 0,
    UNDERSOEG: 1,
    JUSTER_TAERSKEL: 2,
  };
  findings.sort(
    (a, b) =>
      actionRank[a.action] - actionRank[b.action] ||
      (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0)
  );

  return { checkedAt: now, sourcesChecked, findings, notInService, retired: [] };
}

/** Slutdatoen for perioden efter den givne. */
function nextPeriodEnd(period: string, end: Date): Date | null {
  if (/^\d{4}M\d{2}$/.test(period)) {
    return new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 2, 0));
  }
  if (/^\d{4}K\d$/.test(period)) {
    return new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 4, 0));
  }
  if (/^\d{4}$/.test(period)) {
    return new Date(Date.UTC(end.getUTCFullYear() + 1, 12, 0));
  }
  return null;
}
