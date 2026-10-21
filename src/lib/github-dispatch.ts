// ============================================================
// Vercel udløser Actions-workflowet
//
// HVORFOR
//
// GitHubs egen scheduler er ikke pålidelig. Den 29. juli 2026 udeblev
// den første planlagte kørsel af sync-series: cron-udtrykket var
// gyldigt, workflowet aktivt, Actions ubegrænset og GitHub meldt
// operational. Kørslen kom bare ikke. GitHub oplyser selv at planlagte
// kørsler kan forsinkes eller falde helt bort under belastning.
//
// Vercels cron kørte til gengæld på klokkeslættet, dokumenteret i
// DataSource.lastFetchedAt. To uafhængige udløsere på samme kørsel er
// derfor bedre end én: falder den ene, dækker den anden.
//
// ARBEJDET BLIVER I ACTIONS
//
// Vercel udløser kun. Selve hentningen sker stadig i Actions, hvor
// tidszonen er UTC og miljøet kendt. Skriveværnet kræver
// GITHUB_ACTIONS=true og er urørt: en Vercel-funktion kan ikke skrive i
// produktionsdata, uanset at den beder om at få det gjort.
//
// DOBBELTKØRSEL
//
// Tre lag, fordi de fanger hver sin situation:
//
//   1. Her: vi spørger GitHub om der allerede kører eller lige har
//      kørt en, og lader være hvis der gør.
//   2. Workflowets concurrency-gruppe: to der starter i samme sekund
//      køer op i stedet for at køre oven i hinanden.
//   3. Kørslen selv er idempotent. writeObservations skriver kun
//      ændringer, så en dublet koster minutter, ikke data.
// ============================================================

/** Hvor længe efter en kørsel vi regner arbejdet for gjort. */
// Var 6 indtil 21. oktober 2026. Da kørslen blev flyttet til kl. 02 UTC,
// kom GitHubs scheduler typisk 4 til 7 timer bagefter, og med 6 timer
// ville den ofte hente alt en gang til.
export const DAEKNINGSVINDUE_TIMER = 10;

/**
 * `conclusion` er GitHubs afslutning: "success", "failure", "cancelled"
 * osv. Den er null mens kørslen er i gang.
 */
export type Koersel = { status: string; conclusion?: string | null; startedAt: Date };

export type Beslutning =
  | { udloes: true }
  | { udloes: false; grund: string };

/**
 * Skal vi udløse en kørsel.
 *
 * Ren funktion, så reglen kan prøves uden at røre GitHub.
 *
 * En kørsel der er i gang, eller som lige er LYKKEDES, dækker allerede
 * dagens arbejde. En kørsel der fejlede eller blev afbrudt dækker ikke:
 * "jeg fejlede" er ikke "der er ikke mere at gøre". Den 15. oktober 2026
 * fejlede AUS08 i Vercels kørsel, og GitHubs kørsel tre timer senere
 * sprang over, fordi den regnede arbejdet for gjort. Ledigheden ventede
 * et døgn. En afsluttet kørsel uden kendt afslutning dækker heller ikke:
 * en dublet er billigere end en udebleven hentning. Vinduet er seks timer: jobbet er dagligt, så to
 * kørsler inden for seks timer er altid en dublet, og en udeblevet
 * kørsel opdages stadig samme dag.
 */
export function skalUdloese(koersler: Koersel[], nu: Date): Beslutning {
  const igang = koersler.find(
    (k) => k.status === "in_progress" || k.status === "queued" || k.status === "waiting"
  );
  if (igang) {
    return { udloes: false, grund: `en kørsel er allerede ${igang.status}` };
  }

  const graense = nu.getTime() - DAEKNINGSVINDUE_TIMER * 3600_000;
  const nylig = koersler.find(
    (k) => k.startedAt.getTime() >= graense && k.status === "completed" && k.conclusion === "success"
  );
  if (nylig) {
    const minutter = Math.round((nu.getTime() - nylig.startedAt.getTime()) / 60_000);
    return { udloes: false, grund: `en kørsel lykkedes for ${minutter} minutter siden` };
  }

  return { udloes: true };
}

const EJER = "AliStair0550";
const REPO = "alius-site";
const WORKFLOW = "sync-series.yml";

type Udfald =
  | { slags: "udloest" }
  | { slags: "sprunget_over"; grund: string }
  | { slags: "ingen_token" }
  | { slags: "fejl"; besked: string };

async function gh(sti: string, token: string, init?: RequestInit): Promise<Response> {
  return fetch(`https://api.github.com${sti}`, {
    ...init,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      ...(init?.body ? { "content-type": "application/json" } : {}),
    },
    signal: AbortSignal.timeout(20_000),
  });
}

/**
 * Beder Actions om at køre sync-series, hvis der er brug for det.
 *
 * Hvert udfald er sin egen tilstand. "Ingen token" må ikke ligne
 * "sprunget over", og ingen af dem må ligne "udløst": så ville en
 * manglende hemmelighed se ud som et job der kørte.
 */
export async function udloesSyncSeries(nu: Date = new Date()): Promise<Udfald> {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token) return { slags: "ingen_token" };

  try {
    const liste = await gh(
      `/repos/${EJER}/${REPO}/actions/workflows/${WORKFLOW}/runs?per_page=10`,
      token
    );
    if (!liste.ok) {
      return { slags: "fejl", besked: `kunne ikke hente kørsler: HTTP ${liste.status}` };
    }
    const data = (await liste.json()) as {
      workflow_runs?: Array<{
        status: string;
        conclusion: string | null;
        run_started_at: string;
        created_at: string;
      }>;
    };
    const koersler: Koersel[] = (data.workflow_runs ?? []).map((r) => ({
      status: r.status,
      conclusion: r.conclusion,
      startedAt: new Date(r.run_started_at ?? r.created_at),
    }));

    const dom = skalUdloese(koersler, nu);
    if (!dom.udloes) return { slags: "sprunget_over", grund: dom.grund };

    const svar = await gh(
      `/repos/${EJER}/${REPO}/actions/workflows/${WORKFLOW}/dispatches`,
      token,
      {
        method: "POST",
        body: JSON.stringify({ ref: "main", inputs: { udloeser: "vercel" } }),
      }
    );
    if (svar.status !== 204) {
      const krop = await svar.text().catch(() => "");
      return {
        slags: "fejl",
        besked: `dispatch svarede HTTP ${svar.status} ${krop.slice(0, 120)}`,
      };
    }
    return { slags: "udloest" };
  } catch (e) {
    return { slags: "fejl", besked: (e as Error).message };
  }
}

/** Udfaldet i én linje til cron-loggen. */
export function beskrivUdfald(u: Udfald): string {
  switch (u.slags) {
    case "udloest":
      return "Actions-kørslen er udløst fra Vercel";
    case "sprunget_over":
      return `Ikke udløst: ${u.grund}`;
    case "ingen_token":
      return (
        "IKKE UDLØST: GITHUB_DISPATCH_TOKEN er ikke sat. Kørslen afhænger " +
        "indtil videre alene af GitHubs egen scheduler, som er upålidelig."
      );
    case "fejl":
      return `IKKE UDLØST: ${u.besked}`;
  }
}
