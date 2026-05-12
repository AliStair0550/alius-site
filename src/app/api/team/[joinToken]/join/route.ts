import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ joinToken: string }> }
) {
  const { joinToken } = await params;
  const body = await req.json();

  const rawName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  if (!rawName || rawName.length > 80) {
    return Response.json({ error: "Navn er påkrævet" }, { status: 400 });
  }

  const session = await prisma.teamSession.findUnique({ where: { joinToken } });
  if (!session) return Response.json({ error: "Session ikke fundet" }, { status: 404 });
  if (session.status !== "OPEN") {
    return Response.json({ error: "Session er lukket" }, { status: 400 });
  }

  // Placeholder profile — scores updated on submit
  const profile = await prisma.profile.create({
    data: {
      displayName: rawName,
      totals: { A: 0, B: 0, C: 0, D: 0 },
      primary: "A",
      secondary: "B",
      weakest: "D",
      selections: [],
      source: "team_invitation",
    },
  });

  const member = await prisma.teamMember.create({
    data: {
      sessionId: session.id,
      profileId: profile.id,
      displayName: rawName,
    },
  });

  return Response.json({
    ok: true,
    profileId: profile.id,
    accessToken: profile.accessToken,
    memberId: member.id,
    reportToken: session.reportToken,
  });
}
