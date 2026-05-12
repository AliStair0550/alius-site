// ============================================================
// Pulse-specific email templates
// ============================================================

import { sendEmail, EMAIL_TO } from "./email";

type PulseUpdateData = {
  sourceName: string;
  sourceSlug: string;
  newDataPeriod: string;
  rowsInserted: number;
  rowsUpdated: number;
  signalsGenerated: number;
  newSignals: Array<{ headline: string; severity: string }>;
};

type PulseErrorData = {
  sourceName: string;
  sourceSlug: string;
  step: string;
  errorMessage: string;
  timestamp: Date;
};

/**
 * Send notification when pipeline successfully detects and processes new data.
 */
export async function sendPulseUpdateEmail(data: PulseUpdateData) {
  const importantSignals = data.newSignals
    .filter((s) => s.severity === "important")
    .slice(0, 5);

  return sendEmail({
    to: EMAIL_TO,
    subject: `Pulse opdateret: ${data.sourceName} – ${data.newDataPeriod}`,
    html: `<!DOCTYPE html>
<html lang="da">
<head><meta charset="UTF-8"><title>Pulse opdateret</title></head>
<body style="margin: 0; padding: 0; background-color: #F9F7F2; font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #1A1A1A;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F9F7F2; padding: 48px 24px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #FFFFFF; padding: 48px;">
          <tr>
            <td style="padding-bottom: 32px; border-bottom: 1px solid rgba(26,26,26,0.1);">
              <div style="font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; font-weight: 500;">
                ALIUS &middot; PULSE
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 40px;">
              <div style="font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: #2D5F4A; font-weight: 500; margin-bottom: 16px;">
                Ny data
              </div>
              <h1 style="font-family: Georgia, serif; font-weight: 300; font-style: italic; font-size: 32px; line-height: 1.1; margin: 0 0 24px 0; letter-spacing: -0.01em;">
                ${escapeHtml(data.sourceName)}
              </h1>
              <p style="font-size: 16px; line-height: 1.6; color: #2A2A2A; margin: 0 0 32px 0;">
                Pulse har detekteret og behandlet ny data for <strong>${escapeHtml(data.newDataPeriod)}</strong>.
              </p>

              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 32px; border-collapse: collapse;">
                ${statRow("Nye datapunkter", String(data.rowsInserted))}
                ${statRow("Opdaterede", String(data.rowsUpdated))}
                ${statRow("Signaler genereret", String(data.signalsGenerated))}
              </table>

              ${importantSignals.length > 0 ? `
                <div style="margin-top: 32px; padding-top: 32px; border-top: 1px solid rgba(26,26,26,0.1);">
                  <div style="font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: #2D5F4A; font-weight: 500; margin-bottom: 16px;">
                    Vigtige signaler
                  </div>
                  <ul style="margin: 0; padding: 0; list-style: none;">
                    ${importantSignals
                      .map(
                        (s) => `<li style="padding: 8px 0; font-size: 15px; color: #1A1A1A;">&middot; ${escapeHtml(s.headline)}</li>`
                      )
                      .join("")}
                  </ul>
                </div>
              ` : ""}

              <div style="margin-top: 40px;">
                <a href="${getAppUrl()}/pulse/ledighed"
                   style="display: inline-block; background-color: #1A1A1A; color: #F9F7F2; padding: 16px 28px; text-decoration: none; font-size: 12px; letter-spacing: 0.25em; text-transform: uppercase; font-weight: 500;">
                  Se siden &rarr;
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 48px; margin-top: 48px; border-top: 1px solid rgba(26,26,26,0.1); font-size: 11px; color: rgba(26,26,26,0.4); line-height: 1.6;">
              Sendt automatisk fra Alius Pulse cron-jobbet.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    text: `ALIUS PULSE: ${data.sourceName}

Ny data for ${data.newDataPeriod}.

Nye datapunkter: ${data.rowsInserted}
Opdaterede: ${data.rowsUpdated}
Signaler genereret: ${data.signalsGenerated}

${importantSignals.length > 0 ? "Vigtige signaler:\n" + importantSignals.map((s) => "- " + s.headline).join("\n") : ""}

Se siden: ${getAppUrl()}/pulse/ledighed`,
  });
}

/**
 * Send alert when pipeline encounters an error.
 */
export async function sendPulseErrorEmail(data: PulseErrorData) {
  return sendEmail({
    to: EMAIL_TO,
    subject: `[FEJL] Pulse ${data.sourceSlug}: ${data.step}`,
    html: `<!DOCTYPE html>
<html lang="da">
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; background-color: #F9F7F2; font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #1A1A1A;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F9F7F2; padding: 48px 24px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #FFFFFF; padding: 48px; border-left: 4px solid #B45309;">
          <tr>
            <td>
              <div style="font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: #B45309; font-weight: 500; margin-bottom: 16px;">
                Pulse-fejl
              </div>
              <h1 style="font-family: Georgia, serif; font-weight: 300; font-style: italic; font-size: 28px; line-height: 1.1; margin: 0 0 16px 0;">
                ${escapeHtml(data.sourceName)}
              </h1>
              <p style="font-size: 15px; color: #2A2A2A; margin: 0 0 24px 0;">
                Cron-jobbet fejlede ved trinnet <strong>${escapeHtml(data.step)}</strong>.
              </p>
              <div style="background-color: #F9F7F2; padding: 16px; font-family: monospace; font-size: 13px; color: #1A1A1A; margin-bottom: 24px; white-space: pre-wrap;">${escapeHtml(data.errorMessage)}</div>
              <p style="font-size: 13px; color: rgba(26,26,26,0.6); margin: 0;">
                Tid: ${data.timestamp.toLocaleString("da-DK")}
              </p>
              <p style="font-size: 13px; color: rgba(26,26,26,0.6); margin: 16px 0 0 0;">
                Tjek <a href="${getAppUrl()}/api/admin/pulse" style="color: #2D5F4A;">/api/admin/pulse</a> for detaljer fra FetchLog.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    text: `[FEJL] Pulse ${data.sourceSlug}: ${data.step}

${data.sourceName}

Cron-jobbet fejlede ved trinnet "${data.step}".

Fejlbesked:
${data.errorMessage}

Tid: ${data.timestamp.toLocaleString("da-DK")}

Tjek /api/admin/pulse for detaljer.`,
  });
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://alius.dk";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function statRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid rgba(26,26,26,0.08); width: 60%;">
        <div style="font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(26,26,26,0.6);">
          ${label}
        </div>
      </td>
      <td style="padding: 12px 0; border-bottom: 1px solid rgba(26,26,26,0.08); text-align: right;">
        <div style="font-family: Georgia, serif; font-size: 22px; font-weight: 300;">
          ${value}
        </div>
      </td>
    </tr>
  `;
}
