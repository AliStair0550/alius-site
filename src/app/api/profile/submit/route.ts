import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Validate that totals look reasonable
function isValidTotals(t: unknown): t is { A: number; B: number; C: number; D: number } {
  if (!t || typeof t !== "object") return false;
  const o = t as Record<string, unknown>;
  return (
    typeof o.A === "number" &&
    typeof o.B === "number" &&
    typeof o.C === "number" &&
    typeof o.D === "number" &&
    o.A >= 0 &&
    o.B >= 0 &&
    o.C >= 0 &&
    o.D >= 0
  );
}

function isValidQuadrant(q: unknown): q is "A" | "B" | "C" | "D" {
  return q === "A" || q === "B" || q === "C" || q === "D";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate input
    if (!isValidTotals(body.totals)) {
      return NextResponse.json(
        { error: "Invalid totals" },
        { status: 400 }
      );
    }
    if (
      !isValidQuadrant(body.primary) ||
      !isValidQuadrant(body.secondary) ||
      !isValidQuadrant(body.weakest)
    ) {
      return NextResponse.json(
        { error: "Invalid quadrant values" },
        { status: 400 }
      );
    }

    // Email is optional but if provided, must look like an email
    let email: string | undefined;
    if (body.email && typeof body.email === "string") {
      const trimmed = body.email.trim().toLowerCase();
      if (trimmed.length > 0) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
          return NextResponse.json(
            { error: "Invalid email format" },
            { status: 400 }
          );
        }
        email = trimmed;
      }
    }

    // Display name optional
    let displayName: string | undefined;
    if (body.displayName && typeof body.displayName === "string") {
      const trimmed = body.displayName.trim();
      if (trimmed.length > 0 && trimmed.length <= 80) {
        displayName = trimmed;
      }
    }

    // Source optional
    const validSources = ["individual", "team_invitation", "workshop"];
    const source =
      body.source && validSources.includes(body.source) ? body.source : "individual";

    // If email already exists, update the existing profile instead of creating new
    if (email) {
      const existing = await prisma.profile.findUnique({ where: { email } });
      if (existing) {
        const updated = await prisma.profile.update({
          where: { id: existing.id },
          data: {
            totals: body.totals,
            primary: body.primary,
            secondary: body.secondary,
            weakest: body.weakest,
            selections: body.selections ?? existing.selections,
            displayName: displayName ?? existing.displayName,
            source,
          },
        });
        return NextResponse.json({
          ok: true,
          profileId: updated.id,
          accessToken: updated.accessToken,
          isReturning: true,
        });
      }
    }

    // Create new profile
    const profile = await prisma.profile.create({
      data: {
        email,
        displayName,
        totals: body.totals,
        primary: body.primary,
        secondary: body.secondary,
        weakest: body.weakest,
        selections: body.selections ?? [],
        source,
      },
    });

    return NextResponse.json({
      ok: true,
      profileId: profile.id,
      accessToken: profile.accessToken,
      isReturning: false,
    });
  } catch (error) {
    console.error("[/api/profile/submit] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
