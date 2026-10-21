import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import type { PrismaClient } from "@prisma/client";
import { kaldMedLoft } from "./claude";
import { BudgetStop } from "./budget";
import { MODEL_HURTIG } from "./priser";

const CFG = { maanedUsd: 80, doegnUsd: 4, nulstillingsdag: 1 };

function falsk(svarTekst: string, stop = "end_turn", brugt = 0) {
  const ledger: unknown[] = [];
  const prisma = {
    apiLedger: {
      aggregate: async () => ({ _sum: { costUsd: brugt } }),
      create: async (a: { data: unknown }) => {
        ledger.push(a.data);
        return a.data;
      },
    },
  } as unknown as PrismaClient;
  let kaldt = 0;
  const klient = {
    messages: {
      create: async () => {
        kaldt++;
        return {
          model: MODEL_HURTIG,
          stop_reason: stop,
          stop_details: null,
          content: [{ type: "text", text: svarTekst }],
          usage: { input_tokens: 1000, output_tokens: 6000, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
        };
      },
    },
  } as unknown as Anthropic;
  return { prisma, klient, ledger, kaldt: () => kaldt };
}

const opt = {
  trin: "test",
  model: MODEL_HURTIG,
  system: [{ type: "text" as const, text: "system" }],
  bruger: "bruger",
  skema: z.object({ a: z.number() }),
  maxTokens: 6000,
  effort: "low" as const,
};

describe("kaldMedLoft", () => {
  test("første kørsel 21/10: afskåret JSON registreres i ledgeren, før kaldet fejler", async () => {
    const f = falsk('{"a": 1, "b": "uafslutt', "max_tokens");
    await assert.rejects(
      kaldMedLoft({ prisma: f.prisma, klient: f.klient, agentId: "finn", briefId: "b1", cfg: CFG }, opt),
      /max_tokens/
    );
    assert.equal(f.ledger.length, 1, "prisen skal i ledgeren, selvom svaret ikke kan bruges");
  });

  test("ugyldig JSON uden max_tokens: også registreret, og fejlen siger hvorfor", async () => {
    const f = falsk("ikke json");
    await assert.rejects(
      kaldMedLoft({ prisma: f.prisma, klient: f.klient, agentId: "finn", briefId: "b1", cfg: CFG }, opt),
      /ikke gyldig JSON/
    );
    assert.equal(f.ledger.length, 1);
  });

  test("et gyldigt svar læses og registreres", async () => {
    const f = falsk('{"a": 7}');
    const r = await kaldMedLoft({ prisma: f.prisma, klient: f.klient, agentId: "finn", briefId: "b1", cfg: CFG }, opt);
    assert.deepEqual(r.data, { a: 7 });
    assert.equal(f.ledger.length, 1);
    assert.ok(r.prisUsd > 0);
  });

  test("over loftet sendes kaldet slet ikke", async () => {
    const f = falsk('{"a": 7}', "end_turn", 3.9999);
    await assert.rejects(
      kaldMedLoft({ prisma: f.prisma, klient: f.klient, agentId: "finn", briefId: "b1", cfg: CFG }, opt),
      (e) => e instanceof BudgetStop
    );
    assert.equal(f.kaldt(), 0, "intet kald må gå ud, når loftet ville blive sprængt");
    assert.equal(f.ledger.length, 0);
  });
});
