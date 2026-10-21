// ============================================================
// Status for Alius Agenter: forbrug, loft og seneste kørsler
//
// Beskyttet med ADMIN_SECRET (?key=...). Læser kun.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { laesBudgetConfig, maanedStart, doegnStart } from "@/lib/agenter/budget";
import { aktueltForbrug } from "@/lib/agenter/claude";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const forventet = process.env.ADMIN_SECRET;
  if (!forventet || req.nextUrl.searchParams.get("key") !== forventet) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Vercel kender ikke nødvendigvis de samme lofter som Actions. Siges
  // højt, frem for at vise et loft der ikke er det der håndhæves.
  let cfg;
  try {
    cfg = laesBudgetConfig();
  } catch (e) {
    return NextResponse.json({ ok: false, fejl: (e as Error).message }, { status: 500 });
  }

  const nu = new Date();
  const forbrug = await aktueltForbrug(prisma, cfg, nu);
  const koersler = await prisma.brief.findMany({
    orderBy: { startedAt: "desc" },
    take: 15,
    select: { id: true, agentId: true, date: true, status: true, statusMessage: true, sourcesRead: true, kept: true, costUsd: true, startedAt: true, finishedAt: true },
  });

  return NextResponse.json({
    ok: true,
    note:
      "Lofterne her er dem Vercel kender. Kørslen i GitHub Actions læser sine egne fra repository-variablerne. " +
      "Sæt dem ens, eller lad begge stå på standarden.",
    loft: cfg,
    perioder: { doegnFra: doegnStart(nu), maanedFra: maanedStart(nu, cfg.nulstillingsdag) },
    forbrugUsd: { idag: forbrug.doegn, maaned: forbrug.maaned },
    tilbageUsd: { idag: cfg.doegnUsd - forbrug.doegn, maaned: cfg.maanedUsd - forbrug.maaned },
    koersler: koersler.map((k) => ({ ...k, costUsd: k.costUsd === null ? null : Number(k.costUsd) })),
  });
}
