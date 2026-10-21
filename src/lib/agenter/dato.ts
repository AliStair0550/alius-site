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
