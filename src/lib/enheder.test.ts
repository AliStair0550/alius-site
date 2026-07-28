// ============================================================
// Tests for enhedsformateringen
//
// Run with: npm test
// ============================================================

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { ENHEDER, enhed, formatVaerdi, formatAendring } from "./pulse-enheder";
import { UNIT_RANGES } from "./adapters/types";
import { SERIES } from "../../config/series";
import { CONFIG, enhedFor } from "../../scripts/legacy-mapping";

describe("Enheder: ingen falder igennem", () => {
  test("hver enhed i config er erklæret", () => {
    const uden = SERIES.filter((s) => !(s.unit in ENHEDER)).map((s) => `${s.id} (${s.unit})`);
    assert.deepEqual(uden, [], "en enhed uden erklæring ville blive formateret på et gæt");
  });

  test("hver enhed i legacy-mapping er erklæret", () => {
    // Både standardenheden og enhver enhed unitPerCode kan finde på at
    // returnere. Fejlen der begrunder testen: PRIS01's årsændring stod
    // som "indeks" og blev vist uden enhed.
    const uden: string[] = [];
    for (const cfg of CONFIG) {
      const kandidater = new Set([cfg.unit, enhedFor(cfg, null)]);
      for (const kode of ["100", "300", "F1", "G47", "000"]) {
        kandidater.add(enhedFor(cfg, kode));
      }
      for (const u of kandidater) if (!(u in ENHEDER)) uden.push(`${cfg.slug}: ${u}`);
    }
    assert.deepEqual(uden, []);
  });

  test("enhederne og størrelsesordensværnet kender de samme enheder", () => {
    // To lister der skal være enige. Er de det ikke, har en serie enten
    // et værn uden formatering eller en formatering uden værn.
    const kunIRanges = Object.keys(UNIT_RANGES).filter((u) => !(u in ENHEDER));
    const kunIEnheder = Object.keys(ENHEDER).filter((u) => !(u in UNIT_RANGES));
    assert.deepEqual(kunIRanges, [], "enheder med værn men uden formatering");
    assert.deepEqual(kunIEnheder, [], "enheder med formatering men uden værn");
  });

  test("en ukendt enhed kaster frem for at gætte", () => {
    assert.throws(() => enhed("noget_nyt"), /Ukendt enhed/);
    assert.throws(() => formatVaerdi(1, "noget_nyt"), /Ukendt enhed/);
  });
});

describe("Enheder: de fire der faldt igennem", () => {
  test("beløb får kroner og ingen decimaler", () => {
    // Stod som "2.662.528,0" uden enhed.
    assert.equal(formatVaerdi(2662528, "dkk"), "2.662.528 kr.");
  });

  test("demografital siger per hvad", () => {
    assert.equal(formatVaerdi(3.4, "per_1000"), "3,4 per 1.000 indbyggere");
  });

  test("et indeks er et bart tal, og det er med vilje", () => {
    assert.equal(formatVaerdi(105.4, "indeks"), "105,4");
    assert.equal(formatVaerdi(105.43, "indeks_1980"), "105,4");
  });

  test("m2 har ingen decimal", () => {
    // Fejlen der startede det hele: m2 faldt igennem til default og fik
    // en decimal, så en ændring stod som "−61.616,0 m2".
    assert.equal(formatVaerdi(165037, "m2"), "165.037 m2");
  });
});

describe("Enheder: ændringer", () => {
  const hale = "samme måned sidste år";

  test("satser sammenlignes i point, mængder i procent", () => {
    assert.equal(formatAendring(0.3, 3.17, "pct", hale), `0,30 procentpoint højere end ${hale}`);
    assert.equal(formatAendring(1.0, -15.7, "nettotal", hale), `1,0 point højere end ${hale}`);
    assert.equal(
      formatAendring(-61616, 226653, "m2", hale),
      `27 procent lavere end ${hale}`
    );
  });

  test("uden et grundlag skrives det absolutte tal", () => {
    assert.equal(formatAendring(-5, null, "antal", hale), `5 lavere end ${hale}`);
  });

  test("et grundlag nær nul giver ikke en vild procent", () => {
    // 5 af 0,4 er 1250 procent. Det er regnet rigtigt og betyder intet.
    const r = formatAendring(5, 0.4, "antal", hale);
    assert.ok(!r.includes("procent"), r);
  });

  test("en ændring under afrundingen kaldes uændret, ikke nul", () => {
    assert.equal(formatAendring(0.001, 3.0, "pct", hale), `Uændret ${hale}`);
    assert.match(formatAendring(0.1, 10000, "antal", hale), /Nogenlunde som/);
  });
});
