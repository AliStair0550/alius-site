import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { afsnitTilVurdering, maal, opsummer, score, type DagsVurdering } from "./kvalitet";
import type { Analyse } from "./analyse";

const ref = (id: string) => ({ id, navn: id, url: "", type: "tal" as const });
const analyse = (omraade: "energi" | "priser" | null, medier: Analyse["medier"] = []): Analyse => ({
  udgave: 1,
  dagens: omraade
    ? {
        omraade,
        overskrift: "O",
        tese: "T",
        hvadTalleneSiger: [{ tekst: "S1", kilder: [ref("a")] }, { tekst: "S2", kilder: [ref("b")] }],
        hvadDetBetyder: { virksomhed: "V", husholdning: "H" },
        holdOeje: [{ tekst: "HO", kilder: [ref("a")] }],
      }
    : null,
  overblik: [],
  elpris: [],
  usaedvanligt: [],
  nyt: [],
  medier,
  omraader: { priser: { overskrift: "P", afsnit: [{ tekst: "P1", kilder: [ref("c")] }] } },
});

describe("Kvalitetstjek: målinger", () => {
  test("gentagne områder, dage uden analyse og temaer uden kommentar tælles", () => {
    const tema = (kommentar: boolean) => ({ titel: "t", omraade: null, kommentar: kommentar ? { tekst: "k", kilder: [] } : null, artikler: [] });
    const m = maal([
      { dato: "2026-10-21", analyse: analyse("energi", [tema(true), tema(false)]), costUsd: 0.14, skrevet: 8, fjernet: 2 },
      { dato: "2026-10-22", analyse: analyse("energi", [tema(false)]), costUsd: 0.16, skrevet: 9, fjernet: 1 },
      { dato: "2026-10-23", analyse: analyse(null), costUsd: 0.1, skrevet: 5, fjernet: 4 },
    ]);
    assert.equal(m.gentagelser, 1);
    assert.equal(m.udenDagens, 1);
    assert.equal(m.medietemaerUdenKommentar, 2);
    assert.equal(m.afsnitFjernet, 7);
    assert.equal(m.prisUsd, 0.4);
  });
});

describe("Kvalitetstjek: afsnit og opsummering", () => {
  test("alle afsnit kommer med, og tese og betydning vurderes mod tallenes kilder", () => {
    const a = afsnitTilVurdering(analyse("energi"));
    assert.equal(a.length, 6, "tese, to om tallene, betydning, hold øje, et områdeafsnit");
    assert.deepEqual(a[0].kilder, ["a", "b"]);
  });

  test("et afsnit er svagt når ét kriterium er 2 eller lavere; svagest først", () => {
    const v = (sted: string, pointe: number, klarhed = 4) => ({ sted, tekst: "", pointe, sammenligning: 4, relevans: 4, klarhed, problem: null });
    const dage: DagsVurdering[] = [{ dato: "2026-10-22", samlet: "", vurderinger: [v("a", 4), v("b", 2), v("c", 4, 1)], ubesvaret: ["d"] }];
    const o = opsummer(dage);
    assert.deepEqual(o.svage.map((s) => s.sted), ["c", "b"]);
    assert.equal(o.snit.pointe, 3.3);
    assert.equal(o.ubesvaret, 1);
  });

  test("en score uden for 1 til 5 rettes, den troes ikke", () => {
    assert.equal(score(0), 1);
    assert.equal(score(7), 5);
    assert.equal(score(3.4), 3);
  });
});
