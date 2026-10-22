import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { dagensStatus } from "./dato";
import type { BriefVisning } from "./laes";

const brief = (dato: string): BriefVisning => ({ id: "b", dato, items: [], analyse: null, caveats: [], sourcesRead: 1, kept: 1, costUsd: 0, finishedAt: null });
const koersel = (status: "RUNNING" | "DONE" | "BUDGET_STOPPED" | "FAILED", dato = "2026-10-21") => ({ dato, status, besked: null, sourcesRead: null, kept: null });

describe("Linjen om dagens brief", () => {
  test("dagens brief findes: ingen linje, også selv om en senere kørsel blev stoppet", () => {
    assert.equal(dagensStatus("2026-10-21", 15, brief("2026-10-21"), koersel("BUDGET_STOPPED")), null);
  });

  test("acceptkriteriet: stoppet af budget viser gårsdagens brief med en linje om det", () => {
    assert.equal(
      dagensStatus("2026-10-21", 8, brief("2026-10-20"), koersel("BUDGET_STOPPED")),
      "Dagens brief blev stoppet af budgetloftet. Her er briefen fra 20. oktober 2026."
    );
  });

  test("hver tilstand har sin egen linje", () => {
    assert.match(dagensStatus("2026-10-21", 8, brief("2026-10-20"), koersel("FAILED"))!, /ikke færdig/);
    assert.match(dagensStatus("2026-10-21", 8, brief("2026-10-20"), koersel("RUNNING"))!, /arbejder/);
    assert.match(dagensStatus("2026-10-21", 5, brief("2026-10-20"), koersel("DONE", "2026-10-20"))!, /kommer kl. 6/);
    assert.match(dagensStatus("2026-10-21", 9, brief("2026-10-20"), koersel("DONE", "2026-10-20"))!, /ikke kommet/);
  });
});

import { finnAlarm } from "./dato";

describe("Finns driftsalarm", () => {
  test("en færdig brief i dag giver ingen alarm, også efter en senere fejlet kørsel", () => {
    assert.equal(finnAlarm("2026-10-22", true, { dato: "2026-10-22", status: "FAILED", besked: "x" }), null);
  });
  test("hver tilstand siges som sig selv", () => {
    assert.match(finnAlarm("2026-10-22", false, null)!, /ingen kørsel/);
    assert.match(finnAlarm("2026-10-22", false, { dato: "2026-10-21", status: "DONE", besked: null })!, /ingen kørsel/);
    assert.match(finnAlarm("2026-10-22", false, { dato: "2026-10-22", status: "FAILED", besked: "DST svarede 503" })!, /fejlede\. Besked: DST svarede 503/);
    assert.match(finnAlarm("2026-10-22", false, { dato: "2026-10-22", status: "BUDGET_STOPPED", besked: null })!, /budgetloftet/);
    assert.match(finnAlarm("2026-10-22", false, { dato: "2026-10-22", status: "RUNNING", besked: null })!, /død undervejs/);
  });
});
