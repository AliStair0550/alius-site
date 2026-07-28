// ============================================================
// Værn mod at en udviklermaskine skriver i produktionsdata
//
// Samme idé som scripts/db-guard.ts, bredere anvendt. db-guard dækker
// destruktive Prisma-kommandoer. Dette dækker alle scripts der skriver
// rækker, uanset hvor uskyldige de ser ud.
//
// HVORFOR
//
// Den 28. juli 2026 stod hvert eneste døgngennemsnit i elserierne
// forkert. `toUtcMidnight` tolkede EDS' tidsstempler som lokal tid,
// fordi strengen ikke har noget Z, og backfill blev kørt fra en maskine
// i CEST. De to første timer af hvert UTC-døgn røg over i døgnet før,
// og gennemsnittet blev fem til femten procent forkert. 613 kroner og
// 565 kroner ligner begge en elpris.
//
// Fejlen krævede tre ting samtidig: en tvetydig tidsstempelstreng, en
// maskine der ikke var i UTC, og adgang til at skrive i produktion fra
// den maskine. Den første er rettet. Den anden kan ikke rettes, for
// folk bor hvor de bor. Den tredje kan fjernes, og så findes
// fejlklassen ikke længere.
//
// REGLEN
//
// Skrivning til produktionsdata sker i GitHub Actions. Ikke fordi
// Actions er klogere, men fordi det er ét miljø med kendte
// indstillinger i stedet for et per maskine.
//
// Læsning er fri. Man skal kunne undersøge produktion fra sin egen
// maskine uden ceremoni; det er skrivningen der er farlig.
// ============================================================

/**
 * Værter der regnes som produktion.
 *
 * Delstreng, så både pooled og direkte Neon-endpoints fanges.
 * Holdes i takt med PRODUCTION_HOSTS i db-guard.ts. To lister er én
 * for mange, men db-guard kører som selvstændig proces før Prisma CLI
 * og kan ikke importere herfra uden at trække Prisma med ind.
 */
export const PRODUKTIONSVAERTER = [
  "ep-rough-forest-alz77jsq", // Neon, alius-site produktion
];

export function erProduktion(databaseUrl: string | undefined): boolean {
  if (!databaseUrl) return false;
  let host: string;
  try {
    host = new URL(databaseUrl).host;
  } catch {
    // En streng vi ikke kan læse er ikke "ikke produktion". Vi ved det
    // ikke, og det skal behandles som det farligste af de to.
    return true;
  }
  return PRODUKTIONSVAERTER.some((h) => host.includes(h));
}

/**
 * Kører vi et sted hvor indstillingerne er kendte?
 *
 * GITHUB_ACTIONS sættes af GitHub selv og kan ikke sættes af en
 * workflow-fil, så den kan ikke efterlignes ved et uheld lokalt.
 */
export function erBetroetMiljoe(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.GITHUB_ACTIONS === "true";
}

/**
 * Tidszonen processen faktisk regner i.
 *
 * Ikke process.env.TZ, som ofte er tom og så betyder "spørg systemet".
 * Det er den løste zone der bestemmer hvad `new Date("...")` gør ved en
 * streng uden tidszone, og det var netop dét der gik galt.
 */
export function loestTidszone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "ukendt";
}

export function erUtc(zone: string = loestTidszone()): boolean {
  return zone === "UTC" || zone === "Etc/UTC" || zone === "Etc/GMT";
}

export type Afvisning = { ok: false; grund: string; besked: string };
export type Godkendelse = { ok: true; vaert: string; tidszone: string };

/**
 * Afgør om der må skrives. Ren funktion, så den kan prøves.
 *
 * Rækkefølgen er med vilje: produktion afgøres først, fordi alt andet
 * er tilladt uden for produktion. En udviklerdatabase må gerne skrives
 * til fra en maskine i CEST.
 */
export function vurderSkriveret(
  env: NodeJS.ProcessEnv,
  tidszone: string,
  opgave: string
): Afvisning | Godkendelse {
  const url = env.DATABASE_URL;

  if (!url) {
    return {
      ok: false,
      grund: "ingen_url",
      besked:
        `${opgave}: DATABASE_URL er ikke sat.\n\n` +
        `  Produktionsstrengen ligger i .env.local, ikke .env. Skal du LÆSE\n` +
        `  fra produktion:\n` +
        `      set -a && . ./.env.local && set +a && <kommando>\n`,
    };
  }

  let vaert = "ulæselig";
  try {
    vaert = new URL(url).host;
  } catch {
    /* erProduktion() behandler den som produktion */
  }

  if (!erProduktion(url)) {
    return { ok: true, vaert, tidszone };
  }

  if (!erBetroetMiljoe(env)) {
    return {
      ok: false,
      grund: "lokal_maskine",
      besked:
        `STOP. "${opgave}" vil skrive i produktionsdata fra en lokal maskine.\n\n` +
        `      vært:      ${vaert}\n` +
        `      tidszone:  ${tidszone}\n\n` +
        `  Intet på en udviklermaskine skriver til produktionsdata. Lokale\n` +
        `  indstillinger som tidszone og sprog må ikke kunne nå tallene.\n\n` +
        `  Sådan køres det rigtigt:\n` +
        `      gh workflow run backfill.yml -f series="<serie-id ...>"\n` +
        `      gh workflow run sync-series.yml\n\n` +
        `  Eller fra Actions-fanen i GitHub. Begge kører i UTC.\n\n` +
        `  Skal du prøve noget af, så peg DATABASE_URL på en anden database.\n` +
        `  Læsning fra produktion er fri og rammes ikke af det her.\n\n` +
        `  Se CLAUDE.md, afsnittet om hvor skrivning sker.\n`,
    };
  }

  if (!erUtc(tidszone)) {
    return {
      ok: false,
      grund: "ikke_utc",
      besked:
        `STOP. "${opgave}" kører i tidszonen ${tidszone}, ikke UTC.\n\n` +
        `  Et tidsstempel uden Z tolkes som lokal tid, og så bliver\n` +
        `  døgnaggregeringen forskudt. Det giver tal der ser rigtige ud.\n\n` +
        `  Fjern TZ fra workflowet, eller sæt TZ=UTC.\n`,
    };
  }

  return { ok: true, vaert, tidszone };
}

/**
 * Kaldes øverst i hvert script der skriver. Stopper processen hvis
 * skrivningen ikke må ske.
 */
export function kraevSkriveret(opgave: string): void {
  const dom = vurderSkriveret(process.env, loestTidszone(), opgave);
  if (!dom.ok) {
    console.error(`\n  ${dom.besked}`);
    process.exit(1);
  }
  console.log(
    `  skriveværn: ${opgave} mod ${dom.vaert} (${dom.tidszone}) - godkendt.`
  );
}
