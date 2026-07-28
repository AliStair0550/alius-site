// ============================================================
// Tests for det inkrementelle tilbageblik
//
// Run with: npm test
// ============================================================

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  hentFra,
  tilbageblikDage,
  forventetFriskhedDage,
  TILBAGEBLIK_DAGE,
  MAJOR_FAKTOR,
} from "./pulse-incremental";
import { SERIES } from "../../config/series";

const NU = new Date(Date.UTC(2026, 6, 28));
const dage = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86_400_000);

describe("Inkrementelt: tilbageblikket er et vindue, ikke et startpunkt", () => {
  test("vinduet afhænger ikke af hvad vi allerede har", () => {
    // Det er hele pointen. Et startpunkt ved vores nyeste periode ville
    // være hurtigere og ville aldrig se en revision.
    const a = hentFra("MONTHLY", "MINOR", NU);
    const b = hentFra("MONTHLY", "MINOR", NU);
    assert.equal(a.getTime(), b.getTime());
    assert.equal(dage(a, NU), TILBAGEBLIK_DAGE.MONTHLY);
  });

  test("månedsserier rækker forbi samme måned sidste år", () => {
    // Årsændringen bruger måneden for et år siden. Revideres den, flytter
    // det tal vi viser i dag, så vinduet skal dække den.
    assert.ok(
      TILBAGEBLIK_DAGE.MONTHLY > 366,
      "et vindue under et år ville aldrig se en revision af sammenligningsmåneden"
    );
  });

  test("daglige serier henter et kort vindue, ellers kan jobbet ikke køre dagligt", () => {
    // DNVALD har 12.506 daglige perioder. Hentes de hver morgen, er
    // jobbet ikke længere inkrementelt.
    assert.ok(TILBAGEBLIK_DAGE.DAILY <= 90);
    assert.ok(TILBAGEBLIK_DAGE.DAILY >= 30, "skal dække helligdagshuller");
  });

  test("sjældnere frekvens giver længere vindue", () => {
    const f = ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"] as const;
    for (let i = 1; i < f.length; i++) {
      assert.ok(
        TILBAGEBLIK_DAGE[f[i]] > TILBAGEBLIK_DAGE[f[i - 1]],
        `${f[i]} skal have længere vindue end ${f[i - 1]}`
      );
    }
  });

  test("MAJOR-revision fordobler vinduet", () => {
    assert.equal(
      tilbageblikDage("MONTHLY", "MAJOR"),
      TILBAGEBLIK_DAGE.MONTHLY * MAJOR_FAKTOR
    );
    assert.equal(tilbageblikDage("MONTHLY", "MINOR"), TILBAGEBLIK_DAGE.MONTHLY);
    assert.equal(tilbageblikDage("MONTHLY", "NONE"), TILBAGEBLIK_DAGE.MONTHLY);
  });

  test("hver frekvens i config har et vindue", () => {
    const uden = SERIES.filter((s) => !(s.frequency in TILBAGEBLIK_DAGE));
    assert.deepEqual(
      uden.map((s) => `${s.id} (${s.frequency})`),
      [],
      "en frekvens uden vindue ville hente hele historikken hver dag"
    );
  });

  test("vinduet er altid i fortiden", () => {
    for (const f of ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"] as const) {
      assert.ok(hentFra(f, "MINOR", NU) < NU, `${f} peger ikke bagud`);
    }
  });
});

describe("Inkrementelt: forventet friskhed", () => {
  test("en daglig serie må være få dage gammel, en årlig må være over et år", () => {
    assert.ok(forventetFriskhedDage("DAILY", 1) < 10);
    assert.ok(forventetFriskhedDage("YEARLY", 30) > 366);
  });

  test("publiceringsforsinkelsen tælles med", () => {
    assert.equal(
      forventetFriskhedDage("MONTHLY", 20) - forventetFriskhedDage("MONTHLY", 5),
      15
    );
  });
});
