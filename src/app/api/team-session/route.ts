import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail, approvalEmailHtml, approvalEmailText } from "@/lib/email";

function isValidString(v: unknown, maxLen = 500): v is string {
  return typeof v === "string" && v.trim().length > 0 && v.trim().length <= maxLen;
}

function isValidEmail(v: unknown): v is string {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function parseTeamSize(s: string): number | undefined {
  const match = s.match(/\d+/);
  return match ? parseInt(match[0], 10) : undefined;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!isValidString(body.name, 100)) {
      return NextResponse.json({ error: "Navn er påkrævet" }, { status: 400 });
    }
    if (!isValidEmail(body.email)) {
      return NextResponse.json({ error: "Gyldig email er påkrævet" }, { status: 400 });
    }
    if (!isValidString(body.company, 200)) {
      return NextResponse.json({ error: "Virksomhed er påkrævet" }, { status: 400 });
    }
    if (!isValidString(body.teamSize, 50)) {
      return NextResponse.json({ error: "Antal deltagere er påkrævet" }, { status: 400 });
    }

    const name = body.name.trim();
    const email = body.email.trim().toLowerCase();
    const company = body.company.trim();
    const teamSize = body.teamSize.trim();

    const session = await prisma.teamSession.create({
      data: {
        name: `${company}: Hold`,
        companyName: company,
        ownerEmail: email,
        ownerName: name,
        expectedSize: parseTeamSize(teamSize),
        status: "OPEN",
      },
    });

    const rawUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL;
    const appUrl = rawUrl?.startsWith("http") ? rawUrl : rawUrl ? `https://${rawUrl}` : "https://alius.dk";

    const joinUrl = `${appUrl}/tankeprofil/join/${session.joinToken}`;
    const adminUrl = `${appUrl}/tankeprofil/hold/admin/${session.adminToken}`;

    const emailResult = await sendEmail({
      to: email,
      subject: "Dit hold-link er klar · Alius Personlighedsprofil",
      html: approvalEmailHtml({ name, company, joinUrl, adminUrl }),
      text: approvalEmailText({ name, company, joinUrl, adminUrl }),
    });

    if (!emailResult.ok) {
      console.error("[team-session] Email send failed:", emailResult.reason);
    }

    return NextResponse.json({
      ok: true,
      joinUrl,
      adminUrl,
      joinToken: session.joinToken,
      adminToken: session.adminToken,
      reportToken: session.reportToken,
    });
  } catch (error) {
    console.error("[/api/team-session] Error:", error);
    return NextResponse.json(
      { error: "Der opstod en fejl. Prøv igen om lidt." },
      { status: 500 }
    );
  }
}
