import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { laesNasdaq } from "./nasdaq";

const item = (o: Record<string, unknown>) => ({
  disclosureId: "1",
  releaseTime: "2026-10-21 05:31:47",
  company: "DSV A/S",
  cnsCategory: "Delårsrapport/Periodemeddelelse (Q1 og Q3)",
  headline: "DSV, 1175 - INTERIM FINANCIAL REPORT Q3 2026",
  messageUrl: "https://view.news.eu.nasdaq.com/view?id=x",
  language: "en",
  ...o,
});

describe("Nasdaq: regnskabsmeddelelser", () => {
  test("en dansk regnskabsmeddelelse bliver en nyhed med tidspunkt i UTC", () => {
    const [p] = laesNasdaq({ results: { item: [item({})] } });
    assert.equal(p.titel, "DSV A/S: DSV, 1175 - INTERIM FINANCIAL REPORT Q3 2026");
    assert.equal(p.dato, "2026-10-21T05:31:47.000Z");
    assert.equal(p.kilde, "nasdaq");
  });

  test("udenlandske selskaber, andre kategorier og finanskalendere springes over", () => {
    const r = laesNasdaq({
      results: {
        item: [
          item({ company: "Skandinaviska Enskilda Banken AB", disclosureId: "2" }),
          item({ cnsCategory: "Ledende medarbejderes transaktioner", disclosureId: "3" }),
          item({ cnsCategory: "Finanskalender", disclosureId: "4" }),
        ],
      },
    });
    assert.equal(r.length, 0);
  });

  test("samme meddelelse på flere sprog bliver én, dansk frem for engelsk", () => {
    const r = laesNasdaq({ results: { item: [item({ disclosureId: "5" }), item({ disclosureId: "6", language: "da", headline: "DSV, 1175 - DELÅRSRAPPORT" })] } });
    assert.equal(r.length, 1);
    assert.match(r[0].titel, /DELÅRSRAPPORT/);
  });

  test("et svar med en anden form er en fejl, ikke en tom liste", () => {
    assert.throws(() => laesNasdaq({ data: [] }), /ændret form/);
  });
});
