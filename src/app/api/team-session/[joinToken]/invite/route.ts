import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail, inviteEmailHtml, inviteEmailText } from "@/lib/email";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ joinToken: string }> }
) {
  try {
    const { joinToken } = await params;
    const body = await req.json();

    const emails: unknown[] = Array.isArray(body.emails) ? body.emails : [];
    const validEmails = emails.filter(
      (e): e is string =>
        typeof e === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())
    ).map((e) => e.trim().toLowerCase());

    if (validEmails.length === 0) {
      return NextResponse.json({ error: "Ingen gyldige emailadresser" }, { status: 400 });
    }
    if (validEmails.length > 50) {
      return NextResponse.json({ error: "Maks 50 invitationer ad gangen" }, { status: 400 });
    }

    const session = await prisma.teamSession.findUnique({
      where: { joinToken },
      select: { id: true, ownerName: true, companyName: true, name: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Session ikke fundet" }, { status: 404 });
    }

    const rawUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL;
    const appUrl = rawUrl?.startsWith("http") ? rawUrl : rawUrl ? `https://${rawUrl}` : "https://alius.dk";
    const joinUrl = `${appUrl}/tankeprofil/join/${joinToken}`;
    const inviterName = session.ownerName ?? "Dit hold";
    const company = session.companyName ?? session.name;

    const results = await Promise.allSettled(
      validEmails.map((email) =>
        sendEmail({
          to: email,
          subject: `${inviterName} inviterer dig til en personlighedsprofil`,
          html: inviteEmailHtml({ inviterName, company, joinUrl }),
          text: inviteEmailText({ inviterName, company, joinUrl }),
        })
      )
    );

    const sent = results.filter((r) => r.status === "fulfilled" && r.value.ok).length;
    const failed = validEmails.length - sent;

    return NextResponse.json({ ok: true, sent, failed });
  } catch (error) {
    console.error("[/api/team-session/invite] Error:", error);
    return NextResponse.json(
      { error: "Der opstod en fejl. Prøv igen om lidt." },
      { status: 500 }
    );
  }
}
