import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

// Temporary diagnostic route — remove after confirming email works.
// Hit GET /api/test-email to trigger a test send.
export async function GET() {
  const result = await sendEmail({
    subject: "Test email fra alius.dk",
    html: "<p>Hvis du ser denne email, virker Resend korrekt.</p>",
    text: "Hvis du ser denne email, virker Resend korrekt.",
  });

  return NextResponse.json({
    result,
    env: {
      hasKey: !!process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM ?? "(ikke sat, bruger noreply@alius.dk)",
      to: process.env.EMAIL_TO ?? "(ikke sat, bruger hej@alius.dk)",
    },
  });
}
