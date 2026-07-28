// ============================================================
// Adapter: Energi Data Service (Energinet)
//
// Tre særtræk i forhold til DST:
//
//   1. Serien sammensættes af to datasæt. Elspotprices dækker
//      1999-06-30 til 2025-09-30, DayAheadPrices fra 2025-09-30 og frem.
//      Feltnavnene er forskellige i de to.
//   2. Der aggregeres til døgngennemsnit ved indlæsning. Elspotprices
//      er timeværdier, DayAheadPrices er kvarterværdier. Rådata gemmes
//      ikke. Besluttet i byggebriefens afsnit 3d, og beslutningen er
//      irreversibel.
//   3. EDS rate-limiter til cirka én side på 10.000 rækker per fire
//      minutter. Målt 27. juli 2026: med otte sekunder mellem sider blev
//      fire ud af fem afvist med 429 og en anvisning om at vente ~250
//      sekunder. Et fuldt backfill af DK1 er 23 sider, altså halvanden
//      time, og begge prisområder tager omkring tre en halv.
//
//      Derfor skriver adapteren undervejs og kan genoptages. En afbrudt
//      kørsel mister kun den side den var i gang med.
// ============================================================

import {
  toUtcMidnight,
  type BatchSink,
  type FetchedPoint,
  type SeriesDef,
  type SourceAdapter,
} from "./types";

const BASE = "https://api.energidataservice.dk/dataset";

/**
 * 10.000 er det største EDS accepterer. 50.000 og derover afvises med 429
 * uanset hvor længe man venter.
 */
const PAGE = 10_000;

/**
 * Pause mellem sider. Sat efter målt grænse: mindre end dette giver
 * næsten kun 429'ere, og straffen er dyrere end ventetiden.
 */
const PAGE_DELAY_MS = 240_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 429 er ikke "ingen data", det er "prøv igen". */
async function fetchPage(url: string, label: string, maxTries = 6): Promise<unknown> {
  for (let i = 1; i <= maxTries; i++) {
    const res = await fetch(url);
    const txt = await res.text();

    if (res.status === 429) {
      const m = txt.match(/again in (\d+)/);
      const secs = m ? Math.min(+m[1] + 5, 300) : 60;
      process.stdout.write(`      ${label}: 429, venter ${secs}s (forsøg ${i}/${maxTries})\n`);
      await sleep(secs * 1000);
      continue;
    }
    if (!res.ok) throw new Error(`${label}: HTTP ${res.status} ${txt.slice(0, 120)}`);
    try {
      return JSON.parse(txt);
    } catch {
      throw new Error(`${label}: uparsbart svar ${txt.slice(0, 120)}`);
    }
  }
  throw new Error(
    `${label}: opgav efter ${maxTries} forsøg. EDS rate-limiter; kør igen, ` +
      `kørslen genoptages hvor den slap.`
  );
}

type Row = Record<string, unknown>;

export class EdsAdapter implements SourceAdapter {
  readonly source = "EDS" as const;

  async fetchSeries(
    def: SeriesDef,
    opts: { onBatch?: BatchSink; resumeFrom?: Date | null; since?: Date | null } = {}
  ): Promise<FetchedPoint[]> {
    const p = def.eds;
    if (!p) throw new Error(`${def.id}: mangler eds-parametre`);

    const resumeMs = opts.resumeFrom?.getTime() ?? -Infinity;
    const all: FetchedPoint[] = [];

    // EDS' egen "start" afkorter hos kilden. Det er forskellen mellem
    // 23 sider med fire minutters pause imellem og én side: et fuldt
    // backfill af DK1 tager halvanden time, et tresdages vindue tager
    // sekunder. Uden det kan jobbet ikke køre dagligt.
    //
    // Der bedes om et DØGN MERE end vi vil bruge, og grunden er en
    // fælde: EDS filtrerer "start" på TimeDK, mens vi spander på
    // TimeUTC. Om sommeren er der to timers forskel, så det første
    // UTC-døgn i svaret kun får otte kvarter ud af seksioghalvfems.
    // Skrives det, står der et døgngennemsnit regnet på to timer, og
    // det ser ud som en almindelig elpris.
    const graenseMs = opts.since
      ? Date.UTC(
          opts.since.getUTCFullYear(),
          opts.since.getUTCMonth(),
          opts.since.getUTCDate()
        )
      : -Infinity;
    const startParam = opts.since
      ? `&start=${new Date(graenseMs - 86_400_000).toISOString().slice(0, 10)}T00:00`
      : "";

    // Døgnet vi står i er ikke færdigt. Et gennemsnit af de kvarter der
    // er nået at komme er et rigtigt regnestykke på et forkert grundlag.
    // Adapteren må kun sende FÆRDIGE perioder; se BatchSink i types.ts.
    const nu = new Date();
    const foersteUfaerdigeDoegn = Date.UTC(
      nu.getUTCFullYear(),
      nu.getUTCMonth(),
      nu.getUTCDate()
    );

    for (const ds of p.datasets) {
      // Et datasæt der slutter før vinduet begynder har intet at give.
      // At springe det over er ikke at skjule noget: Elspotprices er
      // lukket i 2025 og kan per definition ikke have nye tal.
      if (opts.since && ds.toInclusive && ds.toInclusive < opts.since.toISOString()) {
        continue;
      }
      // Døgnspande for netop dette datasæt. Et døgn er først færdigt når
      // vi har set en observation fra næste døgn.
      const daily = new Map<number, { sum: number; n: number }>();
      let offset = 0;
      let got = 0;

      for (;;) {
        const filter = encodeURIComponent(JSON.stringify({ PriceArea: [p.priceArea] }));
        const url =
          `${BASE}/${ds.name}?limit=${PAGE}&offset=${offset}` +
          `&sort=${encodeURIComponent(`${ds.timeField} ASC`)}&filter=${filter}` +
          startParam;
        const body = (await fetchPage(url, `${ds.name} ${p.priceArea} @${offset}`)) as {
          records?: Row[];
        };
        const records = body.records ?? [];
        if (records.length === 0) break;

        for (const rec of records) {
          const rawTime = rec[ds.timeField];
          if (typeof rawTime !== "string") {
            throw new Error(
              `${def.id}: feltet "${ds.timeField}" mangler i ${ds.name}. ` +
                `Rækken har: ${Object.keys(rec).join(", ")}`
            );
          }
          if (ds.fromInclusive && rawTime < ds.fromInclusive) continue;
          if (ds.toInclusive && rawTime > ds.toInclusive) continue;

          const day = toUtcMidnight(rawTime).getTime();
          if (day <= resumeMs) continue; // allerede gemt i en tidligere kørsel

          const rawVal = rec[ds.valueField];
          if (rawVal === undefined) {
            throw new Error(
              `${def.id}: feltet "${ds.valueField}" mangler i ${ds.name}. ` +
                `Rækken har: ${Object.keys(rec).join(", ")}`
            );
          }
          if (rawVal === null) continue;
          const value = Number(rawVal);
          if (!Number.isFinite(value)) continue;

          const acc = daily.get(day) ?? { sum: 0, n: 0 };
          acc.sum += value;
          acc.n += 1;
          daily.set(day, acc);
          got++;
        }

        offset += records.length;
        const done = records.length < PAGE;

        const days = [...daily.keys()].sort((a, b) => a - b);

        // Døgn under grænsen er det ekstra døgn vi bad om for at få det
        // første rigtige døgn helt med. Det er selv afkortet af EDS'
        // start-filter og må aldrig skrives. Ud af kortet med det samme,
        // ellers vurderes det igen ved hver side.
        for (const ms of days) {
          if (ms < graenseMs) daily.delete(ms);
        }

        // Flush alle døgn på nær det seneste, som stadig kan få flere
        // timer i næste side. Ved sidste side flushes også det seneste.
        // Døgnet vi står i holdes tilbage uanset: det er ikke slut.
        const tilbage = [...daily.keys()].sort((a, b) => a - b);
        const flushable = (done ? tilbage : tilbage.slice(0, -1)).filter(
          (ms) => ms < foersteUfaerdigeDoegn
        );

        if (flushable.length > 0) {
          const batch: FetchedPoint[] = flushable.map((ms) => {
            const acc = daily.get(ms)!;
            daily.delete(ms);
            return { period: new Date(ms), areaCode: "DK", value: acc.sum / acc.n };
          });
          all.push(...batch);
          if (opts.onBatch) await opts.onBatch(batch);
        }

        process.stdout.write(
          `      ${ds.name} ${p.priceArea}: ${offset} rækker, ${all.length} døgn gemt\n`
        );

        if (done) break;
        await sleep(PAGE_DELAY_MS);
      }

      // Nul rækker ved fuld hentning betyder at datasættet er tomt,
      // omdøbt eller filtreret forkert. Nul rækker i et tresdages
      // vindue betyder som regel bare at der ikke er kommet nye timer
      // endnu, og det er ikke en fejl.
      if (got === 0 && resumeMs === -Infinity && !opts.since) {
        throw new Error(
          `${def.id}: ${ds.name} gav nul brugbare observationer for ${p.priceArea}. ` +
            `Datasættet er tomt, omdøbt eller filtreret forkert.`
        );
      }
      if (got === 0 && opts.since) {
        process.stdout.write(
          `      ${ds.name} ${p.priceArea}: ingen nye timer siden ` +
            `${opts.since.toISOString().slice(0, 10)}\n`
        );
      }
    }

    return all.sort((a, b) => a.period.getTime() - b.period.getTime());
  }
}
