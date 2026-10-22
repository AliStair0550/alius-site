// ============================================================
// POST /api/agenter/kvalitet  { id: string }   Authorization: Bearer ADMIN_SECRET
//
// Sender det ugentlige kvalitetstjek som mail. Rapporten er skrevet af
// scripts/finn-kvalitet.ts i GitHub Actions; ruten læser den og sender,
// fordi mailnøglen ligger på Vercel. Den skriver intet.
// ============================================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getAlertRecipient } from "@/lib/pulse-email";
import { KRITERIER, type DagsVurdering, type Maalinger, type opsummer } from "@/lib/agenter/finn/kvalitet";

export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const NAVN: Record<string, string> = { pointe: "Pointe", sammenligning: "Sammenligning", relevans: "Relevans", klarhed: "Klarhed" };

export async function POST(req: Request) {
  const hemmelighed = process.env.ADMIN_SECRET;
  if (!hemmelighed || req.headers.get("authorization") !== `Bearer ${hemmelighed}`) {
    return NextResponse.json({ fejl: "Uautoriseret" }, { status: 401 });
  }
  let id = "";
  try {
    id = String(((await req.json()) as { id?: unknown }).id ?? "");
  } catch {
    // Behandles som manglende id nedenfor.
  }
  const r = id ? await prisma.qualityReport.findUnique({ where: { id } }) : null;
  if (!r) return NextResponse.json({ fejl: `Rapporten "${id}" findes ikke` }, { status: 404 });

  const m = r.maalinger as unknown as Maalinger & { udenAnalyse?: string[]; stoppetAfBudget?: string };
  const v = r.vurderinger as unknown as { dage: DagsVurdering[]; opsummering: ReturnType<typeof opsummer> };
  const o = v.opsummering;
  const fra = r.periodeFra.toISOString().slice(0, 10);
  const til = r.periodeTil.toISOString().slice(0, 10);

  const raekke = (k: string, val: string) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#4A4A4A">${esc(k)}</td><td style="padding:4px 0;color:#1A1A1A">${esc(val)}</td></tr>`;
  const svage = o.svage.slice(0, 12).map(
    (s) => `<li style="margin:0 0 14px">
      <div style="font-size:13px;color:#4A4A4A">${esc(s.dato)} &middot; ${esc(s.sted)} &middot; ${KRITERIER.map((k) => `${NAVN[k]} ${s[k]}`).join(", ")}</div>
      <div style="font-size:14px;color:#1A1A1A;margin:4px 0">${esc(s.problem ?? "Ingen begrundelse givet.")}</div>
      <div style="font-size:13px;color:#6B7B75;font-style:italic">${esc(s.tekst.slice(0, 280))}${s.tekst.length > 280 ? " ..." : ""}</div>
      <a href="https://alius.dk/agenter/finn/arkiv/${esc(s.dato)}" style="font-size:12px;color:#2D5F4A">Se dagen i arkivet</a>
    </li>`
  );

  const html = `<!DOCTYPE html><html lang="da"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:32px 20px;background:#FAF8F4;font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#1A1A1A">
<div style="max-width:640px;margin:0 auto">
<div style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#2D5F4A">Finn Finans &middot; kvalitetstjek</div>
<h1 style="font-weight:300;font-size:24px;margin:8px 0 4px">Ugen ${esc(fra)} til ${esc(til)}</h1>
<p style="font-size:13px;color:#4A4A4A;margin:0 0 24px">Målingerne er regnet i kode. Vurderingerne er Sonnets læsning af hvert afsnit mod dagens data: en vurdering, ikke en facitliste. Brug dem til at finde det der skal læses.</p>

<h2 style="font-weight:400;font-size:15px;margin:0 0 8px">Målinger</h2>
<table style="font-size:14px;border-collapse:collapse;margin-bottom:24px">
${raekke("Analyser", `${m.dage}${m.udenAnalyse?.length ? ` (dage uden analyse: ${m.udenAnalyse.join(", ")})` : ""}`)}
${raekke("Dagens områder", m.omraader.map((x) => `${x.dato.slice(5)} ${x.omraade ?? "ingen"}`).join(", "))}
${raekke("Samme område to dage i træk", String(m.gentagelser))}
${raekke("Dage uden holdbar dagens analyse", String(m.udenDagens))}
${raekke("Afsnit fjernet af selvtjekket", `${m.afsnitFjernet} af ${m.afsnitSkrevet + m.afsnitFjernet}`)}
${raekke("Medietemaer uden kommentar", `${m.medietemaerUdenKommentar} af ${m.medietemaer}`)}
${raekke("Områder med analyse per dag", `${m.omraaderMedAnalyse} af 7`)}
${raekke("Pris for analyserne", `$${m.prisUsd.toFixed(2)}`)}
${raekke("Pris for dette tjek", `$${Number(r.costUsd).toFixed(2)}`)}
${m.stoppetAfBudget ? raekke("Stoppet af budgetloftet", m.stoppetAfBudget) : ""}
</table>

<h2 style="font-weight:400;font-size:15px;margin:0 0 8px">Vurdering, ${o.antal} afsnit (1 til 5)</h2>
<table style="font-size:14px;border-collapse:collapse;margin-bottom:8px">
${KRITERIER.map((k) => raekke(NAVN[k], o.snit[k] === null ? "ikke vurderet" : String(o.snit[k]).replace(".", ","))).join("")}
</table>
${o.ubesvaret ? `<p style="font-size:13px;color:#4A4A4A">${o.ubesvaret} afsnit blev ikke besvaret af vurderingen.</p>` : ""}

<h2 style="font-weight:400;font-size:15px;margin:24px 0 8px">Svage afsnit (${o.svage.length})</h2>
${o.svage.length ? `<ul style="list-style:none;padding:0;margin:0">${svage.join("")}</ul>` : `<p style="font-size:14px;color:#4A4A4A">Intet afsnit fik 2 eller lavere på et kriterium.</p>`}

<h2 style="font-weight:400;font-size:15px;margin:24px 0 8px">Dag for dag</h2>
${v.dage.map((d) => `<p style="font-size:14px;margin:0 0 10px"><strong style="font-weight:500">${esc(d.dato)}</strong> ${esc(d.samlet)}</p>`).join("")}
</div></body></html>`;

  const res = await sendEmail({
    to: getAlertRecipient(),
    subject: `Finn Finans, kvalitetstjek ${fra} til ${til}: ${o.svage.length} svage afsnit`,
    html,
  });
  const ok = (res as { ok?: boolean })?.ok !== false;
  if (!ok) return NextResponse.json({ fejl: "Mailen kunne ikke sendes", grund: (res as { reason?: string }).reason ?? null }, { status: 503 });
  return NextResponse.json({ sendt: true, til: getAlertRecipient() });
}
