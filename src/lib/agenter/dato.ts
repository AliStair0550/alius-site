import type { BriefVisning, KoerselStatus } from "./laes";

const MAANEDER = ["januar", "februar", "marts", "april", "maj", "juni", "juli", "august", "september", "oktober", "november", "december"];

/** "2026-10-21" til "21. oktober 2026". Datoen er allerede en dansk dag. */
export function langDato(iso: string): string {
  const [aar, md, dag] = iso.split("-").map(Number);
  return `${dag}. ${MAANEDER[md - 1]} ${aar}`;
}

/** Timen i København lige nu. */
export function danskTimeNu(): number {
  return Number(new Intl.DateTimeFormat("da-DK", { timeZone: "Europe/Copenhagen", hour: "2-digit", hourCycle: "h23" }).format(new Date()));
}

/**
 * En linje om dagens kørsel, når den viste brief ikke er dagens.
 * Hver tilstand siges for sig: stoppet af budget er ikke det samme som
 * fejlet, og "ikke kl. 6 endnu" er ikke det samme som "udeblevet".
 */
export function dagensStatus(idag: string, time: number, vist: BriefVisning | null, seneste: KoerselStatus | null): string | null {
  if (vist && vist.dato === idag) return null;
  const fra = vist ? ` Her er briefen fra ${langDato(vist.dato)}.` : "";
  if (seneste && seneste.dato === idag) {
    if (seneste.status === "BUDGET_STOPPED") return `Dagens brief blev stoppet af budgetloftet.${fra}`;
    if (seneste.status === "FAILED") return `Dagens brief blev ikke færdig.${fra}`;
    if (seneste.status === "RUNNING") return `Finn arbejder på dagens brief.${fra}`;
  }
  if (time < 7) return `Dagens brief kommer kl. 6.${fra}`;
  return `Dagens brief er ikke kommet.${fra}`;
}

/**
 * Driftsalarmen for Finn: er dagens brief ikke færdig, når stale-tjekket
 * kører kl. 07 UTC (8 eller 9 dansk tid), siges det hvorfor. null betyder
 * at der er en færdig brief for dagen. Siden viser det samme for den der
 * kigger; alarmen er for den der ikke gør.
 */
export function finnAlarm(
  idag: string,
  doneIdag: boolean,
  seneste: { dato: string; status: string; besked: string | null } | null
): string | null {
  if (doneIdag) return null;
  if (!seneste || seneste.dato !== idag) {
    return `Finn har ingen kørsel for ${idag}. Hverken Vercels cron eller GitHubs scheduler startede agent-finn.yml, eller kørslen nåede ikke at oprette sin brief.`;
  }
  const b = seneste.besked ? ` Besked: ${seneste.besked}` : "";
  if (seneste.status === "BUDGET_STOPPED") return `Dagens brief blev stoppet af budgetloftet.${b}`;
  if (seneste.status === "FAILED") return `Dagens brief fejlede.${b}`;
  if (seneste.status === "RUNNING") return `Dagens brief står stadig som i gang. Kørslen er sandsynligvis død undervejs uden at nå at afslutte.${b}`;
  return `Dagens brief har status ${seneste.status} og er ikke færdig.${b}`;
}
