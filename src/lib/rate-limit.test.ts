import { test } from "node:test";
import assert from "node:assert/strict";

import { afsenderNoegle, nulstilGraense, vurderGraense } from "./rate-limit";

const T0 = 1_754_900_000_000;

function req(headers: Record<string, string>): Request {
  return new Request("https://alius.dk/api/kontakt", { headers });
}

// ── Den fejl der var der ────────────────────────────────────────────

test("fire forskellige afsendere i samme minut slipper alle igennem", () => {
  nulstilGraense();
  // Det her var fejlen. Anna, Bo og Cecilie brugte grænsen op for
  // David, som aldrig havde skrevet.
  for (const navn of ["anna", "bo", "cecilie", "david"]) {
    const u = vurderGraense(navn, T0);
    assert.equal(u.tilladt, true, `${navn} blev afvist`);
  }
});

test("den samme afsender bliver stoppet paa fjerde forsoeg", () => {
  nulstilGraense();
  assert.equal(vurderGraense("robot", T0).grund, "under_graensen");
  assert.equal(vurderGraense("robot", T0 + 10).grund, "under_graensen");
  assert.equal(vurderGraense("robot", T0 + 20).grund, "under_graensen");

  const fjerde = vurderGraense("robot", T0 + 30);
  assert.equal(fjerde.tilladt, false);
  assert.equal(fjerde.grund, "over_graensen");
  assert.equal(fjerde.brugt, 3);
});

test("en travl afsender lukker ikke for en anden", () => {
  nulstilGraense();
  for (let i = 0; i < 3; i++) vurderGraense("robot", T0 + i);
  assert.equal(vurderGraense("robot", T0 + 5).tilladt, false);
  assert.equal(vurderGraense("kunde", T0 + 5).tilladt, true, "kunden blev ramt af robottens forbrug");
});

// ── Vinduet ─────────────────────────────────────────────────────────

test("graensen aabner igen naar vinduet er gaaet", () => {
  nulstilGraense();
  for (let i = 0; i < 3; i++) vurderGraense("robot", T0 + i);
  assert.equal(vurderGraense("robot", T0 + 59_000).tilladt, false, "for tidligt");
  assert.equal(vurderGraense("robot", T0 + 61_000).tilladt, true, "for sent");
});

test("en anden afsenders oprydning nulstiller ikke mit forbrug", () => {
  nulstilGraense();
  vurderGraense("gammel", T0);
  for (let i = 0; i < 3; i++) vurderGraense("robot", T0 + 30_000 + i);
  // "gammel" er udloebet nu og ryddes. "robot" er ikke.
  assert.equal(vurderGraense("robot", T0 + 61_000).tilladt, false);
});

// ── Ukendt afsender ─────────────────────────────────────────────────

test("ukendt afsender slipper igennem og siger hvorfor", () => {
  nulstilGraense();
  for (let i = 0; i < 10; i++) {
    const u = vurderGraense(null, T0 + i);
    assert.equal(u.tilladt, true);
    // Fravaer af adresse maa ikke ligne "under graensen". Det er en
    // egen tilstand, og kaldstedet skal kunne logge den.
    assert.equal(u.grund, "ukendt_afsender");
  }
});

// ── Adressen ────────────────────────────────────────────────────────

test("foerste led i x-forwarded-for er klienten", () => {
  assert.equal(afsenderNoegle(req({ "x-forwarded-for": "203.0.113.7, 70.41.3.18" })), "203.0.113.7");
});

test("x-real-ip bruges naar kaeden mangler", () => {
  assert.equal(afsenderNoegle(req({ "x-real-ip": "203.0.113.9" })), "203.0.113.9");
});

test("ingen hoveder giver null, ikke tom streng", () => {
  // En tom streng ville blive en faelles noegle for alle ukendte, og
  // saa var vi tilbage ved den oprindelige fejl.
  assert.equal(afsenderNoegle(req({})), null);
  assert.equal(afsenderNoegle(req({ "x-forwarded-for": "  " })), null);
});
