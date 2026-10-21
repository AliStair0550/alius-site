// ============================================================
// Vercel udløser agenternes kørsel i GitHub Actions
//
// Samme mønster som Pulse (src/lib/github-dispatch.ts): Vercel beder
// kun Actions om at køre. Arbejdet og skrivningen sker i Actions, bag
// skriveværnet.
//
// KLOKKEN 06 I KØBENHAVN
//
// Vercels cron kører i UTC og kender ikke sommertid. Ruten kaldes
// derfor både kl. 04 og 05 UTC, og her afgøres hvilket af de to kald
// der rammer 06 dansk tid. Det andet gør intet.
// ============================================================

const EJER = "AliStair0550";
const REPO = "alius-site";

/** Timen i København, uanset maskinens zone. */
export function danskTime(nu: Date): number {
  return Number(
    new Intl.DateTimeFormat("da-DK", { timeZone: "Europe/Copenhagen", hour: "2-digit", hourCycle: "h23" }).format(nu)
  );
}

export type Udfald =
  | { slags: "udloest" }
  | { slags: "ikke_nu"; grund: string }
  | { slags: "ingen_token" }
  | { slags: "fejl"; besked: string };

export async function udloesAgent(workflow: string, nu: Date = new Date(), tving = false): Promise<Udfald> {
  const time = danskTime(nu);
  if (!tving && time !== 6) return { slags: "ikke_nu", grund: `klokken er ${time} i København, ikke 6` };

  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token) return { slags: "ingen_token" };

  try {
    const svar = await fetch(`https://api.github.com/repos/${EJER}/${REPO}/actions/workflows/${workflow}/dispatches`, {
      method: "POST",
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "x-github-api-version": "2022-11-28",
        "content-type": "application/json",
      },
      body: JSON.stringify({ ref: "main", inputs: { udloeser: "vercel" } }),
      signal: AbortSignal.timeout(20_000),
    });
    if (svar.status !== 204) {
      return { slags: "fejl", besked: `dispatch svarede HTTP ${svar.status} ${(await svar.text().catch(() => "")).slice(0, 120)}` };
    }
    return { slags: "udloest" };
  } catch (e) {
    return { slags: "fejl", besked: (e as Error).message };
  }
}
