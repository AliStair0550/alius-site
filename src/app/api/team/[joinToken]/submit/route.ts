import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

function isValidTotals(t: unknown): t is { A: number; B: number; C: number; D: number } {
  if (!t || typeof t !== "object") return false;
  const o = t as Record<string, unknown>;
  return (
    typeof o.A === "number" &&
    typeof o.B === "number" &&
    typeof o.C === "number" &&
    typeof o.D === "number" &&
    o.A >= 0 && o.B >= 0 && o.C >= 0 && o.D >= 0
  );
}

function isValidQuadrant(q: unknown): q is "A" | "B" | "C" | "D" {
  return q === "A" || q === "B" || q === "C" || q === "D";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ joinToken: string }> }
) {
  const { joinToken } = await params;
  const body = await req.json();

  if (!isValidTotals(body.totals)) {
    return Response.json({ error: "Invalid totals" }, { status: 400 });
  }
  if (
    !isValidQuadrant(body.primary) ||
    !isValidQuadrant(body.secondary) ||
    !isValidQuadrant(body.weakest)
  ) {
    return Response.json({ error: "Invalid quadrant" }, { status: 400 });
  }

  const accessToken = typeof body.accessToken === "string" ? body.accessToken.trim() : "";
  if (!accessToken) {
    return Response.json({ error: "Missing accessToken" }, { status: 400 });
  }

  const [profile, session] = await Promise.all([
    prisma.profile.findUnique({ where: { accessToken } }),
    prisma.teamSession.findUnique({ where: { joinToken } }),
  ]);

  if (!profile) return Response.json({ error: "Profil ikke fundet" }, { status: 404 });
  if (!session || session.status !== "OPEN") {
    return Response.json({ error: "Session er lukket" }, { status: 400 });
  }

  await prisma.profile.update({
    where: { accessToken },
    data: {
      totals: body.totals,
      primary: body.primary,
      secondary: body.secondary,
      weakest: body.weakest,
      selections: body.selections ?? profile.selections,
    },
  });

  await prisma.teamMember.updateMany({
    where: { profileId: profile.id, sessionId: session.id },
    data: { submittedAt: new Date() },
  });

  return Response.json({ ok: true, accessToken });
}
