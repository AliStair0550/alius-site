// ============================================================
// Adapter: Eurostat
//
// JSON-stat 2.0. Formatet er anderledes end DST's: værdier ligger i
// et fladt objekt indekseret på position, og perioderne findes i
// dimension.time.category.index.
// ============================================================

import {
  eurostatPeriodToDate,
  type FetchedPoint,
  type SeriesDef,
  type SourceAdapter,
} from "./types";

const BASE = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data";

type JsonStat = {
  label?: string;
  value?: Record<string, number | null>;
  dimension?: Record<string, { category?: { index?: Record<string, number> } }>;
  id?: string[];
  size?: number[];
};

export class EurostatAdapter implements SourceAdapter {
  readonly source = "EUROSTAT" as const;

  async fetchSeries(def: SeriesDef): Promise<FetchedPoint[]> {
    const p = def.eurostat;
    if (!p) throw new Error(`${def.id}: mangler eurostat-parametre`);

    const qs = new URLSearchParams({ format: "JSON", ...p.params });
    const url = `${BASE}/${p.dataflow}?${qs.toString()}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) {
      throw new Error(`${def.id}: Eurostat svarede HTTP ${res.status} for ${p.dataflow}`);
    }
    const j = (await res.json()) as JsonStat;

    const timeIndex = j.dimension?.time?.category?.index;
    if (!timeIndex) {
      throw new Error(
        `${def.id}: ingen time-dimension i svaret. Dimensioner: ` +
          `${Object.keys(j.dimension ?? {}).join(", ")}`
      );
    }
    if (!j.value) throw new Error(`${def.id}: svaret har ingen value-blok`);

    // Alle øvrige dimensioner er bundet til én værdi via params, så
    // positionen i value-objektet er tidsindekset. Hvis en dimension
    // ikke er bundet, ville flere serier blandes sammen - så fejl.
    const sizes = j.size ?? [];
    const ids = j.id ?? [];
    const unbound = ids.filter((dimId, i) => dimId !== "time" && (sizes[i] ?? 1) > 1);
    if (unbound.length > 0) {
      throw new Error(
        `${def.id}: dimensionerne [${unbound.join(", ")}] har flere værdier. ` +
          `Bind dem i params, ellers blandes flere serier sammen.`
      );
    }

    const points: FetchedPoint[] = [];
    for (const [period, idx] of Object.entries(timeIndex)) {
      const date = eurostatPeriodToDate(period);
      if (!date) throw new Error(`${def.id}: ukendt periodeformat "${period}"`);
      const raw = j.value[String(idx)];
      // area_code er vores geografiske dimension, ikke seriens emne.
      // At serien handler om Tyskland ligger i serie-identiteten.
      points.push({ period: date, areaCode: "DK", value: raw ?? null });
    }

    const withValue = points.filter((x) => x.value !== null);
    if (withValue.length === 0) {
      throw new Error(
        `${def.id}: ${p.dataflow} gav ${points.length} perioder uden en eneste værdi`
      );
    }

    return points.sort((a, b) => a.period.getTime() - b.period.getTime());
  }
}
