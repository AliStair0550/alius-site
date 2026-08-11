// ============================================================
// Delte opslag der ellers laves én gang per side
//
// PROBLEMET
//
// Ledighedsserien er 27.378 rækker, cirka 2,2 MB over ledningen. Den
// blev læst i sin helhed på /pulse/ledighed, på hver af de 98
// kommuneprofiler og på hver af de 98 ledighedssider, hver gang en af
// dem blev genskabt. Alle tre steder bruger den til det samme: at køre
// detektorerne og derefter filtrere til én kommune.
//
// Ét fuldt gennemløb af kommunesiderne var dermed omkring 430 MB, og
// Neons månedskvote er 5 GB. Femten gennemløb, og basen holder op med
// at svare.
//
// LØSNINGEN
//
// Beregningen cachees, ikke rådataene. Signalerne fylder nogle få
// kilobyte, og de 197 sider deler nu ét opslag og én beregning.
//
// Cachen ryddes af revalidateTag i /api/revalidate/pulse, som det
// daglige job kalder når det har skrevet. Den følger altså dataene og
// ikke et ur.
// ============================================================

import { unstable_cache } from "next/cache";
import { prisma } from "./db";
import { generateAllSignals } from "./signals/detectors";
import { generateKonkursSignals } from "./signals/konkurs-detectors";
import { hentPunkter, hentSenesteePerOmraade, type OmraadeVaerdi } from "./pulse-model";
import type { Signal } from "./signals/types";

/** Ét mærke for alt Pulse-data. Jobbet rydder det hele på én gang. */
export const PULSE_TAG = "pulse-data";

/**
 * Et døgn. Dataene ændrer sig én gang dagligt, og jobbet rydder cachen
 * eksplicit når de gør. Tallet er kun sikkerhedsnettet hvis kaldet ikke
 * når frem.
 */
const LEVETID = 86_400;

const LEDIGHED = "dst.ledighed.sasonkorrigeret";
const KONKURS = "dst.konkurs.total";

/**
 * Ledighedssignalerne for HELE landet, alle områder.
 *
 * Kaldes af tre sider. Uden cachen betød det 197 opslag på 2,2 MB per
 * genskabelsesrunde.
 *
 * Detektorerne har brug for alle områder samtidig: "største fald" kan
 * ikke afgøres fra én kommunes tal. Derfor kan opslaget ikke bare
 * afgrænses, det skal deles.
 */
export const hentLedighedSignaler = unstable_cache(
  async (): Promise<Signal[]> => {
    const punkter = await hentPunkter(prisma, LEDIGHED, "MONTHLY");
    return generateAllSignals(punkter);
  },
  ["pulse-ledighed-signaler"],
  { tags: [PULSE_TAG], revalidate: LEVETID }
);

export const hentKonkursSignaler = unstable_cache(
  async (): Promise<Signal[]> => {
    const punkter = await hentPunkter(prisma, KONKURS, "MONTHLY", { areaCode: ["DK", "000"] });
    return generateKonkursSignals(punkter);
  },
  ["pulse-konkurs-signaler"],
  { tags: [PULSE_TAG], revalidate: LEVETID }
);

/**
 * Seneste værdi per kommune for de tre nøgletal kommuneprofilen
 * sammenligner med.
 *
 * Kaldes tre gange på hver af 98 sider. Svaret er det samme hver gang:
 * 98 rækker per serie. Cachen gør 294 opslag til tre.
 */
export const hentKommuneNoegletal = unstable_cache(
  async (): Promise<{
    ledighed: Array<[string, number]>;
    befolkning: Array<[string, number]>;
    indkomst: Array<[string, number]>;
  }> => {
    const [l, b, i] = await Promise.all([
      hentSenesteePerOmraade(prisma, LEDIGHED, "MONTHLY"),
      hentSenesteePerOmraade(prisma, "dst.befolkning.antal", "MONTHLY"),
      hentSenesteePerOmraade(prisma, "dst.indkomst.disponibel", "YEARLY"),
    ]);
    // Map kan ikke serialiseres af cachen. Par kan.
    const par = (m: Map<string, { value: number }>) =>
      [...m.entries()].map(([k, v]) => [k, v.value] as [string, number]);
    return { ledighed: par(l), befolkning: par(b), indkomst: par(i) };
  },
  ["pulse-kommune-noegletal"],
  { tags: [PULSE_TAG], revalidate: LEVETID }
);

/**
 * Alle kommuner for ledighedsseriens nyeste periode.
 *
 * Bruges af /pulse/ledighed til kort og rangering, og af hver
 * kommuneside til at finde placeringen.
 */
export const hentLedighedKommuner = unstable_cache(
  async (): Promise<{ periode: string; raekker: OmraadeVaerdi[] }> => {
    const nyeste = await prisma.observation.findFirst({
      where: { seriesId: LEDIGHED, isCurrent: true, value: { not: null } },
      orderBy: { period: "desc" },
      select: { period: true },
    });
    if (!nyeste) return { periode: "", raekker: [] };
    const { hentKommuner } = await import("./pulse-model");
    return {
      periode: nyeste.period.toISOString(),
      raekker: await hentKommuner(prisma, LEDIGHED, nyeste.period),
    };
  },
  ["pulse-ledighed-kommuner"],
  { tags: [PULSE_TAG], revalidate: LEVETID }
);
