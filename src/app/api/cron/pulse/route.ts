import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma, withDbRetry } from "@/lib/db";
import {
  syncAus08,
  syncKonk3,
  regenerateSignalsForAus08,
  regenerateSignalsForKonk3,
} from "@/lib/pulse-pipeline";
import { sendPulseUpdateEmail, sendPulseErrorEmail } from "@/lib/pulse-email";
import { humanizePeriod } from "@/lib/signals/types";

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

let lastRunAt: Date | null = null;
const MIN_INTERVAL_MS = 60 * 1000;

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    // Step 0: Wake up / confirm DB connectivity before doing work.
    // Neon skalerer til nul ved inaktivitet; det første kald efter en
    // cold start kan fejle med "Can't reach database server". withDbRetry
    // rider opvågningen af, så en forbigående blip ikke udløser fejlmails.
    // ============================================================
    note("Step 0: warming up database connection");
    try {
      await withDbRetry(() => prisma.$queryRaw`SELECT 1`);
      note("Database reachable");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      note(`Database unreachable after retries: ${message}`);
      // Én samlet infra-alarm i stedet for en identisk mail pr. datakilde
      await sendPulseErrorEmail({
        sourceName: "Database (Neon)",
        sourceSlug: "infra-db",
        step: "sync",
        errorMessage: `Kan ikke nå databasen efter gentagne forsøg: ${message}`,
        timestamp: new Date(),
      });
      return NextResponse.json(
        {
          ok: false,
          error: "database_unreachable",
          runtime_ms: Date.now() - startedAt.getTime(),
          log,
        },
        { status: 503 }
      );
    }

    // ============================================================
    // Step 1: Sync both sources in parallel
    // ============================================================
    note("Step 1: syncing AUS08 and KONK3 from DST");
    const [aus08Sync, konk3Sync] = await Promise.all([
      syncAus08(prisma),
      syncKonk3(prisma),
    ]);

    // Log errors but don't abort — the other source might still have data
    if (!aus08Sync.success) {
      note(`AUS08 sync failed: ${aus08Sync.errorMessage}`);
      await sendPulseErrorEmail({
        sourceName: "AUS08 (Fuldtidsledige)",
        sourceSlug: "dst-aus08",
        step: "sync",
        errorMessage: aus08Sync.errorMessage ?? "Unknown sync error",
        timestamp: new Date(),
      });
    } else {
      note(
        aus08Sync.hadNewData
          ? `AUS08 OK: ${aus08Sync.rowsInserted} inserted, latest: ${aus08Sync.newDataPeriod}`
          : "AUS08: no new data"
      );
    }

    if (!konk3Sync.success) {
      note(`KONK3 sync failed: ${konk3Sync.errorMessage}`);
      await sendPulseErrorEmail({
        sourceName: "KONK3 (Konkurser)",
        sourceSlug: "dst-konk3",
        step: "sync",
        errorMessage: konk3Sync.errorMessage ?? "Unknown sync error",
        timestamp: new Date(),
      });
    } else {
      note(
        konk3Sync.hadNewData
          ? `KONK3 OK: ${konk3Sync.rowsInserted} inserted, latest: ${konk3Sync.newDataPeriod}`
          : "KONK3: no new data"
      );
    }

    // Early exit if neither had new data
    if (!aus08Sync.hadNewData && !konk3Sync.hadNewData) {
      note("No new data from either source. Exiting early.");
      return NextResponse.json({
        ok: true,
        hadNewData: false,
        runtime_ms: Date.now() - startedAt.getTime(),
        log,
      });
    }

    // ============================================================
    // Step 2: Regenerate signals for sources with new data
    // ============================================================
    let aus08Signals = 0;
    let konk3Signals = 0;

    if (aus08Sync.hadNewData) {
      note("Step 2a: regenerating AUS08 signals");
      const result = await regenerateSignalsForAus08(prisma);
      if (!result.success) {
        note(`AUS08 signal generation failed: ${result.errorMessage}`);
        await sendPulseErrorEmail({
          sourceName: "AUS08 (Fuldtidsledige)",
          sourceSlug: "dst-aus08",
          step: "signal generation",
          errorMessage: result.errorMessage ?? "Unknown signal error",
          timestamp: new Date(),
        });
      } else {
        aus08Signals = result.signalsGenerated;
        note(`AUS08 signals OK: ${aus08Signals} generated`);
      }
    }

    if (konk3Sync.hadNewData) {
      note("Step 2b: regenerating KONK3 signals");
      const result = await regenerateSignalsForKonk3(prisma);
      if (!result.success) {
        note(`KONK3 signal generation failed: ${result.errorMessage}`);
        await sendPulseErrorEmail({
          sourceName: "KONK3 (Konkurser)",
          sourceSlug: "dst-konk3",
          step: "signal generation",
          errorMessage: result.errorMessage ?? "Unknown signal error",
          timestamp: new Date(),
        });
      } else {
        konk3Signals = result.signalsGenerated;
        note(`KONK3 signals OK: ${konk3Signals} generated`);
      }
    }

    // ============================================================
    // Step 3: Revalidate cached pages
    // ============================================================
    note("Step 3: revalidating pages");
    try {
      if (aus08Sync.hadNewData) {
        revalidatePath("/pulse/ledighed");
        revalidatePath("/pulse/ledighed/[kommune]", "page");
        revalidatePath("/pulse/kommuner");
        revalidatePath("/pulse/kommuner/[slug]", "page");
        revalidatePath("/pulse/kommuner/danmark");
      }
      if (konk3Sync.hadNewData) {
        revalidatePath("/pulse/konkurser");
      }
      revalidatePath("/pulse");
      note("Revalidated pages");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      note(`Revalidation warning: ${msg}`);
    }

    // ============================================================
    // Step 4: Send notification email
    // ============================================================
    note("Step 4: sending notification email");

    if (aus08Sync.hadNewData) {
      const signals = await prisma.signal.findMany({
        where: { source: { slug: "dst-aus08" } },
        orderBy: [{ severity: "desc" }, { magnitude: "desc" }],
        select: { headline: true, severity: true },
      });
      await sendPulseUpdateEmail({
        sourceName: "Ledighed (AUS08)",
        sourceSlug: "dst-aus08",
        newDataPeriod: aus08Sync.newDataPeriod
          ? humanizePeriod(aus08Sync.newDataPeriod)
          : "ny måned",
        rowsInserted: aus08Sync.rowsInserted,
        rowsUpdated: aus08Sync.rowsUpdated,
        signalsGenerated: aus08Signals,
        newSignals: signals,
      });
    }

    if (konk3Sync.hadNewData) {
      const signals = await prisma.signal.findMany({
        where: { source: { slug: "dst-konk3" } },
        orderBy: [{ severity: "desc" }, { magnitude: "desc" }],
        select: { headline: true, severity: true },
      });
      await sendPulseUpdateEmail({
        sourceName: "Konkurser (KONK3)",
        sourceSlug: "dst-konk3",
        newDataPeriod: konk3Sync.newDataPeriod
          ? humanizePeriod(konk3Sync.newDataPeriod)
          : "ny måned",
        rowsInserted: konk3Sync.rowsInserted,
        rowsUpdated: konk3Sync.rowsUpdated,
        signalsGenerated: konk3Signals,
        newSignals: signals,
      });
    }

    note("Done");

    return NextResponse.json({
      ok: true,
      hadNewData: true,
      aus08: aus08Sync.hadNewData
        ? {
            inserted: aus08Sync.rowsInserted,
            updated: aus08Sync.rowsUpdated,
            newDataPeriod: aus08Sync.newDataPeriod,
            signals: aus08Signals,
          }
        : null,
      konk3: konk3Sync.hadNewData
        ? {
            inserted: konk3Sync.rowsInserted,
            updated: konk3Sync.rowsUpdated,
            newDataPeriod: konk3Sync.newDataPeriod,
            signals: konk3Signals,
          }
        : null,
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
      { ok: false, step: "fatal", error: message, log },
      { status: 500 }
    );
  }
}
