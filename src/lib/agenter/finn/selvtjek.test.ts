import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { talITekst, usporedeTal, rensSprog } from "./selvtjek";
import type { NyhedPost, TalPost } from "../kilder/typer";

const ledighed: TalPost = {
  type: "tal",
  id: "pulse:dst.ledighed.sasonkorrigeret",
  kilde: "pulse",
  navn: "Fuldtidsledige i pct. af arbejdsstyrken, sæsonkorrigeret",
  enhed: "procent",
  saeson: "korrigeret",
  url: "https://www.statbank.dk/AUS08",
  periode: "august 2026",
  vaerdi: 2.84,
  vaerdiTekst: "2,84",
  sammenligning: {
    slags: "forrige periode",
    periode: "juli 2026",
    vaerdi: 2.8,
    vaerdiTekst: "2,80",
    aendring: 0.04,
    aendringEnhed: "procentpoint",
    aendringTekst: "+0,04 procentpoint",
  },
  forloeb: [
    { periode: "august 2026", vaerdi: 2.84 },
    { periode: "juli 2026", vaerdi: 2.8 },
  ],
  foersteGangSet: "2026-10-09T10:21:00Z",
};

const nyhed: NyhedPost = {
  type: "nyhed",
  id: "rss.nationalbanken.statistik:x",
  kilde: "rss.nationalbanken.statistik",
  titel: "Forventning om indkomststigning på 2,2 pct. de næste 12 måneder",
  url: "https://www.nationalbanken.dk/x",
  dato: "2026-10-20T06:00:00Z",
};

describe("Selvtjek: tal i briefen", () => {
  test("danske tal læses rigtigt, navne med cifre springes over", () => {
    assert.deepEqual(
      talITekst("Elprisen i DK1 var 1.234,5 kr. mod 2,20 i G47 og 7 dage").map((f) => f.vaerdi),
      [1234.5, 2.2, 7]
    );
  });

  test("tal fra posten er sporbare, også afrundet", () => {
    assert.deepEqual(usporedeTal("Ledigheden var 2,84 procent i august 2026, op fra 2,80 i juli.", [ledighed]), []);
    assert.deepEqual(usporedeTal("Ledigheden ligger lige under 3 procent.", [ledighed]), []);
  });

  test("et opdigtet tal fanges", () => {
    assert.deepEqual(usporedeTal("Ledigheden steg til 2,9 procent.", [ledighed]), ["2,9"]);
    assert.deepEqual(usporedeTal("Det svarer til 4.000 flere ledige.", [ledighed]), ["4.000"]);
  });

  test("et rigtigt tal fra en ANDEN post end den punktet henviser til, fanges", () => {
    // 2,2 står i nyheden, men punktet henviser kun til ledigheden.
    assert.deepEqual(usporedeTal("Ledigheden var 2,2 procent.", [ledighed]), ["2,2"]);
    assert.deepEqual(usporedeTal("Husholdningerne venter 2,2 procent højere indkomst.", [nyhed]), []);
  });

  test("nyhedens dato legitimerer dag og år", () => {
    assert.deepEqual(usporedeTal("Nationalbanken offentliggjorde den 20. oktober 2026 ...", [nyhed]), []);
  });

  test("tankestreger og udråbstegn renses", () => {
    assert.equal(rensSprog("Renten steg — igen!"), "Renten steg, igen.");
    assert.equal(rensSprog("2025–2026"), "2025-2026");
  });
});
