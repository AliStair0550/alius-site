// ============================================================
// Tallene på en områdeside
//
// Pulse-serierne i et område: seneste værdi, værdien et år før og fem
// års månedsgennemsnit til en lille kurve. Læses kun, caches i seks
// timer under agenternes mærke, så en ny brief også genskaber siderne.
//
// Månedsgennemsnittet regnes i basen (hentMaanedsgennemsnit). Neons
// kvote er netværkstrafik; elprisens dagstal skal ikke over ledningen.
// ============================================================

import { unstable_cache } from "next/cache";
import { prisma } from "../db";
import { hentMaanedsgennemsnit, hentSerieInfo } from "../pulse-model";
import { omraade, type OmraadeNoegle } from "./finn/omraader";
import { FINN_SERIER } from "./finn/serier";
import { AGENTER_TAG } from "./laes";

export type OmraadeSerie = {
  id: string;
  navn: string;
  unit: string;
  frekvens: string;
  attribution: string;
  seneste: { periode: string; vaerdi: number };
  /** Samme periode et år før. null når den ikke findes, eller serien er daglig. */
  aarFoer: { periode: string; vaerdi: number } | null;
  /** Månedsgennemsnit, de seneste fem år, ældste først. */
  kurve: { periode: string; vaerdi: number }[];
};

export type OmraadeTal = {
  serier: OmraadeSerie[];
  /** Serier i området der ikke kunne læses, med grund. Vises ikke som tomme. */
  mangler: string[];
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

async function laes(noegle: OmraadeNoegle): Promise<OmraadeTal> {
  const o = omraade(noegle);
  if (!o) throw new Error(`Ukendt område "${noegle}"`);
  const serier: OmraadeSerie[] = [];
  const mangler: string[] = [];
  for (const id of o.serier) {
    const info = await hentSerieInfo(prisma, id);
    if (!info) {
      mangler.push(`${id}: findes ikke i Pulse`);
      continue;
    }
    const finn = FINN_SERIER.find((f) => f.id === id);
    const sidste = await prisma.observation.findMany({
      where: { seriesId: id, isCurrent: true, value: { not: null }, areaCode: { in: ["DK", "000"] } },
      orderBy: { period: "desc" },
      take: info.frequency === "DAILY" ? 1 : 13,
      select: { period: true, value: true },
    });
    if (sidste.length === 0) {
      mangler.push(`${info.nameDa}: ingen tal`);
      continue;
    }
    const nyeste = sidste[0];
    const maal = Date.UTC(nyeste.period.getUTCFullYear() - 1, nyeste.period.getUTCMonth(), nyeste.period.getUTCDate());
    const foer = info.frequency === "DAILY" ? undefined : sidste.find((x) => x.period.getTime() === maal);
    const graense = new Date(Date.UTC(nyeste.period.getUTCFullYear() - 5, nyeste.period.getUTCMonth(), 1));
    const kurve = (await hentMaanedsgennemsnit(prisma, id)).filter((p) => p.periode >= graense);
    serier.push({
      id,
      navn: finn?.navn ?? info.nameDa,
      unit: info.unit,
      frekvens: info.frequency,
      attribution: info.attribution,
      seneste: { periode: iso(nyeste.period), vaerdi: Number(nyeste.value) },
      aarFoer: foer ? { periode: iso(foer.period), vaerdi: Number(foer.value) } : null,
      kurve: kurve.map((p) => ({ periode: iso(p.periode), vaerdi: p.vaerdi })),
    });
  }
  return { serier, mangler };
}

export const hentOmraadeTal = unstable_cache(laes, ["agenter-omraade-tal"], { tags: [AGENTER_TAG], revalidate: 6 * 3600 });
