// ============================================================
// Finns daglige kørsel
//
// KØRES I GITHUB ACTIONS (scripts/agent-finn.ts). Skriveværnet nægter
// lokalt. Se CLAUDE.md, "Hvor skrivning sker".
//
// Trin, alle logget i tracen:
//   1. Hent alle kilder (én gang per dag, se cache.ts).
//   2. Dedupliker.
//   3. Filtrer: nyheder højst 48 timer gamle; tal altid seneste udgivelse.
//   4. Relevans og rangering (Haiku, ét kald).
//   5. Skriv briefen (Sonnet).
//   6. Selvtjek: regler (Sonnet), derefter tal (kode, sidste ord).
//   7. Gem brief, trace, tællere og pris.
//
// Hver slutning har sin egen status: DONE, BUDGET_STOPPED eller FAILED.
// Siden viser altid seneste færdige brief og siger hvis dagens mangler.
// ============================================================

import type { Prisma, PrismaClient } from "@prisma/client";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { BudgetStop, type BudgetConfig } from "../budget";
import { kaldMedLoft, type KaldKontekst } from "../claude";
import { MODEL_HURTIG, MODEL_SKRIV } from "../priser";
import { hentMedCache } from "../kilder/cache";
import { pulseKilde } from "../kilder/pulse";
import { dstBoligpriser } from "../kilder/dst-boligpriser";
import { FEEDS, rssKilde } from "../kilder/rss";
import type { Kilde, KildeSvar, Post, NyhedPost } from "../kilder/typer";
import { FINN_SERIER } from "./serier";
import { finnSystem } from "./prompt";
import { rensSprog, udenPraefiks, usporedeTal } from "./selvtjek";

export const AGENT_ID = "finn";
const MAKS_ALDER_TIMER = 48;
const TIL_SKRIVNING = 12;
/** Pladser til nyheder blandt kandidaterne, så tallene ikke altid fortrænger dem. */
const NYHEDSPLADSER = 3;

/** Er tallet udgivet inden for de seneste 48 timer. */
function erNyt(p: Post, nu: Date): boolean {
  return p.type === "tal" && nu.getTime() - new Date(p.foersteGangSet).getTime() < MAKS_ALDER_TIMER * 3_600_000;
}

export type TraceTrin = {
  ts: string;
  type: "start" | "kilde" | "afvist" | "beholdt" | "rangeret" | "skriver" | "punkt" | "fjernet" | "selvtjek" | "budget" | "slut" | "fejl";
  kilde?: string;
  postId?: string;
  titel?: string;
  beslutning?: string;
  grund?: string;
  data?: Record<string, unknown>;
};

export type BriefPunkt = {
  title: string;
  body: string;
  meaning: string;
  sources: { id: string; navn: string; url: string; type: "tal" | "nyhed" }[];
};

/** Dagen i dansk tid. Eksplicit tidszone, så maskinens zone aldrig når datoen. */
export function danskDag(nu: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Copenhagen" }).format(nu);
}

function titelNoegle(t: string): string {
  return t.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N} ]/gu, "").replace(/\s+/g, " ").trim();
}

function postLinje(p: Post, nu: Date): string {
  if (p.type === "nyhed") return `${p.id} | nyhed | ${p.titel} | ${p.dato}`;
  const nyt = erNyt(p, nu) ? " | NY UDGIVELSE" : "";
  const s = p.sammenligning;
  return (
    `${p.id} | tal | ${p.navn} | ${p.periode} | ${p.vaerdiTekst} ${p.enhed}` +
    (s ? ` | ${s.aendringTekst} mod ${s.slags} (${s.periode})` : " | ingen sammenligning") +
    ` | sæson: ${p.saeson}${nyt}`
  );
}

const RangeringSkema = z.object({
  nyheder: z.array(z.object({ id: z.string(), behold: z.boolean(), grund: z.string() })),
  rangering: z.array(z.object({ id: z.string(), betydning: z.number(), begrundelse: z.string() })),
});

const BriefSkema = z.object({
  punkter: z.array(
    z.object({
      overskrift: z.string(),
      tekst: z.string(),
      hvadDetBetyder: z.string(),
      kilder: z.array(z.string()),
    })
  ),
  forbehold: z.array(z.string()),
});

const RegelSkema = z.object({
  vurderinger: z.array(z.object({ nummer: z.number(), brud: z.boolean(), hvilken: z.string() })),
});

export function finnKilder(prisma: PrismaClient): Kilde[] {
  return [pulseKilde(prisma, FINN_SERIER), dstBoligpriser, ...FEEDS.map(rssKilde)];
}

export async function koerFinn(opt: {
  prisma: PrismaClient;
  klient: Anthropic;
  cfg: BudgetConfig;
  nu?: Date;
  kilder?: Kilde[];
}): Promise<{ briefId: string; status: string; besked?: string }> {
  const { prisma } = opt;
  const nu = opt.nu ?? new Date();
  const dag = danskDag(nu);
  const kilder = opt.kilder ?? finnKilder(prisma);

  const brief = await prisma.brief.create({
    data: { agentId: AGENT_ID, date: new Date(`${dag}T00:00:00Z`), status: "RUNNING" },
  });
  const trace: TraceTrin[] = [];
  const log = (t: Omit<TraceTrin, "ts">) => trace.push({ ts: new Date().toISOString(), ...t });
  const k: KaldKontekst = { prisma, agentId: AGENT_ID, briefId: brief.id, cfg: opt.cfg, klient: opt.klient };

  let sourcesRead = 0;
  let kept = 0;

  try {
    log({ type: "start", data: { dag, budget: opt.cfg } });

    // 1. Hent.
    const svar: KildeSvar[] = [];
    for (const kilde of kilder) {
      const s = await hentMedCache(prisma, kilde, dag);
      svar.push(s);
      sourcesRead += s.poster.length;
      log({
        type: "kilde",
        kilde: s.navn,
        beslutning: s.status,
        grund: s.besked,
        data: { url: s.url, hentet: s.hentet, antal: s.poster.length, fraCache: s.fraCache ?? false, titler: s.poster.slice(0, 40).map((p) => (p.type === "tal" ? p.navn : p.titel)) },
      });
    }
    const ikkeOk = svar.filter((s) => s.status !== "ok");

    // 2. Dedupliker.
    const set = new Set<string>();
    const unikke: Post[] = [];
    for (const p of svar.flatMap((s) => s.poster)) {
      const noegler = p.type === "nyhed" ? [`u:${p.url}`, `t:${titelNoegle(p.titel)}`] : [`i:${p.id}`];
      if (noegler.some((n) => set.has(n))) {
        log({ type: "afvist", postId: p.id, titel: p.type === "tal" ? p.navn : p.titel, kilde: p.kilde, grund: "dublet" });
        continue;
      }
      noegler.forEach((n) => set.add(n));
      unikke.push(p);
    }

    // 3. Alder. Tal er altid seneste udgivelse og beholdes; nyheder skal være friske.
    const friske = unikke.filter((p) => {
      if (p.type === "tal") return true;
      const timer = (nu.getTime() - new Date(p.dato).getTime()) / 3_600_000;
      if (timer > MAKS_ALDER_TIMER) {
        log({ type: "afvist", postId: p.id, titel: p.titel, kilde: p.kilde, grund: `ældre end ${MAKS_ALDER_TIMER} timer` });
        return false;
      }
      return true;
    });

    // 4. Relevans og rangering.
    const r = await kaldMedLoft(k, {
      trin: "relevans og rangering",
      model: MODEL_HURTIG,
      system: finnSystem(kilder),
      bruger:
        `Dato: ${dag}.\n\nOPGAVE\n1. For hver nyhed: behold den kun, hvis den har betydning for dansk økonomi, ` +
        `danske virksomheder eller danske husholdninger. Grunden er højst otte ord.\n` +
        `2. Rangér de højst 20 vigtigste blandt tallene og de nyheder du beholder, efter betydning for en dansk ` +
        `virksomhed med 5 til 50 ansatte eller en husholdning, 1 til 10 hvor 10 er størst. Ny udgivelse vejer ` +
        `tungere end gamle tal. Begrundelsen er højst tolv ord.\n\nPOSTER\n${friske.map((p) => postLinje(p, nu)).join("\n")}`,
      skema: RangeringSkema,
      maxTokens: 16000,
      effort: "low",
    });

    const efterId = new Map(friske.map((p) => [p.id, p]));
    const vurderet = new Map(r.data.nyheder.map((n) => [n.id, n]));
    const beholdte = friske.filter((p) => {
      if (p.type === "tal") return true;
      const v = vurderet.get(p.id);
      if (!v) {
        log({ type: "afvist", postId: p.id, titel: p.titel, kilde: p.kilde, grund: "ikke vurderet af relevansfilteret" });
        return false;
      }
      if (!v.behold) {
        log({ type: "afvist", postId: p.id, titel: p.titel, kilde: p.kilde, grund: `ingen dansk relevans: ${v.grund}` });
        return false;
      }
      return true;
    });

    const rangeret = r.data.rangering
      .filter((x) => {
        const ok = efterId.has(x.id) && beholdte.some((b) => b.id === x.id);
        if (!ok) log({ type: "afvist", postId: x.id, grund: "modellen rangerede et id der ikke var med" });
        return ok;
      })
      .map((x) => ({ ...x, betydning: Math.max(1, Math.min(10, Math.round(x.betydning))) }))
      .sort((a, b) => b.betydning - a.betydning);

    // De bedst rangerede nyheder får op til NYHEDSPLADSER pladser, resten
    // fyldes med de bedst rangerede tal. Ellers fortrængte tallene altid
    // nyhederne: i første kørsel kom ingen nyhed med blandt de tolv.
    const nyhedsvalg = rangeret.filter((x) => efterId.get(x.id)!.type === "nyhed").slice(0, NYHEDSPLADSER);
    const talvalg = rangeret.filter((x) => efterId.get(x.id)!.type === "tal").slice(0, TIL_SKRIVNING - nyhedsvalg.length);
    const valgteId = new Set([...nyhedsvalg, ...talvalg].map((x) => x.id));
    const valgte = rangeret.filter((x) => valgteId.has(x.id)).map((x) => efterId.get(x.id)!);
    for (const x of rangeret) {
      const p = efterId.get(x.id)!;
      const med = valgte.includes(p);
      log({
        type: med ? "rangeret" : "afvist",
        postId: p.id,
        titel: p.type === "tal" ? p.navn : p.titel,
        kilde: p.kilde,
        beslutning: `betydning ${x.betydning}`,
        grund: med ? x.begrundelse : `lavere betydning end de ${TIL_SKRIVNING} valgte: ${x.begrundelse}`,
      });
    }
    kept = valgte.length;
    if (valgte.length === 0) throw new Error("Intet overlevede filtreringen. Der er ikke noget at skrive om.");

    // 5. Skriv.
    const tidligere = await prisma.brief.findMany({
      where: { agentId: AGENT_ID, status: "DONE", date: { lt: new Date(`${dag}T00:00:00Z`) } },
      orderBy: { date: "desc" },
      take: 5,
      select: { date: true, items: true },
    });
    const hukommelse = tidligere
      .map((b) => `${b.date.toISOString().slice(0, 10)}: ${((b.items as BriefPunkt[] | null) ?? []).map((i) => i.title).join(" / ")}`)
      .join("\n");

    // 5-6. Skriv og tjek. Ét udkast; holder færre end fem punkter, får
    // Sonnet ét forsøg mere med grundene til det der blev afvist, og det
    // udkast med flest holdbare punkter bruges.
    const udkast = async (forsoeg: number, feedback: string[]) => {
      log({ type: "skriver", data: { forsoeg, antalKandidater: valgte.length } });
      const skrevet = await kaldMedLoft(k, {
        trin: forsoeg === 1 ? "skriv" : `skriv, forsøg ${forsoeg}`,
        model: MODEL_SKRIV,
        system: finnSystem(kilder),
        bruger:
          `Dato: ${dag}.\n\nSkriv dagens brief: 5 til 7 punkter om dansk økonomi. Hvert punkt har en kort overskrift, ` +
          `2 til 4 korte sætninger, og en sætning "Hvad det betyder" for en dansk virksomhed med 5 til 50 ansatte eller ` +
          `en husholdning. Hvert punkt henviser i "kilder" til de id'er det bygger på, og bruger kun tal fra dem.\n` +
          `Under "forbehold" skriver du ærligt, hvad du tog forbehold for: usikre eller ukorrigerede tal, gamle tal, ` +
          `og kilder der ikke kunne hentes.\n\n` +
          (feedback.length
            ? `DIT FØRSTE UDKAST HOLDT IKKE. Disse punkter blev afvist, og grunden står ved hvert:\n${feedback.map((f) => `- ${f}`).join("\n")}\n` +
              `Skriv briefen igen, så ingen punkter har de fejl.\n\n`
            : "") +
          `DATA (fuld form). Feltet nyt er true, når tallet er udgivet inden for 48 timer.\n` +
          `${JSON.stringify(valgte.map((p) => (p.type === "tal" ? { ...p, nyt: erNyt(p, nu) } : p)), null, 1)}\n\n` +
          `KILDER DER IKKE LEVEREDE I DAG\n${ikkeOk.map((s) => `${s.navn}: ${s.status}${s.besked ? `, ${s.besked}` : ""}`).join("\n") || "Ingen."}\n\n` +
          `DINE SENESTE BRIEFS\n${hukommelse || "Ingen endnu. Dette er den første."}`,
        skema: BriefSkema,
        maxTokens: 12000,
        effort: "medium",
      });

      // 6a. De hårde regler (Sonnet). Tallene vurderes IKKE her: tjekket
      // ser ikke dataene, og i tredje kørsel afviste det et tal der stod
      // ordret i dem. Tallene kontrolleres af kode i 6b.
      const regel = await kaldMedLoft(k, {
        trin: forsoeg === 1 ? "selvtjek regler" : `selvtjek regler, forsøg ${forsoeg}`,
        model: MODEL_SKRIV,
        system: finnSystem(kilder),
        bruger:
          `Tjek hvert punkt for fire brud, og kun dem: 1) giver investeringsråd eller anbefaler et konkret produkt, ` +
          `2) fortæller læseren hvad de skal gøre, 3) gengiver artikeltekst ud over overskriften, 4) siger det modsatte ` +
          `af sig selv. Tallene er allerede kontrolleret mod kilderne; vurder dem ikke. Svar for hvert nummer, og ` +
          `navngiv bruddet.\n\n` +
          skrevet.data.punkter.map((p, i) => `${i + 1}. ${p.overskrift}\n${p.tekst}\n${p.hvadDetBetyder}`).join("\n\n"),
        skema: RegelSkema,
        maxTokens: 3000,
        effort: "low",
      });
      const brudt = new Map(regel.data.vurderinger.filter((v) => v.brud).map((v) => [v.nummer, v.hvilken]));

      // 6b. Tal (kode, sidste ord) og sprog.
      const punkter: BriefPunkt[] = [];
      const fjernede: string[] = [];
      skrevet.data.punkter.forEach((p, i) => {
        const nr = i + 1;
        const kildeposter = p.kilder.map((id) => efterId.get(id)).filter((x): x is Post => !!x && valgte.includes(x));
        const ukendte = p.kilder.filter((id) => !kildeposter.some((x) => x.id === id));
        const titel = rensSprog(p.overskrift);
        const fjern = (grund: string) => {
          log({ type: "fjernet", titel, grund, data: { forsoeg } });
          fjernede.push(`"${titel}": ${grund}`);
        };

        if (brudt.has(nr)) return fjern(`brød Finns regler (${brudt.get(nr)})`);
        if (kildeposter.length === 0) return fjern("det henviste ikke til nogen af dagens kilder");
        const tekst = rensSprog(p.tekst);
        const betyder = rensSprog(udenPraefiks(p.hvadDetBetyder));
        const usporet = usporedeTal(`${titel} ${tekst} ${betyder}`, kildeposter);
        if (usporet.length) return fjern(`tallet ${usporet.join(", ")} kunne ikke spores til kilderne`);

        log({ type: "punkt", titel, data: { forsoeg, kilder: kildeposter.map((x) => x.id), ukendteKilder: ukendte } });
        punkter.push({
          title: titel,
          body: tekst,
          meaning: betyder,
          sources: kildeposter.map((x) => ({
            id: x.id,
            navn: x.type === "tal" ? `${x.navn}, ${x.periode}` : (svar.find((s) => s.kilde === x.kilde)?.navn ?? x.kilde),
            url: x.url,
            type: x.type,
          })),
        });
      });
      log({ type: "selvtjek", data: { forsoeg, skrevet: skrevet.data.punkter.length, beholdt: punkter.length } });
      return { punkter, fjernede, forbehold: skrevet.data.forbehold.map(rensSprog) };
    };

    let valgt = await udkast(1, []);
    let omskrevet = false;
    if (valgt.punkter.length < 5) {
      const andet = await udkast(2, valgt.fjernede);
      if (andet.punkter.length > valgt.punkter.length) {
        valgt = andet;
        omskrevet = true;
      }
    }
    const punkter = valgt.punkter;
    const forbehold = [
      ...valgt.forbehold,
      ...valgt.fjernede.map((f) => `Et punkt blev fjernet, ${f}.`),
      ...(omskrevet ? ["Første udkast holdt ikke, så briefen er skrevet om én gang."] : []),
    ];

    if (punkter.length > 7) {
      for (const p of punkter.splice(7)) log({ type: "fjernet", titel: p.title, grund: "mere end syv punkter" });
    }
    if (punkter.length === 0) throw new Error("Selvtjekket fjernede alle punkter. Briefen udgives ikke.");
    if (punkter.length < 5) forbehold.push(`Briefen har kun ${punkter.length} punkter i dag. Resten kunne ikke bære en påstand.`);

    // 7. Gem.
    log({ type: "slut", beslutning: "DONE", data: { punkter: punkter.length } });
    await afslut(prisma, brief.id, "DONE", null, trace, { items: punkter, caveats: forbehold, sourcesRead, kept });
    return { briefId: brief.id, status: "DONE" };
  } catch (e) {
    if (e instanceof BudgetStop) {
      log({ type: "budget", beslutning: "stoppet", grund: e.grund });
      await afslut(prisma, brief.id, "BUDGET_STOPPED", `Stoppet af budgetloftet. ${e.grund}`, trace, { sourcesRead, kept });
      return { briefId: brief.id, status: "BUDGET_STOPPED", besked: e.grund };
    }
    const besked = (e as Error).message;
    log({ type: "fejl", grund: besked });
    await afslut(prisma, brief.id, "FAILED", besked.slice(0, 500), trace, { sourcesRead, kept });
    return { briefId: brief.id, status: "FAILED", besked };
  }
}

async function afslut(
  prisma: PrismaClient,
  briefId: string,
  status: "DONE" | "BUDGET_STOPPED" | "FAILED",
  besked: string | null,
  trace: TraceTrin[],
  felter: { items?: BriefPunkt[]; caveats?: string[]; sourcesRead: number; kept: number }
) {
  const sum = await prisma.apiLedger.aggregate({ _sum: { costUsd: true }, where: { briefId } });
  await prisma.$transaction([
    prisma.brief.update({
      where: { id: briefId },
      data: {
        status,
        statusMessage: besked,
        items: (felter.items ?? undefined) as Prisma.InputJsonValue | undefined,
        caveats: (felter.caveats ?? undefined) as Prisma.InputJsonValue | undefined,
        sourcesRead: felter.sourcesRead,
        kept: felter.kept,
        costUsd: sum._sum.costUsd ?? 0,
        finishedAt: new Date(),
      },
    }),
    prisma.trace.upsert({
      where: { briefId },
      create: { briefId, steps: trace as unknown as Prisma.InputJsonValue },
      update: { steps: trace as unknown as Prisma.InputJsonValue },
    }),
  ]);
}

export type { NyhedPost };
