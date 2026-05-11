import { Resend } from "resend";

// Lazy init so env vars are always read at call time, not module load time.
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function getFrom(): string {
  return process.env.EMAIL_FROM ?? "noreply@alius.dk";
}

function getTo(): string {
  return process.env.EMAIL_TO ?? "hej@alius.dk";
}

type SendOptions = {
  to?: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export async function sendEmail({ to, subject, html, text, replyTo }: SendOptions) {
  const resend = getResend();

  if (!resend) {
    console.error("[email] RESEND_API_KEY is not set — email not sent");
    return { ok: false, reason: "RESEND_API_KEY not configured" };
  }

  const from = getFrom();
  const recipient = to ?? getTo();

  console.log(`[email] Sending "${subject}" to ${recipient} from ${from}`);

  try {
    const result = await resend.emails.send({
      from: `Alius <${from}>`,
      to: [recipient],
      subject,
      html,
      text,
      ...(replyTo ? { replyTo } : {}),
    });

    if (result.error) {
      console.error("[email] Resend API error:", JSON.stringify(result.error));
      return { ok: false, reason: result.error.message };
    }

    console.log("[email] Sent ok, id:", result.data?.id);
    return { ok: true, id: result.data?.id };
  } catch (err) {
    console.error("[email] Exception:", err);
    return { ok: false, reason: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ============================================================
// Email templates
// ============================================================

type TeamRequestEmailData = {
  name: string;
  email: string;
  company: string;
  teamSize: string;
  context?: string;
  requestId: string;
  appUrl: string;
};

export function teamRequestEmailHtml(data: TeamRequestEmailData): string {
  const contextBlock = data.context
    ? `
        <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid rgba(26,26,26,0.1);">
          <div style="font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(26,26,26,0.5); margin-bottom: 8px;">
            Kontekst
          </div>
          <div style="font-size: 15px; line-height: 1.6; color: #2A2A2A; white-space: pre-wrap;">${escapeHtml(data.context)}</div>
        </div>
      `
    : "";

  return `<!DOCTYPE html>
<html lang="da">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ny team-anmodning</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #F9F7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1A1A1A;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F9F7F2; padding: 48px 24px;">
      <tr>
        <td align="center">
          <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #FFFFFF; padding: 48px;">

            <tr>
              <td style="padding-bottom: 32px; border-bottom: 1px solid rgba(26,26,26,0.1);">
                <div style="font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; color: #1A1A1A; font-weight: 500;">
                  ALIUS &middot; TANKEPROFIL
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding-top: 40px;">
                <div style="font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: #2D5F4A; font-weight: 500; margin-bottom: 16px;">
                  Ny team-anmodning
                </div>
                <h1 style="font-family: Georgia, serif; font-weight: 300; font-style: italic; font-size: 36px; line-height: 1.1; margin: 0 0 32px 0; color: #1A1A1A; letter-spacing: -0.01em;">
                  ${escapeHtml(data.company)}
                </h1>

                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 0;">
                  ${row("Kontaktperson", data.name)}
                  ${row("Email", `<a href="mailto:${escapeHtml(data.email)}" style="color: #2D5F4A; text-decoration: none;">${escapeHtml(data.email)}</a>`)}
                  ${row("Antal deltagere", data.teamSize)}
                </table>

                ${contextBlock}

                <div style="margin-top: 40px; padding-top: 32px; border-top: 1px solid rgba(26,26,26,0.1);">
                  <a href="mailto:${escapeHtml(data.email)}?subject=Re: Team-rapport hos ${encodeURIComponent(data.company)}"
                     style="display: inline-block; background-color: #1A1A1A; color: #F9F7F2; padding: 16px 28px; text-decoration: none; font-size: 12px; letter-spacing: 0.25em; text-transform: uppercase; font-weight: 500;">
                    Svar til ${escapeHtml(data.name)} &rarr;
                  </a>
                </div>

                <div style="margin-top: 32px; font-size: 12px; color: rgba(26,26,26,0.5); line-height: 1.6;">
                  Anmodning #${data.requestId.slice(0, 8)} &middot; modtaget ${new Date().toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding-top: 48px; margin-top: 48px; border-top: 1px solid rgba(26,26,26,0.1); font-size: 11px; color: rgba(26,26,26,0.4); line-height: 1.6; letter-spacing: 0.03em;">
                Sendt automatisk fra alius.dk/personlighedsprofil/hold
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function teamRequestEmailText(data: TeamRequestEmailData): string {
  return `Ny team-anmodning fra Alius Personlighedsprofil

Virksomhed: ${data.company}
Kontaktperson: ${data.name}
Email: ${data.email}
Antal deltagere: ${data.teamSize}

${data.context ? `Kontekst:\n${data.context}\n` : ""}
Anmodning #${data.requestId.slice(0, 8)}
Modtaget ${new Date().toLocaleString("da-DK")}

Svar til ${data.name}: ${data.email}`;
}

// Helpers

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function row(label: string, value: string): string {
  return `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid rgba(26,26,26,0.08);">
        <div style="font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(26,26,26,0.5); margin-bottom: 4px;">
          ${label}
        </div>
        <div style="font-size: 15px; color: #1A1A1A;">${value}</div>
      </td>
    </tr>
  `;
}
