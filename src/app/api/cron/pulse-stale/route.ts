// ============================================================
// Dagligt stale-tjek
//
// Kører hver dag kl. 07:00 UTC (09:00 dansk sommertid, 08:00 vintertid),
// altså efter det daglige sync-job kl. 06:00 UTC.
//
// Sender én samlet mail hvis noget er forældet eller fejlet.
// Sender ingenting hvis alt er i orden, så en mail altid betyder
// at der er noget at se på.
// ============================================================

import { NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/db";
import { findStaleSources, findStaleSeries } from "@/lib/pulse-stale";
import { sendPulseStaleEmail, sendPulseErrorEmail } from "@/lib/pulse-email";

export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const adminSecret = process.env.ADMIN_SECRET;

  const authHeader = req.headers.get("authorization");
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;

  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (adminSecret && key === adminSecret) return true;

  return false;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  // ?dry=1 kører tjekket og returnerer resultatet uden at sende mail.
  const dryRun = url.searchParams.get("dry") === "1";

  const startedAt = Date.now();

  try {
    await withDbRetry(() => prisma.$queryRaw`SELECT 1`);

    // Hent DST's tabelregister og find de tabeller der er sat til
    // active: false. Det er sådan KONK4 døde: den svarede fint på
    // API'et hele tiden, den var bare frosset. Uden dette tjek opdages
    // en lukket tabel først når nogen undrer sig over tallene.
    let inactiveTableIds: Set<string> | undefined;
    try {
      const res = await fetch(
        "https://api.statbank.dk/v1/tables?lang=da&format=JSON&includeInactive=true",
        { signal: AbortSignal.timeout(20_000) }
      );
      if (res.ok) {
        const tables = (await res.json()) as Array<{ id: string; active?: boolean }>;
        inactiveTableIds = new Set(
          tables.filter((t) => t.active === false).map((t) => t.id)
        );
      }
    } catch {
      // Registret er en ekstra kilde, ikke en forudsætning. Kan vi ikke
      // nå det, kører de øvrige tjek videre.
      inactiveTableIds = undefined;
    }

    // To datamodeller kører side om side under overgangen. Begge skal
    // overvåges, ellers er den ene usynlig indtil nogen undrer sig.
    const now = new Date();
    const legacy = await findStaleSources(prisma, now, { inactiveTableIds });
    const modern = await findStaleSeries(prisma, now);

    const report = {
      ...legacy,
      sourcesChecked: legacy.sourcesChecked + modern.sourcesChecked,
      findings: [...legacy.findings, ...modern.findings],
      notInService: [...legacy.notInService, ...modern.notInService],
    };

    let emailed = false;
    if (report.findings.length > 0 && !dryRun) {
      await sendPulseStaleEmail(report);
      emailed = true;
    }

    return NextResponse.json({
      ok: true,
      dryRun,
      emailed,
      sourcesChecked: report.sourcesChecked,
      staleCount: report.findings.length,
      notInService: report.notInService,
      registryChecked: inactiveTableIds !== undefined,
      retired: report.retired,
      findings: report.findings.map((f) => ({
        slug: f.slug,
        kind: f.kind,
        action: f.action,
        headline: f.headline,
        detail: f.detail,
        latestPeriod: f.latestPeriod,
        daysOverdue: f.daysOverdue,
      })),
      runtime_ms: Date.now() - startedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    await sendPulseErrorEmail({
      sourceName: "Pulse stale-tjek",
      sourceSlug: "system",
      step: "stale-detection",
      errorMessage: message,
      timestamp: new Date(),
    });

    return NextResponse.json(
      { ok: false, error: message, runtime_ms: Date.now() - startedAt },
      { status: 500 }
    );
  }
}
