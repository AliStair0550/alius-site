import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { sammenlign, periodeTekst, type Punkt } from "./pulse";
import { laesFeed } from "./rss";

const m = (aar: number, md: number, v: number): Punkt => ({ period: new Date(Date.UTC(aar, md - 1, 1)), value: v });
// Nyeste først: januar 2026 og tolv måneder bagud.
const konkurser = [m(2026, 1, 300), m(2025, 12, 150), m(2025, 11, 160), m(2025, 10, 170), m(2025, 9, 160), m(2025, 8, 140), m(2025, 7, 120), m(2025, 6, 150), m(2025, 5, 155), m(2025, 4, 160), m(2025, 3, 165), m(2025, 2, 170), m(2025, 1, 250)];

describe("Sammenligning efter sæsonkorrektion", () => {
  test("en rå serie sammenlignes med samme måned året før, ikke med måneden før", () => {
    // Januar har altid mange konkurser. Mod december ligner det en
    // fordobling; mod januar året før er det +20 procent.
    const s = sammenlign(konkurser, "MONTHLY", "ikke korrigeret", "antal")!;
    assert.equal(s.slags, "samme periode året før");
    assert.equal(s.periode, "januar 2025");
    assert.equal(s.aendring, 20);
  });

  test("ukendt sæsonkorrektion behandles som rå", () => {
    assert.equal(sammenlign(konkurser, "MONTHLY", "ukendt", "antal")!.slags, "samme periode året før");
  });

  test("en sæsonkorrigeret serie sammenlignes med forrige måned", () => {
    const s = sammenlign([m(2026, 9, 2.9), m(2026, 8, 2.8)], "MONTHLY", "korrigeret", "pct")!;
    assert.equal(s.slags, "forrige periode");
    assert.equal(s.aendringEnhed, "procentpoint");
    assert.equal(s.aendring, 0.1);
  });

  test("en sats ændrer sig i point, en mængde i procent", () => {
    const rente = sammenlign([m(2026, 9, 3.4), m(2026, 8, 3.0)], "MONTHLY", "ikke relevant", "pct")!;
    assert.equal(rente.aendringEnhed, "procentpoint");
    const indeks = sammenlign([m(2026, 9, 110), m(2026, 8, 100)], "MONTHLY", "ikke relevant", "indeks")!;
    assert.equal(indeks.aendringEnhed, "procent");
    assert.equal(indeks.aendring, 10);
  });

  test("mangler samme periode året før, er der ingen sammenligning frem for en forkert", () => {
    assert.equal(sammenlign([m(2026, 1, 300), m(2025, 12, 150)], "MONTHLY", "ikke korrigeret", "antal"), null);
  });

  test("daglige serier sammenlignes med forrige notering", () => {
    const d = (dag: number, v: number): Punkt => ({ period: new Date(Date.UTC(2026, 9, dag)), value: v });
    assert.equal(sammenlign([d(20, 6.4), d(17, 6.3)], "DAILY", "ikke relevant", "dkk_per_enhed")!.slags, "forrige notering");
  });

  test("perioder skrives på dansk efter frekvens", () => {
    assert.equal(periodeTekst(new Date(Date.UTC(2026, 3, 1)), "QUARTERLY"), "2. kvartal 2026");
    assert.equal(periodeTekst(new Date(Date.UTC(2026, 8, 1)), "MONTHLY"), "september 2026");
    assert.equal(periodeTekst(new Date(Date.UTC(2026, 9, 20)), "DAILY"), "20. oktober 2026");
  });
});

describe("RSS", () => {
  test("kun overskrift, link og dato læses; beskrivelsen ignoreres", () => {
    const xml = `<rss><channel><item><title><![CDATA[Renten stiger &amp; falder]]></title><link>https://x.dk/a</link>
      <description>ARTIKELTEKST DER IKKE MÅ GEMMES</description><pubDate>Tue, 20 Oct 2026 06:00:00 GMT</pubDate></item></channel></rss>`;
    const { poster } = laesFeed(xml, "test");
    assert.equal(poster.length, 1);
    assert.equal(poster[0].titel, "Renten stiger & falder");
    assert.ok(!JSON.stringify(poster).includes("ARTIKELTEKST"));
  });

  test("et punkt uden læsbar dato springes over og tælles", () => {
    const xml = `<item><title>A</title><link>https://x.dk/a</link><pubDate>i går</pubDate></item>`;
    assert.deepEqual(laesFeed(xml, "test"), { poster: [], udenDato: 1 });
  });
});

describe("RSS-overskrifter på Alius' sider", () => {
  test("lange tankestreger bliver til almindelig bindestreg", () => {
    const xml = `<item><title>Krisen i nettet — kan vare i årevis</title><link>https://x.dk/a</link><pubDate>Tue, 20 Oct 2026 06:00:00 GMT</pubDate></item>`;
    assert.equal(laesFeed(xml, "t").poster[0].titel, "Krisen i nettet - kan vare i årevis");
  });
});
