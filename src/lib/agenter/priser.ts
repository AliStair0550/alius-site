// ============================================================
// Priser for Anthropic-modellerne agenterne bruger
//
// ÉT STED. Ændrer Anthropic priserne, rettes de her og intet andet.
// Kilde: platform.claude.com/docs/en/about-claude/pricing, aflæst
// 21. oktober 2026.
//
// En ukendt model kaster. Alternativet var en pris på nul, og så ville
// budgetloftet aldrig blive ramt, uanset hvad kørslen kostede. Det er
// præcis den slags plausible forkerte værdi CLAUDE.md advarer mod:
// "$0,00" ligner et billigt kald.
// ============================================================

/** Den hurtige, billige model: relevans og rangering. */
export const MODEL_HURTIG = "claude-haiku-5-5";
/** Den model der skriver og tjekker briefen. */
export const MODEL_SKRIV = "claude-sonnet-5-5";

/** Dollars per million tokens. */
type Satser = { input: number; output: number };

type Prisplan = {
  satser: Satser;
  /**
   * Nogle modeller har et dyrere kort for lange prompts. Haiku 5.5
   * koster fem gange mere når prompten er over 100.000 tokens.
   */
  langPrompt?: { overTokens: number; satser: Satser };
};

/** Cache-læsning koster 0,1x input, 5-minutters cache-skrivning 1,25x. */
const CACHE_LAES = 0.1;
const CACHE_SKRIV = 1.25;

export const PRISER: Record<string, Prisplan> = {
  [MODEL_HURTIG]: {
    satser: { input: 0.1, output: 0.5 },
    langPrompt: { overTokens: 100_000, satser: { input: 0.5, output: 2.5 } },
  },
  [MODEL_SKRIV]: {
    satser: { input: 2, output: 10 },
  },
};

export type Forbrug = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

function plan(model: string): Prisplan {
  const p = PRISER[model];
  if (!p) {
    throw new Error(
      `Ingen pris for modellen "${model}" i src/lib/agenter/priser.ts. ` +
        `Kaldet afvises hellere end at blive regnet som gratis.`
    );
  }
  return p;
}

function satserFor(p: Prisplan, promptTokens: number): Satser {
  return p.langPrompt && promptTokens > p.langPrompt.overTokens ? p.langPrompt.satser : p.satser;
}

/** Den faktiske pris for et kald, ud fra det API'et rapporterede. */
export function prisForKald(model: string, u: Forbrug): number {
  const p = plan(model);
  const laes = u.cache_read_input_tokens ?? 0;
  const skriv = u.cache_creation_input_tokens ?? 0;
  const prompt = u.input_tokens + laes + skriv;
  const s = satserFor(p, prompt);
  return (
    (u.input_tokens * s.input +
      laes * s.input * CACHE_LAES +
      skriv * s.input * CACHE_SKRIV +
      u.output_tokens * s.output) /
    1_000_000
  );
}

/**
 * Det mest et kald kan koste, før det sendes.
 *
 * Antager at intet rammer cachen og at hele cachen skrives (1,25x), og
 * at modellen bruger alle max_tokens. Det overvurderer altid, og det er
 * meningen: loftet skal holde, også når estimatet tager fejl.
 */
export function vaerstTaenkeligePris(model: string, promptTokens: number, maxTokens: number): number {
  const s = satserFor(plan(model), promptTokens);
  return (promptTokens * s.input * CACHE_SKRIV + maxTokens * s.output) / 1_000_000;
}

/**
 * Groft og bevidst højt estimat af en prompts tokens ud fra dens tekst.
 *
 * Dansk tekst ligger omkring 3 til 4 tegn per token, og de nyeste
 * modellers tokenizer tæller op til 30 procent flere. To tegn per token
 * er derfor et loft, ikke et gæt.
 */
export function anslaaTokens(tekst: string): number {
  return Math.ceil(tekst.length / 2);
}
