// ============================================================
// Driftsalarm for Finn
//
// Kaldes fra det daglige stale-tjek (/api/cron/pulse-stale, kl. 07 UTC).
// Sender én mail når dagens brief ikke er færdig, og intet ellers, så en
// mail altid betyder at der er noget at se på. Samme modtager som
// Pulses alarmer.
// ============================================================

import type { PrismaClient } from "@prisma/client";
import { sendEmail } from "../email";
import { getAlertRecipient } from "../pulse-email";
import { danskDag } from "./finn/pipeline";
import { finnAlarm } from "./dato";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function tjekFinn(prisma: PrismaClient, nu: Date, opt: { dry: boolean }): Promise<{ alarm: string | null; mailet: boolean }> {
  const idag = danskDag(nu);
  const dato = new Date(`${idag}T00:00:00Z`);
  const [done, seneste] = await Promise.all([
    prisma.brief.count({ where: { agentId: "finn", date: dato, status: "DONE" } }),
    prisma.brief.findFirst({ where: { agentId: "finn" }, orderBy: { startedAt: "desc" }, select: { date: true, status: true, statusMessage: true } }),
  ]);
  const alarm = finnAlarm(idag, done > 0, seneste ? { dato: seneste.date.toISOString().slice(0, 10), status: seneste.status, besked: seneste.statusMessage } : null);
  if (!alarm || opt.dry) return { alarm, mailet: false };
  const r = await sendEmail({
    to: getAlertRecipient(),
    subject: `[FEJL] Finn Finans: dagens brief mangler (${idag})`,
    html: `<!DOCTYPE html><html lang="da"><head><meta charset="UTF-8"></head><body style="font-family:-apple-system,sans-serif;color:#1A1A1A;background:#FAF8F4;padding:32px">
<h1 style="font-weight:300;font-size:22px;margin:0 0 12px">Finns brief for ${idag} er ikke færdig</h1>
<p style="font-size:15px;line-height:1.6;margin:0 0 16px">${esc(alarm)}</p>
<p style="font-size:13px;color:#4A4A4A;margin:0">Se kørslerne: <a href="https://github.com/AliStair0550/alius-site/actions/workflows/agent-finn.yml">agent-finn.yml</a>. Start igen: <code>gh workflow run agent-finn.yml -f tving=true</code></p>
</body></html>`,
  });
  return { alarm, mailet: (r as { ok?: boolean })?.ok !== false };
}
