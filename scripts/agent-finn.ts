// ============================================================
// Finn Finans: dagens kørsel
//
// KØRES I GITHUB ACTIONS (.github/workflows/agent-finn.yml).
// Skriveværnet nægter at køre mod produktion andre steder fra.
//
//   npx tsx scripts/agent-finn.ts            kør, hvis dagens brief mangler
//   npx tsx scripts/agent-finn.ts --tving    kør, selvom den findes
//
// Udløses af Vercels cron kl. 06 dansk tid og af GitHubs egen
// scheduler som reserve. Findes dagens brief allerede færdig, springes
// over, så de to udløsere ikke betaler for den samme brief to gange.
// ============================================================

import { prisma } from "../src/lib/db";
import { withDbRetry } from "../src/lib/db";
import { laesBudgetConfig } from "../src/lib/agenter/budget";
import { nyKlient } from "../src/lib/agenter/claude";
import { AGENT_ID, danskDag, koerFinn } from "../src/lib/agenter/finn/pipeline";
import { kraevSkriveret } from "./write-guard";

const TVING = process.argv.includes("--tving");

async function main() {
  kraevSkriveret("agent-finn.ts");
  // Læses før noget andet. Et loft der ikke kan læses, stopper kørslen.
  const cfg = laesBudgetConfig();
  const klient = nyKlient();
  await withDbRetry(() => prisma.$queryRaw`SELECT 1`, { attempts: 6 });

  const dag = danskDag(new Date());
  console.log(`Finn Finans, ${dag}. Lofter: $${cfg.doegnUsd} i døgnet, $${cfg.maanedUsd} i budgetmåneden fra den ${cfg.nulstillingsdag}.`);

  if (!TVING) {
    const findes = await prisma.brief.findFirst({
      where: { agentId: AGENT_ID, date: new Date(`${dag}T00:00:00Z`), status: "DONE" },
      select: { id: true },
    });
    if (findes) {
      console.log(`SPRINGER OVER: dagens brief findes allerede (${findes.id}).`);
      return;
    }
  }

  const r = await koerFinn({ prisma, klient, cfg });
  const brief = await prisma.brief.findUniqueOrThrow({
    where: { id: r.briefId },
    select: { costUsd: true, sourcesRead: true, kept: true },
  });
  console.log(
    `${r.status}: brief ${r.briefId}. Læst ${brief.sourcesRead}, beholdt ${brief.kept}, ` +
      `pris $${Number(brief.costUsd ?? 0).toFixed(4)}.${r.besked ? ` ${r.besked}` : ""}`
  );

  // Siderne genskabes med det samme. Uden hemmeligheden sker det alligevel
  // inden for sidernes levetid, men det siges.
  const hemmelighed = process.env.ADMIN_SECRET;
  if (!hemmelighed) {
    console.log("ADMIN_SECRET er ikke sat. Siderne genskabes ikke nu, men inden for en time.");
  } else {
    const svar = await fetch(`${process.env.SITE_URL ?? "https://alius.dk"}/api/revalidate/agenter`, {
      method: "POST",
      headers: { authorization: `Bearer ${hemmelighed}` },
      signal: AbortSignal.timeout(20_000),
    }).catch((e) => ({ status: `fejl: ${(e as Error).message}` }));
    console.log(`Genskabelse af /agenter: ${svar.status}`);
  }

  // En brief der ikke blev færdig, er en fejlet kørsel. Budgetstop er
  // det ikke: loftet virkede som det skulle.
  if (r.status === "FAILED") process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error("Fatal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
