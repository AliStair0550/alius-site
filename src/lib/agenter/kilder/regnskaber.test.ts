import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { aaretFoer, periodeMaaneder, postForIndlevering, type Raekke } from "./regnskaber";
import { tilladteTal } from "../finn/selvtjek";
import type { Selskab } from "../../../../config/selskaber";

const maersk: Selskab = { cvr: "22756214", navn: "A.P. Møller - Mærsk", navnIRegnskab: "A.P. Møller - Mærsk A/S", valuta: "USD" };
const r = (begreb: string, start: string, slut: string, vaerdi: number, sag = "NY"): Raekke => ({
  cvr: maersk.cvr, begreb, start, slut, vaerdi, valuta: "USD", sagsNummer: sag, indleveringSlags: "HALVAARSRAPPORT", offentliggjort: "2026-08-13T10:00:00.000Z",
});

describe("Regnskaber som Finn læser dem", () => {
  test("perioder skrives som måneder, også når regnskabsåret starter i oktober", () => {
    assert.equal(periodeMaaneder("2026-04-01", "2026-06-30"), "april til juni 2026");
    assert.equal(periodeMaaneder("2025-10-01", "2026-06-30"), "oktober 2025 til juni 2026");
  });

  test("året før bevarer månedens sidste dag", () => {
    assert.equal(aaretFoer("2026-06-30"), "2025-06-30");
    assert.equal(aaretFoer("2024-02-29"), "2023-02-28");
    assert.equal(aaretFoer("2025-02-28"), "2024-02-29");
  });

  test("kvartalet vælges frem for halvåret, i egen valuta, med året før", () => {
    const alle = [
      r("omsaetning", "2026-04-01", "2026-06-30", 15_757_000_000),
      r("omsaetning", "2026-01-01", "2026-06-30", 28_727_000_000),
      r("omsaetning", "2025-04-01", "2025-06-30", 13_132_000_000, "GAMMEL"),
      r("resultat", "2026-04-01", "2026-06-30", -120_000_000),
      r("resultat", "2025-04-01", "2025-06-30", 400_000_000, "GAMMEL"),
    ];
    const p = postForIndlevering(maersk, "NY", alle)!;
    assert.equal(p.periode, "april til juni 2026");
    assert.equal(p.enhed, "mio. dollar");
    assert.equal(p.vaerdi, 15757);
    assert.equal(p.sammenligning!.aendringTekst, "+20,0 procent");
    assert.match(p.kontekst!, /Resultatet efter skat var -120 mio\. dollar mod 400 mio\. dollar/);
    assert.match(p.kontekst!, /egen regnskabsvaluta, dollar/);
    // Selvtjekket skal godtage tallene i posten og konteksten.
    const ok = tilladteTal(p);
    for (const t of [15757, 13132, 20, 120, 400]) assert.ok(ok.some((v) => Math.abs(v) === t), `${t} skal kunne spores`);
  });

  test("uden året før er der ingen sammenligning, ikke en forkert", () => {
    const p = postForIndlevering(maersk, "NY", [r("omsaetning", "2026-04-01", "2026-06-30", 15_757_000_000)])!;
    assert.equal(p.sammenligning, null);
  });

  test("en indlevering uden omsætning giver ingen post", () => {
    assert.equal(postForIndlevering(maersk, "NY", [r("resultat", "2026-04-01", "2026-06-30", 1)]), null);
  });
});
