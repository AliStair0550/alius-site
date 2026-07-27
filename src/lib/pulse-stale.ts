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
  "dst-deta211a": 35,
  "dst-konk4": 45,
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

export type StaleKind =
  | "DATA_STALE"
  | "SYNC_FAILED"
  | "SYNC_INCOMPLETE"
  | "NEVER_FETCHED";

export type StaleFinding = {
  slug: string;
  name: string;
  kind: StaleKind;
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
};

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
  now: Date = new Date()
): Promise<StaleReport> {
  const sources = await prisma.dataSource.findMany({
    orderBy: { slug: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      updateFrequency: true,
      lastFetchedAt: true,
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
  let sourcesChecked = 0;

  for (const source of sources) {
    // Kilder uden data har aldrig været i drift. dst-aus09 er sådan en:
    // DST afviser udtrækket. Den skal ikke alarmere hver dag.
    if (source._count.dataPoints === 0) {
      notInService.push(source.slug);
      continue;
    }
    sourcesChecked++;

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
      findings.push({
        slug: source.slug,
        name: source.name,
        kind: "DATA_STALE",
        headline: `Ingen nye tal siden ${newest.period}`,
        detail:
          `Næste periode sluttede ${formatDate(nextEnd)} og burde have været publiceret ` +
          `senest ${formatDate(expectedBy)} (${lag} dages forventet lag plus ${GRACE_DAYS} dages nåde).`,
        latestPeriod: newest.period,
        expectedBy,
        daysOverdue: daysBetween(now, expectedBy),
        lastFetchedAt: source.lastFetchedAt,
      });
    }
  }

  // Værst først: flest dage over tiden.
  findings.sort((a, b) => (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0));

  return { checkedAt: now, sourcesChecked, findings, notInService };
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
