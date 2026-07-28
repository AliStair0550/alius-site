// ============================================================
// Adapter: Danmarks Statistik
//
// Dækker også Nationalbankens tabeller (DNVALD, DNRUGPI, DNRUURI),
// som republiceres i DST's statistikbank. Nationalbanken har ingen
// egen REST-API; se docs/pulse-kildeverifikation-fase-1.md afsnit 1.
// ============================================================

import { getTableMetadata, getTableData, type DSTFilter } from "../dst";
import {
  assertUnitRange,
  dstPeriodToDate,
  type FetchedPoint,
  type SeriesDef,
  type SourceAdapter,
} from "./types";

export class DstAdapter implements SourceAdapter {
  readonly source = "DST" as const;

  async fetchSeries(
    def: SeriesDef,
    opts: { since?: Date | null } = {}
  ): Promise<FetchedPoint[]> {
    const p = def.dst;
    if (!p) throw new Error(`${def.id}: mangler dst-parametre`);

    const meta = await getTableMetadata(def.sourceRef);

    // En konfigureret kode der ikke findes hos kilden må ikke forsvinde
    // lydløst. Det er samme fejl som de seks DB07-koder i DETA211A.
    for (const [dimCode, wanted] of Object.entries(p.filters)) {
      const dim = meta.variables.find(
        (v) => v.code.toUpperCase() === dimCode.toUpperCase()
      );
      if (!dim) {
        throw new Error(
          `${def.id}: dimensionen "${dimCode}" findes ikke i ${def.sourceRef}. ` +
            `Tabellen har: ${meta.variables.map((v) => v.code).join(", ")}`
        );
      }
      const have = new Set(dim.values.map((v) => v.code));
      const missing = wanted.filter((w) => w !== "*" && !have.has(w));
      if (missing.length > 0) {
        throw new Error(
          `${def.id}: koderne [${missing.join(", ")}] findes ikke i ` +
            `${def.sourceRef}.${dim.code} (${dim.values.length} værdier). ` +
            `Kilden har sandsynligvis omlagt. Ret config, lad dem ikke falde bort.`
        );
      }
    }

    const tidVar = meta.variables.find((v) => v.code.toUpperCase() === "TID");
    if (!tidVar) throw new Error(`${def.id}: ingen Tid-dimension i ${def.sourceRef}`);

    // Uden `since` bedes der om hele tidsdimensionen. Med `since`
    // udpeges de enkelte perioder, fordi DST ikke har et "fra og med".
    let tidValues: string[] = ["*"];
    if (opts.since) {
      const siden = opts.since.getTime();
      const uparsbare: string[] = [];
      tidValues = tidVar.values
        .filter((v) => {
          const d = dstPeriodToDate(v.code);
          if (!d) { uparsbare.push(v.code); return false; }
          return d.getTime() >= siden;
        })
        .map((v) => v.code);

      // En periodekode vi ikke kan læse er ikke en periode der ikke
      // findes. Falder formatet om, skal kørslen stoppe, ikke hente
      // et tilfældigt udsnit.
      if (uparsbare.length > 0) {
        throw new Error(
          `${def.id}: ${uparsbare.length} periodekoder i ${def.sourceRef} kunne ikke ` +
            `tolkes, fx "${uparsbare.slice(0, 3).join('", "')}". Periodeformatet er ændret.`
        );
      }

      // Tabellen har perioder, men ingen i vinduet. Det er ikke det
      // samme som en tom tabel, og det er ikke en fejl: en kvartalsserie
      // kan sagtens ligge stille i to måneder.
      if (tidValues.length === 0) {
        console.log(
          `      ${def.id}: ${def.sourceRef} har ingen perioder siden ` +
            `${opts.since.toISOString().slice(0, 10)}. Nyeste hos kilden er ` +
            `${tidVar.values[tidVar.values.length - 1]?.code ?? "ukendt"}.`
        );
        return [];
      }
    }

    const filters: DSTFilter[] = [
      ...Object.entries(p.filters).map(([code, values]) => ({ code, values })),
      { code: tidVar.code, values: tidValues },
    ];

    const raw = await getTableData(def.sourceRef, filters);
    const scale = p.valueScale ?? 1;
    const points: FetchedPoint[] = [];
    const badPeriods: string[] = [];
    let zeroAsMissing = 0;

    for (const r of raw) {
      const period = dstPeriodToDate(r.period);
      if (!period) { badPeriods.push(r.period); continue; }
      let value = r.value === null ? null : r.value * scale;
      if (p.zeroIsMissing && value === 0) { value = null; zeroAsMissing++; }
      points.push({ period, areaCode: "DK", value });
    }

    if (zeroAsMissing > 0) {
      console.log(
        `      ${def.id}: ${zeroAsMissing} nulværdier oversat til "ingen observation" ` +
          `(kilden koder manglende notering som 0)`
      );
    }

    if (badPeriods.length > 0) {
      throw new Error(
        `${def.id}: ${badPeriods.length} perioder kunne ikke tolkes, ` +
          `fx "${badPeriods.slice(0, 3).join('", "')}". Periodeformatet er ændret.`
      );
    }

    // En serie uden observationer er en fejl, ikke et tomt resultat.
    // MPK3 lærte os at en levende tabel kan have døde serier.
    //
    // Men kun ved fuld hentning. I et vindue på tres dage kan en
    // månedsserie sagtens have nul værdier, fordi den næste endnu ikke
    // er publiceret. At kaste dér ville gøre "ikke publiceret endnu"
    // til "serien er udgået", og det er stale-alarmens spørgsmål, ikke
    // hentningens.
    const withValue = points.filter((x) => x.value !== null);
    if (withValue.length === 0) {
      if (!opts.since) {
        throw new Error(
          `${def.id}: ${def.sourceRef} svarede med ${points.length} perioder, ` +
            `men ingen af dem har en værdi. Serien er sandsynligvis udgået.`
        );
      }
      console.log(
        `      ${def.id}: ${points.length} perioder i vinduet, ingen med værdi endnu.`
      );
    }

    // Værn mod plausible forkerte værdier. Skaleringen er allerede
    // anvendt; her tjekkes at resultatet overhovedet kan være enheden.
    assertUnitRange(def.id, def.unit, points.map((p) => p.value));

    return points.sort((a, b) => a.period.getTime() - b.period.getTime());
  }
}
