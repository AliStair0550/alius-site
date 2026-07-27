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
import { findStaleSources } from "@/lib/pulse-stale";
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

    const report = await findStaleSources(prisma);

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
      findings: report.findings.map((f) => ({
        slug: f.slug,
        kind: f.kind,
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
