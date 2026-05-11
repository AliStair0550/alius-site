import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail, approvalEmailHtml, approvalEmailText } from "@/lib/email";

function checkAdmin(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  return req.headers.get("x-admin-secret") === secret;
}

function parseTeamSize(s: string): number | undefined {
  const match = s.match(/\d+/);
  return match ? parseInt(match[0], 10) : undefined;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAdmin(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { action } = body;

  if (action !== "approve" && action !== "decline") {
    return Response.json({ error: "Invalid action" }, { status: 400 });
  }

  const existing = await prisma.teamRequest.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.status !== "NEW") {
    return Response.json({ error: "Already processed" }, { status: 400 });
  }

  if (action === "decline") {
    await prisma.teamRequest.update({
      where: { id },
      data: { status: "DECLINED", reviewedAt: new Date() },
    });
    return Response.json({ ok: true });
  }

  // approve
  const session = await prisma.teamSession.create({
    data: {
      name: `${existing.company} — Hold`,
      companyName: existing.company,
      ownerEmail: existing.email,
      ownerName: existing.name,
      expectedSize: parseTeamSize(existing.teamSize),
      status: "OPEN",
    },
  });

  await prisma.teamRequest.update({
    where: { id },
    data: { status: "APPROVED", sessionId: session.id, reviewedAt: new Date() },
  });

  const rawUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL;
  const appUrl =
    rawUrl?.startsWith("http") ? rawUrl : rawUrl ? `https://${rawUrl}` : "https://alius.dk";

  const joinUrl = `${appUrl}/tankeprofil/join/${session.joinToken}`;
  const adminUrl = `${appUrl}/tankeprofil/hold/admin/${session.adminToken}`;

  const emailResult = await sendEmail({
    to: existing.email,
    subject: "Dit hold-link er klar · Alius Personlighedsprofil",
    html: approvalEmailHtml({ name: existing.name, company: existing.company, joinUrl, adminUrl }),
    text: approvalEmailText({ name: existing.name, company: existing.company, joinUrl, adminUrl }),
  });

  if (!emailResult.ok) {
    console.error("[team-request approve] Email failed:", emailResult.reason);
  }

  return Response.json({
    ok: true,
    session: {
      id: session.id,
      joinToken: session.joinToken,
      adminToken: session.adminToken,
      reportToken: session.reportToken,
    },
    emailSent: emailResult.ok,
  });
}
