// ============================================================
// Må agenten hente denne adresse
//
// Agenterne er AI-agenter bygget på Claude. Når et medie i sin
// robots.txt udelukker Anthropics agenter (anthropic-ai, ClaudeBot,
// Claude-User ...), gælder det også os, selvom vi præsenterer os med
// vores egen brugeragent. At slippe igennem under et andet navn ville
// være at gå uden om det mediet har bedt om.
//
// Reglen er derfor: en adresse må hentes, kun hvis HVER gruppe der
// gælder for os, tillader den. Grupperne er dem der nævner en af vores
// identiteter, og stjernegruppen.
//
// Inden for en gruppe vinder den længste matchende regel, og Allow
// vinder over Disallow ved lige længde, som i RFC 9309.
// ============================================================

/** Navne i robots.txt der omfatter os. Små bogstaver. */
export const VORES_IDENTITETER = [
  "aliusagenter",
  "anthropic-ai",
  "claudebot",
  "claude-user",
  "claude-web",
  "claude-searchbot",
];

type Regel = { tillad: boolean; sti: string };
type Gruppe = { agenter: string[]; regler: Regel[] };

export function laesRobots(tekst: string): Gruppe[] {
  const grupper: Gruppe[] = [];
  let aktuel: Gruppe | null = null;
  let senesteVarAgent = false;

  for (const raa of tekst.split(/\r?\n/)) {
    const linje = raa.replace(/#.*$/, "").trim();
    if (!linje) continue;
    const i = linje.indexOf(":");
    if (i < 0) continue;
    const felt = linje.slice(0, i).trim().toLowerCase();
    const vaerdi = linje.slice(i + 1).trim();

    if (felt === "user-agent") {
      // Flere User-agent-linjer i træk deler én gruppe.
      if (!aktuel || !senesteVarAgent) {
        aktuel = { agenter: [], regler: [] };
        grupper.push(aktuel);
      }
      aktuel.agenter.push(vaerdi.toLowerCase());
      senesteVarAgent = true;
    } else if ((felt === "allow" || felt === "disallow") && aktuel) {
      senesteVarAgent = false;
      // En tom Disallow betyder "alt er tilladt" og bidrager ikke.
      if (felt === "disallow" && vaerdi === "") continue;
      aktuel.regler.push({ tillad: felt === "allow", sti: vaerdi });
    } else {
      senesteVarAgent = false;
    }
  }
  return grupper;
}

function matcher(regel: string, sti: string): number {
  // * matcher hvad som helst, $ forankrer slutningen.
  const forankret = regel.endsWith("$");
  const kerne = forankret ? regel.slice(0, -1) : regel;
  const re = new RegExp(
    "^" + kerne.split("*").map((d) => d.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + (forankret ? "$" : "")
  );
  return re.test(sti) ? kerne.length : -1;
}

function gruppeTillader(g: Gruppe, sti: string): boolean {
  let bedst: Regel | null = null;
  let laengde = -1;
  for (const r of g.regler) {
    const l = matcher(r.sti, sti);
    if (l > laengde || (l === laengde && l >= 0 && r.tillad)) {
      bedst = r;
      laengde = l;
    }
  }
  return bedst ? bedst.tillad : true;
}

export type RobotsDom = { tilladt: true } | { tilladt: false; grund: string };

export function maaHente(robotsTekst: string, sti: string): RobotsDom {
  const grupper = laesRobots(robotsTekst);
  const gaelder = grupper.filter((g) =>
    g.agenter.some((a) => a === "*" || VORES_IDENTITETER.some((id) => a === id || id.startsWith(a)))
  );
  for (const g of gaelder) {
    if (!gruppeTillader(g, sti)) {
      return { tilladt: false, grund: `robots.txt forbyder ${sti} for ${g.agenter.join(", ")}` };
    }
  }
  return { tilladt: true };
}
