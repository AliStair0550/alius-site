import { NextResponse } from "next/server";
import {
  sendEmail,
  beregnerResultEmailHtml,
  beregnerResultEmailText,
  beregnerLeadEmailHtml,
  beregnerLeadEmailText,
} from "@/lib/email";

// ── Beregningsgrundlag (spejler /beregner) ─────────────────────────
const WEEKS_PER_YEAR = 46;
const ANNUAL_HOURS = 1628;
const EMPLOYER_OVERHEAD = 1.08;

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

    // Validér e-mail
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

    if (!checkRateLimit(email)) {
      return NextResponse.json({ error: "For mange forsøg. Prøv igen om lidt." }, { status: 429 });
    }

    // Beregn server-side (stol ikke på klientens tal)
    const hourlyCost = (monthlySalary * 12 * EMPLOYER_OVERHEAD) / ANNUAL_HOURS;
    const rawAnnual = employees * hoursPerWeek * WEEKS_PER_YEAR * hourlyCost;
    const annualCost = Math.round(rawAnnual / 1000) * 1000;
    const totalHours = employees * hoursPerWeek * WEEKS_PER_YEAR;
    const fte = totalHours / ANNUAL_HOURS;

    const base =
      process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL ?? "https://alius.dk";
    const appUrl = base.startsWith("http") ? base : `https://${base}`;
    const bookUrl = `${appUrl}/#kontakt`;
    const calcUrl = `${appUrl}/beregner`;

    const shared = { employees, hoursPerWeek, monthlySalary, annualCost, totalHours, fte };

    // 1) Resultat til brugeren
    const resultRes = await sendEmail({
      to: email,
      subject: `Jeres beregning: ${annualCost.toLocaleString("da-DK")} kr om året`,
      html: beregnerResultEmailHtml({ ...shared, bookUrl, calcUrl }),
      text: beregnerResultEmailText({ ...shared, bookUrl, calcUrl }),
    });

    // 2) Lead-notifikation til hej@alius.dk (fanger leadet, reply går til brugeren)
    await sendEmail({
      subject: `Ny beregner-lead: ${annualCost.toLocaleString("da-DK")} kr`,
      html: beregnerLeadEmailHtml({ ...shared, email }),
      text: beregnerLeadEmailText({ ...shared, email }),
      replyTo: email,
    });

    if (!resultRes.ok) {
      console.error("[beregner/lead] Result email failed:", resultRes.reason);
      return NextResponse.json({ error: "Kunne ikke sende. Prøv igen." }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[/api/beregner/lead] Error:", error);
    return NextResponse.json({ error: "Der opstod en fejl. Prøv igen." }, { status: 500 });
  }
}
