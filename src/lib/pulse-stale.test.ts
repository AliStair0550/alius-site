import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { afgoerForsinkelse, NYLIG_HENTNING_TIMER } from "./pulse-stale";

const NU = new Date("2026-10-20T12:00:00Z");
const timerSiden = (t: number) => new Date(NU.getTime() - t * 3_600_000);

describe("Stale-tjek: hvad ved vi om seneste hentning", () => {
  test("den der udløste rettelsen: spurgt i morges, intet nyt", () => {
    // Byggetilladelserne 20. oktober 2026. Nyeste observation skrevet i
    // juli, men kørslen spurgte DST i morges og fik intet nyt. Det er en
    // forsinket publicering, ikke noget der skal undersøges.
    const a = afgoerForsinkelse(
      { sidstLykket: timerSiden(5), sidstFejlet: null, nyesteSkrevet: timerSiden(24 * 85) },
      NU
    );
    assert.equal(a.kind, "PUBLICATION_LATE");
    assert.equal(a.action, "JUSTER_TAERSKEL");
  });

  test("ingen registreret hentning og gammel observation: forældet", () => {
    // Den halvdel man glemmer. Uden spor af en nylig hentning må det
    // ikke blive til "forsinket hos kilden".
    const a = afgoerForsinkelse(
      { sidstLykket: null, sidstFejlet: null, nyesteSkrevet: timerSiden(24 * 85) },
      NU
    );
    assert.equal(a.kind, "DATA_STALE");
    assert.equal(a.action, "UNDERSOEG");
  });

  test("en nyligt skrevet observation tæller som hentning", () => {
    // Serier der kommer gennem broen har ingen ingest_runs, men en
    // observation skrevet i går er bevis nok på at der blev hentet.
    const a = afgoerForsinkelse(
      { sidstLykket: null, sidstFejlet: null, nyesteSkrevet: timerSiden(20) },
      NU
    );
    assert.equal(a.kind, "PUBLICATION_LATE");
  });

  test("fejlet efter seneste lykkede: kørsel fejlede, ikke forsinket", () => {
    const a = afgoerForsinkelse(
      {
        sidstLykket: timerSiden(30),
        sidstFejlet: { at: timerSiden(5), besked: "HTTP 429" },
        nyesteSkrevet: timerSiden(24 * 40),
      },
      NU
    );
    assert.equal(a.kind, "SYNC_FAILED");
    if (a.kind === "SYNC_FAILED") assert.equal(a.besked, "HTTP 429");
  });

  test("en gammel fejl efterfulgt af en lykket hentning tæller ikke", () => {
    const a = afgoerForsinkelse(
      {
        sidstLykket: timerSiden(5),
        sidstFejlet: { at: timerSiden(30), besked: "ECONNRESET" },
        nyesteSkrevet: timerSiden(24 * 40),
      },
      NU
    );
    assert.equal(a.kind, "PUBLICATION_LATE");
  });

  test("grænsen ligger hvor konstanten siger", () => {
    const lige = afgoerForsinkelse(
      { sidstLykket: timerSiden(NYLIG_HENTNING_TIMER), sidstFejlet: null, nyesteSkrevet: timerSiden(999) },
      NU
    );
    const over = afgoerForsinkelse(
      { sidstLykket: timerSiden(NYLIG_HENTNING_TIMER + 1), sidstFejlet: null, nyesteSkrevet: timerSiden(999) },
      NU
    );
    assert.equal(lige.kind, "PUBLICATION_LATE");
    assert.equal(over.kind, "DATA_STALE");
  });
});
