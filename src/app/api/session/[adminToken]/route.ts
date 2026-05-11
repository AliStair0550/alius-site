import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ adminToken: string }> }
) {
  const { adminToken } = await params;
  const body = await req.json();
  const { action } = body;

  if (action !== "close" && action !== "reopen") {
    return Response.json({ error: "Invalid action" }, { status: 400 });
  }

  const session = await prisma.teamSession.findUnique({ where: { adminToken } });
  if (!session) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (action === "close") {
    if (session.status !== "OPEN") {
      return Response.json({ error: "Session is not open" }, { status: 400 });
    }
    await prisma.teamSession.update({
      where: { adminToken },
      data: { status: "CLOSED", closedAt: new Date() },
    });
  } else {
    if (session.status === "ARCHIVED") {
      return Response.json({ error: "Cannot reopen archived session" }, { status: 400 });
    }
    await prisma.teamSession.update({
      where: { adminToken },
      data: { status: "OPEN", closedAt: null },
    });
  }

  return Response.json({ ok: true });
}
