// ============================================================
// Kontaktformularen
//
// Samme værn som beregnerens lead-endpoint: honeypot, rate-limit og
// validering før noget sendes. Feltet _hp er skjult for mennesker, så
// udfyldt betyder robot.
// ============================================================

import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 3;
const recent = new Map<string, number>();

function underGraensen(): boolean {
  const nu = Date.now();
  for (const [k, ts] of recent.entries()) {
    if (nu - ts > RATE_WINDOW_MS) recent.delete(k);
  }
  if (recent.size >= RATE_MAX) return false;
  recent.set(`${nu}-${Math.round(nu % 1000)}`, nu);
  return true;
}

/** Klipper og afviser tomt. Returnerer null når feltet ikke duer. */
function tekst(v: unknown, maks: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t.length === 0 || t.length > maks) return null;
  return t;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Kunne ikke læse beskeden." }, { status: 400 });
  }

  // Honeypot. Accepteres stille: en robot skal ikke lære at den blev
  // opdaget, og et menneske ser aldrig feltet.
  if (typeof body._hp === "string" && body._hp.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const navn = tekst(body.navn, 120);
  const besked = tekst(body.besked, 5000);
  const virksomhed = typeof body.virksomhed === "string" ? body.virksomhed.trim().slice(0, 120) : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!navn) return NextResponse.json({ error: "Skriv dit navn." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Skriv en gyldig e-mail." }, { status: 400 });
  }
  if (!besked) {
    return NextResponse.json({ error: "Skriv en besked." }, { status: 400 });
  }

  if (!underGraensen()) {
    return NextResponse.json(
      { error: "Der er sendt for mange beskeder lige nu. Prøv om et øjeblik." },
      { status: 429 }
    );
  }

  const linjer = [
    `Navn: ${navn}`,
    `E-mail: ${email}`,
    virksomhed ? `Virksomhed: ${virksomhed}` : null,
    "",
    besked,
  ].filter((l): l is string => l !== null);

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1A1A1A;line-height:1.7">
      <p style="margin:0 0 4px"><strong>${esc(navn)}</strong></p>
      <p style="margin:0 0 4px"><a href="mailto:${esc(email)}">${esc(email)}</a></p>
      ${virksomhed ? `<p style="margin:0 0 4px">${esc(virksomhed)}</p>` : ""}
      <hr style="border:none;border-top:1px solid #D4D0C8;margin:18px 0" />
      <p style="margin:0;white-space:pre-wrap">${esc(besked)}</p>
    </div>`;

  // replyTo sættes til afsenderen, så et svar går direkte tilbage.
  const r = await sendEmail({
    subject: `Besked fra ${navn}${virksomhed ? ` (${virksomhed})` : ""}`,
    html,
    text: linjer.join("\n"),
    replyTo: email,
  });

  if (!r.ok) {
    // Beskeden nåede ikke frem. Det må ikke se ud som om den gjorde.
    console.error("[kontakt] kunne ikke sende:", r.reason);
    return NextResponse.json(
      {
        error:
          "Beskeden kunne ikke sendes lige nu. Skriv til hej@alius.dk, så fanger vi den der.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
