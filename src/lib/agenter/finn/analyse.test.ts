import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { TalPost } from "../kilder/typer";
import { bygElpris, bygNyt, bygOverblik, bygUsaedvanligt, omraadeFor } from "./analyse";

const nu = new Date("2026-10-22T06:00:00Z");

function tal(id: string, over: Partial<TalPost> = {}): TalPost {
  return {
    type: "tal",
    id,
    kilde: "pulse",
    navn: id,
    enhed: "procent",
    saeson: "korrigeret",
    url: "https://example.dk",
    periode: "september 2026",
    vaerdi: 2,
    vaerdiTekst: "2,0",
    sammenligning: null,
    forloeb: [],
    tendens: null,
    foersteGangSet: "2026-10-01T00:00:00Z",
    ...over,
  };
}

describe("analysens beregnede dele", () => {
  test("dagens elpris hører til energi, så den kommer med i overblikket", () => {
    assert.equal(omraadeFor("eds.timer:DK2"), "energi");
    const p = tal("eds.timer:DK2", { timer: [{ time: 0, pris: 500 }], vaerdi: 500, vaerdiTekst: "500", enhed: "kr. per MWh" });
    assert.equal(bygOverblik([p])[0]?.omraade, "energi");
  });

  test("usædvanligt tager kun |z| >= 1, størst først", () => {
    const u = (id: string, z: number) => tal(id, { usaedvanlighed: { tekst: "x", z, sjaeldenhed: 0.1, maaneder: 120, opad: z > 0 } });
    const r = bygUsaedvanligt([u("pulse:a", 0.9), u("pulse:b", -2.5), u("pulse:c", 1.2)]);
    assert.deepEqual(r.map((x) => x.id), ["pulse:b", "pulse:c"]);
  });

  test("nyt er udgivet inden for 48 timer, og dagens elpris tæller ikke som nyt", () => {
    const r = bygNyt(
      [
        tal("pulse:ny", { foersteGangSet: "2026-10-21T08:00:00Z" }),
        tal("pulse:gammel", { foersteGangSet: "2026-10-10T08:00:00Z" }),
        tal("eds.timer:DK2", { foersteGangSet: "2026-10-22T00:00:00Z" }),
      ],
      nu
    );
    assert.deepEqual(r.map((x) => x.id), ["pulse:ny"]);
  });

  test("elpris uden timer giver ingen graf i stedet for en tom", () => {
    assert.deepEqual(bygElpris([tal("eds.timer:DK2")]), []);
  });
});
