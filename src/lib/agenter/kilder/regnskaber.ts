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

/**
 * Posten for ét selskabs seneste indlevering. Ren funktion.
 * null når indleveringen ikke har omsætning for en periode der slutter på
 * regnskabets slutdato; det siges af kalderen.
 */
export function postForIndlevering(s: Selskab, sagsNummer: string, alle: Raekke[]): TalPost | null {
  const fra = alle.filter((r) => r.sagsNummer === sagsNummer);
  if (fra.length === 0) return null;
  const slut = fra.map((r) => r.slut).sort().at(-1)!;
  const oms = fra
    .filter((r) => r.begreb === "omsaetning" && r.slut === slut)
    .sort((a, b) => dage(a.start, a.slut) - dage(b.start, b.slut))[0];
  if (!oms) return null;

  // Sammenligningen findes i tabellen, uanset hvilken indlevering den kom fra.
  const sammeAarFoer = (begreb: string) =>
    alle.find((r) => r.begreb === begreb && r.start === aaretFoer(oms.start) && r.slut === aaretFoer(oms.slut));
  const ved = (begreb: string) => alle.find((r) => r.begreb === begreb && r.start === oms.start && r.slut === oms.slut);

  const enhed = `mio. ${VALUTANAVN[oms.valuta] ?? oms.valuta}`;
  const foer = sammeAarFoer("omsaetning");
  let sammenligning: Sammenligning | null = null;
  if (foer && foer.vaerdi !== 0) {
    const aendring = Math.round(((oms.vaerdi - foer.vaerdi) / Math.abs(foer.vaerdi)) * 1000) / 10;
    sammenligning = {
      slags: "samme periode året før",
      periode: periodeMaaneder(foer.start, foer.slut),
      vaerdi: mio(foer.vaerdi),
      vaerdiTekst: daTal(mio(foer.vaerdi), 0),
      aendring,
      aendringEnhed: "procent",
      aendringTekst: `${aendring > 0 ? "+" : ""}${daTal(aendring, 1)} procent`,
    };
  }

  const linje = (begreb: string, navn: string) => {
    const nu = ved(begreb);
    if (!nu) return null;
    const f = sammeAarFoer(begreb);
    return `${navn} var ${daTal(mio(nu.vaerdi), 0)} ${enhed}${f ? ` mod ${daTal(mio(f.vaerdi), 0)} ${enhed} samme periode året før` : ""}.`;
  };
  const kontekst = [
    linje("driftsresultat", "Driftsresultatet"),
    linje("resultat", "Resultatet efter skat"),
    oms.valuta !== "DKK" ? `Beløbene er i selskabets egen regnskabsvaluta, ${VALUTANAVN[oms.valuta] ?? oms.valuta}.` : null,
    `Indleveret til Erhvervsstyrelsen ${oms.offentliggjort.slice(0, 10)}; selskabets børsmeddelelse kom typisk tidligere.`,
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
    periode: periodeMaaneder(oms.start, oms.slut),
    vaerdi: mio(oms.vaerdi),
    vaerdiTekst: daTal(mio(oms.vaerdi), 0),
    sammenligning,
    forloeb: [],
    tendens: null,
    foersteGangSet: oms.offentliggjort,
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
