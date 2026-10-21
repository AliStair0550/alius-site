// ============================================================
// Budgetloftet for Alius Agenter
//
// UFRAVIGELIGT. Driften må aldrig koste mere end den månedlige kredit
// fra Claude Max-abonnementet ($100). Loftet håndhæves her, i koden,
// før hvert eneste kald. Spend limit i Anthropic Console er andet lag.
//
// SÅDAN VIRKER DET
//
// Hvert kald til Anthropic gemmes i api_ledger med sin faktiske pris.
// Før næste kald lægges forbruget for døgnet og for budgetmåneden
// sammen med det værst tænkelige kald (se priser.ts). Ville summen
// overskride et af lofterne, sendes kaldet ikke, og kørslen stopper
// med status BUDGET_STOPPED.
//
// Der kører aldrig to kørsler samtidig: workflowet har en
// concurrency-gruppe. Ellers kunne to kørsler begge se et budget der
// kun rakte til den ene.
//
// PERIODERNE
//
// Døgnet regnes i UTC. Budgetmåneden begynder på
// AGENTS_BUDGET_RESET_DAY, så den kan følge faktureringsdatoen for
// abonnementet, hvor kreditten fornyes.
// ============================================================

export type BudgetConfig = {
  maanedUsd: number;
  doegnUsd: number;
  /** 1-28. Dagen i måneden hvor budgetmåneden begynder. */
  nulstillingsdag: number;
};

const STANDARD = { maanedUsd: 80, doegnUsd: 4, nulstillingsdag: 1 };

/**
 * Læser lofterne fra miljøet. En værdi der er sat, men ikke kan læses,
 * kaster. At falde tilbage til standarden ville være at lade en default
 * stå som resultat af noget der ikke virkede.
 */
export function laesBudgetConfig(env: Record<string, string | undefined> = process.env): BudgetConfig {
  const tal = (navn: string, standard: number, min: number, max: number): number => {
    const raa = env[navn];
    if (raa === undefined || raa.trim() === "") return standard;
    const v = Number(raa);
    if (!Number.isFinite(v) || v < min || v > max) {
      throw new Error(`${navn}="${raa}" er ikke et tal mellem ${min} og ${max}. Kørslen stopper.`);
    }
    return v;
  };
  const cfg = {
    maanedUsd: tal("AGENTS_BUDGET_MONTHLY_USD", STANDARD.maanedUsd, 0, 100),
    doegnUsd: tal("AGENTS_BUDGET_DAILY_USD", STANDARD.doegnUsd, 0, 100),
    nulstillingsdag: tal("AGENTS_BUDGET_RESET_DAY", STANDARD.nulstillingsdag, 1, 28),
  };
  if (!Number.isInteger(cfg.nulstillingsdag)) {
    throw new Error(`AGENTS_BUDGET_RESET_DAY skal være et helt tal, ikke ${cfg.nulstillingsdag}.`);
  }
  return cfg;
}

/** Midnat UTC samme døgn. */
export function doegnStart(nu: Date): Date {
  return new Date(Date.UTC(nu.getUTCFullYear(), nu.getUTCMonth(), nu.getUTCDate()));
}

/** Første dag i den budgetmåned nu ligger i. */
export function maanedStart(nu: Date, nulstillingsdag: number): Date {
  const aar = nu.getUTCFullYear();
  const md = nu.getUTCMonth();
  return nu.getUTCDate() >= nulstillingsdag
    ? new Date(Date.UTC(aar, md, nulstillingsdag))
    : new Date(Date.UTC(aar, md - 1, nulstillingsdag));
}

export type Afgoerelse = { ok: true } | { ok: false; grund: string };

/** Ren regel: må et kald til `estimeret` dollars sendes nu. */
export function maaKalde(
  forbrug: { doegn: number; maaned: number },
  estimeret: number,
  cfg: BudgetConfig
): Afgoerelse {
  const kr = (v: number) => `$${v.toFixed(4)}`;
  if (forbrug.doegn + estimeret > cfg.doegnUsd) {
    return {
      ok: false,
      grund:
        `Døgnloftet på ${kr(cfg.doegnUsd)} ville blive overskredet: ` +
        `brugt ${kr(forbrug.doegn)}, næste kald op til ${kr(estimeret)}.`,
    };
  }
  if (forbrug.maaned + estimeret > cfg.maanedUsd) {
    return {
      ok: false,
      grund:
        `Månedsloftet på ${kr(cfg.maanedUsd)} ville blive overskredet: ` +
        `brugt ${kr(forbrug.maaned)}, næste kald op til ${kr(estimeret)}.`,
    };
  }
  return { ok: true };
}

/** Kastes når et kald ikke må sendes. Pipelinen fanger den og stopper pænt. */
export class BudgetStop extends Error {
  constructor(public grund: string) {
    super(grund);
    this.name = "BudgetStop";
  }
}
