// ============================================================
// Tests: parsing, enhedskonvertering og revisionshåndtering
//
// Run with: npm test
//
// Bruger Node's indbyggede testrunner. Ingen ny afhængighed.
// ============================================================

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  assertUnitRange,
  dstPeriodToDate,
  eurostatPeriodToDate,
  toUtcMidnight,
} from "./types";
import { computeZ, toMonthly, WINDOW_YEARS } from "../pulse-zscore";
import { erRevision } from "../pulse-observations";
import { UNIT_RANGES } from "./types";
import { SERIES } from "../../../config/series";

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

// ----------------------------------------------------------------
describe("DST: periodeparsing", () => {
  test("måned, kvartal, år og dag", () => {
    assert.equal(iso(dstPeriodToDate("2026M06")), "2026-06-01");
    assert.equal(iso(dstPeriodToDate("2026K1")), "2026-01-01");
    assert.equal(iso(dstPeriodToDate("2026K4")), "2026-10-01");
    assert.equal(iso(dstPeriodToDate("2025")), "2025-01-01");
    assert.equal(iso(dstPeriodToDate("2026M07D24")), "2026-07-24");
  });

  test("ukendt format giver null, ikke en gættet dato", () => {
    assert.equal(dstPeriodToDate("2026Q1"), null);
    assert.equal(dstPeriodToDate("juni 2026"), null);
    assert.equal(dstPeriodToDate(""), null);
  });

  test("dagsperiode forveksles ikke med månedsperiode", () => {
    // 2026M07D24 må ikke tolkes som juli 2026. Fejlen ville flytte
    // 10.000 valutaobservationer til den første i måneden.
    assert.notEqual(iso(dstPeriodToDate("2026M07D24")), iso(dstPeriodToDate("2026M07")));
  });
});

describe("Eurostat: periodeparsing", () => {
  test("måned, kvartal og år", () => {
    assert.equal(iso(eurostatPeriodToDate("2026-06")), "2026-06-01");
    assert.equal(iso(eurostatPeriodToDate("2026Q2")), "2026-04-01");
    assert.equal(iso(eurostatPeriodToDate("2026")), "2026-01-01");
  });
  test("ukendt format giver null", () => {
    assert.equal(eurostatPeriodToDate("2026M06"), null);
  });
});

describe("EDS: tidsstempel til døgn", () => {
  test("time og kvarter lander på samme døgn", () => {
    assert.equal(iso(toUtcMidnight("2025-09-30T21:00:00")), "2025-09-30");
    assert.equal(iso(toUtcMidnight("2026-07-28T21:45:00")), "2026-07-28");
  });

  test("døgnets første timer bliver i døgnet, uanset maskinens tidszone", () => {
    // Den her fejlede lydløst indtil 28. juli 2026. EDS' TimeUTC har
    // hverken Z eller offset, og new Date() på sådan en streng tolker
    // den som lokal tid. På en maskine i København røg de to første
    // timer af hvert UTC-døgn over i døgnet før, og døgngennemsnittet
    // blev fem til femten procent forkert.
    //
    // De to gamle prøver ovenfor lå 21:00 og 21:45 og overlevede
    // forskydningen. Fejlen viser sig kun her.
    assert.equal(iso(toUtcMidnight("2026-07-27T00:00:00")), "2026-07-27");
    assert.equal(iso(toUtcMidnight("2026-07-27T00:15:00")), "2026-07-27");
    assert.equal(iso(toUtcMidnight("2026-07-27T01:45:00")), "2026-07-27");
    // Vintertid: én times forskydning i stedet for to.
    assert.equal(iso(toUtcMidnight("2026-01-15T00:30:00")), "2026-01-15");
  });

  test("eksplicit tidszone respekteres frem for at blive overskrevet", () => {
    assert.equal(iso(toUtcMidnight("2026-07-27T00:15:00Z")), "2026-07-27");
    // 00:15 i UTC+2 er 22:15 UTC dagen før, og så ER det døgnet før.
    assert.equal(iso(toUtcMidnight("2026-07-27T00:15:00+02:00")), "2026-07-26");
  });

  test("et tidsstempel der ikke kan læses kaster frem for at give et døgn", () => {
    assert.throws(() => toUtcMidnight("ikke en dato"), /kan læses/);
  });
});

// ----------------------------------------------------------------
describe("Enhedskonvertering", () => {
  test("DNVALD skaleres fra DKK pr. 100 enheder til DKK pr. 1", () => {
    const usd = SERIES.find((s) => s.id === "dst.valuta.usd");
    assert.ok(usd, "dst.valuta.usd findes i config");
    assert.equal(usd.dst?.valueScale, 0.01);
    // 640,25 DKK pr. 100 USD skal blive 6,4025 DKK pr. USD
    assert.equal(640.25 * (usd.dst!.valueScale ?? 1), 6.4025);
  });

  test("serier uden skalering rører ikke værdien", () => {
    const rente = SERIES.find((s) => s.id === "dst.rente.erhverv.nye");
    assert.ok(rente);
    const scale = rente.dst?.valueScale ?? 1;
    assert.equal(3.471 * scale, 3.471);
  });

  // DNVALD leverer to slags serier, og de skal behandles modsat.
  // KURTYP=KBH er kurser i DKK pr. 100 enheder og skal skaleres.
  // KURTYP=INX er et indeks med basis 1980=100 og må IKKE skaleres:
  // ganges det med 0,01 bliver 104 til 1,04, og fejlen ville se ud som
  // en plausibel valutakurs i stedet for at fejle højlydt.
  test("bilaterale valutakurser skaleres, ingen glemt", () => {
    const par = SERIES.filter((s) => s.dst?.filters.KURTYP?.includes("KBH"));
    assert.equal(par.length, 4, "fire valutapar, PLN udgår");
    for (const s of par) {
      assert.equal(s.dst?.valueScale, 0.01, `${s.id} mangler valueScale`);
      assert.equal(s.unit, "dkk_per_enhed");
    }
  });

  test("den effektive kronekurs er et indeks og skaleres ikke", () => {
    const inx = SERIES.filter((s) => s.dst?.filters.KURTYP?.includes("INX"));
    assert.equal(inx.length, 1);
    assert.equal(inx[0].dst?.valueScale, undefined, "et indeks må ikke skaleres");
    assert.equal(inx[0].unit, "indeks_1980");
  });

  test("nævnere er ikke rangerbare uden begrundelse", () => {
    for (const s of SERIES) {
      if (s.rankable === false) {
        assert.ok(
          s.rankableReason && s.rankableReason.length > 20,
          `${s.id} er fravalgt uden en brugbar begrundelse`
        );
      }
    }
  });
});

// ----------------------------------------------------------------
describe("Værn mod plausible forkerte værdier", () => {
  test("den fejl der næsten skete: indeks ganget med 0,01", () => {
    // Effektiv kronekurs omkring 104. Ganges den fejlagtigt med 0,01
    // bliver den 1,04, hvilket ligner en plausibel valutakurs.
    assert.throws(
      () => assertUnitRange("dst.valuta.effektiv", "indeks_1980", [1.04]),
      /uden for hvad enheden/,
      "1,04 skal afvises som indeks, uanset at det ligner en kurs"
    );
    // Og den rigtige værdi skal slippe igennem
    assert.doesNotThrow(() => assertUnitRange("dst.valuta.effektiv", "indeks_1980", [104.2]));
  });

  test("den modsatte fejl: kurs uden skalering", () => {
    // DNVALD leverer 640,25 DKK pr. 100 USD. Glemmes skaleringen,
    // står der 640 kroner per dollar.
    assert.throws(
      () => assertUnitRange("dst.valuta.usd", "dkk_per_enhed", [640.25]),
      /uden for hvad enheden/
    );
    assert.doesNotThrow(() => assertUnitRange("dst.valuta.usd", "dkk_per_enhed", [6.4025]));
  });

  test("rente i basispunkter i stedet for procent", () => {
    assert.throws(() => assertUnitRange("dst.rente.erhverv.nye", "pct", [347]), /uden for/);
    assert.doesNotThrow(() => assertUnitRange("dst.rente.erhverv.nye", "pct", [3.47]));
  });

  test("negative værdier er lovlige hvor de giver mening", () => {
    assert.doesNotThrow(() => assertUnitRange("x", "nettotal", [-18.6]));
    assert.doesNotThrow(() => assertUnitRange("x", "pct", [-0.47]));
    assert.doesNotThrow(() => assertUnitRange("x", "dkk_mwh", [-120]));
  });

  test("null og NaN springes over frem for at fejle", () => {
    assert.doesNotThrow(() => assertUnitRange("x", "pct", [null, NaN, 3.1]));
  });

  test("ukendt enhed giver intet værn, men heller ingen falsk tryghed", () => {
    assert.doesNotThrow(() => assertUnitRange("x", "en_enhed_der_ikke_findes", [1e12]));
  });

  test("alle enheder i config har et interval", () => {
    const uden: string[] = [];
    for (const s of SERIES) {
      if (!(s.unit in UNIT_RANGES)) uden.push(`${s.id} (${s.unit})`);
    }
    assert.deepEqual(uden, [], "enheder uden interval har intet værn");
  });
});

// ----------------------------------------------------------------
describe("Config: integritet", () => {
  test("serie-id'er er unikke", () => {
    const ids = SERIES.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  test("hver serie har præcis ét sæt kildeparametre", () => {
    for (const s of SERIES) {
      const n = [s.dst, s.eds, s.eurostat].filter(Boolean).length;
      assert.equal(n, 1, `${s.id} har ${n} sæt kildeparametre`);
    }
  });

  test("kildeparametrene matcher source-feltet", () => {
    for (const s of SERIES) {
      if (s.source === "DST") assert.ok(s.dst, `${s.id}`);
      if (s.source === "EDS") assert.ok(s.eds, `${s.id}`);
      if (s.source === "EUROSTAT") assert.ok(s.eurostat, `${s.id}`);
    }
  });

  test("elprisens to datasæt overlapper ikke", () => {
    for (const s of SERIES.filter((x) => x.eds)) {
      const [gammel, ny] = s.eds!.datasets;
      assert.ok(gammel.toInclusive, `${s.id}: gammelt datasæt mangler slutdato`);
      assert.ok(ny.fromInclusive, `${s.id}: nyt datasæt mangler startdato`);
      assert.ok(
        gammel.toInclusive! < ny.fromInclusive!,
        `${s.id}: datasættene overlapper, observationer ville tælles to gange`
      );
    }
  });
});

// ----------------------------------------------------------------
describe("Revisionshåndtering: kun ændringer nogen mener noget med", () => {
  // Den ægte funktion, ikke en kopi af reglen. Testen lå tidligere med
  // sin egen (a.toFixed(6) !== b.toFixed(6)), og to steder der regner
  // det samme er før eller siden uenige.

  test("float-støj er ikke en revision", () => {
    assert.equal(erRevision(3.1, 3.1000000000000005), false);
    assert.equal(erRevision(0.1 + 0.2, 0.3), false);
  });

  test("den afrundingsvippe der begrundede tolerancen", () => {
    // Elprisen for DK1 den 26. august 2022. Den eksakte middelværdi er
    // 5246,28959149999999, ni milliardtedele under afrundingsgrænsen,
    // så de to lovlige afrundinger afviger med 1e-6. To kørsler måtte
    // ikke skiftes til at revidere hinanden på den.
    assert.equal(erRevision(5246.289591, 5246.289592), false);
  });

  test("en ægte ændring er en revision", () => {
    assert.equal(erRevision(3.1, 3.2), true);
    assert.equal(erRevision(1464, 1470), true);
    // EDS' otte en halv procent, den mindste ægte revision vi har set.
    assert.equal(erRevision(917.264769, 994.926492), true);
  });

  test("tolerancen følger niveauet, ikke et fast tal", () => {
    // Samme absolutte forskel: støj på en ejendomsværdi, revision på
    // en valutakurs.
    assert.equal(erRevision(2662528, 2662528.2), false);
    assert.equal(erRevision(6.5601, 6.5603), true);
  });

  test("hver enhed har luft i begge retninger", () => {
    // Niveau, og den mindste ændring kilden overhovedet kan publicere.
    const tilfaelde: Array<[string, number, number]> = [
      ["pct", 3.47, 0.01],
      ["nettotal", 14.7, 0.1],
      ["indeks", 105.4, 0.1],
      ["antal", 153, 1],
      ["m2", 165037, 1],
      ["dkk", 2662528, 1],
      ["dkk_per_enhed", 6.5601, 0.0001],
      ["dkk_mwh", 5246, 0.01],
    ];
    for (const [navn, niveau, mindste] of tilfaelde) {
      assert.equal(
        erRevision(niveau, niveau + mindste),
        true,
        `${navn}: den mindste ægte ændring skal fanges`
      );
      // Float-akkumulering over hundrede led ligger langt under det her.
      assert.equal(
        erRevision(niveau, niveau + niveau * 1e-10),
        false,
        `${navn}: float-støj må ikke tælle`
      );
    }
  });

  test("nul mod nul er ingen revision, men nul mod noget er", () => {
    // Nettotal kan lovligt være nul, og der falder en relativ tolerance
    // sammen. Den absolutte bund holder den fra at sluge alt.
    assert.equal(erRevision(0, 0), false);
    assert.equal(erRevision(0, 0.1), true);
    assert.equal(erRevision(0, 1e-12), false);
  });
});

// ----------------------------------------------------------------
describe("Z-score: sammenlignelighed på tværs af historiklængde", () => {
  /**
   * Serie med fast månedlig kadence og kendt støj.
   *
   * Støjen er forankret til KALENDEREN, ikke til seriens startpunkt.
   * To serier med forskellig længde har derfor nøjagtig samme værdi i
   * samme måned, og forskellen i z kan kun komme fra vinduet. Det er
   * præcis det påstanden handler om.
   */
  function makeSeries(years: number, amplitude: number): { period: Date; value: number }[] {
    const out: { period: Date; value: number }[] = [];
    const endKey = 2026 * 12 + 6; // juli 2026
    for (let k = endKey - years * 12 + 1; k <= endKey; k++) {
      const d = new Date(Date.UTC(Math.floor(k / 12), k % 12, 1));
      const noise = Math.sin(k * 1.7) + Math.sin(k * 0.31);
      out.push({ period: d, value: 100 + noise * amplitude });
    }
    return out;
  }

  const now = new Date(Date.UTC(2026, 6, 1));

  test("kort og lang historik giver z i samme størrelsesorden", () => {
    const kort = computeZ(makeSeries(11, 5), "level", { now });
    const lang = computeZ(makeSeries(30, 5), "level", { now });
    assert.ok(kort.rankable && lang.rankable);
    // Samme vindue betyder samme antal måneder uanset hvor lang
    // historikken er. Det er hele pointen.
    assert.equal(kort.monthsUsed, lang.monthsUsed);
    assert.ok(
      Math.abs(kort.z - lang.z) < 0.01,
      `z skal være ens: kort=${kort.z} lang=${lang.z}`
    );
  });

  test("vinduet er det samme uanset hvor meget historik der findes", () => {
    const r = computeZ(makeSeries(30, 5), "level", { now });
    assert.ok(r.rankable);
    assert.ok(
      r.monthsUsed <= WINDOW_YEARS * 12 + 1,
      `brugte ${r.monthsUsed} måneder, vinduet er ${WINDOW_YEARS} år`
    );
  });

  test("en serie med for lidt dækning rangeres ikke, men siger hvorfor", () => {
    const r = computeZ(makeSeries(2, 5), "level", { now });
    assert.equal(r.rankable, false);
    if (!r.rankable) {
      assert.equal(r.reason, "for_lidt_daekning");
      assert.ok(r.coverage < 0.8);
    }
  });

  test("tom serie giver en begrundelse, ikke z = 0", () => {
    const r = computeZ([], "level", { now });
    assert.equal(r.rankable, false);
    if (!r.rankable) assert.equal(r.reason, "ingen_observationer");
  });

  test("flad serie rangeres ikke i stedet for at dividere med nul", () => {
    const flad = Array.from({ length: 140 }, (_, i) => ({
      period: new Date(Date.UTC(2015 + Math.floor(i / 12), i % 12, 1)),
      value: 42,
    }));
    const r = computeZ(flad, "level", { now });
    assert.equal(r.rankable, false);
    if (!r.rankable) assert.equal(r.reason, "ingen_spredning");
  });

  test("daglig serie giver ikke systematisk større z end månedlig", () => {
    // Samme underliggende månedsforløb, men den ene målt hver dag.
    const maanedlig = makeSeries(12, 4);
    const daglig: { period: Date; value: number }[] = [];
    for (const m of maanedlig) {
      for (let d = 0; d < 28; d++) {
        daglig.push({
          period: new Date(m.period.getTime() + d * 86_400_000),
          value: m.value + Math.sin(d) * 0.4,
        });
      }
    }
    const a = computeZ(maanedlig, "level", { now });
    const b = computeZ(daglig, "level", { now });
    assert.ok(a.rankable && b.rankable);
    assert.ok(
      Math.abs(a.z - b.z) < 0.3,
      `resampling skal udligne frekvens: månedlig=${a.z} daglig=${b.z}`
    );
  });

  test("trendserie: yoy fjerner trenden, level gør ikke", () => {
    // Eksponentiel trend: konstant VÆKSTRATE. En ret linje har
    // aftagende procentvækst, og så ville yoy fange faldet i vækstraten
    // i stedet for at fjerne trenden. Indeksserier vokser eksponentielt.
    const trend = Array.from({ length: 160 }, (_, i) => ({
      period: new Date(Date.UTC(2013 + Math.floor(i / 12), i % 12, 1)),
      value: 100 * Math.pow(1.004, i),
    }));
    const level = computeZ(trend, "level", { now });
    const yoy = computeZ(trend, "yoy", { now });
    assert.ok(level.rankable && yoy.rankable);
    // På niveau ligger seneste punkt yderst i fordelingen, hver måned,
    // for evigt. Med robust spredning topper det omkring 1,35 for en
    // ret rampe, men det er stadig et permanent falsk signal.
    assert.ok(level.z > 1.0, `level-z burde være markant positiv, var ${level.z}`);
    // På årsændring er væksten konstant, altså ikke usædvanlig
    assert.ok(Math.abs(yoy.z) < 0.5, `yoy-z burde være nær nul, var ${yoy.z}`);
    assert.ok(
      level.z > Math.abs(yoy.z) * 2,
      `level skal være klart mere alarmerende end yoy: ${level.z} mod ${yoy.z}`
    );
  });

  test("break_at afkorter vinduet", () => {
    const s = makeSeries(20, 5);
    const uden = computeZ(s, "level", { now });
    const med = computeZ(s, "level", { now, breakAt: new Date(Date.UTC(2024, 0, 1)) });
    assert.ok(uden.rankable && med.rankable);
    assert.ok(
      med.monthsUsed < uden.monthsUsed,
      `bruddet skal afkorte: ${med.monthsUsed} mod ${uden.monthsUsed}`
    );
  });

  test("brud tæt på nu gør serien urangerbar frem for at regne på tre punkter", () => {
    const s = makeSeries(20, 5);
    const r = computeZ(s, "level", { now, breakAt: new Date(Date.UTC(2026, 3, 1)) });
    assert.equal(r.rankable, false);
    if (!r.rankable) assert.equal(r.reason, "for_lidt_daekning");
  });
});

describe("Z-score: resampling", () => {
  test("daglige værdier midles inden for måneden", () => {
    const obs = [
      { period: new Date(Date.UTC(2026, 0, 1)), value: 10 },
      { period: new Date(Date.UTC(2026, 0, 15)), value: 20 },
      { period: new Date(Date.UTC(2026, 1, 1)), value: 100 },
    ];
    const m = toMonthly(obs);
    assert.equal(m.get(2026 * 12 + 0), 15);
    assert.equal(m.get(2026 * 12 + 1), 100);
  });

  test("kvartalsserie bæres frem, så dækningen ikke undervurderes", () => {
    const obs = [
      { period: new Date(Date.UTC(2026, 0, 1)), value: 10 },
      { period: new Date(Date.UTC(2026, 3, 1)), value: 20 },
    ];
    const m = toMonthly(obs);
    assert.equal(m.get(2026 * 12 + 1), 10, "februar bærer januars værdi");
    assert.equal(m.get(2026 * 12 + 2), 10, "marts bærer januars værdi");
    assert.equal(m.get(2026 * 12 + 3), 20, "april har sin egen");
  });

  test("hul over et år bæres ikke frem", () => {
    const obs = [
      { period: new Date(Date.UTC(2020, 0, 1)), value: 10 },
      { period: new Date(Date.UTC(2026, 0, 1)), value: 20 },
    ];
    const m = toMonthly(obs);
    assert.equal(m.has(2023 * 12 + 5), false, "et hul på seks år er manglende data");
  });
});
