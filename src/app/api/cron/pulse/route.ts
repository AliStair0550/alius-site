import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { syncAus08, regenerateSignalsForAus08 } from "@/lib/pulse-pipeline";
import { sendPulseUpdateEmail, sendPulseErrorEmail } from "@/lib/pulse-email";
import { humanizePeriod } from "@/lib/signals/types";

// Vercel sends a special header for cron jobs in production.
// We also accept manual triggers via ADMIN_SECRET for testing.
function isAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const adminSecret = process.env.ADMIN_SECRET;

  // Vercel cron jobs send Authorization: Bearer CRON_SECRET
  const authHeader = req.headers.get("authorization");
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;

  // Manual trigger via ?key=ADMIN_SECRET for testing
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (adminSecret && key === adminSecret) return true;

  return false;
}

// Avoid double-trigger by tracking the last run
let lastRunAt: Date | null = null;
const MIN_INTERVAL_MS = 60 * 1000; // 1 minute

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Throttle: prevent accidental rapid re-triggers
  if (lastRunAt && Date.now() - lastRunAt.getTime() < MIN_INTERVAL_MS) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "Throttled (last run too recent)",
    });
  }
  lastRunAt = new Date();

  const startedAt = new Date();
  const log: string[] = [];

  const note = (msg: string) => {
    log.push(`[${new Date().toISOString()}] ${msg}`);
  };

  try {
    note("Starting Pulse cron run");

    // ============================================================
    // Step 1: Sync from DST
    // ============================================================
    note("Step 1: syncing AUS08 from DST");
    const syncResult = await syncAus08(prisma);

    if (!syncResult.success) {
      note(`Sync failed: ${syncResult.errorMessage}`);
      await sendPulseErrorEmail({
        sourceName: "AUS08 (Fuldtidsledige)",
        sourceSlug: "dst-aus08",
        step: "sync",
        errorMessage: syncResult.errorMessage ?? "Unknown sync error",
        timestamp: new Date(),
      });
      return NextResponse.json(
        {
          ok: false,
          step: "sync",
          error: syncResult.errorMessage,
          log,
        },
        { status: 500 }
      );
    }

    if (!syncResult.hadNewData) {
      note("No new data from DST. Exiting early.");
      return NextResponse.json({
        ok: true,
        hadNewData: false,
        runtime_ms: Date.now() - startedAt.getTime(),
        log,
      });
    }

    note(
      `Sync OK: ${syncResult.rowsInserted} inserted, ${syncResult.rowsUpdated} updated, latest period: ${syncResult.newDataPeriod}`
    );

    // ============================================================
    // Step 2: Regenerate signals
    // ============================================================
    note("Step 2: regenerating signals");
    const signalResult = await regenerateSignalsForAus08(prisma);

    if (!signalResult.success) {
      note(`Signal generation failed: ${signalResult.errorMessage}`);
      await sendPulseErrorEmail({
        sourceName: "AUS08 (Fuldtidsledige)",
        sourceSlug: "dst-aus08",
        step: "signal generation",
        errorMessage: signalResult.errorMessage ?? "Unknown signal error",
        timestamp: new Date(),
      });
      return NextResponse.json(
        {
          ok: false,
          step: "signals",
          error: signalResult.errorMessage,
          log,
        },
        { status: 500 }
      );
    }

    note(`Signals OK: ${signalResult.signalsGenerated} signals generated`);

    // ============================================================
    // Step 3: Revalidate cached pages
    // ============================================================
    note("Step 3: revalidating pages");
    try {
      revalidatePath("/pulse/ledighed");
      revalidatePath("/pulse/ledighed/[kommune]", "page");
      note("Revalidated /pulse/ledighed and all kommune pages");
    } catch (err) {
      // Revalidation failure is non-critical — log but don't abort
      const msg = err instanceof Error ? err.message : "unknown";
      note(`Revalidation warning: ${msg}`);
    }

    // ============================================================
    // Step 4: Send notification email
    // ============================================================
    note("Step 4: sending notification email");
    const signals = await prisma.signal.findMany({
      where: { source: { slug: "dst-aus08" } },
      orderBy: [{ severity: "desc" }, { magnitude: "desc" }],
      select: { headline: true, severity: true },
    });

    await sendPulseUpdateEmail({
      sourceName: "Ledighed (AUS08)",
      sourceSlug: "dst-aus08",
      newDataPeriod: syncResult.newDataPeriod
        ? humanizePeriod(syncResult.newDataPeriod)
        : "ny måned",
      rowsInserted: syncResult.rowsInserted,
      rowsUpdated: syncResult.rowsUpdated,
      signalsGenerated: signalResult.signalsGenerated,
      newSignals: signals,
    });

    note("Notification sent");

    return NextResponse.json({
      ok: true,
      hadNewData: true,
      sync: {
        inserted: syncResult.rowsInserted,
        updated: syncResult.rowsUpdated,
        newDataPeriod: syncResult.newDataPeriod,
      },
      signals: signalResult.signalsGenerated,
      runtime_ms: Date.now() - startedAt.getTime(),
      log,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    note(`Fatal: ${message}`);

    await sendPulseErrorEmail({
      sourceName: "Pulse cron",
      sourceSlug: "system",
      step: "fatal",
      errorMessage: message,
      timestamp: new Date(),
    });

    return NextResponse.json(
      {
        ok: false,
        step: "fatal",
        error: message,
        log,
      },
      { status: 500 }
    );
  }
}
