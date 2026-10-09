import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { beregnAfledt, type Raekke } from "./derived";
import { DERIVED, type DerivedDef } from "../../config/derived";

const maaned = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const r = (iso: string, value: number, areaCode = "DK"): Raekke => ({
  areaCode,
  period: maaned(iso),
  value,
});

const maengde = DERIVED.find((d) => d.id === "derived.detail.maengde")!;

describe("Afledte serier", () => {
  test("mængdeindekset regnes som omsætning / priser * 100", () => {
    const { points } = beregnAfledt(maengde, [r("2026-07-01", 110)], [r("2026-07-01", 100)]);
    assert.equal(points.length, 1);
    assert.ok(Math.abs((points[0].value ?? NaN) - 110) < 1e-9, `fik ${points[0].value}`);
  });

  test("glemt skala afvises: 1,1 ligner et tal, men ikke et indeks", () => {
    // Den halvdel man glemmer. Uden skala bliver 110 / 100 til 1,1,
    // og det må aldrig skrives som et mængdeindeks.
    const udenSkala: DerivedDef = { ...maengde, scale: undefined };
    assert.throws(
      () => beregnAfledt(udenSkala, [r("2026-07-01", 110)], [r("2026-07-01", 100)]),
      /uden for hvad enheden/
    );
  });

  test("dobbelt skala afvises også", () => {
    const forMeget: DerivedDef = { ...maengde, scale: 100_000 };
    assert.throws(
      () => beregnAfledt(forMeget, [r("2026-07-01", 110)], [r("2026-07-01", 100)]),
      /uden for hvad enheden/
    );
  });

  test("en enhed uden interval afvises i stedet for at slippe igennem", () => {
    const ukendt: DerivedDef = { ...maengde, unit: "noget_nyt" };
    assert.throws(
      () => beregnAfledt(ukendt, [r("2026-07-01", 110)], [r("2026-07-01", 100)]),
      /intet interval/
    );
  });

  test("perioder uden modpart og nul i nævneren tælles, ikke skjules", () => {
    const res = beregnAfledt(
      maengde,
      [r("2026-06-01", 108), r("2026-07-01", 110), r("2026-08-01", 112)],
      [r("2026-06-01", 0), r("2026-07-01", 100)]
    );
    assert.equal(res.points.length, 1);
    assert.equal(res.udenModpart, 1);
    assert.equal(res.nulINaevneren, 1);
  });

  test("hver afledt serie i config har en enhed med interval", () => {
    for (const d of DERIVED) {
      assert.doesNotThrow(
        () => beregnAfledt(d, [], []),
        `${d.id} har enheden "${d.unit}", som ikke har et interval`
      );
    }
  });
});
