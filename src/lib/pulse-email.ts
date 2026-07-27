// ============================================================
// Pulse-specific email templates
// ============================================================

import { sendEmail, EMAIL_TO } from "./email";
import {
  ACTION_LABEL,
  KIND_LABEL,
  type StaleReport,
  type StaleAction,
} from "./pulse-stale";

/**
 * Modtager af driftsalarmer.
 *
 * Adskilt fra EMAIL_TO, som går til den almindelige postkasse. En
 * stale-alarm er drift, ikke korrespondance, og skal kunne dirigeres
 * til en anden adresse eller et alarmsystem uden at røre koden.
 *
 * Sæt PULSE_ALERT_EMAIL_TO i miljøet for at overstyre.
 */
export function getAlertRecipient(): string {
  return process.env.PULSE_ALERT_EMAIL_TO ?? "drift@alius.dk";
}

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
    subject: `Pulse opdateret: ${data.sourceName} - ${data.newDataPeriod}`,
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
    to: getAlertRecipient(),
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

/**
 * Én samlet mail om alle forældede eller fejlende datasæt.
 *
 * Datakatalogets afsnit 4: "Sender én samlet mail til superadmin.
 * Ikke én mail per serie." En mail per serie bliver til støj, og
 * støj bliver filtreret væk.
 */
export async function sendPulseStaleEmail(report: StaleReport) {
  const n = report.findings.length;
  if (n === 0) return { ok: true, reason: "Ingen fund, ingen mail" };

  const kindLabels = KIND_LABEL;

  // Grupperet efter hvad fundet kræver. Tre fund kan have tre helt
  // forskellige svar: en lukket tabel kræver en beslutning, en forkert
  // tærskel kræver et talskifte, og en fejlet kørsel kræver at nogen
  // kigger. Uden opdelingen behandles alt som samme hastesag.
  const ACTION_COLOR: Record<StaleAction, string> = {
    BESLUTNING: "#B45309",
    UNDERSOEG: "#B45309",
    JUSTER_TAERSKEL: "#6B7B75",
  };
  const ACTION_HINT: Record<StaleAction, string> = {
    BESLUTNING:
      "Der er ikke noget at reparere. Kilden findes ikke længere, og forsøg på at hente igen ændrer intet.",
    UNDERSOEG: "Noget er gået galt i pipelinen.",
    JUSTER_TAERSKEL:
      "Pipelinen er rask. Forventningen til hvornår kilden publicerer er sat for stramt.",
  };

  const order: StaleAction[] = ["BESLUTNING", "UNDERSOEG", "JUSTER_TAERSKEL"];
  const groups = order
    .map((a) => ({ action: a, items: report.findings.filter((f) => f.action === a) }))
    .filter((g) => g.items.length > 0);

  const rows = groups
    .map((g) => {
      const header = `
        <tr>
          <td style="padding: 28px 0 10px 0;">
            <div style="font-size: 11px; letter-spacing: 0.25em; text-transform: uppercase; color: ${ACTION_COLOR[g.action]}; font-weight: 500;">
              ${ACTION_LABEL[g.action]} &middot; ${g.items.length}
            </div>
            <div style="font-size: 12px; color: rgba(26,26,26,0.5); margin-top: 6px; line-height: 1.5;">
              ${ACTION_HINT[g.action]}
            </div>
          </td>
        </tr>`;
      const items = g.items
        .map((f) => {
          const overdue =
            f.daysOverdue !== null
              ? ` &middot; <span style="color: ${ACTION_COLOR[f.action]};">${f.daysOverdue} dage</span>`
              : "";
          return `
        <tr>
          <td style="padding: 14px 0; border-bottom: 1px solid rgba(26,26,26,0.08); vertical-align: top;">
            <div style="font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(26,26,26,0.5); margin-bottom: 6px;">
              ${kindLabels[f.kind]}${overdue}
            </div>
            <div style="font-size: 15px; color: #1A1A1A; margin-bottom: 4px;">
              ${escapeHtml(f.name)}
            </div>
            <div style="font-family: monospace; font-size: 12px; color: rgba(26,26,26,0.45); margin-bottom: 8px;">
              ${escapeHtml(f.slug)}
            </div>
            <div style="font-size: 13px; color: rgba(26,26,26,0.65); line-height: 1.55;">
              ${escapeHtml(f.headline)}. ${escapeHtml(f.detail)}
            </div>
          </td>
        </tr>`;
        })
        .join("");
      return header + items;
    })
    .join("");

  const notInService =
    report.notInService.length > 0
      ? `<p style="font-size: 12px; color: rgba(26,26,26,0.45); margin: 24px 0 0 0; line-height: 1.6;">
           Ikke i drift, ikke alarmeret: ${report.notInService.map(escapeHtml).join(", ")}.
         </p>`
      : "";

  return sendEmail({
    to: getAlertRecipient(),
    subject: (() => {
      const beslutning = report.findings.filter((f) => f.action === "BESLUTNING").length;
      const undersoeg = report.findings.filter((f) => f.action === "UNDERSOEG").length;
      const parts: string[] = [];
      if (beslutning > 0) parts.push(`${beslutning} kræver beslutning`);
      if (undersoeg > 0) parts.push(`${undersoeg} skal undersøges`);
      const rest = n - beslutning - undersoeg;
      if (rest > 0) parts.push(`${rest} tærskeljustering`);
      return `[PULSE] ${parts.join(", ")}`;
    })(),
    html: `<!DOCTYPE html>
<html lang="da">
<head><meta charset="UTF-8"><title>Pulse stale-alarm</title></head>
<body style="margin: 0; padding: 0; background-color: #F9F7F2; font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #1A1A1A;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F9F7F2; padding: 48px 24px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #FFFFFF; padding: 48px; border-left: 4px solid #B45309;">
          <tr>
            <td style="padding-bottom: 32px; border-bottom: 1px solid rgba(26,26,26,0.1);">
              <div style="font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; font-weight: 500;">
                ALIUS &middot; PULSE
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 40px;">
              <div style="font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: #B45309; font-weight: 500; margin-bottom: 16px;">
                Stale-alarm
              </div>
              <h1 style="font-family: Georgia, serif; font-weight: 300; font-style: italic; font-size: 32px; line-height: 1.1; margin: 0 0 24px 0; letter-spacing: -0.01em;">
                ${n} af ${report.sourcesChecked} datasæt er ikke opdateret
              </h1>
              <p style="font-size: 15px; line-height: 1.6; color: #2A2A2A; margin: 0 0 32px 0;">
                Kontrolleret ${report.checkedAt.toLocaleString("da-DK")}.
              </p>

              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top: 1px solid rgba(26,26,26,0.08); border-collapse: collapse;">
                ${rows}
              </table>

              ${notInService}

              <div style="margin-top: 40px;">
                <a href="${getAppUrl()}/api/admin/pulse/health"
                   style="display: inline-block; background-color: #1A1A1A; color: #F9F7F2; padding: 16px 28px; text-decoration: none; font-size: 12px; letter-spacing: 0.25em; text-transform: uppercase; font-weight: 500;">
                  Se health-endpoint &rarr;
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 48px; border-top: 1px solid rgba(26,26,26,0.1); font-size: 11px; color: rgba(26,26,26,0.4); line-height: 1.6;">
              Sendt automatisk fra det daglige stale-tjek. Én mail per kørsel, uanset antal fund.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    text: `ALIUS PULSE: stale-alarm

${n} af ${report.sourcesChecked} datasæt er ikke opdateret.
Kontrolleret ${report.checkedAt.toLocaleString("da-DK")}.

${groups
  .map(
    (g) =>
      `${ACTION_LABEL[g.action].toUpperCase()} (${g.items.length})\n${ACTION_HINT[g.action]}\n\n` +
      g.items
        .map(
          (f) =>
            `  - [${kindLabels[f.kind]}${f.daysOverdue !== null ? `, ${f.daysOverdue} dage` : ""}] ${f.name} (${f.slug})\n    ${f.headline}. ${f.detail}`
        )
        .join("\n\n")
  )
  .join("\n\n")}
${report.notInService.length > 0 ? `\nIkke i drift, ikke alarmeret: ${report.notInService.join(", ")}.` : ""}

Health-endpoint: ${getAppUrl()}/api/admin/pulse/health`,
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
