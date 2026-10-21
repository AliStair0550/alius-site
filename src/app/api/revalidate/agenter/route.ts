// ============================================================
// Genskab /agenter, når en agent har skrevet en ny brief
//
// Kaldes af scripts/agent-finn.ts. Henter intet og skriver intet.
// ============================================================

import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { AGENTER_TAG } from "@/lib/agenter/laes";

export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  const hemmeligheder = [process.env.ADMIN_SECRET, process.env.CRON_SECRET].filter(
    (s): s is string => typeof s === "string" && s.length > 0
  );
  const header = req.headers.get("authorization");
  return !!header && hemmeligheder.some((s) => header === `Bearer ${s}`);
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  revalidateTag(AGENTER_TAG, "max");
  revalidatePath("/agenter", "layout");
  return NextResponse.json({ ok: true, tag: AGENTER_TAG, at: new Date().toISOString() });
}
