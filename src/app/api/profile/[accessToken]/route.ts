import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail, fullProfileEmailHtml, fullProfileEmailText } from "@/lib/email";
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

    // Send full profile email when an email is first set
    const emailBeingSaved = updates.email;
    if (emailBeingSaved && !profile.email) {
      const rawUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL;
      const appUrl = rawUrl?.startsWith("http") ? rawUrl : rawUrl ? `https://${rawUrl}` : "https://alius.dk";
      const profileUrl = `${appUrl}/tankeprofil/min-profil/${accessToken}`;

      const primary = updated.primary as QuadrantKey;
      const secondary = updated.secondary as QuadrantKey;
      const weakest = updated.weakest as QuadrantKey;
      const primaryArch = ARCHETYPES[primary];
      const secondaryArch = ARCHETYPES[secondary];
      const weakestArch = ARCHETYPES[weakest];

      const raw = updated.totals as Record<string, number> | null;
      const t = raw
        ? { A: raw.A ?? 0, B: raw.B ?? 0, C: raw.C ?? 0, D: raw.D ?? 0 }
        : { A: 0, B: 0, C: 0, D: 0 };
      const sum = t.A + t.B + t.C + t.D;
      const pct = sum > 0
        ? {
            A: Math.round((t.A / sum) * 100),
            B: Math.round((t.B / sum) * 100),
            C: Math.round((t.C / sum) * 100),
            D: Math.round((t.D / sum) * 100),
          }
        : { A: 25, B: 25, C: 25, D: 25 };

      const emailResult = await sendEmail({
        to: emailBeingSaved,
        subject: `Din personlighedsprofil · ${primaryArch?.name ?? "Alius"}`,
        html: fullProfileEmailHtml({
          displayName: updated.displayName,
          primaryName: primaryArch?.name ?? primary,
          primaryDescription: primaryArch?.description ?? "",
          secondaryName: secondaryArch?.name ?? secondary,
          weakestName: weakestArch?.name ?? weakest,
          weakestShort: weakestArch?.short ?? "",
          strengths: primaryArch?.strengths ?? [],
          blindspots: primaryArch?.blindspots ?? [],
          pct,
          profileUrl,
        }),
        text: fullProfileEmailText({
          displayName: updated.displayName,
          primaryName: primaryArch?.name ?? primary,
          primaryDescription: primaryArch?.description ?? "",
          secondaryName: secondaryArch?.name ?? secondary,
          weakestName: weakestArch?.name ?? weakest,
          weakestShort: weakestArch?.short ?? "",
          strengths: primaryArch?.strengths ?? [],
          blindspots: primaryArch?.blindspots ?? [],
          pct,
          profileUrl,
        }),
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
