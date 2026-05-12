import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail, profileEmailHtml, profileEmailText } from "@/lib/email";
import { ARCHETYPES } from "@/components/tankeprofil/data";
import type { QuadrantKey } from "@/components/tankeprofil/data";

export async function GET(
  _req: Request,
  context: { params: Promise<{ accessToken: string }> }
) {
  try {
    const { accessToken } = await context.params;

    if (!accessToken || typeof accessToken !== "string") {
      return NextResponse.json(
        { error: "Missing access token" },
        { status: 400 }
      );
    }

    const profile = await prisma.profile.findUnique({
      where: { accessToken },
      select: {
        id: true,
        displayName: true,
        email: true,
        totals: true,
        primary: true,
        secondary: true,
        weakest: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    console.error("[/api/profile/[accessToken]] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH allows adding/updating email on an existing profile
export async function PATCH(
  req: Request,
  context: { params: Promise<{ accessToken: string }> }
) {
  try {
    const { accessToken } = await context.params;
    const body = await req.json();

    const profile = await prisma.profile.findUnique({
      where: { accessToken },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    const updates: { email?: string; displayName?: string } = {};

    if (body.email !== undefined) {
      if (body.email === null || body.email === "") {
        // Allow clearing email
        updates.email = undefined;
      } else if (typeof body.email === "string") {
        const trimmed = body.email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
          return NextResponse.json(
            { error: "Invalid email format" },
            { status: 400 }
          );
        }
        // Check if another profile already has this email
        const existing = await prisma.profile.findUnique({
          where: { email: trimmed },
        });
        if (existing && existing.id !== profile.id) {
          return NextResponse.json(
            { error: "Email already in use" },
            { status: 409 }
          );
        }
        updates.email = trimmed;
      }
    }

    if (body.displayName !== undefined && typeof body.displayName === "string") {
      const trimmed = body.displayName.trim();
      if (trimmed.length > 0 && trimmed.length <= 80) {
        updates.displayName = trimmed;
      }
    }

    const updated = await prisma.profile.update({
      where: { id: profile.id },
      data: updates,
      select: {
        id: true,
        displayName: true,
        email: true,
        totals: true,
        primary: true,
        secondary: true,
        weakest: true,
      },
    });

    // Send profile link email when an email is first set
    const emailBeingSaved = updates.email;
    if (emailBeingSaved && !profile.email) {
      const rawUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL;
      const appUrl = rawUrl?.startsWith("http") ? rawUrl : rawUrl ? `https://${rawUrl}` : "https://alius.dk";
      const profileUrl = `${appUrl}/tankeprofil/min-profil/${accessToken}`;
      const primaryName = ARCHETYPES[updated.primary as QuadrantKey]?.name ?? updated.primary;

      const emailResult = await sendEmail({
        to: emailBeingSaved,
        subject: `Din personlighedsprofil · Alius`,
        html: profileEmailHtml({ displayName: updated.displayName, primaryName, profileUrl }),
        text: profileEmailText({ displayName: updated.displayName, primaryName, profileUrl }),
      });
      if (!emailResult.ok) {
        console.error("[profile PATCH] email send failed:", emailResult.reason);
      }
    }

    return NextResponse.json({ ok: true, profile: updated });
  } catch (error) {
    console.error("[/api/profile/[accessToken] PATCH] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
