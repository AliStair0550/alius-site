// ============================================================
// Det eneste sted agenterne kalder Anthropic
//
// Hvert kald går igennem kaldMedLoft, og intet andet sted må oprette
// en Anthropic-klient. Så kan intet kald komme uden om budgetloftet.
//
// Rækkefølgen er fast:
//   1. Læs forbruget for døgnet og budgetmåneden fra api_ledger.
//   2. Regn det værst tænkelige kald ud. Ville det sprænge et loft,
//      sendes kaldet ikke (BudgetStop).
//   3. Send kaldet.
//   4. Skriv den faktiske pris i api_ledger, FØR svaret vurderes. Et
//      svar der ikke kan bruges, er betalt alligevel.
//   5. Afvis svaret, hvis modellen nægtede, løb tør for tokens eller
//      ikke fulgte skemaet. Hver af dem er sin egen fejl.
// ============================================================

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { PrismaClient } from "@prisma/client";
import type { z } from "zod";
import { BudgetStop, doegnStart, maaKalde, maanedStart, type BudgetConfig } from "./budget";
import { anslaaTokens, prisForKald, vaerstTaenkeligePris, MODEL_HURTIG, PRISER } from "./priser";

export type KaldKontekst = {
  prisma: PrismaClient;
  agentId: string;
  briefId: string;
  cfg: BudgetConfig;
  klient: Anthropic;
};

export type KaldResultat<T> = {
  data: T;
  prisUsd: number;
  estimeretUsd: number;
  usage: Anthropic.Usage;
};

export function nyKlient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY er ikke sat. Ingen kørsel uden nøgle.");
  }
  return new Anthropic();
}

async function forbrugSiden(prisma: PrismaClient, fra: Date): Promise<number> {
  const r = await prisma.apiLedger.aggregate({ _sum: { costUsd: true }, where: { ts: { gte: fra } } });
  return Number(r._sum.costUsd ?? 0);
}

/** Forbruget nu, til loftet og til statussiden. Gælder alle agenter samlet. */
export async function aktueltForbrug(prisma: PrismaClient, cfg: BudgetConfig, nu = new Date()) {
  const [doegn, maaned] = await Promise.all([
    forbrugSiden(prisma, doegnStart(nu)),
    forbrugSiden(prisma, maanedStart(nu, cfg.nulstillingsdag)),
  ]);
  return { doegn, maaned };
}

export async function kaldMedLoft<S extends z.ZodType>(
  k: KaldKontekst,
  opt: {
    trin: string;
    model: string;
    system: Anthropic.TextBlockParam[];
    bruger: string;
    skema: S;
    maxTokens: number;
    effort: "low" | "medium" | "high";
  }
): Promise<KaldResultat<z.infer<S>>> {
  // 1-2. Loftet, før noget sendes.
  const promptTokens = anslaaTokens(JSON.stringify(opt.system) + opt.bruger);
  const estimeret = vaerstTaenkeligePris(opt.model, promptTokens, opt.maxTokens);
  const forbrug = await aktueltForbrug(k.prisma, k.cfg);
  const dom = maaKalde(forbrug, estimeret, k.cfg);
  if (!dom.ok) throw new BudgetStop(`${opt.trin}: ${dom.grund}`);

  // 3. Kaldet. Haiku arbejder uden tænkning; den sorterer og vurderer,
  // og tænkning ville kun koste output-tokens. Sonnet tænker adaptivt.
  const svar = await k.klient.messages.parse({
    model: opt.model,
    max_tokens: opt.maxTokens,
    system: opt.system,
    messages: [{ role: "user", content: opt.bruger }],
    ...(opt.model === MODEL_HURTIG ? { thinking: { type: "disabled" as const } } : {}),
    output_config: { effort: opt.effort, format: zodOutputFormat(opt.skema) },
  });

  // 4. Prisen gemmes uanset hvad svaret indeholder. Den regnes ud fra
  // den model der FAKTISK svarede. Er den ukendt, skrives det værst
  // tænkelige beløb, og kørslen stopper: hellere overvurderet end gratis.
  const brugt = svar.model;
  const kendt = brugt in PRISER;
  const pris = kendt ? prisForKald(brugt, svar.usage) : estimeret;
  await k.prisma.apiLedger.create({
    data: {
      agentId: k.agentId,
      briefId: k.briefId,
      step: kendt ? opt.trin : `${opt.trin} (ukendt model, pris sat til loftet)`,
      model: brugt,
      inputTokens: svar.usage.input_tokens,
      outputTokens: svar.usage.output_tokens,
      cacheReadTokens: svar.usage.cache_read_input_tokens ?? 0,
      cacheWriteTokens: svar.usage.cache_creation_input_tokens ?? 0,
      costUsd: pris,
    },
  });

  if (!kendt) throw new Error(`${opt.trin}: svaret kom fra ${brugt}, som ikke har en pris i priser.ts.`);

  // 5. Hver måde at fejle på er sin egen.
  if (svar.stop_reason === "refusal") {
    throw new Error(`${opt.trin}: modellen afviste opgaven (${svar.stop_details?.category ?? "ingen kategori"}).`);
  }
  if (svar.stop_reason === "max_tokens") {
    throw new Error(`${opt.trin}: svaret blev afskåret ved max_tokens=${opt.maxTokens}.`);
  }
  if (svar.parsed_output === null || svar.parsed_output === undefined) {
    throw new Error(`${opt.trin}: svaret fulgte ikke skemaet.`);
  }

  return { data: svar.parsed_output as z.infer<S>, prisUsd: pris, estimeretUsd: estimeret, usage: svar.usage };
}
