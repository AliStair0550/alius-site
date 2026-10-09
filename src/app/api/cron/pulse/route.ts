// ============================================================
// Vercels daglige cron: udløs sync-series i Actions
//
// Ruten gør ÉN ting. Den beder GitHub om at køre sync-series.yml og
// rapporterer hvad GitHub svarede. Den henter intet, skriver intet og
// rører ikke databasen.
//
// HVORFOR DEN ER SÅ TYND
//
// Indtil 9. oktober 2026 hentede ruten selv AUS08 og KONK3 fra DST,
// skrev dem til DataPoint, genskabte signaler og sendte mails, inde i
// en Vercel-funktion. Det stred mod reglen i CLAUDE.md om hvor skrivning
// sker: Vercel-funktioner er uden for skriveværnet, og deres tidszone
// og miljø er ikke dem Actions har. Det arbejde ligger nu i
// sync-series.yml, før broen, med samme scripts som det månedlige job.
//
// HVORFOR DEN FINDES
//
// GitHubs egen scheduler er upålidelig på tidspunktet; se
// src/lib/github-dispatch.ts. Vercels cron er den anden, uafhængige
// udløser, og den hurtigste af de to sætter tempoet.
// ============================================================

import { NextResponse } from "next/server";
import { udloesSyncSeries, beskrivUdfald } from "@/lib/github-dispatch";
import { sendPulseErrorEmail } from "@/lib/pulse-email";
import { PAA_PAUSE, PAUSE_FRA } from "@/lib/pulse-pause";

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

  // Pulse holder pause. Der udløses intet. Se src/lib/pulse-pause.ts.
  if (PAA_PAUSE) {
    return NextResponse.json({ ok: true, paaPause: true, siden: PAUSE_FRA });
  }

  const udfald = await udloesSyncSeries();
  const linje = beskrivUdfald(udfald);

  // "Udløst" og "sprunget over" er begge i orden: i det sidste tilfælde
  // har GitHubs scheduler allerede gjort arbejdet. "Ingen token" og
  // "fejl" er det ikke, og de må ikke ligne et job der kørte. De svarer
  // med en fejlkode, så Vercels cron-log viser dem som fejlede, og
  // der sendes en mail.
  const iOrden = udfald.slags === "udloest" || udfald.slags === "sprunget_over";

  if (!iOrden) {
    await sendPulseErrorEmail({
      sourceName: "Pulse cron (Vercel)",
      sourceSlug: "system",
      step: "udløs sync-series",
      errorMessage: linje,
      timestamp: new Date(),
    });
  }

  return NextResponse.json(
    { ok: iOrden, udfald: udfald.slags, besked: linje },
    { status: iOrden ? 200 : 502 }
  );
}
