// ============================================================
// Børsnoterede selskabers regnskaber, som Finn læser dem
//
// Læser tabellen regnskabstal, som sync-regnskaber.ts fylder fra
// Erhvervsstyrelsen. Henter intet udefra.
//
// Én post per selskab der har indleveret et regnskab inden for vinduet:
// omsætningen for den korteste periode regnskabet dækker (helst et
// kvartal), ændringen mod samme periode året før, og resultatet som
// kontekst. Beløbene står i mio. i selskabets EGEN regnskabsvaluta og
// omregnes aldrig: Mærsks dollar er dollar.
//
// Perioder skrives som måneder, ikke kvartaler. Coloplast og Ambu har
// regnskabsår fra oktober, så deres "3. kvartal" er april til juni.
// ============================================================

import type { PrismaClient } from "@prisma/client";
import { SELSKABER, type Selskab } from "../../../../config/selskaber";
import type { Kilde, KildeSvar, Sammenligning, TalPost } from "./typer";

const VINDUE_DAGE = 10;

const MAANEDER = ["januar", "februar", "marts", "april", "maj", "juni", "juli", "august", "september", "oktober", "november", "december"];
const VALUTANAVN: Record<string, string> = { DKK: "kr.", EUR: "euro", USD: "dollar", SEK: "svenske kr.", NOK: "norske kr.", GBP: "pund" };

const daTal = (v: number, dec: number) => v.toLocaleString("da-DK", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const mio = (v: number) => Math.round(v / 1e6);

/** "april til juni 2026", "oktober 2025 til juni 2026". */
export function periodeMaaneder(start: string, slut: string): string {
  const [sa, sm] = start.split("-").map(Number);
  const [ea, em] = slut.split("-").map(Number);
  if (sa === ea && sm === em) return `${MAANEDER[sm - 1]} ${sa}`;
  return sa === ea ? `${MAANEDER[sm - 1]} til ${MAANEDER[em - 1]} ${ea}` : `${MAANEDER[sm - 1]} ${sa} til ${MAANEDER[em - 1]} ${ea}`;
}

/** Samme periode året før. Månedens sidste dag bevares (29. februar bliver 28.). */
export function aaretFoer(dato: string): string {
  const [a, m, d] = dato.split("-").map(Number);
  const sidste = new Date(Date.UTC(a - 1, m, 0)).getUTCDate();
  const erSidste = d === new Date(Date.UTC(a, m, 0)).getUTCDate();
  return `${a - 1}-${String(m).padStart(2, "0")}-${String(erSidste ? sidste : Math.min(d, sidste)).padStart(2, "0")}`;
}

export type Raekke = {
  cvr: string;
  begreb: string;
  start: string;
  slut: string;
  vaerdi: number;
  valuta: string;
  sagsNummer: string;
  indleveringSlags: string;
  offentliggjort: string;
};

const dage = (start: string, slut: string) => (Date.parse(`${slut}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000;

export type Beloeb = { start: string; slut: string; vaerdi: number };

/** Det der står i én indlevering, med sammenligningen året før. Ren data. */
export type Regnskabsudsnit = {
  sagsNummer: string;
  offentliggjort: string;
  valuta: string;
  omsaetning: Beloeb;
  omsaetningFoer: Beloeb | null;
  /** Ændring i procent mod samme periode året før, med én decimal. null uden året før. */
  aendring: number | null;
  driftsresultat: { nu: Beloeb; foer: Beloeb | null } | null;
  resultat: { nu: Beloeb; foer: Beloeb | null } | null;
};

/**
 * Omsætningen for den korteste periode der slutter på regnskabets
 * slutdato (helst et kvartal), og resten for samme periode. Sammenligningen
 * findes i tabellen, uanset hvilken indlevering den kom fra.
 * null når indleveringen ikke har omsætning for slutdatoen.
 */
export function udsnit(sagsNummer: string, alle: Raekke[]): Regnskabsudsnit | null {
  const fra = alle.filter((r) => r.sagsNummer === sagsNummer);
  if (fra.length === 0) return null;
  const slut = fra.map((r) => r.slut).sort().at(-1)!;
  const oms = fra
    .filter((r) => r.begreb === "omsaetning" && r.slut === slut)
    .sort((a, b) => dage(a.start, a.slut) - dage(b.start, b.slut))[0];
  if (!oms) return null;
  const b = (r: Raekke | undefined): Beloeb | null => (r ? { start: r.start, slut: r.slut, vaerdi: r.vaerdi } : null);
  const aarFoer = (begreb: string) => alle.find((r) => r.begreb === begreb && r.start === aaretFoer(oms.start) && r.slut === aaretFoer(oms.slut));
  const ved = (begreb: string) => alle.find((r) => r.begreb === begreb && r.start === oms.start && r.slut === oms.slut);
  const par = (begreb: string) => {
    const nu = ved(begreb);
    return nu ? { nu: b(nu)!, foer: b(aarFoer(begreb)) } : null;
  };
  const foer = aarFoer("omsaetning");
  return {
    sagsNummer,
    offentliggjort: oms.offentliggjort,
    valuta: oms.valuta,
    omsaetning: b(oms)!,
    omsaetningFoer: b(foer),
    aendring: foer && foer.vaerdi !== 0 ? Math.round(((oms.vaerdi - foer.vaerdi) / Math.abs(foer.vaerdi)) * 1000) / 10 : null,
    driftsresultat: par("driftsresultat"),
    resultat: par("resultat"),
  };
}

/** Selskabets nyeste indlevering der har omsætning. */
export function senesteUdsnit(alle: Raekke[]): Regnskabsudsnit | null {
  const sager = [...new Map(alle.map((r) => [r.sagsNummer, r.offentliggjort])).entries()].sort((a, b) => b[1].localeCompare(a[1]));
  for (const [sag] of sager) {
    const u = udsnit(sag, alle);
    if (u) return u;
  }
  return null;
}

export const valutaEnhed = (valuta: string) => `mio. ${VALUTANAVN[valuta] ?? valuta}`;

/**
 * Posten for ét selskabs seneste indlevering. Ren funktion.
 * null når indleveringen ikke har omsætning for en periode der slutter på
 * regnskabets slutdato; det siges af kalderen.
 */
export function postForIndlevering(s: Selskab, sagsNummer: string, alle: Raekke[]): TalPost | null {
  const u = udsnit(sagsNummer, alle);
  if (!u) return null;
  const enhed = valutaEnhed(u.valuta);
  const sammenligning: Sammenligning | null =
    u.aendring !== null && u.omsaetningFoer
      ? {
          slags: "samme periode året før",
          periode: periodeMaaneder(u.omsaetningFoer.start, u.omsaetningFoer.slut),
          vaerdi: mio(u.omsaetningFoer.vaerdi),
          vaerdiTekst: daTal(mio(u.omsaetningFoer.vaerdi), 0),
          aendring: u.aendring,
          aendringEnhed: "procent",
          aendringTekst: `${u.aendring > 0 ? "+" : ""}${daTal(u.aendring, 1)} procent`,
        }
      : null;
  const linje = (x: Regnskabsudsnit["resultat"], navn: string) =>
    x ? `${navn} var ${daTal(mio(x.nu.vaerdi), 0)} ${enhed}${x.foer ? ` mod ${daTal(mio(x.foer.vaerdi), 0)} ${enhed} samme periode året før` : ""}.` : null;
  const kontekst = [
    linje(u.driftsresultat, "Driftsresultatet"),
    linje(u.resultat, "Resultatet efter skat"),
    u.valuta !== "DKK" ? `Beløbene er i selskabets egen regnskabsvaluta, ${VALUTANAVN[u.valuta] ?? u.valuta}.` : null,
    `Indleveret til Erhvervsstyrelsen ${u.offentliggjort.slice(0, 10)}; selskabets børsmeddelelse kom typisk tidligere.`,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    type: "tal",
    id: `regnskab:${s.cvr}`,
    kilde: "regnskaber",
    navn: `${s.navn}, omsætning`,
    enhed,
    saeson: "ikke korrigeret",
    url: `https://datacvr.virk.dk/enhed/virksomhed/${s.cvr}`,
    periode: periodeMaaneder(u.omsaetning.start, u.omsaetning.slut),
    vaerdi: mio(u.omsaetning.vaerdi),
    vaerdiTekst: daTal(mio(u.omsaetning.vaerdi), 0),
    sammenligning,
    forloeb: [],
    tendens: null,
    foersteGangSet: u.offentliggjort,
    kontekst,
  };
}

export function regnskabKilde(prisma: PrismaClient): Kilde {
  return {
    id: "regnskaber",
    navn: "Erhvervsstyrelsen, børsnoterede selskabers regnskaber",
    version: 1,
    beskrivelse:
      `Omsætning, driftsresultat og resultat efter skat fra de regnskaber ${SELSKABER.length} store børsnoterede, ` +
      `ikke-finansielle selskaber har indleveret til Erhvervsstyrelsen de seneste ${VINDUE_DAGE} dage. Beløb i mio. i ` +
      `selskabets egen regnskabsvaluta, ikke omregnet. Ændringen er mod samme periode året før. Indleveringen kommer ` +
      `typisk dage til uger efter selskabets børsmeddelelse.`,
    async hent(dag: string): Promise<KildeSvar> {
      // Vinduet slutter med dagen selv, så en kørsel for en tidligere dag
      // ikke ser regnskaber der kom senere.
      const dagensSlut = new Date(Date.parse(`${dag}T00:00:00Z`) + 86_400_000);
      const graense = new Date(dagensSlut.getTime() - (VINDUE_DAGE + 1) * 86_400_000);
      const nye = await prisma.regnskabstal.findMany({
        where: { isCurrent: true, offentliggjort: { gte: graense, lt: dagensSlut } },
        distinct: ["cvr", "sagsNummer"],
        orderBy: { offentliggjort: "desc" },
        select: { cvr: true, sagsNummer: true },
      });
      const base = { kilde: this.id, navn: this.navn, url: "http://distribution.virk.dk/offentliggoerelser", hentet: new Date().toISOString() };
      // Kun den nyeste indlevering per selskab.
      const seneste = new Map<string, string>();
      for (const n of nye) if (!seneste.has(n.cvr)) seneste.set(n.cvr, n.sagsNummer);
      if (seneste.size === 0) {
        return { ...base, status: "tom", besked: `Ingen af de ${SELSKABER.length} selskaber har indleveret et regnskab de seneste ${VINDUE_DAGE} dage.`, poster: [] };
      }

      const poster: TalPost[] = [];
      const mangler: string[] = [];
      for (const [cvr, sag] of seneste) {
        const s = SELSKABER.find((x) => x.cvr === cvr);
        if (!s) {
          mangler.push(`CVR ${cvr} står i tabellen men ikke i config/selskaber.ts`);
          continue;
        }
        const alle = (
          await prisma.regnskabstal.findMany({
            where: { cvr, isCurrent: true },
            select: { cvr: true, begreb: true, periodeStart: true, periodeSlut: true, vaerdi: true, valuta: true, sagsNummer: true, indleveringSlags: true, offentliggjort: true },
          })
        ).map((r) => ({
          cvr: r.cvr,
          begreb: r.begreb,
          start: r.periodeStart.toISOString().slice(0, 10),
          slut: r.periodeSlut.toISOString().slice(0, 10),
          vaerdi: Number(r.vaerdi),
          valuta: r.valuta,
          sagsNummer: r.sagsNummer,
          indleveringSlags: r.indleveringSlags,
          offentliggjort: r.offentliggjort.toISOString(),
        }));
        const p = postForIndlevering(s, sag, alle);
        if (p) poster.push(p);
        else mangler.push(`${s.navn}: indleveringen ${sag} har ingen omsætning for regnskabets slutdato`);
      }
      return { ...base, status: "ok", ...(mangler.length ? { besked: mangler.join("; ") } : {}), poster };
    },
  };
}

/**
 * Hvor mange selskaber øgede omsætningen i deres seneste regnskab, og
 * medianen af ændringerne. Procent er valutaneutral, så Mærsks dollar og
 * Novos kroner kan tælles sammen; beløbene kan ikke.
 */
export function opsummerOversigt(aendringer: (number | null)[]): { med: number; hoejere: number; median: number | null } {
  const tal = aendringer.filter((x): x is number => x !== null).sort((a, b) => a - b);
  if (tal.length === 0) return { med: 0, hoejere: 0, median: null };
  const m = tal.length % 2 ? tal[(tal.length - 1) / 2] : (tal[tal.length / 2 - 1] + tal[tal.length / 2]) / 2;
  return { med: tal.length, hoejere: tal.filter((x) => x > 0).length, median: Math.round(m * 10) / 10 };
}
