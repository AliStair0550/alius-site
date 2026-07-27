// ============================================================
// Tests for ranglisten
//
// Run with: npm test
// ============================================================

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  beregnSjaeldenhed,
  kildeUrl,
  rangordn,
  MAX_KORT,
  MIN_Z,
  NATIONALE_OMRAADER,
  type Kandidat,
} from "./pulse-rangliste";
import { computeZ, toMonthlyMedKilde, type Obs } from "./pulse-zscore";

const NU = new Date(Date.UTC(2026, 6, 28));

function kandidat(over: Partial<Kandidat> & { seriesId: string; z: number }): Kandidat {
  return {
    navn: over.seriesId,
    enhed: "pct",
    kilde: "DST",
    kildeRef: over.kildeRef ?? over.seriesId,
    attribution: "test",
    lag: "LEADING",
    areaCode: "DK",
    hentet: NU,
    vaerdi: 1,
    raaVaerdi: 1,
    periode: NU,
    normal: 0,
    transform: "level",
    sjaeldenhed: 1,
    maaneder: 120,
    kurve: [],
    ...over,
  };
}

/** Månedlige observationer med en given værdi per måned. */
function maanedlig(vaerdier: number[], slut = NU): Obs[] {
  return vaerdier.map((v, i) => ({
    period: new Date(
      Date.UTC(slut.getUTCFullYear(), slut.getUTCMonth() - (vaerdier.length - 1 - i), 1)
    ),
    value: v,
  }));
}

// ----------------------------------------------------------------
describe("Rangliste: kvoter og afskæring", () => {
  test("kun serier over tærsklen får kort", () => {
    const { kort, rolige } = rangordn([
      kandidat({ seriesId: "a", z: 2.4 }),
      kandidat({ seriesId: "b", z: MIN_Z - 0.01 }),
    ]);
    assert.deepEqual(kort.map((k) => k.seriesId), ["a"]);
    assert.deepEqual(rolige.map((k) => k.seriesId), ["b"]);
  });

  test("sorteres på absolut afvigelse, så store fald ikke taber til små stigninger", () => {
    const { kort } = rangordn([
      kandidat({ seriesId: "lille-op", z: 1.6 }),
      kandidat({ seriesId: "stort-fald", z: -3.9 }),
    ]);
    assert.equal(kort[0].seriesId, "stort-fald");
  });

  test("maks fire kort, uanset hvor mange der kvalificerer", () => {
    const mange = Array.from({ length: 9 }, (_, i) =>
      kandidat({ seriesId: `s${i}`, z: 5 - i * 0.1, kildeRef: `T${i}` })
    );
    const { kort, rolige } = rangordn(mange);
    assert.equal(kort.length, MAX_KORT);
    assert.equal(rolige.length, 9 - MAX_KORT);
  });

  test("kun ét kort per kildetabel", () => {
    // ETILLID leverer tre rangerbare serier. Uden kvoten tager de tre
    // af fire pladser med tre udgaver af samme undersøgelse.
    const { kort, rolige } = rangordn([
      kandidat({ seriesId: "tillid.samlet", z: 3.0, kildeRef: "ETILLID" }),
      kandidat({ seriesId: "tillid.industri", z: 2.9, kildeRef: "ETILLID" }),
      kandidat({ seriesId: "tillid.byggeri", z: 2.8, kildeRef: "ETILLID" }),
      kandidat({ seriesId: "konkurser", z: 2.0, kildeRef: "KONK3" }),
    ]);
    assert.deepEqual(kort.map((k) => k.seriesId), ["tillid.samlet", "konkurser"]);
    assert.equal(rolige.length, 2, "de to øvrige falder ned i den rolige liste, de forsvinder ikke");
  });

  test("den stærkeste i en kilde er den der optager pladsen", () => {
    const { kort } = rangordn([
      kandidat({ seriesId: "svag", z: 1.7, kildeRef: "ETILLID" }),
      kandidat({ seriesId: "staerk", z: 3.3, kildeRef: "ETILLID" }),
    ]);
    assert.deepEqual(kort.map((k) => k.seriesId), ["staerk"]);
  });

  test("ingen kandidat forsvinder", () => {
    const alle = Array.from({ length: 12 }, (_, i) =>
      kandidat({ seriesId: `s${i}`, z: 4 - i * 0.4, kildeRef: `T${i}` })
    );
    const { kort, rolige } = rangordn(alle);
    assert.equal(kort.length + rolige.length, alle.length);
  });

  test("kommunekoder er ikke nationale", () => {
    assert.ok(NATIONALE_OMRAADER.has("DK"));
    assert.ok(NATIONALE_OMRAADER.has("000"));
    assert.ok(!NATIONALE_OMRAADER.has("153"));
  });
});

// ----------------------------------------------------------------
describe("Rangliste: sjældenhed", () => {
  test("retningen tælles med, så en rekordlav ikke drukner i de høje", () => {
    const v = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    // 1 er lavest og ligger under midten: kun sig selv er lige så lav.
    assert.equal(beregnSjaeldenhed(v, 1, 5.5), 1);
    // 10 er højest og ligger over midten: kun sig selv er lige så høj.
    assert.equal(beregnSjaeldenhed(v, 10, 5.5), 1);
  });

  test("tæller hvor mange der var mindst lige så yderligtgående", () => {
    const v = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    assert.equal(beregnSjaeldenhed(v, 8, 5.5), 3, "8, 9 og 10");
  });

  test("en almindelig værdi er ikke sjælden", () => {
    const v = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    assert.ok(beregnSjaeldenhed(v, 6, 5.5) >= 5);
  });
});

// ----------------------------------------------------------------
describe("Rangliste: link til kilden", () => {
  test("DST peger på statistikbanken", () => {
    assert.equal(kildeUrl("DST", "KONK3"), "https://www.statistikbanken.dk/KONK3");
  });

  test("sammensat kilde giver intet link frem for et forkert", () => {
    // EDS' historik ligger i to datasæt. Der findes ingen enkelt side.
    assert.equal(kildeUrl("EDS", "DayAheadPrices+Elspotprices"), null);
    // Afledte serier har en formel som sourceRef, ikke en tabel.
    assert.equal(kildeUrl("DERIVED", "a / b"), null);
  });

  test("ukendt kilde gætter ikke", () => {
    assert.equal(kildeUrl("NOGET_NYT", "X1"), null);
  });
});

// ----------------------------------------------------------------
describe("Z-score: fremskrevne måneder må ikke tælle som observationer", () => {
  test("kvartalsserie får ikke kunstigt lille spredning", () => {
    // Fire år kvartalsvise tal der svinger. Bæres de frem til månedlig
    // frekvens, står hver værdi tre gange, og MAD'en falder mod nul.
    const kvartaler: Obs[] = [];
    const vaerdier = [100, 120, 90, 130, 105, 125, 95, 135, 110, 115, 100, 128];
    for (let i = 0; i < vaerdier.length; i++) {
      kvartaler.push({
        period: new Date(Date.UTC(2023, i * 3, 1)),
        value: vaerdier[i],
      });
    }
    const { udfyldt, aegte } = toMonthlyMedKilde(kvartaler);
    assert.ok(udfyldt.size > aegte.size, "udfyldningen skal stadig ske");
    assert.equal(aegte.size, vaerdier.length, "kun de ægte er ægte");
  });

  test("den fejl der stod øverst på ranglisten", () => {
    // BYGV33 for Brøndby: små kvartalsvise tal. Årsændringen fra 1 til
    // 15 boliger er plus 1400 procent. Regnes den mod en spredning der
    // er trykket ned af fremskrevne måneder, bliver z tocifret.
    const kvartaler: Obs[] = [];
    const tal = [5, 2, 14, 187, 7, 15, 3, 1, 5, 5, 3, 15];
    for (let i = 0; i < tal.length; i++) {
      kvartaler.push({ period: new Date(Date.UTC(2023, i * 3, 1)), value: tal[i] });
    }
    const r = computeZ(kvartaler, "yoy", { now: new Date(Date.UTC(2025, 9, 1)) });
    // Uanset udfald må den ikke rangeres på tocifret z.
    if (r.rankable) {
      assert.ok(
        Math.abs(r.z) < 10,
        `z blev ${r.z}, og en tocifret z på tolv kvartaler er et artefakt`
      );
    }
  });

  test("månedlig serie er upåvirket af rettelsen", () => {
    const obs = maanedlig(
      Array.from({ length: 130 }, (_, i) => 100 + Math.sin(i / 3) * 10)
    );
    const r = computeZ(obs, "level", { now: NU });
    assert.ok(r.rankable, "en fuld månedlig serie skal stadig kunne rangeres");
    if (r.rankable) {
      assert.equal(r.values.length, r.monthsUsed);
      assert.ok(r.values.length > 100);
    }
  });

  test("values er den skala z er regnet i", () => {
    // Stigende serie med yoy: values skal være procenter, ikke niveauer.
    const obs = maanedlig(Array.from({ length: 130 }, (_, i) => 100 + i));
    const r = computeZ(obs, "yoy", { now: NU });
    assert.ok(r.rankable);
    if (r.rankable) {
      assert.ok(
        r.values.every((v) => Math.abs(v) < 50),
        "årsændringer i procent, ikke niveauer omkring 200"
      );
      assert.ok(r.values.includes(r.latest), "seneste værdi indgår i grundlaget");
    }
  });
});
