import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { klassificer, laesKalender } from "./kalender";

// Uddrag af de rigtige meddelelser, hentet 22. oktober 2026.
const DSV =
  "This financial calendar lists the expected dates of publication of financial announcements and the Annual General Meeting in the 2027 financial year for DSV A/S: 2 February 2027 Annual Report 2026 18 March 2027 Annual General Meeting 2027. Any proposals for the agenda of the Annual General Meeting must be received no later than 3 February 2027. 21 April 2027 Interim Financial Report, First Quarter 2027 21 July 2027 Interim Financial Report, H1 2027 27 October 2027 Interim Financial Report, Third Quarter 2027 Contacts Investor Relations";
const MAERSK =
  "Halvårsmeddelelsen vil blive offentliggjort den 13. august 2026 og ikke som tidligere nævnt i selskabets finanskalender den 6. august 2026. Herefter er selskabets finanskalender for resten af 2026 som følger: A.P. Møller - Mærsk A/S forventer at offentliggøre Halvårsmeddelelse den 13. august 2026 Kvartalsrapport for 3. kvartal den 5. november 2026 København, den 7. maj 2026 Kontaktperson";
const ROCKWOOL =
  "Finanskalender for 2026 Følgende større begivenheder finder sted i vores finanskalender 2026: Stilleperiode før 4. kvartal 21. december 2025 - 4. februar 2026 Årsrapport for 2025 4. februar 2026 Sidste frist for aktionærerne til at stille forslag til Dagsordenen til den ordinære generalforsamling 3. marts 2026 Ordinær generalforsamling 15. april 2026 Udbytte for 2025 til rådighed for aktionærerne 20. april 2026 Stilleperiode før 1. kvartal 4. april - 19. maj 2026 Regnskabsmeddelelse for første kvartal 2026 19. maj 2026 Stilleperiode før 2. kvartal 5. juli - 19. august 2026 Regnskabsmeddelelse for første halvår 2026 19. august 2026 Stilleperiode før 3. kvartal 11. oktober - 25. november 2026 Regnskabsmeddelelse for 3. kvartal 2026 25. november 2026 Kontakt";
const DEMANT =
  "3. december 2025 Finanskalender for 2026 21. januar Frist for indlevering af emner til dagsordenen for den ordinære generalforsamling * 13. januar til 2. februar Stilleperiode forud for offentliggørelse af Annual Report 2025 (årsrapport for 2025) 3. februar Årsrapport 2025 5. marts Ordinær generalforsamling 15. april til 5. maj Stilleperiode forud for offentliggørelse af periodemeddelelse 5. maj Periodemeddelelse for Q1 2026 22. juli til 11. august Stilleperiode forud for offentliggørelse af Interim Report 2026 (halvårsrapport for 2026) 11. august Halvårsrapport 2026 14. oktober til 3. november Stilleperiode forud for offentliggørelse af periodemeddelelse 3. november Periodemeddelelse for Q3 2026 * Såfremt en generalforsamling ikke kan afholdes som planlagt, offentliggøres en ny dato.";

const kun = (k: ReturnType<typeof laesKalender>) => k.map((p) => `${p.dato} ${p.begivenhed}`);

describe("Finanskalendere", () => {
  test("DSV: begivenheden efter datoen; generalforsamling og frister er ikke regnskaber", () => {
    assert.deepEqual(kun(laesKalender(DSV, "2026-10-05")), [
      "2027-02-02 Årsrapport",
      "2027-04-21 Delårsrapport",
      "2027-07-21 Halvårsrapport",
      "2027-10-27 Delårsrapport",
    ]);
  });

  test("Mærsk: 'den' foran datoen betyder at begivenheden står før", () => {
    assert.deepEqual(kun(laesKalender(MAERSK, "2026-05-07")), ["2026-08-13 Halvårsrapport", "2026-11-05 Delårsrapport"]);
  });

  test("ROCKWOOL: stilleperioder er ikke begivenheder, heller ikke deres slutdato", () => {
    assert.deepEqual(kun(laesKalender(ROCKWOOL, "2025-12-05")), [
      "2026-02-04 Årsrapport",
      "2026-05-19 Delårsrapport",
      "2026-08-19 Halvårsrapport",
      "2026-11-25 Delårsrapport",
    ]);
  });

  test("Demant: datoer uden årstal får kalenderens år", () => {
    assert.deepEqual(kun(laesKalender(DEMANT, "2025-12-03")), [
      "2026-02-03 Årsrapport",
      "2026-05-05 Delårsrapport",
      "2026-08-11 Halvårsrapport",
      "2026-11-03 Delårsrapport",
    ]);
  });

  test("en delårsrapport er ikke en årsrapport, selvom ordet står i den", () => {
    assert.equal(klassificer("Delårsrapport for de første ni måneder af 2026"), "Delårsrapport");
    assert.equal(klassificer("Årsrapport 2025"), "Årsrapport");
  });

  test("datoer før udgivelsen og ugyldige datoer bruges ikke", () => {
    assert.deepEqual(laesKalender("Annual Report 2025 3 February 2025", "2025-12-01"), []);
    assert.deepEqual(laesKalender("31 February 2027 Annual Report 2026", "2026-10-01"), []);
  });
});
