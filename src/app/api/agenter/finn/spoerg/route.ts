// ============================================================
// POST /api/agenter/finn/spoerg  { spoergsmaal: string }
//
// Spørg Finn. Al logik og alle grænser i src/lib/agenter/finn/spoerg.ts.
// Ruten finder den besøgendes hash og afleverer.
// ============================================================

import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { laesBudgetConfig } from "@/lib/agenter/budget";
import { nyKlient } from "@/lib/agenter/claude";
import { spoergFinn } from "@/lib/agenter/finn/spoerg";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const salt = process.env.ADMIN_SECRET;
  if (!salt) {
    console.error("Spørg Finn: ADMIN_SECRET mangler, kan ikke hashe besøgende.");
    return NextResponse.json({ status: "fejl", tekst: "Finn kan ikke tage imod spørgsmål lige nu.", kilder: [], tilbage: -1 }, { status: 503 });
  }

  let spoergsmaal = "";
  try {
    const krop = (await req.json()) as { spoergsmaal?: unknown };
    spoergsmaal = typeof krop.spoergsmaal === "string" ? krop.spoergsmaal : "";
  } catch {
    // Et tomt eller ulæseligt spørgsmål afvises af spoergFinn som ugyldigt.
  }

  // Kun en salted hash af IP-adressen gemmes, aldrig adressen selv.
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "ukendt";
  const ipHash = createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);

  let svar;
  try {
    svar = await spoergFinn({ prisma, klient: nyKlient(), cfg: laesBudgetConfig(), spoergsmaal, ipHash });
  } catch (e) {
    console.error("Spørg Finn:", (e as Error).message);
    return NextResponse.json({ status: "fejl", tekst: "Finn kunne ikke svare lige nu. Prøv igen om lidt.", kilder: [], tilbage: -1 }, { status: 500 });
  }
  const kode = svar.status === "svaret" || svar.status === "ikke_sporbar" ? 200 : svar.status === "ugyldig" ? 400 : svar.status === "graense" ? 429 : svar.status === "fejl" ? 500 : 503;
  return NextResponse.json(svar, { status: kode });
}
