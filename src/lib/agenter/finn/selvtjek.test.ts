import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { talITekst, usporedeTal, rensSprog, udenPraefiks } from "./selvtjek";
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
  tendens: null,
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

describe("Hvad det betyder", () => {
  test("modellens eget præfiks fjernes, så siden ikke viser det to gange", () => {
    assert.equal(udenPraefiks("Hvad det betyder: Lønudgifterne vokser."), "Lønudgifterne vokser.");
    assert.equal(udenPraefiks("Lønudgifterne vokser."), "Lønudgifterne vokser.");
  });
});

describe("Årstal", () => {
  test("året før perioden er tilladt, et vilkårligt andet år er ikke", () => {
    assert.deepEqual(usporedeTal("Ledigheden er lavere end i august 2025.", [ledighed]), []);
    assert.deepEqual(usporedeTal("Ledigheden er lavere end i 2019.", [ledighed]), ["2019"]);
  });
});


import { overdrevneOrd } from "./selvtjek";

describe("Hvor usædvanligt: kun Pulses egne ord", () => {
  const post = (sjaeldenhed: number, opad: boolean): TalPost => ({
    type: "tal", id: "x", kilde: "pulse", navn: "x", enhed: "", saeson: "korrigeret", url: "", periode: "september 2026",
    vaerdi: 1, vaerdiTekst: "1", sammenligning: null, forloeb: [], tendens: null, foersteGangSet: "2026-10-01T00:00:00Z",
    usaedvanlighed: { tekst: "", z: 1.5, sjaeldenhed, maaneder: 120, opad },
  });
  const over = post(20, true); // "Ligger over det normale"
  const under = post(20, false);
  const sjaelden = post(2, true); // "Kun 2 af 120 måneder"
  const rekord = post(1, false); // "Ingen måned har ligget lavere"

  test("22/10 2026: 'langt over normalen' og 'usædvanligt højt' om en elpris der kun var over det normale", () => {
    assert.equal(overdrevneOrd("Elprisen ligger langt over normalen.", [over]).length, 1);
    assert.equal(overdrevneOrd("Prisen er usædvanligt høj i dag.", [over]).length, 1);
  });

  test("22/10 2026: 'omkring det normale' om en ledighed der lå under", () => {
    assert.equal(overdrevneOrd("Ledigheden ligger omkring det normale.", [under]).length, 1);
  });

  test("forkert retning fanges", () => {
    assert.equal(overdrevneOrd("Ledigheden ligger over det normale.", [under]).length, 1);
  });

  test("Pulses egne ord, og stærkere ord når niveauet bærer dem, går igennem", () => {
    assert.deepEqual(overdrevneOrd("Elprisen ligger over det normale for de seneste ti år.", [over]), []);
    assert.deepEqual(overdrevneOrd("Det er usædvanligt højt; kun 2 af 120 måneder har ligget lige så højt.", [sjaelden]), []);
    assert.deepEqual(overdrevneOrd("Konkurserne er de laveste i ti år.", [rekord]), []);
    assert.deepEqual(overdrevneOrd("Der står intet om det normale her.", []), []);
  });

  test("en påstand uden kilde der siger noget om det normale, fanges", () => {
    assert.equal(overdrevneOrd("Renten ligger under det normale.", []).length, 1);
  });

  test("et stærkere udtryk tælles kun én gang", () => {
    assert.equal(overdrevneOrd("Prisen ligger markant over normalen.", [over]).length, 1);
  });
});
