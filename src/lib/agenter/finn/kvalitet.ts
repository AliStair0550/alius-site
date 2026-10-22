// ============================================================
// Ugentligt kvalitetstjek af Finns analyser
//
// Selvtjekket sikrer at tallene passer. Det siger intet om, hvorvidt
// pointen holder, sammenligningen er fair, eller det er relevant. Det
// tjek findes her, i to dele:
//
//   Målinger, i kode: hvor meget selvtjekket fjernede, gentagne områder,
//   medietemaer uden kommentar, områder uden holdbar analyse, pris.
//
//   Vurderinger, af Sonnet: hvert afsnit holdt op mod de data det selv
//   henviser til, på fire kriterier fra 1 til 5. Det er en models
//   vurdering af en models tekst. Den bruges til at finde det der skal
//   læses af et menneske, ikke som facit.
//
// Rene funktioner. Scriptet henter og gemmer, se scripts/finn-kvalitet.ts.
// ============================================================

import { z } from "zod";
import type { Analyse, Afsnit } from "./analyse";
import type { Post } from "../kilder/typer";

export type Dag = {
  dato: string;
  analyse: Analyse;
  costUsd: number;
  /** Trace-trin af typerne "punkt" og "fjernet", til at tælle selvtjekkets fjernelser. */
  skrevet: number;
  fjernet: number;
};

export type Maalinger = {
  dage: number;
  omraader: { dato: string; omraade: string | null }[];
  /** Dage hvor dagens område var det samme som dagen før. */
  gentagelser: number;
  /** Dage uden en holdbar dagens analyse. */
  udenDagens: number;
  afsnitSkrevet: number;
  afsnitFjernet: number;
  medietemaer: number;
  medietemaerUdenKommentar: number;
  /** Gennemsnitligt antal områder med en holdbar analyse per dag, ud af syv. */
  omraaderMedAnalyse: number;
  prisUsd: number;
};

export function maal(dage: Dag[]): Maalinger {
  const sorteret = [...dage].sort((a, b) => a.dato.localeCompare(b.dato));
  const omraader = sorteret.map((d) => ({ dato: d.dato, omraade: d.analyse.dagens?.omraade ?? null }));
  let gentagelser = 0;
  for (let i = 1; i < omraader.length; i++) {
    if (omraader[i].omraade && omraader[i].omraade === omraader[i - 1].omraade) gentagelser++;
  }
  const medier = sorteret.flatMap((d) => d.analyse.medier);
  return {
    dage: sorteret.length,
    omraader,
    gentagelser,
    udenDagens: omraader.filter((o) => !o.omraade).length,
    afsnitSkrevet: sorteret.reduce((s, d) => s + d.skrevet, 0),
    afsnitFjernet: sorteret.reduce((s, d) => s + d.fjernet, 0),
    medietemaer: medier.length,
    medietemaerUdenKommentar: medier.filter((m) => !m.kommentar).length,
    omraaderMedAnalyse: sorteret.length ? Math.round((sorteret.reduce((s, d) => s + Object.keys(d.analyse.omraader).length, 0) / sorteret.length) * 10) / 10 : 0,
    prisUsd: Math.round(sorteret.reduce((s, d) => s + d.costUsd, 0) * 10000) / 10000,
  };
}

export type AfsnitTilVurdering = { sted: string; tekst: string; kilder: string[] };

/** Alt Finn skrev den dag, som afsnit med deres kilder. */
export function afsnitTilVurdering(a: Analyse): AfsnitTilVurdering[] {
  const ud: AfsnitTilVurdering[] = [];
  const af = (sted: string, x: Afsnit) => ud.push({ sted, tekst: x.tekst, kilder: x.kilder.map((k) => k.id) });
  if (a.dagens) {
    const d = a.dagens;
    const sigerKilder = [...new Set(d.hvadTalleneSiger.flatMap((x) => x.kilder.map((k) => k.id)))];
    ud.push({ sted: `Dagens analyse (${d.omraade}), tese`, tekst: `${d.overskrift}. ${d.tese}`, kilder: sigerKilder });
    d.hvadTalleneSiger.forEach((x, i) => af(`Dagens analyse, hvad tallene siger ${i + 1}`, x));
    ud.push({ sted: "Dagens analyse, hvad det betyder", tekst: `Virksomhed: ${d.hvadDetBetyder.virksomhed} Husholdning: ${d.hvadDetBetyder.husholdning}`, kilder: sigerKilder });
    d.holdOeje.forEach((x, i) => af(`Dagens analyse, hold øje med ${i + 1}`, x));
  }
  for (const [noegle, o] of Object.entries(a.omraader)) {
    o?.afsnit.forEach((x, i) => af(`Område ${noegle}, afsnit ${i + 1}`, x));
  }
  for (const m of a.medier) if (m.kommentar) af(`Medietema "${m.titel}"`, m.kommentar);
  return ud;
}

/** En post som én linje til vurderingen. Det samme Finn så, i kort form. */
export function dataLinje(p: Post): string {
  if (p.type === "nyhed") return `${p.id} | nyhed | ${p.titel} | ${p.dato.slice(0, 10)}`;
  const s = p.sammenligning;
  const a = p.sammenligningAar;
  return [
    `${p.id} | ${p.navn} | ${p.periode} | ${p.vaerdiTekst} ${p.enhed} | sæson: ${p.saeson}`,
    s ? `${s.aendringTekst} mod ${s.slags} (${s.periode})` : null,
    a ? `${a.aendringTekst} mod ${a.slags} (${a.periode})` : null,
    p.tendens,
    p.usaedvanlighed?.tekst,
    p.kontekst,
  ]
    .filter(Boolean)
    .join(" | ");
}

export const KRITERIER = ["pointe", "sammenligning", "relevans", "klarhed"] as const;

export const VurderingSkema = z.object({
  vurderinger: z.array(
    z.object({
      nummer: z.number(),
      pointe: z.number(),
      sammenligning: z.number(),
      relevans: z.number(),
      klarhed: z.number(),
      problem: z.string().nullable(),
    })
  ),
  samlet: z.string(),
});

export type Vurdering = { sted: string; tekst: string; pointe: number; sammenligning: number; relevans: number; klarhed: number; problem: string | null };

export type DagsVurdering = { dato: string; samlet: string; vurderinger: Vurdering[]; /** Afsnit modellen ikke svarede på. Siges, ikke skjules. */ ubesvaret: string[] };

/** Gennemsnit per kriterium og de svageste afsnit (et kriterium på 2 eller lavere). */
export function opsummer(dage: DagsVurdering[]): {
  antal: number;
  snit: Record<(typeof KRITERIER)[number], number | null>;
  svage: (Vurdering & { dato: string })[];
  ubesvaret: number;
} {
  const alle = dage.flatMap((d) => d.vurderinger.map((v) => ({ ...v, dato: d.dato })));
  const snit = Object.fromEntries(
    KRITERIER.map((k) => [k, alle.length ? Math.round((alle.reduce((s, v) => s + v[k], 0) / alle.length) * 10) / 10 : null])
  ) as Record<(typeof KRITERIER)[number], number | null>;
  const svage = alle
    .filter((v) => KRITERIER.some((k) => v[k] <= 2))
    .sort((a, b) => Math.min(...KRITERIER.map((k) => a[k])) - Math.min(...KRITERIER.map((k) => b[k])));
  return { antal: alle.length, snit, svage, ubesvaret: dage.reduce((s, d) => s + d.ubesvaret.length, 0) };
}

/** Holder en score inden for 1 til 5. En model der svarer 0 eller 7, er rettet, ikke troet. */
export function score(v: number): number {
  return Math.max(1, Math.min(5, Math.round(v)));
}
