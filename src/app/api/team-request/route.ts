import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail, teamRequestEmailHtml, teamRequestEmailText } from "@/lib/email";

// Basic rate-limit using in-memory map. Resets on server restart.
// For preview deployments this is OK; for production we'd want a real KV store.
const recentSubmissions = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_PER_WINDOW = 3;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  // Clean old entries
  for (const [k, ts] of recentSubmissions.entries()) {
    if (now - ts > RATE_LIMIT_WINDOW_MS) recentSubmissions.delete(k);
  }
  // Count current
  const count = Array.from(recentSubmissions.values()).filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS
  ).length;
  if (count >= RATE_LIMIT_MAX_PER_WINDOW) return false;
  recentSubmissions.set(`${key}-${now}`, now);
  return true;
}

function isValidString(v: unknown, maxLen = 500): v is string {
  return typeof v === "string" && v.trim().length > 0 && v.trim().length <= maxLen;
}

function isValidEmail(v: unknown): v is string {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("[team-request] Received body keys:", Object.keys(body));
    console.log("[team-request] Honeypot value:", JSON.stringify(body._hp));

    // Validate required fields
    if (!isValidString(body.name, 100)) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!isValidEmail(body.email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (!isValidString(body.company, 200)) {
      return NextResponse.json({ error: "Company is required" }, { status: 400 });
    }
    if (!isValidString(body.teamSize, 50)) {
      return NextResponse.json({ error: "Team size is required" }, { status: 400 });
    }

    // Optional context with longer limit
    let context: string | undefined;
    if (body.context !== undefined) {
      if (typeof body.context !== "string") {
        return NextResponse.json({ error: "Invalid context" }, { status: 400 });
      }
      const trimmed = body.context.trim();
      if (trimmed.length > 0) {
        if (trimmed.length > 2000) {
          return NextResponse.json(
            { error: "Context is too long (max 2000 characters)" },
            { status: 400 }
          );
        }
        context = trimmed;
      }
    }

    // Honeypot field - if set, silently accept but do nothing.
    if (body._hp && typeof body._hp === "string" && body._hp.length > 0) {
      console.warn("[team-request] Honeypot triggered:", body.email);
      return NextResponse.json({ ok: true });
    }

    // Rate limit by email
    if (!checkRateLimit(body.email)) {
      return NextResponse.json(
        { error: "For mange anmodninger. Prøv igen om lidt." },
        { status: 429 }
      );
    }

    const name = body.name.trim();
    const email = body.email.trim().toLowerCase();
    const company = body.company.trim();
    const teamSize = body.teamSize.trim();

    // Save to database
    const request = await prisma.teamRequest.create({
      data: {
        name,
        email,
        company,
        teamSize,
        context,
        status: "NEW",
      },
    });

    // Get base URL for any links in the email
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.VERCEL_URL ??
      "https://alius.dk";

    // Send notification email to hej@alius.dk
    // We don't fail the request if email fails - the request is already saved
    const emailResult = await sendEmail({
      subject: `Ny team-anmodning: ${company}`,
      html: teamRequestEmailHtml({
        name,
        email,
        company,
        teamSize,
        context,
        requestId: request.id,
        appUrl: appUrl.startsWith("http") ? appUrl : `https://${appUrl}`,
      }),
      text: teamRequestEmailText({
        name,
        email,
        company,
        teamSize,
        context,
        requestId: request.id,
        appUrl,
      }),
      replyTo: email, // So "Reply" goes directly to the requester
    });

    if (!emailResult.ok) {
      console.error("[team-request] Email send failed:", emailResult.reason);
    } else {
      console.log("[team-request] Email sent ok, id:", (emailResult as { id?: string }).id);
    }

    return NextResponse.json({
      ok: true,
      requestId: request.id,
      emailSent: emailResult.ok,
    });
  } catch (error) {
    console.error("[/api/team-request] Error:", error);
    return NextResponse.json(
      { error: "Der opstod en fejl. Prøv igen om lidt." },
      { status: 500 }
    );
  }
}
