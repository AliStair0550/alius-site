// ============================================================
// Skal denne kørsel gøre noget, eller er arbejdet lige gjort
//
// Run i workflowet:
//   npx tsx scripts/skal-koere.ts
//
// Skriver "skal=true" eller "skal=false" til GITHUB_OUTPUT og går
// altid ud med kode 0. En sprunget kørsel er ikke en fejl.
//
// HVORFOR DEN LIGGER HER OG IKKE KUN I VERCEL-RUTEN
//
// Værnet lå oprindeligt i /api/cron/pulse: ruten spurgte GitHub om der
// allerede kørte en, og lod være hvis der gjorde. Det stoppede Vercel
// fra at starte en dublet, men det kunne ikke stoppe GitHubs egen
// scheduler, som fyrer ubetinget.
//
// Resultatet var fire døgn i træk med to fulde kørsler: Vercel 06:43,
// GitHub halvanden til to en halv time senere. Ingen skade på data,
// fordi writeObservations kun skriver ændringer, men det var ikke det
// der var aftalt, og loggen fik to kørsler om dagen hvor der skulle
// være én.
//
// Værnet hører til hvor de to udløsere MØDES, altså i selve jobbet.
// Det er nu tre lag: ruten spørger før den udløser, jobbet spørger før
// det arbejder, og concurrency-gruppen fanger dem der starter i samme
// sekund.
//
// Vinduet importeres fra pulse-incremental-nabomodulet, så der kun er
// ét tal. To steder der definerer "for nylig" bliver før eller siden
// uenige.
// ============================================================

import { skalUdloese, DAEKNINGSVINDUE_TIMER, type Koersel } from "../src/lib/github-dispatch";
import { appendFileSync } from "node:fs";

const EJER = "AliStair0550";
const REPO = "alius-site";
const WORKFLOW = "sync-series.yml";

function svar(skal: boolean, grund: string): never {
  console.log(`${skal ? "KØRER" : "SPRINGER OVER"}: ${grund}`);
  const ud = process.env.GITHUB_OUTPUT;
  if (ud) appendFileSync(ud, `skal=${skal}\n`);
  process.exit(0);
}

async function main() {
  if (process.env.TVING === "true") {
    svar(true, "TVING er sat, værnet er sprunget over med vilje");
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    // Uden token kan vi ikke spørge. Så kører vi, for en dublet er
    // billigere end en udebleven hentning. Men det siges.
    svar(true, "GITHUB_TOKEN mangler, kunne ikke spørge om andre kørsler");
  }

  const migSelv = process.env.GITHUB_RUN_ID;
  const res = await fetch(
    `https://api.github.com/repos/${EJER}/${REPO}/actions/workflows/${WORKFLOW}/runs?per_page=20`,
    {
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "x-github-api-version": "2022-11-28",
      },
      signal: AbortSignal.timeout(20_000),
    }
  );

  if (!res.ok) {
    svar(true, `kunne ikke hente kørsler (HTTP ${res.status}), kører hellere end at springe over`);
  }

  const data = (await res.json()) as {
    workflow_runs?: Array<{ id: number; status: string; run_started_at: string; created_at: string }>;
  };

  // Denne kørsel står selv på listen og må ikke tælle med.
  const andre: Koersel[] = (data.workflow_runs ?? [])
    .filter((r) => String(r.id) !== migSelv)
    .map((r) => ({ status: r.status, startedAt: new Date(r.run_started_at ?? r.created_at) }));

  const dom = skalUdloese(andre, new Date());
  if (dom.udloes) {
    svar(true, `ingen anden kørsel inden for ${DAEKNINGSVINDUE_TIMER} timer`);
  }
  svar(false, dom.grund);
}

main().catch((e) => {
  // En fejl i værnet må ikke aflyse hentningen.
  svar(true, `værnet fejlede (${(e as Error).message}), kører hellere end at springe over`);
});
