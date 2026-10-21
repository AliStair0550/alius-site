// ============================================================
// Vercels daglige cron for Alius Agenter
//
// Kaldes kl. 04 og 05 UTC (se vercel.json). Kun det kald der falder
// kl. 06 i København, udløser Finns kørsel i GitHub Actions. Ruten
// henter intet og skriver intet. Se src/lib/agenter/dispatch.ts.
// ============================================================

import { NextResponse } from "next/server";
import { udloesAgent } from "@/lib/agenter/dispatch";
import { sendPulseErrorEmail } from "@/lib/pulse-email";

export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const adminSecret = process.env.ADMIN_SECRET;
  const authHeader = req.headers.get("authorization");
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  const key = new URL(req.url).searchParams.get("key");
  return !!adminSecret && key === adminSecret;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tving = new URL(req.url).searchParams.get("tving") === "1";
  const udfald = await udloesAgent("agent-finn.yml", new Date(), tving);
  const iOrden = udfald.slags === "udloest" || udfald.slags === "ikke_nu";

  // "Ingen token" og "fejl" må ikke ligne en kørsel der blev startet.
  if (!iOrden) {
    await sendPulseErrorEmail({
      sourceName: "Agenter cron (Vercel)",
      sourceSlug: "system",
      step: "udløs agent-finn",
      errorMessage: udfald.slags === "fejl" ? udfald.besked : "GITHUB_DISPATCH_TOKEN er ikke sat",
      timestamp: new Date(),
    });
  }
  return NextResponse.json({ ok: iOrden, udfald }, { status: iOrden ? 200 : 502 });
}
