import { Resend } from "resend";

export const EMAIL_TO = process.env.EMAIL_TO ?? "hej@alius.dk";

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
  return EMAIL_TO;
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

// ============================================================

type ApprovalEmailData = {
  name: string;
  company: string;
  joinUrl: string;
  adminUrl: string;
};

export function approvalEmailHtml(data: ApprovalEmailData): string {
  return `<!DOCTYPE html>
<html lang="da">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dit hold-link er klar</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #F9F7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1A1A1A;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F9F7F2; padding: 48px 24px;">
      <tr>
        <td align="center">
          <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #FFFFFF; padding: 48px;">

            <tr>
              <td style="padding-bottom: 32px; border-bottom: 1px solid rgba(26,26,26,0.1);">
                <div style="font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; color: #1A1A1A; font-weight: 500;">
                  ALIUS &middot; PERSONLIGHEDSPROFIL
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding-top: 40px;">
                <div style="font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: #2D5F4A; font-weight: 500; margin-bottom: 16px;">
                  Hold-link klar
                </div>
                <h1 style="font-family: Georgia, serif; font-weight: 300; font-style: italic; font-size: 36px; line-height: 1.1; margin: 0 0 24px 0; color: #1A1A1A; letter-spacing: -0.01em;">
                  Hej ${escapeHtml(data.name)}.
                </h1>
                <p style="font-size: 16px; line-height: 1.65; color: #4A4A4A; margin: 0 0 32px 0;">
                  Jeres hold-link til ${escapeHtml(data.company)} er klar. Send linket nedenfor til alle deltagere, de behøver ikke oprette en konto.
                </p>

                <div style="margin: 32px 0; padding: 24px; background-color: #F9F7F2; border-left: 3px solid #2D5F4A;">
                  <div style="font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(26,26,26,0.5); margin-bottom: 8px;">
                    Hold-link - send til deltagerne
                  </div>
                  <a href="${data.joinUrl}" style="font-size: 15px; color: #2D5F4A; text-decoration: none; word-break: break-all;">${data.joinUrl}</a>
                </div>

                <div style="margin-top: 40px; padding-top: 32px; border-top: 1px solid rgba(26,26,26,0.1);">
                  <div style="font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(26,26,26,0.5); margin-bottom: 16px;">
                    Dine to links
                  </div>
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="padding-bottom: 12px;">
                        <a href="${data.joinUrl}"
                           style="display: inline-block; background-color: #1A1A1A; color: #F9F7F2; padding: 16px 28px; text-decoration: none; font-size: 12px; letter-spacing: 0.25em; text-transform: uppercase; font-weight: 500;">
                          Tag testen selv &rarr;
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <a href="${data.adminUrl}"
                           style="display: inline-block; background-color: transparent; color: #1A1A1A; padding: 14px 28px; text-decoration: none; font-size: 12px; letter-spacing: 0.25em; text-transform: uppercase; font-weight: 400; border: 1px solid rgba(26,26,26,0.25);">
                          Se admin-panel &rarr;
                        </a>
                      </td>
                    </tr>
                  </table>
                </div>

                <div style="margin-top: 32px; font-size: 12px; color: rgba(26,26,26,0.5); line-height: 1.6;">
                  Gem denne email. Dine links er dit adgangspunkt til session og rapport.<br>
                  Spørgsmål? Skriv til hej@alius.dk
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding-top: 48px; border-top: 1px solid rgba(26,26,26,0.1); font-size: 11px; color: rgba(26,26,26,0.4); line-height: 1.6; letter-spacing: 0.03em;">
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

export function approvalEmailText(data: ApprovalEmailData): string {
  return `Hej ${data.name},

Jeres hold-session hos ${data.company} er klar.

HOLD-LINK (send til deltagerne):
${data.joinUrl}

Tag testen selv ved at klikke samme link, du deltager på præcis samme måde som holdet.

ADMIN-PANEL (gem til dig selv):
${data.adminUrl}
Følg hvem der har udfyldt profilen og se holdrapporten her.

Gem denne email. Dine links er dit adgangspunkt til session og rapport.
Spørgsmål? Skriv til hej@alius.dk

Alius Personlighedsprofil`;
}

// ============================================================

type ProfileEmailData = {
  displayName?: string | null;
  primaryName: string;
  profileUrl: string;
};

export function profileEmailHtml(data: ProfileEmailData): string {
  const greeting = data.displayName
    ? `Hej ${escapeHtml(data.displayName)}.`
    : "Hej.";

  return `<!DOCTYPE html>
<html lang="da">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Din personlighedsprofil</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #F9F7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1A1A1A;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F9F7F2; padding: 48px 24px;">
      <tr>
        <td align="center">
          <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #FFFFFF; padding: 48px;">

            <tr>
              <td style="padding-bottom: 32px; border-bottom: 1px solid rgba(26,26,26,0.1);">
                <div style="font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; color: #1A1A1A; font-weight: 500;">
                  ALIUS &middot; PERSONLIGHEDSPROFIL
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding-top: 40px;">
                <div style="font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: #2D5F4A; font-weight: 500; margin-bottom: 16px;">
                  Din profil
                </div>
                <h1 style="font-family: Georgia, serif; font-weight: 300; font-style: italic; font-size: 48px; line-height: 1.0; margin: 0 0 24px 0; color: #1A1A1A; letter-spacing: -0.02em;">
                  ${escapeHtml(data.primaryName)}
                </h1>
                <p style="font-size: 16px; line-height: 1.65; color: #4A4A4A; margin: 0 0 32px 0;">
                  ${greeting}<br><br>
                  Her er linket til din personlighedsprofil. Du kan vende tilbage og se den til enhver tid.
                </p>

                <div style="margin: 32px 0; padding: 24px; background-color: #F9F7F2; border-left: 3px solid #2D5F4A;">
                  <div style="font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(26,26,26,0.5); margin-bottom: 8px;">
                    Din profil-side
                  </div>
                  <a href="${data.profileUrl}" style="font-size: 15px; color: #2D5F4A; text-decoration: none; word-break: break-all;">${data.profileUrl}</a>
                </div>

                <div style="margin-top: 40px; padding-top: 32px; border-top: 1px solid rgba(26,26,26,0.1);">
                  <a href="${data.profileUrl}"
                     style="display: inline-block; background-color: #1A1A1A; color: #F9F7F2; padding: 16px 28px; text-decoration: none; font-size: 12px; letter-spacing: 0.25em; text-transform: uppercase; font-weight: 500;">
                    Se din profil &rarr;
                  </a>
                </div>

                <div style="margin-top: 32px; font-size: 12px; color: rgba(26,26,26,0.5); line-height: 1.6;">
                  Gem denne mail. Linket er dit adgangspunkt til profilen.<br>
                  Spørgsmål? Skriv til hej@alius.dk
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding-top: 48px; border-top: 1px solid rgba(26,26,26,0.1); font-size: 11px; color: rgba(26,26,26,0.4); line-height: 1.6; letter-spacing: 0.03em;">
                Sendt automatisk fra alius.dk/personlighedsprofil
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function profileEmailText(data: ProfileEmailData): string {
  const greeting = data.displayName ? `Hej ${data.displayName},` : "Hej,";
  return `${greeting}

Her er linket til din personlighedsprofil (${data.primaryName}):
${data.profileUrl}

Gem dette link. Det er dit adgangspunkt til profilen.
Spørgsmål? Skriv til hej@alius.dk

Alius Personlighedsprofil`;
}

// ============================================================

type TeamProgressEmailData = {
  ownerName: string | null;
  company: string;
  submittedCount: number;
  expectedCount: number | null;
  reportUrl: string;
};

export function teamProgressEmailHtml(data: TeamProgressEmailData): string {
  const greeting = data.ownerName ? `Hej ${escapeHtml(data.ownerName)}.` : "Hej.";
  const progress = data.expectedCount
    ? `${data.submittedCount} af ${data.expectedCount}`
    : `${data.submittedCount}`;

  return `<!DOCTYPE html>
<html lang="da">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapporten er under opbygning</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #F9F7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1A1A1A;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F9F7F2; padding: 48px 24px;">
      <tr>
        <td align="center">
          <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #FFFFFF; padding: 48px;">

            <tr>
              <td style="padding-bottom: 32px; border-bottom: 1px solid rgba(26,26,26,0.1);">
                <div style="font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; color: #1A1A1A; font-weight: 500;">
                  ALIUS &middot; PERSONLIGHEDSPROFIL
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding-top: 40px;">
                <div style="font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: #2D5F4A; font-weight: 500; margin-bottom: 16px;">
                  Holdrapport
                </div>
                <h1 style="font-family: Georgia, serif; font-weight: 300; font-style: italic; font-size: 36px; line-height: 1.1; margin: 0 0 24px 0; color: #1A1A1A; letter-spacing: -0.01em;">
                  ${greeting}
                </h1>
                <p style="font-size: 16px; line-height: 1.65; color: #4A4A4A; margin: 0 0 16px 0;">
                  Første deltager fra <strong style="color: #1A1A1A; font-weight: normal;">${escapeHtml(data.company)}</strong> har
                  udfyldt sin profil. Rapporten er allerede tilgængelig og opdateres automatisk
                  som resten af holdet gennemfører testen.
                </p>
                <p style="font-size: 14px; color: rgba(26,26,26,0.5); margin: 0 0 32px 0;">
                  Fremgang: ${progress} udfyldt.
                </p>

                <div style="margin: 32px 0; padding: 24px; background-color: #F9F7F2; border-left: 3px solid #2D5F4A;">
                  <div style="font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(26,26,26,0.5); margin-bottom: 8px;">
                    Holdrapport
                  </div>
                  <a href="${data.reportUrl}" style="font-size: 15px; color: #2D5F4A; text-decoration: none; word-break: break-all;">${data.reportUrl}</a>
                </div>

                <div style="margin-top: 40px; padding-top: 32px; border-top: 1px solid rgba(26,26,26,0.1);">
                  <a href="${data.reportUrl}"
                     style="display: inline-block; background-color: #1A1A1A; color: #F9F7F2; padding: 16px 28px; text-decoration: none; font-size: 12px; letter-spacing: 0.25em; text-transform: uppercase; font-weight: 500;">
                    Abn holdrapporten &rarr;
                  </a>
                </div>

                <div style="margin-top: 32px; font-size: 12px; color: rgba(26,26,26,0.5); line-height: 1.6;">
                  Spørgsmål? Skriv til hej@alius.dk
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding-top: 48px; border-top: 1px solid rgba(26,26,26,0.1); font-size: 11px; color: rgba(26,26,26,0.4); line-height: 1.6; letter-spacing: 0.03em;">
                Sendt automatisk fra alius.dk/personlighedsprofil
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function teamProgressEmailText(data: TeamProgressEmailData): string {
  const greeting = data.ownerName ? `Hej ${data.ownerName},` : "Hej,";
  const progress = data.expectedCount
    ? `${data.submittedCount} af ${data.expectedCount}`
    : `${data.submittedCount}`;
  return `${greeting}

Første deltager fra ${data.company} har udfyldt sin profil.
Fremgang: ${progress} udfyldt.

Rapporten opdateres automatisk som resten af holdet gennemfører testen.
Åbn holdrapporten her:
${data.reportUrl}

Spørgsmål? Skriv til hej@alius.dk

Alius Personlighedsprofil`;
}

// ============================================================

type InviteEmailData = {
  inviterName: string;
  company: string;
  joinUrl: string;
};

export function inviteEmailHtml(data: InviteEmailData): string {
  return `<!DOCTYPE html>
<html lang="da">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Du er inviteret</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #F9F7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1A1A1A;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F9F7F2; padding: 48px 24px;">
      <tr>
        <td align="center">
          <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #FFFFFF; padding: 48px;">

            <tr>
              <td style="padding-bottom: 32px; border-bottom: 1px solid rgba(26,26,26,0.1);">
                <div style="font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; color: #1A1A1A; font-weight: 500;">
                  ALIUS &middot; PERSONLIGHEDSPROFIL
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding-top: 40px;">
                <div style="font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: #2D5F4A; font-weight: 500; margin-bottom: 16px;">
                  Du er inviteret
                </div>
                <h1 style="font-family: Georgia, serif; font-weight: 300; font-style: italic; font-size: 36px; line-height: 1.1; margin: 0 0 24px 0; color: #1A1A1A; letter-spacing: -0.01em;">
                  ${escapeHtml(data.inviterName)} har inviteret dig.
                </h1>
                <p style="font-size: 16px; line-height: 1.65; color: #4A4A4A; margin: 0 0 32px 0;">
                  ${escapeHtml(data.inviterName)} inviterer dig til at tage en personlighedsprofil som en del af
                  <strong style="color: #1A1A1A; font-weight: normal;">${escapeHtml(data.company)}</strong>.
                  Det tager 4 minutter, og du ser dit resultat med det samme.
                </p>

                <div style="margin: 32px 0; padding: 24px; background-color: #F9F7F2; border-left: 3px solid #2D5F4A;">
                  <div style="font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(26,26,26,0.5); margin-bottom: 8px;">
                    Klik for at begynde
                  </div>
                  <a href="${data.joinUrl}" style="font-size: 15px; color: #2D5F4A; text-decoration: none; word-break: break-all;">${data.joinUrl}</a>
                </div>

                <div style="margin-top: 40px; padding-top: 32px; border-top: 1px solid rgba(26,26,26,0.1);">
                  <a href="${data.joinUrl}"
                     style="display: inline-block; background-color: #1A1A1A; color: #F9F7F2; padding: 16px 28px; text-decoration: none; font-size: 12px; letter-spacing: 0.25em; text-transform: uppercase; font-weight: 500;">
                    Tag testen &rarr;
                  </a>
                </div>

                <div style="margin-top: 32px; font-size: 12px; color: rgba(26,26,26,0.5); line-height: 1.6;">
                  Spørgsmål? Skriv til hej@alius.dk
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding-top: 48px; border-top: 1px solid rgba(26,26,26,0.1); font-size: 11px; color: rgba(26,26,26,0.4); line-height: 1.6; letter-spacing: 0.03em;">
                Sendt automatisk fra alius.dk/personlighedsprofil
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function inviteEmailText(data: InviteEmailData): string {
  return `${data.inviterName} har inviteret dig til at tage en personlighedsprofil som en del af ${data.company}.

Det tager 4 minutter og du ser dit resultat med det samme.

Klik her for at begynde:
${data.joinUrl}

Spørgsmål? Skriv til hej@alius.dk

Alius Personlighedsprofil`;
}

// ============================================================

type FullProfileEmailData = {
  displayName?: string | null;
  primaryName: string;
  primaryDescription: string;
  secondaryName: string;
  weakestName: string;
  weakestShort: string;
  strengths: [string, string][];
  blindspots: [string, string][];
  pct: { A: number; B: number; C: number; D: number }; // 0–100
  profileUrl: string;
};

const QUAD_COLORS: Record<string, string> = {
  A: "#2D5F4A",
  B: "#8B7355",
  C: "#C8956D",
  D: "#5B7C9D",
};

const QUAD_NAMES: Record<string, string> = {
  A: "Analytiker",
  B: "Bygmester",
  C: "Forbinder",
  D: "Visionær",
};

export function fullProfileEmailHtml(data: FullProfileEmailData): string {
  const greeting = data.displayName ? `Hej ${escapeHtml(data.displayName)}.` : "Hej.";

  const strengthItems = data.strengths
    .map(
      ([title, desc], i) => `
        <tr>
          <td style="padding: 14px 0; border-bottom: 1px solid rgba(26,26,26,0.08);">
            <div style="display: flex; gap: 16px; align-items: flex-start;">
              <div style="font-family: Georgia, serif; font-weight: 300; font-size: 22px; color: #2D5F4A; min-width: 28px; line-height: 1;">${String(i + 1).padStart(2, "0")}</div>
              <div>
                <div style="font-size: 14px; color: #1A1A1A; margin-bottom: 4px; font-weight: 400;">${escapeHtml(title)}</div>
                <div style="font-size: 13px; color: rgba(26,26,26,0.55); line-height: 1.5;">${escapeHtml(desc)}</div>
              </div>
            </div>
          </td>
        </tr>`
    )
    .join("");

  const blindspotItems = data.blindspots
    .map(
      ([title, desc], i) => `
        <tr>
          <td style="padding: 14px 0; border-bottom: 1px solid rgba(26,26,26,0.08);">
            <div style="display: flex; gap: 16px; align-items: flex-start;">
              <div style="font-family: Georgia, serif; font-weight: 300; font-size: 22px; color: #4A4A4A; min-width: 28px; line-height: 1;">${String(i + 1).padStart(2, "0")}</div>
              <div>
                <div style="font-size: 14px; color: #1A1A1A; margin-bottom: 4px; font-weight: 400;">${escapeHtml(title)}</div>
                <div style="font-size: 13px; color: rgba(26,26,26,0.55); line-height: 1.5;">${escapeHtml(desc)}</div>
              </div>
            </div>
          </td>
        </tr>`
    )
    .join("");

  const scoreRows = (["A", "B", "C", "D"] as const)
    .map(
      (q) => `
        <tr>
          <td style="padding: 8px 0;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="font-size: 12px; color: rgba(26,26,26,0.5); width: 72px; letter-spacing: 0.02em;">${QUAD_NAMES[q]}</div>
              <table cellpadding="0" cellspacing="0" border="0" style="flex: 1; width: 100%;">
                <tr>
                  <td style="width: ${data.pct[q]}%; height: 3px; background-color: ${QUAD_COLORS[q]}; min-width: 2px;"></td>
                  <td style="height: 3px; background-color: rgba(26,26,26,0.08);"></td>
                </tr>
              </table>
              <div style="font-size: 13px; color: #1A1A1A; font-family: Georgia, serif; width: 32px; text-align: right;">${data.pct[q]}%</div>
            </div>
          </td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="da">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Din personlighedsprofil · ${escapeHtml(data.primaryName)}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #F9F7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1A1A1A;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F9F7F2; padding: 48px 24px;">
      <tr>
        <td align="center">
          <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #FFFFFF; padding: 48px;">

            <tr>
              <td style="padding-bottom: 32px; border-bottom: 1px solid rgba(26,26,26,0.1);">
                <div style="font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; color: #1A1A1A; font-weight: 500;">
                  ALIUS &middot; PERSONLIGHEDSPROFIL
                </div>
              </td>
            </tr>

            <!-- Hero -->
            <tr>
              <td style="padding-top: 48px; padding-bottom: 40px; border-bottom: 1px solid rgba(26,26,26,0.1);">
                <div style="font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: #2D5F4A; font-weight: 500; margin-bottom: 16px;">
                  Din profil
                </div>
                <h1 style="font-family: Georgia, serif; font-weight: 300; font-style: italic; font-size: 64px; line-height: 0.95; margin: 0 0 20px 0; color: #1A1A1A; letter-spacing: -0.02em;">
                  ${escapeHtml(data.primaryName)}
                </h1>
                <p style="font-size: 15px; color: rgba(26,26,26,0.55); margin: 0 0 8px 0;">
                  med <em>${escapeHtml(data.secondaryName.toLowerCase())}</em> som medløber, og <em>${escapeHtml(data.weakestName.toLowerCase())}</em> som blindt felt
                </p>
                <p style="font-size: 16px; line-height: 1.65; color: #4A4A4A; margin: 24px 0 0 0;">
                  ${greeting}<br><br>${escapeHtml(data.primaryDescription)}
                </p>
              </td>
            </tr>

            <!-- Score fordeling -->
            <tr>
              <td style="padding-top: 36px; padding-bottom: 36px; border-bottom: 1px solid rgba(26,26,26,0.1);">
                <div style="font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: rgba(26,26,26,0.4); margin-bottom: 20px;">
                  Score fordeling
                </div>
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  ${scoreRows}
                </table>
              </td>
            </tr>

            <!-- Styrker -->
            <tr>
              <td style="padding-top: 36px; padding-bottom: 36px; border-bottom: 1px solid rgba(26,26,26,0.1);">
                <div style="font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: rgba(26,26,26,0.4); margin-bottom: 8px;">
                  Styrker
                </div>
                <h2 style="font-family: Georgia, serif; font-weight: 300; font-size: 26px; line-height: 1.2; margin: 0 0 24px 0; color: #1A1A1A;">
                  Hvad du gør bedst.
                </h2>
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top: 1px solid rgba(26,26,26,0.08);">
                  ${strengthItems}
                </table>
              </td>
            </tr>

            <!-- Blinde felter -->
            <tr>
              <td style="padding-top: 36px; padding-bottom: 36px; border-bottom: 1px solid rgba(26,26,26,0.1);">
                <div style="font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: rgba(26,26,26,0.4); margin-bottom: 8px;">
                  Blinde felter
                </div>
                <h2 style="font-family: Georgia, serif; font-weight: 300; font-size: 26px; line-height: 1.2; margin: 0 0 24px 0; color: #1A1A1A;">
                  Hvor du sandsynligvis overser noget.
                </h2>
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top: 1px solid rgba(26,26,26,0.08);">
                  ${blindspotItems}
                </table>
              </td>
            </tr>

            <!-- Skygge -->
            <tr>
              <td style="padding-top: 36px; padding-bottom: 36px; border-bottom: 1px solid rgba(26,26,26,0.1);">
                <div style="font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: rgba(26,26,26,0.4); margin-bottom: 8px;">
                  Skygge
                </div>
                <h2 style="font-family: Georgia, serif; font-weight: 300; font-size: 26px; line-height: 1.2; margin: 0 0 16px 0; color: #1A1A1A;">
                  Din modsatte kant.
                </h2>
                <p style="font-size: 15px; line-height: 1.65; color: #4A4A4A; margin: 0 0 12px 0;">
                  <strong style="color: #1A1A1A; font-weight: normal;">${escapeHtml(data.weakestName)}</strong> er den kvadrant du henter mindst fra: ${escapeHtml(data.weakestShort)}. Det stærkeste du kan gøre er ikke at blive ${escapeHtml(data.weakestName.toLowerCase())}. Det er at omgive dig med nogen der er det, og lytte når de taler.
                </p>
              </td>
            </tr>

            <!-- CTA -->
            <tr>
              <td style="padding-top: 40px;">
                <p style="font-size: 15px; color: rgba(26,26,26,0.55); margin: 0 0 28px 0;">
                  Se din fulde profil online. Du kan vende tilbage til den til enhver tid.
                </p>
                <a href="${data.profileUrl}"
                   style="display: inline-block; background-color: #1A1A1A; color: #F9F7F2; padding: 16px 28px; text-decoration: none; font-size: 12px; letter-spacing: 0.25em; text-transform: uppercase; font-weight: 500;">
                  Se din profil &rarr;
                </a>
                <div style="margin-top: 28px; font-size: 12px; color: rgba(26,26,26,0.5); line-height: 1.6;">
                  Gem denne mail. Linket er dit adgangspunkt til profilen.<br>
                  Spørgsmål? Skriv til hej@alius.dk
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding-top: 48px; border-top: 1px solid rgba(26,26,26,0.1); font-size: 11px; color: rgba(26,26,26,0.4); line-height: 1.6; letter-spacing: 0.03em;">
                Sendt automatisk fra alius.dk/personlighedsprofil
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function fullProfileEmailText(data: FullProfileEmailData): string {
  const greeting = data.displayName ? `Hej ${data.displayName},` : "Hej,";
  const strengths = data.strengths
    .map(([t, d], i) => `${String(i + 1).padStart(2, "0")}. ${t}: ${d}`)
    .join("\n");
  const blindspots = data.blindspots
    .map(([t, d], i) => `${String(i + 1).padStart(2, "0")}. ${t}: ${d}`)
    .join("\n");
  const scores = (["A", "B", "C", "D"] as const)
    .map((q) => `${QUAD_NAMES[q]}: ${data.pct[q]}%`)
    .join("  ·  ");

  return `${greeting}

Din personlighedsprofil er klar.

${data.primaryName.toUpperCase()}
med ${data.secondaryName.toLowerCase()} som medløber, og ${data.weakestName.toLowerCase()} som blindt felt.

${data.primaryDescription}

SCORE
${scores}

STYRKER
${strengths}

BLINDE FELTER
${blindspots}

SKYGGE
${data.weakestName} er din modsatte kant. ${data.weakestShort}.

Se din fulde profil:
${data.profileUrl}

Gem dette link. Det er dit adgangspunkt til profilen.
Spørgsmål? Skriv til hej@alius.dk

Alius Personlighedsprofil`;
}

// ============================================================

type TeamCompletedEmailData = {
  ownerName: string | null;
  company: string;
  totalCount: number;
  reportUrl: string;
};

export function teamCompletedEmailHtml(data: TeamCompletedEmailData): string {
  const greeting = data.ownerName ? `Hej ${escapeHtml(data.ownerName)}.` : "Hej.";

  return `<!DOCTYPE html>
<html lang="da">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Holdrapporten er klar</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #F9F7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1A1A1A;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F9F7F2; padding: 48px 24px;">
      <tr>
        <td align="center">
          <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #FFFFFF; padding: 48px;">

            <tr>
              <td style="padding-bottom: 32px; border-bottom: 1px solid rgba(26,26,26,0.1);">
                <div style="font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; color: #1A1A1A; font-weight: 500;">
                  ALIUS &middot; PERSONLIGHEDSPROFIL
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding-top: 40px;">
                <div style="font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: #2D5F4A; font-weight: 500; margin-bottom: 16px;">
                  Holdrapporten er klar
                </div>
                <h1 style="font-family: Georgia, serif; font-weight: 300; font-style: italic; font-size: 40px; line-height: 1.1; margin: 0 0 24px 0; color: #1A1A1A; letter-spacing: -0.01em;">
                  ${greeting}
                </h1>
                <p style="font-size: 16px; line-height: 1.65; color: #4A4A4A; margin: 0 0 16px 0;">
                  Alle <strong style="color: #1A1A1A; font-weight: normal;">${data.totalCount} deltagere</strong> fra
                  <strong style="color: #1A1A1A; font-weight: normal;">${escapeHtml(data.company)}</strong> har
                  nu udfyldt profilen. Holdrapporten er klar til at blive åbnet i fællesskab.
                </p>
                <p style="font-size: 14px; color: rgba(26,26,26,0.5); margin: 0 0 32px 0;">
                  Åbn rapporten med holdet. Den er bygget til at blive afsløret sektion for sektion.
                </p>

                <div style="margin: 32px 0; padding: 24px; background-color: #F9F7F2; border-left: 3px solid #2D5F4A;">
                  <div style="font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(26,26,26,0.5); margin-bottom: 8px;">
                    Holdrapport
                  </div>
                  <a href="${data.reportUrl}" style="font-size: 15px; color: #2D5F4A; text-decoration: none; word-break: break-all;">${data.reportUrl}</a>
                </div>

                <div style="margin-top: 40px; padding-top: 32px; border-top: 1px solid rgba(26,26,26,0.1);">
                  <a href="${data.reportUrl}"
                     style="display: inline-block; background-color: #1A1A1A; color: #F9F7F2; padding: 16px 28px; text-decoration: none; font-size: 12px; letter-spacing: 0.25em; text-transform: uppercase; font-weight: 500;">
                    Åbn holdrapporten &rarr;
                  </a>
                </div>

                <div style="margin-top: 32px; font-size: 12px; color: rgba(26,26,26,0.5); line-height: 1.6;">
                  Spørgsmål? Skriv til hej@alius.dk
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding-top: 48px; border-top: 1px solid rgba(26,26,26,0.1); font-size: 11px; color: rgba(26,26,26,0.4); line-height: 1.6; letter-spacing: 0.03em;">
                Sendt automatisk fra alius.dk/personlighedsprofil
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function teamCompletedEmailText(data: TeamCompletedEmailData): string {
  const greeting = data.ownerName ? `Hej ${data.ownerName},` : "Hej,";
  return `${greeting}

Alle ${data.totalCount} deltagere fra ${data.company} har nu udfyldt profilen.
Holdrapporten er klar til at blive åbnet i fællesskab.

Åbn holdrapporten her:
${data.reportUrl}

Spørgsmål? Skriv til hej@alius.dk

Alius Personlighedsprofil`;
}

// ============================================================
// GEVINSTBEREGNER

type BeregnerResultEmailData = {
  employees: number;
  hoursPerWeek: number;
  monthlySalary: number;
  annualCost: number; // afrundet til nærmeste 1.000
  totalHours: number;
  fte: number;
  bookUrl: string;
  calcUrl: string;
};

function dkk(n: number): string {
  return Math.round(n).toLocaleString("da-DK");
}

export function beregnerResultEmailHtml(data: BeregnerResultEmailData): string {
  const fteRow =
    data.fte > 0.5
      ? row("Svarer til", `${data.fte.toFixed(1).replace(".", ",")} fuldtidsstillinger`)
      : "";

  return `<!DOCTYPE html>
<html lang="da">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jeres beregning</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #F9F7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1A1A1A;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F9F7F2; padding: 48px 24px;">
      <tr>
        <td align="center">
          <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #FFFFFF; padding: 48px;">

            <tr>
              <td style="padding-bottom: 32px; border-bottom: 1px solid rgba(26,26,26,0.1);">
                <div style="font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; color: #1A1A1A; font-weight: 500;">
                  ALIUS &middot; GEVINSTBEREGNER
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding-top: 40px; padding-bottom: 36px; border-bottom: 1px solid rgba(26,26,26,0.1);">
                <div style="font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: #2D5F4A; font-weight: 500; margin-bottom: 16px;">
                  Jeres beregning
                </div>
                <h1 style="font-family: Georgia, serif; font-weight: 300; font-style: italic; font-size: 48px; line-height: 1.0; margin: 0 0 12px 0; color: #1A1A1A; letter-spacing: -0.02em;">
                  ${dkk(data.annualCost)} kr om året
                </h1>
                <p style="font-size: 16px; line-height: 1.6; color: #4A4A4A; margin: 0;">
                  bruger I på arbejde, en maskine gør bedre.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding-top: 36px; padding-bottom: 8px;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  ${row("Medarbejdere med manuelt arbejde", String(data.employees))}
                  ${row("Timer om ugen pr. medarbejder", String(data.hoursPerWeek))}
                  ${row("Gennemsnitlig månedsløn", `${dkk(data.monthlySalary)} kr`)}
                  ${row("Timer om året i alt", dkk(data.totalHours))}
                  ${fteRow}
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding-top: 36px; padding-bottom: 8px;">
                <p style="font-size: 16px; line-height: 1.65; color: #4A4A4A; margin: 0 0 28px 0;">
                  Vil I vide, hvilke tre arbejdsgange tallet gemmer sig i? Det er præcis det, vores kortlægning finder.
                </p>
                <a href="${data.bookUrl}"
                   style="display: inline-block; background-color: #2D5F4A; color: #F9F7F2; padding: 16px 28px; text-decoration: none; font-size: 12px; letter-spacing: 0.25em; text-transform: uppercase; font-weight: 500;">
                  Book 20 minutter &rarr;
                </a>
                <div style="margin-top: 20px;">
                  <a href="${data.calcUrl}" style="font-size: 13px; color: #2D5F4A; text-decoration: none;">
                    Juster tallene igen &rarr;
                  </a>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding-top: 40px; margin-top: 8px; font-size: 12px; color: rgba(26,26,26,0.45); line-height: 1.6;">
                Beregningen bruger 46 arbejdsuger, 1.628 årlige timer og 8 pct. arbejdsgiveromkostninger. Konservativt sat.
              </td>
            </tr>

            <tr>
              <td style="padding-top: 40px; border-top: 1px solid rgba(26,26,26,0.1); font-size: 11px; color: rgba(26,26,26,0.4); line-height: 1.6; letter-spacing: 0.03em;">
                Sendt automatisk fra alius.dk/beregner &middot; Spørgsmål? Skriv til hej@alius.dk
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function beregnerResultEmailText(data: BeregnerResultEmailData): string {
  const fteLine =
    data.fte > 0.5 ? `Svarer til: ${data.fte.toFixed(1).replace(".", ",")} fuldtidsstillinger\n` : "";
  return `Jeres beregning fra Alius

${dkk(data.annualCost)} KR OM ÅRET
bruger I på arbejde, en maskine gør bedre.

Medarbejdere med manuelt arbejde: ${data.employees}
Timer om ugen pr. medarbejder: ${data.hoursPerWeek}
Gennemsnitlig månedsløn: ${dkk(data.monthlySalary)} kr
Timer om året i alt: ${dkk(data.totalHours)}
${fteLine}
Vil I vide, hvilke tre arbejdsgange tallet gemmer sig i? Det er præcis det, vores kortlægning finder.

Book 20 minutter: ${data.bookUrl}
Juster tallene igen: ${data.calcUrl}

Beregningen bruger 46 arbejdsuger, 1.628 årlige timer og 8 pct. arbejdsgiveromkostninger. Konservativt sat.
Spørgsmål? Skriv til hej@alius.dk`;
}

// ============================================================

type BeregnerLeadEmailData = {
  email: string;
  employees: number;
  hoursPerWeek: number;
  monthlySalary: number;
  annualCost: number;
  totalHours: number;
  fte: number;
};

export function beregnerLeadEmailHtml(data: BeregnerLeadEmailData): string {
  return `<!DOCTYPE html>
<html lang="da">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ny beregner-lead</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #F9F7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1A1A1A;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F9F7F2; padding: 48px 24px;">
      <tr>
        <td align="center">
          <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #FFFFFF; padding: 48px;">

            <tr>
              <td style="padding-bottom: 32px; border-bottom: 1px solid rgba(26,26,26,0.1);">
                <div style="font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; color: #1A1A1A; font-weight: 500;">
                  ALIUS &middot; GEVINSTBEREGNER
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding-top: 40px;">
                <div style="font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: #2D5F4A; font-weight: 500; margin-bottom: 16px;">
                  Ny beregner-lead
                </div>
                <h1 style="font-family: Georgia, serif; font-weight: 300; font-style: italic; font-size: 36px; line-height: 1.1; margin: 0 0 32px 0; color: #1A1A1A; letter-spacing: -0.01em;">
                  ${dkk(data.annualCost)} kr om året
                </h1>

                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  ${row("Email", `<a href="mailto:${escapeHtml(data.email)}" style="color: #2D5F4A; text-decoration: none;">${escapeHtml(data.email)}</a>`)}
                  ${row("Medarbejdere med manuelt arbejde", String(data.employees))}
                  ${row("Timer om ugen pr. medarbejder", String(data.hoursPerWeek))}
                  ${row("Gennemsnitlig månedsløn", `${dkk(data.monthlySalary)} kr`)}
                  ${row("Timer om året i alt", dkk(data.totalHours))}
                  ${row("Fuldtidsstillinger", data.fte.toFixed(1).replace(".", ","))}
                </table>

                <div style="margin-top: 40px; padding-top: 32px; border-top: 1px solid rgba(26,26,26,0.1);">
                  <a href="mailto:${escapeHtml(data.email)}?subject=Jeres beregning fra Alius"
                     style="display: inline-block; background-color: #1A1A1A; color: #F9F7F2; padding: 16px 28px; text-decoration: none; font-size: 12px; letter-spacing: 0.25em; text-transform: uppercase; font-weight: 500;">
                    Svar til ${escapeHtml(data.email)} &rarr;
                  </a>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding-top: 48px; border-top: 1px solid rgba(26,26,26,0.1); font-size: 11px; color: rgba(26,26,26,0.4); line-height: 1.6; letter-spacing: 0.03em;">
                Sendt automatisk fra alius.dk/beregner
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function beregnerLeadEmailText(data: BeregnerLeadEmailData): string {
  return `Ny beregner-lead fra alius.dk/beregner

Årlig omkostning: ${dkk(data.annualCost)} kr

Email: ${data.email}
Medarbejdere med manuelt arbejde: ${data.employees}
Timer om ugen pr. medarbejder: ${data.hoursPerWeek}
Gennemsnitlig månedsløn: ${dkk(data.monthlySalary)} kr
Timer om året i alt: ${dkk(data.totalHours)}
Fuldtidsstillinger: ${data.fte.toFixed(1).replace(".", ",")}

Svar til leadet: ${data.email}`;
}

// ============================================================
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
