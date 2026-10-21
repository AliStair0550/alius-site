import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { tilTimer } from "./elpris-timer";
import { usaedvanlighedTekst } from "./pulse";
import { usporedeTal } from "../finn/selvtjek";
import type { TalPost } from "./typer";

const kvarter = (tid: string, pris: number, omr = "DK2") => ({ TimeDK: tid, PriceArea: omr, DayAheadPriceDKK: pris });

describe("Elprisen time for time", () => {
  test("fire kvarterer bliver én time, læst af den danske tidsstreng", () => {
    const { timer, mangler } = tilTimer(
      [kvarter("2026-10-21T13:00:00", 100), kvarter("2026-10-21T13:15:00", 200), kvarter("2026-10-21T13:30:00", 300), kvarter("2026-10-21T13:45:00", 400)],
      "DK2"
    );
    assert.deepEqual(timer, [{ time: 13, pris: 250 }]);
    assert.equal(mangler, 23, "manglende timer tælles, ikke skjules");
  });

  test("det andet område og tomme priser tæller ikke med", () => {
    const { timer } = tilTimer([kvarter("2026-10-21T00:00:00", 100, "DK1"), { TimeDK: "2026-10-21T00:15:00", PriceArea: "DK2", DayAheadPriceDKK: null }], "DK2");
    assert.deepEqual(timer, []);
  });

  test("et tidsrum som 17-18 kan spores, en opdigtet time kan ikke", () => {
    const p: TalPost = {
      type: "tal", id: "eds.timer:DK2", kilde: "eds.timer", navn: "Elpris", enhed: "kr. per MWh", saeson: "ikke relevant",
      url: "", periode: "2026-10-21", vaerdi: 1566, vaerdiTekst: "1.566", sammenligning: null, forloeb: [], tendens: null,
      foersteGangSet: "", timer: [{ time: 17, pris: 1874 }],
    };
    assert.deepEqual(usporedeTal("Dyreste time er 17-18 med 1.874 kr. per MWh.", [p]), []);
    assert.deepEqual(usporedeTal("Dyreste time er 19-20.", [p]), ["19", "20"]);
  });
});

describe("Usædvanlighed, samme ordvalg som /pulse", () => {
  test("højeste i ti år, sjælden, og over det normale", () => {
    assert.match(usaedvanlighedTekst({ vaerdi: 5, normal: 1, sjaeldenhed: 1, maaneder: 120 }), /Ingen måned .* højere/);
    assert.equal(
      usaedvanlighedTekst({ vaerdi: 0, normal: 1, sjaeldenhed: 3, maaneder: 120 }),
      "Kun 3 af 120 måneder i de seneste ti år har ligget lige så lavt."
    );
    assert.match(usaedvanlighedTekst({ vaerdi: 2, normal: 1, sjaeldenhed: 20, maaneder: 121 }), /over det normale .* 121 måneder/);
  });
});
