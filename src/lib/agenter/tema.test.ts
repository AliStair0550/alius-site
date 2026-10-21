import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { temaForKilde } from "./tema";
import { FINN_SERIER } from "./finn/serier";

describe("Temaer", () => {
  test("løn og ledighed har hvert sit tema", () => {
    assert.equal(temaForKilde("pulse:dst.loen.privat", "tal"), "Løn");
    assert.equal(temaForKilde("pulse:dst.ledighed.sasonkorrigeret", "tal"), "Ledighed");
  });

  test("inflation og producentpriser har hvert sit tema", () => {
    assert.equal(temaForKilde("pulse:dst.pris.forbruger.aarsaendring", "tal"), "Inflation");
    assert.equal(temaForKilde("pulse:dst.pris.producent.industri", "tal"), "Producentpriser");
  });

  test("hver af Finns serier har et specifikt tema, og ingen to forskellige slags deler et", () => {
    for (const s of FINN_SERIER) {
      assert.notEqual(temaForKilde(`pulse:${s.id}`, "tal"), "Økonomi", `${s.id} faldt igennem til standardtemaet`);
    }
    assert.equal(temaForKilde("dst.ej56:0111", "tal"), "Boligpriser");
    assert.equal(temaForKilde("rss.berlingske:x", "nyhed"), "Nyhed");
  });
});
