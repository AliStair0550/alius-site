// ============================================================
// Genskab /pulse på opfordring
//
// Det daglige hentejob i scripts/sync-series.ts kalder den her når det
// har skrevet nye observationer. Uden kaldet opdaterer siden sig
// alligevel, fordi /pulse er ISR med en times vindue; kaldet gør det
// bare med det samme, så nye tal er ude inden for sekunder.
//
// Ingen sideeffekter ud over genskabelsen. Den henter ikke data og
// skriver ikke i basen.
// ============================================================

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

// Samme tre som /api/cron/pulse tager imod, i samme rækkefølge. Ét
// mønster for beskyttede endpoints frem for tre der ligner hinanden.
function isAuthorized(req: Request): boolean {
  const secrets = [
    process.env.REVALIDATE_SECRET,
    process.env.CRON_SECRET,
    process.env.ADMIN_SECRET,
  ].filter((s): s is string => typeof s === "string" && s.length > 0);
  if (secrets.length === 0) return false;

  const header = req.headers.get("authorization");
  if (header && secrets.some((s) => header === `Bearer ${s}`)) return true;

  const key = new URL(req.url).searchParams.get("key");
  return key !== null && secrets.includes(key);
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  revalidatePath("/pulse");
  return NextResponse.json({ ok: true, revalidated: "/pulse", at: new Date().toISOString() });
}
