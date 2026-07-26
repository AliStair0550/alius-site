import { NextResponse } from "next/server";
import {
  sendEmail,
  kortlaegningLeadEmailHtml,
  kortlaegningLeadEmailText,
} from "@/lib/email";

// ── Beregningsgrundlag (spejler /beregner) ─────────────────────────
const WEEKS_PER_YEAR = 46;
const ANNUAL_HOURS = 1628;
const EMPLOYER_OVERHEAD = 1.08;

// Tilladte rutiner - skal matche chippene i UI'et.
const ALLOWED_ROUTINES = [
  "Fakturaer",
  "Tilbud",
  "Rapporter",
  "Kundesvar",
  "Rykkere",
  "Dobbelttastning",
  "Vagtplaner",
  "Bogføring",
  "Andet",
];
const MAX_ROUTINES = 3;
const MAX_NOTE_LEN = 2000;

// In-memory rate-limit. Nulstilles ved server-genstart - fint til denne brug.
const recent = new Map<string, number>();
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 3;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  for (const [k, ts] of recent.entries()) {
    if (now - ts > RATE_WINDOW_MS) recent.delete(k);
  }
  const count = Array.from(recent.values()).filter((ts) => now - ts < RATE_WINDOW_MS).length;
  if (count >= RATE_MAX) return false;
  recent.set(`${key}-${now}`, now);
  return true;
}

function clampInt(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  const r = Math.round(n);
  if (r < min || r > max) return null;
  return r;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Honeypot - accepter stille, gør intet.
    if (body._hp && typeof body._hp === "string" && body._hp.length > 0) {
      return NextResponse.json({ ok: true });
    }

    // Validér e-mail (eneste påkrævede felt)
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Skriv en gyldig e-mail." }, { status: 400 });
    }

    // Validér inputs (samme grænser som slidere)
    const employees = clampInt(body.employees, 1, 50);
    const hoursPerWeek = clampInt(body.hoursPerWeek, 1, 20);
    const monthlySalary = clampInt(body.monthlySalary, 25000, 70000);
    if (employees === null || hoursPerWeek === null || monthlySalary === null) {
      return NextResponse.json({ error: "Ugyldige tal." }, { status: 400 });
    }

    // Validér rutiner: kun tilladte værdier, unikke, maks tre.
    const rawRoutines = Array.isArray(body.routines) ? body.routines : [];
    const routines = Array.from(
      new Set(
        rawRoutines
          .filter((r: unknown): r is string => typeof r === "string")
          .filter((r: string) => ALLOWED_ROUTINES.includes(r))
      )
    ).slice(0, MAX_ROUTINES) as string[];

    // Fritekst er valgfri.
    const note =
      typeof body.note === "string" ? body.note.trim().slice(0, MAX_NOTE_LEN) : "";

    if (!checkRateLimit(email)) {
      return NextResponse.json({ error: "For mange forsøg. Prøv igen om lidt." }, { status: 429 });
    }

    // Beregn server-side (stol ikke på klientens tal)
    const hourlyCost = (monthlySalary * 12 * EMPLOYER_OVERHEAD) / ANNUAL_HOURS;
    const rawAnnual = employees * hoursPerWeek * WEEKS_PER_YEAR * hourlyCost;
    const annualCost = Math.round(rawAnnual / 1000) * 1000;

    const res = await sendEmail({
      subject: `Kortlægning: ${annualCost.toLocaleString("da-DK")} kr/år`,
      html: kortlaegningLeadEmailHtml({
        email,
        employees,
        hoursPerWeek,
        monthlySalary,
        annualCost,
        routines,
        note: note || undefined,
      }),
      text: kortlaegningLeadEmailText({
        email,
        employees,
        hoursPerWeek,
        monthlySalary,
        annualCost,
        routines,
        note: note || undefined,
      }),
      replyTo: email,
    });

    if (!res.ok) {
      console.error("[beregner/kortlaegning] Email failed:", res.reason);
      return NextResponse.json({ error: "Kunne ikke sende. Prøv igen." }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[/api/beregner/kortlaegning] Error:", error);
    return NextResponse.json({ error: "Der opstod en fejl. Prøv igen." }, { status: 500 });
  }
}
