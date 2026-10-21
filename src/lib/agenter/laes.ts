// ============================================================
// Det siderne læser om agenterne
//
// Cachet med ét mærke, som jobbet rydder når en ny brief er færdig
// (/api/revalidate/agenter). Ingen side kalder Anthropic. Replay læser
// den gemte trace, aldrig API'et.
// ============================================================

import { unstable_cache } from "next/cache";
import { prisma } from "../db";
import type { BriefPunkt, TraceTrin } from "./finn/pipeline";

export const AGENTER_TAG = "agenter-data";
const LEVETID = 3600;

export type AgentKort = {
  id: string;
  name: string;
  tagline: string;
  notDoing: string;
  avatar: string;
  status: "ACTIVE" | "COMING_SOON";
};

export type BriefVisning = {
  id: string;
  dato: string;
  items: BriefPunkt[];
  caveats: string[];
  sourcesRead: number | null;
  kept: number | null;
  costUsd: number | null;
  finishedAt: string | null;
};

/** Seneste kørsel uanset udfald. Bruges til at sige, hvis dagens brief mangler. */
export type KoerselStatus = {
  dato: string;
  status: "RUNNING" | "DONE" | "BUDGET_STOPPED" | "FAILED";
  besked: string | null;
  sourcesRead: number | null;
  kept: number | null;
};

const dato = (d: Date) => d.toISOString().slice(0, 10);

function tilVisning(b: {
  id: string;
  date: Date;
  items: unknown;
  caveats: unknown;
  sourcesRead: number | null;
  kept: number | null;
  costUsd: unknown;
  finishedAt: Date | null;
}): BriefVisning {
  return {
    id: b.id,
    dato: dato(b.date),
    items: (b.items as BriefPunkt[] | null) ?? [],
    caveats: (b.caveats as string[] | null) ?? [],
    sourcesRead: b.sourcesRead,
    kept: b.kept,
    costUsd: b.costUsd === null ? null : Number(b.costUsd),
    finishedAt: b.finishedAt?.toISOString() ?? null,
  };
}

export const hentAgenter = unstable_cache(
  async (): Promise<AgentKort[]> =>
    prisma.agent.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, tagline: true, notDoing: true, avatar: true, status: true },
    }),
  ["agenter-alle"],
  { tags: [AGENTER_TAG], revalidate: LEVETID }
);

export const hentSenesteKoersel = unstable_cache(
  async (agentId: string): Promise<KoerselStatus | null> => {
    const b = await prisma.brief.findFirst({
      where: { agentId },
      orderBy: { startedAt: "desc" },
      select: { date: true, status: true, statusMessage: true, sourcesRead: true, kept: true },
    });
    return b ? { dato: dato(b.date), status: b.status, besked: b.statusMessage, sourcesRead: b.sourcesRead, kept: b.kept } : null;
  },
  ["agenter-seneste-koersel"],
  { tags: [AGENTER_TAG], revalidate: LEVETID }
);

/** Seneste færdige brief, eller den færdige brief for en bestemt dato. */
export const hentBrief = unstable_cache(
  async (agentId: string, paaDato: string | null): Promise<BriefVisning | null> => {
    const b = await prisma.brief.findFirst({
      where: { agentId, status: "DONE", ...(paaDato ? { date: new Date(`${paaDato}T00:00:00Z`) } : {}) },
      orderBy: [{ date: "desc" }, { finishedAt: "desc" }],
      select: { id: true, date: true, items: true, caveats: true, sourcesRead: true, kept: true, costUsd: true, finishedAt: true },
    });
    return b ? tilVisning(b) : null;
  },
  ["agenter-brief"],
  { tags: [AGENTER_TAG], revalidate: LEVETID }
);

export const hentArkiv = unstable_cache(
  async (agentId: string): Promise<string[]> => {
    const r = await prisma.brief.findMany({
      where: { agentId, status: "DONE" },
      distinct: ["date"],
      orderBy: { date: "desc" },
      take: 120,
      select: { date: true },
    });
    return r.map((x) => dato(x.date));
  },
  ["agenter-arkiv"],
  { tags: [AGENTER_TAG], revalidate: LEVETID }
);

export const hentTrace = unstable_cache(
  async (briefId: string): Promise<TraceTrin[]> => {
    const t = await prisma.trace.findUnique({ where: { briefId }, select: { steps: true } });
    return (t?.steps as TraceTrin[] | null) ?? [];
  },
  ["agenter-trace"],
  { tags: [AGENTER_TAG], revalidate: LEVETID }
);
