// ============================================================
// Beregning af afledte serier
//
// Ren funktion, adskilt fra scripts/build-derived.ts, så omregningen
// kan prøves uden database.
//
// VÆRNET
//
// En afledt serie er en omregning: a / b ganget med en skala. Glemmes
// skalaen på et mængdeindeks, bliver 105 til 1,05. Det ligner stadig et
// tal, og ingen stale-alarm fanger det. Se CLAUDE.md om plausible
// forkerte værdier.
//
// Derfor kontrolleres størrelsesordenen her, efter omregningen og før
// noget skrives, mod enhedens interval i UNIT_RANGES. En enhed uden
// interval afvises: en afledt serie er altid en omregning, så den skal
// altid have et værn.
// ============================================================

import type { DerivedDef } from "../../config/derived";
import { UNIT_RANGES, assertUnitRange, type FetchedPoint } from "./adapters/types";

const noegle = (areaCode: string, period: Date) =>
  `${areaCode}::${period.toISOString().slice(0, 10)}`;

export type Raekke = { areaCode: string; period: Date; value: number };

export type Beregning = {
  points: FetchedPoint[];
  udenModpart: number;
  nulINaevneren: number;
};

export function beregnAfledt(def: DerivedDef, a: Raekke[], b: Raekke[]): Beregning {
  if (!UNIT_RANGES[def.unit]) {
    throw new Error(
      `${def.id}: enheden "${def.unit}" har intet interval i UNIT_RANGES. ` +
        `En afledt serie er en omregning og må ikke skrives uden værn.`
    );
  }

  const bMap = new Map(b.map((r) => [noegle(r.areaCode, r.period), r.value]));
  const scale = def.scale ?? 1;
  const points: FetchedPoint[] = [];
  let udenModpart = 0;
  let nulINaevneren = 0;

  for (const r of a) {
    const bv = bMap.get(noegle(r.areaCode, r.period));
    if (bv === undefined) { udenModpart++; continue; }
    if (def.kind === "ratio" && bv === 0) { nulINaevneren++; continue; }
    points.push({
      period: r.period,
      areaCode: r.areaCode,
      value: def.kind === "ratio" ? (r.value / bv) * scale : (r.value - bv) * scale,
    });
  }

  points.sort((x, y) => x.period.getTime() - y.period.getTime());

  // Kaster ved første værdi uden for intervallet. Så skrives intet.
  assertUnitRange(def.id, def.unit, points.map((p) => p.value));

  return { points, udenModpart, nulINaevneren };
}
