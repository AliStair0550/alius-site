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
                    Deltager-link, send til holdet
                  </div>
                  <a href="${data.joinUrl}" style="font-size: 15px; color: #2D5F4A; text-decoration: none; word-break: break-all;">${data.joinUrl}</a>
                </div>

                <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid rgba(26,26,26,0.1);">
                  <p style="font-size: 14px; line-height: 1.6; color: rgba(26,26,26,0.6); margin: 0 0 12px 0;">
                    Som administrator kan du følge med i hvem der har udfyldt profilen:
                  </p>
                  <a href="${data.adminUrl}" style="font-size: 14px; color: #2D5F4A; text-decoration: none;">${data.adminUrl}</a>
                </div>

                <div style="margin-top: 40px; padding-top: 32px; border-top: 1px solid rgba(26,26,26,0.1);">
                  <a href="${data.joinUrl}"
                     style="display: inline-block; background-color: #1A1A1A; color: #F9F7F2; padding: 16px 28px; text-decoration: none; font-size: 12px; letter-spacing: 0.25em; text-transform: uppercase; font-weight: 500;">
                    Åbn deltager-link &rarr;
                  </a>
                </div>

                <div style="margin-top: 32px; font-size: 12px; color: rgba(26,26,26,0.5); line-height: 1.6;">
                  Gem dette link. Det er dit adgangspunkt til holdrapporten.<br>
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

Jeres hold-link til ${data.company} er klar.

Send dette link til alle deltagere:
${data.joinUrl}

Dit admin-link (hold til dig selv):
${data.adminUrl}

Gem disse links, de er jeres adgang til holdrapporten.
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
