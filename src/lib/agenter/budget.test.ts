import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { laesBudgetConfig, maaKalde, maanedStart, doegnStart } from "./budget";
import { prisForKald, vaerstTaenkeligePris, MODEL_HURTIG, MODEL_SKRIV } from "./priser";

const CFG = { maanedUsd: 80, doegnUsd: 4, nulstillingsdag: 1 };
const naer = (a: number, b: number) => Math.abs(a - b) < 1e-9;

describe("Budgetloftet", () => {
  test("et kald under begge lofter må sendes", () => {
    assert.deepEqual(maaKalde({ doegn: 1, maaned: 10 }, 0.5, CFG), { ok: true });
  });

  test("døgnloftet stopper, også når månedsloftet har plads", () => {
    const d = maaKalde({ doegn: 3.9, maaned: 10 }, 0.2, CFG);
    assert.equal(d.ok, false);
    if (!d.ok) assert.match(d.grund, /Døgnloftet/);
  });

  test("månedsloftet stopper, også når døgnet har plads", () => {
    const d = maaKalde({ doegn: 0, maaned: 79.95 }, 0.1, CFG);
    assert.equal(d.ok, false);
    if (!d.ok) assert.match(d.grund, /Månedsloftet/);
  });

  test("acceptkriteriet: et døgnloft på 0,01 stopper første rigtige kald", () => {
    const lavt = { ...CFG, doegnUsd: 0.01 };
    const est = vaerstTaenkeligePris(MODEL_SKRIV, 5000, 4000);
    assert.equal(maaKalde({ doegn: 0, maaned: 0 }, est, lavt).ok, false);
  });

  test("et loft på nul tillader intet", () => {
    assert.equal(maaKalde({ doegn: 0, maaned: 0 }, 0.000001, { ...CFG, doegnUsd: 0 }).ok, false);
  });
});

describe("Budgetperioder", () => {
  test("døgnet begynder ved midnat UTC", () => {
    assert.equal(doegnStart(new Date("2026-10-21T23:59:00Z")).toISOString(), "2026-10-21T00:00:00.000Z");
  });

  test("budgetmåneden følger nulstillingsdagen", () => {
    assert.equal(maanedStart(new Date("2026-10-21T10:00:00Z"), 14).toISOString(), "2026-10-14T00:00:00.000Z");
    assert.equal(maanedStart(new Date("2026-10-13T10:00:00Z"), 14).toISOString(), "2026-09-14T00:00:00.000Z");
    assert.equal(maanedStart(new Date("2026-01-05T10:00:00Z"), 14).toISOString(), "2025-12-14T00:00:00.000Z");
  });
});

describe("Konfiguration", () => {
  test("tomt miljø giver standarden 80 / 4 / 1", () => {
    assert.deepEqual(laesBudgetConfig({}), CFG);
  });

  test("en værdi der ikke kan læses, kaster i stedet for at falde tilbage", () => {
    assert.throws(() => laesBudgetConfig({ AGENTS_BUDGET_DAILY_USD: "fire" }), /ikke et tal/);
    assert.throws(() => laesBudgetConfig({ AGENTS_BUDGET_MONTHLY_USD: "150" }), /ikke et tal/);
    assert.throws(() => laesBudgetConfig({ AGENTS_BUDGET_RESET_DAY: "31" }), /ikke et tal/);
    assert.throws(() => laesBudgetConfig({ AGENTS_BUDGET_RESET_DAY: "2.5" }), /helt tal/);
  });

  test("månedsloftet kan aldrig sættes over kreditten på $100", () => {
    assert.throws(() => laesBudgetConfig({ AGENTS_BUDGET_MONTHLY_USD: "100.01" }));
  });
});

describe("Priser", () => {
  test("Sonnet: input, output, cache-læsning og cache-skrivning", () => {
    const p = prisForKald(MODEL_SKRIV, {
      input_tokens: 1_000_000,
      output_tokens: 1_000_000,
      cache_read_input_tokens: 1_000_000,
      cache_creation_input_tokens: 1_000_000,
    });
    // 2 + 10 + 0,2 + 2,5
    assert.ok(naer(p, 14.7), `fik ${p}`);
  });

  test("Haiku skifter til det dyre kort over 100.000 prompt-tokens", () => {
    const kort = prisForKald(MODEL_HURTIG, { input_tokens: 100_000, output_tokens: 0 });
    const lang = prisForKald(MODEL_HURTIG, { input_tokens: 100_001, output_tokens: 0 });
    assert.ok(naer(kort, 0.01), `fik ${kort}`);
    assert.ok(lang > kort * 4, "over grænsen skal satsen være fem gange højere");
  });

  test("en ukendt model kaster i stedet for at koste nul", () => {
    assert.throws(() => prisForKald("claude-ukendt", { input_tokens: 1, output_tokens: 1 }), /Ingen pris/);
    assert.throws(() => vaerstTaenkeligePris("claude-ukendt", 1, 1), /Ingen pris/);
  });

  test("det værst tænkelige kald er altid mindst den faktiske pris", () => {
    const vaerst = vaerstTaenkeligePris(MODEL_SKRIV, 10_000, 4000);
    const faktisk = prisForKald(MODEL_SKRIV, {
      input_tokens: 2000,
      output_tokens: 4000,
      cache_read_input_tokens: 8000,
    });
    assert.ok(vaerst >= faktisk);
  });
});
