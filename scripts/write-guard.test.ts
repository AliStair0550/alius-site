// ============================================================
// Tests for skriveværnet
//
// Run with: npm test
// ============================================================

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  erProduktion,
  erBetroetMiljoe,
  erUtc,
  vurderSkriveret,
  PRODUKTIONSVAERTER,
} from "./write-guard";

const PROD = `postgresql://u:p@${PRODUKTIONSVAERTER[0]}-pooler.c-3.eu-central-1.aws.neon.tech/neondb`;
const LOKAL = "postgresql://u:p@localhost:5432/alius";

const env = (o: Record<string, string | undefined>) => o as NodeJS.ProcessEnv;

describe("Skriveværn: hvad er produktion", () => {
  test("både pooled og direkte endpoint fanges", () => {
    assert.ok(erProduktion(PROD));
    assert.ok(
      erProduktion(`postgresql://u:p@${PRODUKTIONSVAERTER[0]}.eu-central-1.aws.neon.tech/db`)
    );
  });

  test("en anden database er ikke produktion", () => {
    assert.ok(!erProduktion(LOKAL));
    assert.ok(!erProduktion("postgresql://u:p@ep-anden-vaert.neon.tech/db"));
  });

  test("en streng vi ikke kan læse behandles som produktion", () => {
    // Vi ved det ikke. "Ved ikke" skal falde ud til det farligste af de
    // to, ikke til det bekvemme.
    assert.ok(erProduktion("ikke en url"));
  });

  test("ingen url er ikke produktion, men fanges af sin egen gren", () => {
    assert.ok(!erProduktion(undefined));
    const d = vurderSkriveret(env({}), "UTC", "test");
    assert.equal(d.ok, false);
    if (!d.ok) assert.equal(d.grund, "ingen_url");
  });
});

describe("Skriveværn: hvor må der skrives", () => {
  test("lokal maskine mod produktion afvises", () => {
    const d = vurderSkriveret(env({ DATABASE_URL: PROD }), "Europe/Copenhagen", "backfill.ts");
    assert.equal(d.ok, false);
    if (!d.ok) {
      assert.equal(d.grund, "lokal_maskine");
      assert.match(d.besked, /udviklermaskine/);
      assert.match(d.besked, /gh workflow run/, "skal sige hvordan det gøres rigtigt");
    }
  });

  test("lokal maskine i UTC afvises stadig", () => {
    // Tidszonen var anledningen, ikke reglen. En maskine der tilfældigvis
    // står i UTC er stadig en maskine ingen har styr på.
    const d = vurderSkriveret(env({ DATABASE_URL: PROD }), "UTC", "backfill.ts");
    assert.equal(d.ok, false);
    if (!d.ok) assert.equal(d.grund, "lokal_maskine");
  });

  test("GitHub Actions i UTC godkendes", () => {
    const d = vurderSkriveret(
      env({ DATABASE_URL: PROD, GITHUB_ACTIONS: "true" }),
      "UTC",
      "backfill.ts"
    );
    assert.equal(d.ok, true);
  });

  test("GitHub Actions i en anden tidszone afvises", () => {
    // Den fejl der begrunder hele værnet. Sætter nogen TZ i workflowet,
    // skal kørslen stoppe, ikke skrive forskudte døgn.
    const d = vurderSkriveret(
      env({ DATABASE_URL: PROD, GITHUB_ACTIONS: "true" }),
      "Europe/Copenhagen",
      "backfill.ts"
    );
    assert.equal(d.ok, false);
    if (!d.ok) {
      assert.equal(d.grund, "ikke_utc");
      assert.match(d.besked, /uden Z/);
    }
  });

  test("en anden database må skrives fra hvor som helst", () => {
    const d = vurderSkriveret(env({ DATABASE_URL: LOKAL }), "Europe/Copenhagen", "backfill.ts");
    assert.equal(d.ok, true, "en udviklerdatabase er ikke det værnet handler om");
  });

  test("GITHUB_ACTIONS kan ikke sættes til noget der ligner", () => {
    for (const v of ["1", "yes", "TRUE", "true "]) {
      assert.ok(!erBetroetMiljoe(env({ GITHUB_ACTIONS: v })), `"${v}" må ikke tælle`);
    }
    assert.ok(erBetroetMiljoe(env({ GITHUB_ACTIONS: "true" })));
  });

  test("UTC skrives på flere måder", () => {
    assert.ok(erUtc("UTC"));
    assert.ok(erUtc("Etc/UTC"));
    assert.ok(!erUtc("Europe/Copenhagen"));
    assert.ok(!erUtc("America/New_York"));
  });
});
