// ============================================================
// Tests for nøgletalsberegningen
//
// Run with: npm test
// ============================================================

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  beregnStribe,
  beregnYderlighed,
  beregnNoegletal,
  retningMellem,
  FLAD_ANDEL,
  VINDUE_AAR,
} from "./pulse-noegletal";
import type { SerieInfo } from "./pulse-model";

const NU = new Date(Date.UTC(2026, 6, 15));

const serie = (over: Partial<SerieInfo> = {}): SerieInfo => ({
  id: "test.serie",
  nameDa: "Testserie",
  unit: "indeks",
  frequency: "MONTHLY",
  attribution: "test",
  source: "DST",
  sourceRef: "TEST",
  hentet: NU,
  ...over,
});

/** N månedlige punkter, nyeste sidst. */
function maanedlig(vaerdier: number[], slut = NU) {
  return vaerdier.map((v, i) => ({
    periode: new Date(
      Date.UTC(slut.getUTCFullYear(), slut.getUTCMonth() - (vaerdier.length - 1 - i), 1)
    ),
    vaerdi: v,
  }));
}

/** N kvartalsvise punkter, nyeste sidst. */
function kvartalsvis(vaerdier: number[], slut = NU) {
  return vaerdier.map((v, i) => ({
    periode: new Date(
      Date.UTC(slut.getUTCFullYear(), slut.getUTCMonth() - (vaerdier.length - 1 - i) * 3, 1)
    ),
    vaerdi: v,
  }));
}

describe("Nøgletal: retning og stribe", () => {
  test("en bevægelse under tærsklen er flad, ikke en retning", () => {
    assert.equal(retningMellem(100, 100 + 100 * FLAD_ANDEL * 0.5), "flad");
    assert.equal(retningMellem(100, 100 + 100 * FLAD_ANDEL * 2), "op");
    assert.equal(retningMellem(100, 100 - 100 * FLAD_ANDEL * 2), "ned");
  });

  test("tærsklen følger niveauet, ikke et fast tal", () => {
    // Samme absolutte skridt betyder noget forskelligt på en rente og
    // et indeks. 0,01 er en bevægelse på 3,4 og støj på 130.
    assert.equal(retningMellem(3.4, 3.41), "op");
    assert.equal(retningMellem(130, 130.01), "flad");
  });

  test("striben tælles baglæns og brydes af en flad periode", () => {
    assert.deepEqual(beregnStribe([1, 2, 3, 4]), { retning: "op", stribe: 3 });
    assert.deepEqual(beregnStribe([4, 3, 2, 1]), { retning: "ned", stribe: 3 });
    // 3 -> 3 er flad og bryder: kun sidste skridt tæller.
    assert.deepEqual(beregnStribe([1, 2, 3, 3, 4]), { retning: "op", stribe: 1 });
  });

  test("en vending nulstiller striben", () => {
    assert.deepEqual(beregnStribe([5, 4, 3, 4, 5]), { retning: "op", stribe: 2 });
  });

  test("for få punkter giver ingen stribe, ikke stribe nul i en retning", () => {
    assert.deepEqual(beregnStribe([]), { retning: "flad", stribe: 0 });
    assert.deepEqual(beregnStribe([1]), { retning: "flad", stribe: 0 });
  });
});

describe("Nøgletal: yderlighed", () => {
  const m = (vs: number[]) => vs.map((v, i) => ({ noegle: 24000 + i, vaerdi: v }));

  test("hoejeste og laveste findes", () => {
    assert.deepEqual(beregnYderlighed(m([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])), {
      aar: 1,
      retning: "top",
    });
    assert.deepEqual(beregnYderlighed(m([13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1])), {
      aar: 1,
      retning: "bund",
    });
  });

  test("en almindelig vaerdi er ingen yderlighed", () => {
    assert.equal(beregnYderlighed(m([1, 9, 3, 4, 5, 6, 7, 8, 2, 10, 11, 12, 5])), null);
  });

  test("paastanden begraenses af hvor lang historikken er", () => {
    // Fjorten måneder rækker til "et år", ikke til "fem år".
    const r = beregnYderlighed(m([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]));
    assert.equal(r?.aar, 1);
  });

  test("under tretten maaneder siges der ingenting", () => {
    assert.equal(beregnYderlighed(m([1, 2, 3, 4, 5])), null);
  });
});

describe("Nøgletal: hele beregningen", () => {
  test("stigende maanedsserie", () => {
    const n = beregnNoegletal(serie(), maanedlig([100, 101, 102, 103, 104]), NU);
    assert.ok(!("fejl" in n));
    if ("fejl" in n) return;
    assert.equal(n.retning, "op");
    assert.equal(n.stribe, 4);
    assert.equal(n.vaerdi, 104);
  });

  test("kvartalsserie maaler serien, ikke resamplingen", () => {
    // Fejlen der begrunder rettelsen: baaret frem til maaneder er to ud
    // af tre skridt per definition uaendrede, og loenindekset ville staa
    // som "uaendret" uanset hvad loennen gjorde.
    const n = beregnNoegletal(
      serie({ frequency: "QUARTERLY" }),
      kvartalsvis([100, 102, 104, 106, 108, 110]),
      NU
    );
    assert.ok(!("fejl" in n));
    if ("fejl" in n) return;
    assert.equal(n.retning, "op", "en stigende kvartalsserie stiger");
    assert.equal(n.stribe, 5, "fem kvartaler i traek, ikke et");
  });

  test("kurven tegnes paa den udfyldte serie", () => {
    const n = beregnNoegletal(
      serie({ frequency: "QUARTERLY" }),
      kvartalsvis([100, 102, 104, 106]),
      NU
    );
    assert.ok(!("fejl" in n));
    if ("fejl" in n) return;
    // Fire kvartaler spaender ti maaneder, saa kurven har flere punkter
    // end der er aegte observationer.
    assert.ok(n.kurve.length > 4, `kurven havde ${n.kurve.length} punkter`);
  });

  test("aarsaendringen kraever en aegte maaling et aar foer", () => {
    const n = beregnNoegletal(serie(), maanedlig([100, 101, 102]), NU);
    assert.ok(!("fejl" in n));
    if ("fejl" in n) return;
    assert.equal(n.aaretFoer, null, "tre maaneder raekker ikke et aar tilbage");

    const lang = beregnNoegletal(
      serie(),
      maanedlig(Array.from({ length: 25 }, (_, i) => 100 + i)),
      NU
    );
    assert.ok(!("fejl" in lang));
    if ("fejl" in lang) return;
    assert.equal(lang.aaretFoer, 12);
  });

  test("den viste vaerdi er den seneste faktiske maaling", () => {
    // Daglig serie: to maalinger i samme maaned. Kurven midler dem,
    // men tallet oeverst skal vaere dagens.
    const n = beregnNoegletal(
      serie({ frequency: "DAILY" }),
      [
        { periode: new Date(Date.UTC(2026, 4, 10)), vaerdi: 100 },
        { periode: new Date(Date.UTC(2026, 5, 10)), vaerdi: 200 },
        { periode: new Date(Date.UTC(2026, 6, 10)), vaerdi: 300 },
        { periode: new Date(Date.UTC(2026, 6, 14)), vaerdi: 400 },
      ],
      NU
    );
    assert.ok(!("fejl" in n));
    if ("fejl" in n) return;
    assert.equal(n.vaerdi, 400, "seneste dag, ikke maanedens gennemsnit paa 350");
    assert.equal(n.kurve[n.kurve.length - 1].vaerdi, 350, "kurven midler");
  });

  test("en tom serie giver en begrundelse, ikke et nul", () => {
    const n = beregnNoegletal(serie(), [], NU);
    assert.ok("fejl" in n);
    if ("fejl" in n) assert.match(n.fejl, /Ingen observationer/);
  });

  test("en doed serie siger hvornaar den doede", () => {
    const gammel = maanedlig(
      [1, 2, 3],
      new Date(Date.UTC(2026 - VINDUE_AAR - 2, 0, 1))
    );
    const n = beregnNoegletal(serie(), gammel, NU);
    assert.ok("fejl" in n);
    if ("fejl" in n) {
      assert.match(n.fejl, /Nyeste er \d{4}-\d{2}/);
    }
  });
});
