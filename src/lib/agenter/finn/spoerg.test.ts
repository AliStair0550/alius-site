import { describe, test } from "node:test";
import assert from "node:assert/strict";
import Anthropic from "@anthropic-ai/sdk";
import type { PrismaClient } from "@prisma/client";
import { spoergFinn, MAKS_PR_BESOEGENDE, erKreditFejl } from "./spoerg";
import type { TalPost } from "../kilder/typer";

const CFG = { maanedUsd: 80, doegnUsd: 4, spoergsmaalDoegnUsd: 1, nulstillingsdag: 1 };

const inflation: TalPost = {
  type: "tal",
  id: "pulse:dst.pris.forbruger.aarsaendring",
  kilde: "pulse",
  navn: "Inflation, forbrugerpriser år/år",
  enhed: "procent",
  saeson: "ikke relevant",
  url: "https://www.statbank.dk/PRIS01",
  periode: "september 2026",
  vaerdi: 2.2,
  vaerdiTekst: "2,20",
  sammenligning: null,
  forloeb: [],
  tendens: null,
  foersteGangSet: "2026-10-12T08:00:00Z",
};

function falsk(opt: { brugt?: number; qaBrugt?: number; svar?: string; kast?: unknown } = {}) {
  const gemt: string[] = [];
  let kald = 0;
  const prisma = {
    agentQuestion: {
      count: async () => opt.brugt ?? 0,
      create: async (a: { data: { status: string } }) => {
        gemt.push(a.data.status);
        return a.data;
      },
    },
    brief: { findFirst: async () => ({ date: new Date("2026-10-21T00:00:00Z"), items: [{ title: "Inflation", body: "..." }] }) },
    sourceCache: { findMany: async () => [{ payload: { poster: [inflation] } }] },
    apiLedger: {
      aggregate: async () => ({ _sum: { costUsd: opt.qaBrugt ?? 0 } }),
      create: async () => ({}),
    },
  } as unknown as PrismaClient;
  const klient = {
    messages: {
      create: async () => {
        kald++;
        if (opt.kast) throw opt.kast;
        return {
          model: "claude-sonnet-5-5",
          stop_reason: "end_turn",
          stop_details: null,
          content: [{ type: "text", text: opt.svar ?? '{"kanBesvares":true,"svar":"Inflationen var 2,20 procent i september.","kilder":["pulse:dst.pris.forbruger.aarsaendring"]}' }],
          usage: { input_tokens: 3000, output_tokens: 200 },
        };
      },
    },
  } as unknown as Anthropic;
  return { prisma, klient, gemt, kald: () => kald };
}

const spoerg = (f: ReturnType<typeof falsk>, spoergsmaal = "Hvad er inflationen?") =>
  spoergFinn({ prisma: f.prisma, klient: f.klient, cfg: CFG, spoergsmaal, ipHash: "h" });

describe("Spørg Finn", () => {
  test("et sporbart svar gives med kilde og gemmes som svaret", async () => {
    const f = falsk();
    const r = await spoerg(f);
    assert.equal(r.status, "svaret");
    assert.match(r.tekst, /2,20 procent/);
    assert.equal(r.kilder.length, 1);
    assert.deepEqual(f.gemt, ["svaret"]);
  });

  test("et opdigtet tal giver ikke et svar, men en ærlig besked", async () => {
    const f = falsk({ svar: '{"kanBesvares":true,"svar":"Inflationen var 3,4 procent.","kilder":["pulse:dst.pris.forbruger.aarsaendring"]}' });
    const r = await spoerg(f);
    assert.equal(r.status, "ikke_sporbar");
    assert.doesNotMatch(r.tekst, /3,4/);
  });

  test("grænsen per besøgende stopper før noget kald", async () => {
    const f = falsk({ brugt: MAKS_PR_BESOEGENDE });
    const r = await spoerg(f);
    assert.equal(r.status, "graense");
    assert.equal(f.kald(), 0);
  });

  test("spørgsmålenes døgnbudget stopper før noget kald og siger det", async () => {
    const f = falsk({ qaBrugt: 0.999 });
    const r = await spoerg(f);
    assert.equal(r.status, "budget");
    assert.match(r.tekst, /budget/);
    assert.equal(f.kald(), 0);
  });

  test("brugt Anthropic-kredit siges som sådan, ikke som en almindelig fejl", async () => {
    const fejl = new Anthropic.BadRequestError(
      400,
      { type: "error", error: { type: "invalid_request_error", message: "Your credit balance is too low to access the Anthropic API." } },
      "Your credit balance is too low to access the Anthropic API.",
      new Headers()
    );
    assert.ok(erKreditFejl(fejl));
    const f = falsk({ kast: fejl });
    const r = await spoerg(f);
    assert.equal(r.status, "kredit");
    assert.match(r.tekst, /kreditter er brugt/);
  });

  test("for kort eller for langt spørgsmål afvises uden kald", async () => {
    const f = falsk();
    assert.equal((await spoerg(f, "a")).status, "ugyldig");
    assert.equal((await spoerg(f, "x".repeat(301))).status, "ugyldig");
    assert.equal(f.kald(), 0);
  });
});
