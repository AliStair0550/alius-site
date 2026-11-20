import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { FINN_PAUSE_FRA, finnPaaPause } from "./pause";
import { dagensStatus } from "./dato";
import type { BriefVisning } from "./laes";

const brief = (dato: string): BriefVisning => ({ id: "b", dato, items: [], analyse: null, caveats: [], sourcesRead: 1, kept: 1, costUsd: 0, finishedAt: null });

describe("Finns pause", () => {
  test("slår til 2. december 2026 kl. 01 dansk tid, når kampagnen slutter", () => {
    assert.equal(FINN_PAUSE_FRA?.toISOString(), "2026-12-02T00:00:00.000Z");
  });

  test("1. december kører Finn stadig, også sidst på dagen", () => {
    assert.equal(finnPaaPause(new Date("2026-12-01T05:45:00Z")), false);
    assert.equal(finnPaaPause(new Date("2026-12-01T23:59:59Z")), false);
  });

  test("fra midnat UTC 2. december holder Finn pause", () => {
    assert.equal(finnPaaPause(new Date("2026-12-02T00:00:00Z")), true);
    assert.equal(finnPaaPause(new Date("2026-12-02T05:00:00Z")), true);
  });

  test("siden siger pause og viser datoen for den seneste brief, ikke 'ikke kommet'", () => {
    assert.equal(
      dagensStatus("2026-12-03", 9, brief("2026-12-01"), null, true),
      "Finn holder pause fra 2. december 2026 og skriver ikke nye briefs. Her er den seneste, fra 1. december 2026."
    );
  });

  test("uden pause er linjen den samme som før", () => {
    assert.equal(dagensStatus("2026-12-01", 9, brief("2026-12-01"), null, false), null);
    assert.equal(dagensStatus("2026-12-01", 9, brief("2026-11-30"), null), "Dagens brief er ikke kommet. Her er briefen fra 30. november 2026.");
  });
});
