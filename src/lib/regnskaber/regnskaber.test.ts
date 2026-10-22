import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { laesEsef, maaneder } from "./esef";
import { kontroller, planlaeg, sammeNavn } from "./plan";
import type { Selskab } from "../../../config/selskaber";

function xbrl(opt: { valuta?: string; omsaetning?: string; navn?: string; ekstra?: string; aktiver?: string } = {}): string {
  const v = opt.valuta ?? "USD";
  return `<?xml version="1.0"?>
<xbrli:xbrl xmlns:xbrli="http://www.xbrl.org/2003/instance" xmlns:ifrs-full="https://xbrl.ifrs.org/taxonomy/2024-03-27/ifrs-full" xmlns:iso4217="http://www.xbrl.org/2003/iso4217" xmlns:xbrldi="http://xbrl.org/2006/xbrldi">
  <xbrli:context id="q2"><xbrli:entity><xbrli:identifier scheme="x">1</xbrli:identifier></xbrli:entity><xbrli:period><xbrli:startDate>2026-04-01</xbrli:startDate><xbrli:endDate>2026-06-30</xbrli:endDate></xbrli:period></xbrli:context>
  <xbrli:context id="q2f"><xbrli:entity><xbrli:identifier scheme="x">1</xbrli:identifier></xbrli:entity><xbrli:period><xbrli:startDate>2025-04-01</xbrli:startDate><xbrli:endDate>2025-06-30</xbrli:endDate></xbrli:period></xbrli:context>
  <xbrli:context id="seg"><xbrli:entity><xbrli:identifier scheme="x">1</xbrli:identifier><xbrli:segment><xbrldi:explicitMember dimension="a">b</xbrldi:explicitMember></xbrli:segment></xbrli:entity><xbrli:period><xbrli:startDate>2026-04-01</xbrli:startDate><xbrli:endDate>2026-06-30</xbrli:endDate></xbrli:period></xbrli:context>
  <xbrli:context id="nu"><xbrli:entity><xbrli:identifier scheme="x">1</xbrli:identifier></xbrli:entity><xbrli:period><xbrli:instant>2026-06-30</xbrli:instant></xbrli:period></xbrli:context>
  <xbrli:unit id="u"><xbrli:measure>iso4217:${v}</xbrli:measure></xbrli:unit>
  <ifrs-full:NameOfReportingEntityOrOtherMeansOfIdentification contextRef="nu">${opt.navn ?? "A.P. Møller - Mærsk A/S"}</ifrs-full:NameOfReportingEntityOrOtherMeansOfIdentification>
  <ifrs-full:Assets contextRef="nu" unitRef="u" decimals="-6">${opt.aktiver ?? "75000000000"}</ifrs-full:Assets>
  <ifrs-full:Revenue contextRef="q2" unitRef="u" decimals="-6">${opt.omsaetning ?? "15757000000"}</ifrs-full:Revenue>
  <ifrs-full:Revenue contextRef="q2f" unitRef="u" decimals="-6">13132000000</ifrs-full:Revenue>
  <ifrs-full:Revenue contextRef="seg" unitRef="u" decimals="-6">9000000000</ifrs-full:Revenue>
  <ifrs-full:ProfitLoss contextRef="q2" unitRef="u" decimals="-6">-120000000</ifrs-full:ProfitLoss>
  <ifrs-full:ProfitLoss contextRef="q2" unitRef="u" decimals="-6">-120000000</ifrs-full:ProfitLoss>
  ${opt.ekstra ?? ""}
</xbrli:xbrl>`;
}

const maersk: Selskab = { cvr: "22756214", navn: "A.P. Møller - Mærsk", navnIRegnskab: "A.P. Møller - Mærsk A/S", valuta: "USD" };

describe("ESEF: læsning", () => {
  test("koncernens tal læses med periode og valuta; segmenter og dubletter springes over", () => {
    const l = laesEsef(xbrl());
    assert.equal(l.navn, "A.P. Møller - Mærsk A/S");
    const oms = l.fakta.filter((f) => f.begreb === "omsaetning");
    assert.deepEqual(oms.map((f) => [f.start, f.vaerdi, f.valuta]), [["2026-04-01", 15757000000, "USD"], ["2025-04-01", 13132000000, "USD"]]);
    assert.equal(l.fakta.filter((f) => f.begreb === "resultat").length, 1, "samme tal to gange er ét tal");
    assert.equal(l.fakta.find((f) => f.begreb === "resultat")!.vaerdi, -120000000);
  });

  test("navnet afkodes og mellemrum samles", () => {
    assert.equal(laesEsef(xbrl({ navn: "FLSmidth &amp; Co.  A/S" })).navn, "FLSmidth & Co. A/S");
  });

  test("en ukendt valuta kaster i stedet for at blive gættet", () => {
    assert.throws(() => laesEsef(xbrl({ valuta: "CHF" })), /ukendt enhed "iso4217:CHF"/);
  });

  test("regnskabet modsiger sig selv: tallet skrives ikke, og det siges hvilket", () => {
    // Vestas' halvår 2024 havde både -231 mio. og -156 mio. under samme periode.
    const ekstra = `<ifrs-full:ProfitLoss contextRef="q2" unitRef="u" decimals="-6">-130000000</ifrs-full:ProfitLoss>`;
    const l = laesEsef(xbrl({ ekstra }));
    assert.equal(l.fakta.filter((f) => f.begreb === "resultat").length, 0);
    assert.equal(l.konflikter.length, 1);
    assert.match(l.konflikter[0], /ProfitLoss 2026-04-01..2026-06-30: -120000000 og -130000000 USD/);
    assert.equal(l.fakta.filter((f) => f.begreb === "omsaetning").length, 2, "resten af regnskabet bruges stadig");
  });

  test("afrunding mellem to tabeller er samme tal, og det mest præcise bruges", () => {
    // Zealand Pharma: -228.647.000 og -228.648.000 for samme kvartal.
    const ekstra = `<ifrs-full:ProfitLoss contextRef="q2" unitRef="u" decimals="0">-120000400</ifrs-full:ProfitLoss>`;
    const l = laesEsef(xbrl({ ekstra: ekstra.replace("-120000400", "-120000400") }).replace(/(ProfitLoss contextRef="q2" unitRef="u" decimals=)"-6">-120000000/g, '$1"-3">-120000000'));
    assert.equal(l.konflikter.length, 0);
    assert.equal(l.fakta.find((f) => f.begreb === "resultat")!.vaerdi, -120000400);
  });

  test("navn med markup inde i", () => {
    assert.equal(laesEsef(xbrl({ navn: 'FLSmidt<span xmlns="http://www.w3.org/1999/xhtml" class="_ _0"/>h &amp; Co. A/S' })).navn, "FLSmidth & Co. A/S");
  });

  test("et kvartal er tre måneder, et halvår seks", () => {
    assert.equal(maaneder("2026-04-01", "2026-06-30"), 3);
    assert.equal(maaneder("2026-01-01", "2026-06-30"), 6);
    assert.equal(maaneder("2025-10-01", "2026-09-30"), 12);
  });
});

describe("ESEF: værn mod tal der ser rigtige ud", () => {
  test("Mærsk i dollar går igennem, når dollar er erklæret", () => {
    assert.doesNotThrow(() => kontroller(maersk, laesEsef(xbrl())));
  });

  test("den fejl værnet findes for: dollar læst som kroner", () => {
    assert.throws(() => kontroller({ ...maersk, valuta: "DKK" }, laesEsef(xbrl())), /regnskabet er i USD, erklæret er DKK/);
  });

  test("forkert CVR: et andet selskabs navn i regnskabet", () => {
    assert.throws(() => kontroller(maersk, laesEsef(xbrl({ navn: "Novo Nordisk A/S" }))), /Forkert CVR/);
  });

  test("selskabets egne navnevarianter godtages, et andet selskabs navn gør ikke", () => {
    assert.ok(sammeNavn("PANDORAA/S", "Pandora A/S"));
    assert.ok(sammeNavn("DSV A/S,DSV A/S", "DSV A/S"));
    assert.ok(sammeNavn("GN Store Nord A/S", "GN Store Nord"));
    assert.ok(sammeNavn("Novozymes A/S, part of Novonesis Group", "Novozymes A/S"));
    assert.ok(!sammeNavn("Novo Nordisk A/S", "Novozymes A/S"));
    assert.ok(!sammeNavn("A/S", "Pandora A/S"), "et bart A/S må ikke matche");
  });

  test("et regnskab uden navn godtages kun når et nyere har bekræftet CVR'et", () => {
    const uden = { ...laesEsef(xbrl()), navn: null };
    assert.throws(() => kontroller(maersk, uden), /intet navn/);
    assert.doesNotThrow(() => kontroller(maersk, uden, true));
  });

  test("en fil i tusinder mærket som hele enheder stoppes på aktiverne", () => {
    // Netcompanys Q4-meddelelse 2023: årets omsætning stod som 6.078.400 kr.
    assert.throws(() => kontroller(maersk, laesEsef(xbrl({ aktiver: "75000000", omsaetning: "15757000" }))), /forkert skala/);
  });

  test("en lille omsætning er lovlig, når aktiverne har den rigtige skala", () => {
    // Zealand Pharmas 3. kvartal 2024: 4,4 mio. kr. i omsætning, reelt.
    assert.doesNotThrow(() => kontroller(maersk, laesEsef(xbrl({ omsaetning: "4415000" }))));
  });

  test("uden aktiver kan skalaen ikke efterprøves, og intet skrives", () => {
    assert.throws(() => kontroller(maersk, { ...laesEsef(xbrl()), aktiver: [] }), /ingen samlede aktiver/);
  });

  test("uden omsætning skrives intet, heller ikke resultatet", () => {
    const uden = laesEsef(xbrl());
    assert.throws(() => kontroller(maersk, { ...uden, fakta: uden.fakta.filter((f) => f.begreb !== "omsaetning") }), /ingen omsætning/);
  });
});

describe("ESEF: revision", () => {
  const f = { begreb: "omsaetning" as const, element: "Revenue", start: "2025-04-01", slut: "2025-06-30", vaerdi: 13132000000, valuta: "USD" as const };

  test("nyt tal skrives, ens tal skrives ikke igen, ændret tal er en revision", () => {
    assert.equal(planlaeg([], [f]).nye.length, 1);
    assert.equal(planlaeg([{ ...f }], [f]).uaendret, 1);
    const r = planlaeg([{ ...f, vaerdi: 13000000000 }], [f]);
    assert.equal(r.revideret.length, 1);
    assert.equal(r.revideret[0].foer, 13000000000);
  });

  test("et valutaskifte er ikke en revision", () => {
    assert.throws(() => planlaeg([{ ...f, valuta: "DKK" }], [f]), /valutaskifte/);
  });
});
