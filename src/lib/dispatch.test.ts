// ============================================================
// Tests for udløseren
//
// Run with: npm test
// ============================================================

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { skalUdloese, DAEKNINGSVINDUE_TIMER } from "./github-dispatch";

const NU = new Date("2026-07-30T06:00:00Z");
const timerSiden = (t: number) => new Date(NU.getTime() - t * 3600_000);

describe("Udløser: to kilder, én kørsel", () => {
  test("ingen kørsler betyder udløs", () => {
    assert.deepEqual(skalUdloese([], NU), { udloes: true });
  });

  test("en kørsel i gang blokerer", () => {
    // GitHubs scheduler nåede først. Vercel må ikke starte en til.
    for (const status of ["in_progress", "queued", "waiting"]) {
      const d = skalUdloese([{ status, startedAt: timerSiden(0.1) }], NU);
      assert.equal(d.udloes, false, status);
      if (!d.udloes) assert.match(d.grund, new RegExp(status));
    }
  });

  test("en kørsel der netop er afsluttet blokerer", () => {
    const d = skalUdloese([{ status: "completed", startedAt: timerSiden(0.5) }], NU);
    assert.equal(d.udloes, false);
    if (!d.udloes) assert.match(d.grund, /30 minutter siden/);
  });

  test("gårsdagens kørsel blokerer ikke", () => {
    const d = skalUdloese([{ status: "completed", startedAt: timerSiden(24) }], NU);
    assert.deepEqual(d, { udloes: true });
  });

  test("vinduet er kortere end et døgn, så en udebleven kørsel opdages samme dag", () => {
    assert.ok(
      DAEKNINGSVINDUE_TIMER < 24,
      "et vindue på et døgn ville lade en udebleven kørsel gå ubemærket"
    );
    assert.ok(
      DAEKNINGSVINDUE_TIMER >= 2,
      "for kort vindue ville lade de to udløsere starte hver sin kørsel"
    );
  });

  test("den nyeste kørsel afgør, ikke den ældste", () => {
    // GitHub leverer nyeste først, men rækkefølgen må ikke bestemme.
    const koersler = [
      { status: "completed", startedAt: timerSiden(48) },
      { status: "completed", startedAt: timerSiden(1) },
      { status: "completed", startedAt: timerSiden(72) },
    ];
    const d = skalUdloese(koersler, NU);
    assert.equal(d.udloes, false);
  });

  test("en kørsel i gang vinder over en gammel afsluttet", () => {
    const d = skalUdloese(
      [
        { status: "completed", startedAt: timerSiden(48) },
        { status: "in_progress", startedAt: timerSiden(0.05) },
      ],
      NU
    );
    assert.equal(d.udloes, false);
    if (!d.udloes) assert.match(d.grund, /in_progress/);
  });
});
