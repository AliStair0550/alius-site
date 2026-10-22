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
//   4. Relevans for nyhederne (Haiku), derefter det der beregnes i kode:
//      overblik, elpris time for time, det usædvanlige, nyt i dag.
//   5. Medietemaer (Haiku).
//   6. Dagens analyse om ét område (Sonnet), med selvtjek.
//   7. En kort analyse per område (Sonnet), med selvtjek.
//   8. Gem analysen, trace, tællere og pris.
//
// Selvtjekket: regler (Sonnet), derefter tal (kode, sidste ord). Hvert
// afsnit holdes op mod netop de kilder det selv nævner.
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
import { elprisTimer } from "../kilder/elpris-timer";
import { regnskabKilde } from "../kilder/regnskaber";
import { nasdaqRegnskaber } from "../kilder/nasdaq";
import { regnskabskalender } from "../kilder/regnskabskalender";
import { dstBoligpriser } from "../kilder/dst-boligpriser";
import { FEEDS, rssKilde, udenTankestreg } from "../kilder/rss";
import type { Kilde, KildeSvar, Post, NyhedPost, TalPost } from "../kilder/typer";
import { FINN_SERIER } from "./serier";
import { finnSystem } from "./prompt";
import { temaForKilde } from "../tema";
import { overdrevneOrd, rensSprog, udenPraefiks, usporedeTal } from "./selvtjek";
import { OMRAADER, OMRAADE_NOEGLER, postIOmraade, type OmraadeNoegle } from "./omraader";
import {
  bygElpris,
  bygNyt,
  bygOverblik,
  bygUsaedvanligt,
  vaelgOmraade,
  kildeRef,
  type Afsnit,
  type Analyse,
  type DagensAnalyse,
  type Medietema,
} from "./analyse";

export const AGENT_ID = "finn";
const MAKS_ALDER_TIMER = 48;

/** Er tallet udgivet inden for de seneste 48 timer. */
function erNyt(p: Post, nu: Date): boolean {
  return p.type === "tal" && nu.getTime() - new Date(p.foersteGangSet).getTime() < MAKS_ALDER_TIMER * 3_600_000;
}

export type TraceTrin = {
  ts: string;
  type: | "start"
    | "kilde"
    | "afvist"
    | "beholdt"
    | "rangeret"
    | "beregnet"
    | "medietema"
    | "omraadevalg"
    | "skriver"
    | "punkt"
    | "fjernet"
    | "selvtjek"
    | "omraade"
    | "budget"
    | "slut"
    | "fejl";
  kilde?: string;
  postId?: string;
  titel?: string;
  beslutning?: string;
  grund?: string;
  data?: Record<string, unknown>;
};

/** Briefs fra før 22. oktober 2026 har punkter. Nyere har en Analyse (se analyse.ts). */
export type BriefPunkt = {
  title: string;
  body: string;
  meaning: string;
  sources: { id: string; navn: string; url: string; type: "tal" | "nyhed" }[];
  /** Udledt i kode fra punktets første kilde. Mangler i briefs fra før 22/10. */
  tema?: string;
  /** Punktets bærende tal. Kontrolleret af selvtjekket som alle andre tal. */
  noegletal?: { vaerdi: string; etiket: string } | null;
};

/** Temaet for et punkt, ud fra hvad dets første kilde måler. Se tema.ts. */
export function temaFor(p: Post): string {
  return temaForKilde(p.id, p.type);
}

/** Dagen i dansk tid. Eksplicit tidszone, så maskinens zone aldrig når datoen. */
export function danskDag(nu: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Copenhagen" }).format(nu);
}

function titelNoegle(t: string): string {
  return t.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N} ]/gu, "").replace(/\s+/g, " ").trim();
}

function artiklerFor(nyheder: NyhedPost[]): Medietema["artikler"] {
  return nyheder.map((n) => ({ titel: n.titel, url: n.url, kilde: n.kilde }));
}

const RelevansSkema = z.object({
  vurderinger: z.array(z.object({ nummer: z.number(), behold: z.boolean(), grund: z.string() })),
});

const TemaSkema = z.object({
  temaer: z.array(z.object({ titel: z.string(), omraade: z.string().nullable(), artikler: z.array(z.number()) })),
});

const AfsnitSkema = z.object({ tekst: z.string(), kilder: z.array(z.string()) });

const AnalyseSkema = z.object({
  overskrift: z.string(),
  tese: z.string(),
  hvadTalleneSiger: z.array(AfsnitSkema),
  hvadDetBetyder: z.object({ virksomhed: z.string(), husholdning: z.string() }),
  holdOeje: z.array(AfsnitSkema),
  medietemaer: z.array(z.object({ nummer: z.number(), kommentar: z.string(), kilder: z.array(z.string()) })),
  forbehold: z.array(z.string()),
});

const OmrSkema = z.object({
  omraader: z.array(z.object({ noegle: z.string(), overskrift: z.string(), afsnit: z.array(AfsnitSkema) })),
});

const RegelSkema = z.object({
  vurderinger: z.array(z.object({ nummer: z.number(), brud: z.boolean(), hvilken: z.string() })),
});

export function finnKilder(prisma: PrismaClient): Kilde[] {
  return [pulseKilde(prisma, FINN_SERIER), elprisTimer, dstBoligpriser, regnskabKilde(prisma), nasdaqRegnskaber, regnskabskalender, ...FEEDS.map(rssKilde)];
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
      const hentet = await hentMedCache(prisma, kilde, dag);
      // Også svar fra cachen, der kan være gemt før overskrifterne blev renset.
      const s = { ...hentet, poster: hentet.poster.map((p) => (p.type === "nyhed" ? { ...p, titel: udenTankestreg(p.titel) } : p)) };
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

    // 4a. Relevans, kun nyheder, ét svar per nummer. I sit eget kald:
    // da relevans og rangering lå i ét, sprang Haiku 28 af 37 nyheder
    // over. Mangler der svar, spørges der én gang til om netop dem.
    const efterId = new Map(friske.map((p) => [p.id, p]));
    const nyheder = friske.filter((p): p is NyhedPost => p.type === "nyhed");
    const vurderet = new Map<string, { behold: boolean; grund: string }>();
    for (let runde = 1; runde <= 2; runde++) {
      const mangler = nyheder.filter((n) => !vurderet.has(n.id));
      if (mangler.length === 0) break;
      const rel = await kaldMedLoft(k, {
        trin: runde === 1 ? "relevans" : "relevans, manglende",
        model: MODEL_HURTIG,
        system: finnSystem(kilder),
        bruger:
          `Dato: ${dag}.\n\nVurder HVER af de ${mangler.length} nyheder herunder, og svar én gang per nummer. ` +
          `Behold kun en nyhed, hvis den har betydning for dansk økonomi, danske virksomheder eller danske ` +
          `husholdninger. Grunden er højst otte ord.\n\n` +
          mangler.map((n, i) => `${i + 1}. ${n.titel}`).join("\n"),
        skema: RelevansSkema,
        maxTokens: 8000,
        effort: "low",
      });
      for (const v of rel.data.vurderinger) {
        const n = mangler[v.nummer - 1];
        if (n && !vurderet.has(n.id)) vurderet.set(n.id, { behold: v.behold, grund: v.grund });
      }
    }
    const beholdte = friske.filter((p) => {
      if (p.type === "tal") return true;
      const v = vurderet.get(p.id);
      if (!v) {
        log({ type: "afvist", postId: p.id, titel: p.titel, kilde: p.kilde, grund: "ikke vurderet af relevansfilteret efter to forsøg" });
        return false;
      }
      if (!v.behold) {
        log({ type: "afvist", postId: p.id, titel: p.titel, kilde: p.kilde, grund: `ingen dansk relevans: ${v.grund}` });
        return false;
      }
      return true;
    });

    // 4b. Det der kan beregnes, beregnes: overblik, elpris time for time,
    // det usædvanlige og nyt i dag. Ingen model rører disse tal.
    const tal = beholdte.filter((p): p is TalPost => p.type === "tal");
    const nyhederBeholdt = beholdte.filter((p): p is NyhedPost => p.type === "nyhed");
    const analyse: Analyse = {
      udgave: 1,
      dagens: null,
      overblik: bygOverblik(tal),
      elpris: bygElpris(tal),
      usaedvanligt: bygUsaedvanligt(tal),
      nyt: bygNyt(tal, nu),
      medier: [],
      omraader: {},
    };
    kept = beholdte.length;
    log({
      type: "beregnet",
      data: {
        overblik: analyse.overblik.length,
        elpris: analyse.elpris.map((e) => e.kode),
        usaedvanligt: analyse.usaedvanligt.map((u) => u.id),
        nyt: analyse.nyt.map((n) => n.id),
      },
    });
    if (tal.length === 0) throw new Error("Ingen tal overlevede hentningen. Der er intet at analysere.");
    const forbehold: string[] = [];

    // 5. Medietemaer (Haiku): dagens beholdte nyheder samlet i højst tre temaer.
    let temaer: { titel: string; omraade: OmraadeNoegle | null; artikler: NyhedPost[] }[] = [];
    if (nyhederBeholdt.length > 0) {
      const t = await kaldMedLoft(k, {
        trin: "medietemaer",
        model: MODEL_HURTIG,
        system: finnSystem(kilder),
        bruger:
          `Dato: ${dag}.\n\nSaml nyhederne herunder i højst tre temaer om dansk økonomi. Et tema skal have mindst ` +
          `én nyhed. Titlen er højst seks ord og indeholder ingen tal. "omraade" er et af: ${OMRAADE_NOEGLER.join(", ")}, ` +
          `eller null hvis temaet ikke passer i nogen. Nyheder der ikke passer i et tema, udelades.\n\n` +
          nyhederBeholdt.map((n, i) => `${i + 1}. ${n.titel}`).join("\n"),
        skema: TemaSkema,
        maxTokens: 4000,
        effort: "low",
      });
      temaer = t.data.temaer.slice(0, 3).flatMap((x) => {
        const artikler = [...new Set(x.artikler)].map((nr) => nyhederBeholdt[nr - 1]).filter((n): n is NyhedPost => !!n);
        const omr = x.omraade && (OMRAADE_NOEGLER as string[]).includes(x.omraade) ? (x.omraade as OmraadeNoegle) : null;
        if (x.omraade && !omr) log({ type: "afvist", titel: x.titel, grund: `ukendt område "${x.omraade}", temaet står uden område` });
        if (artikler.length === 0) {
          log({ type: "afvist", titel: x.titel, grund: "temaet henviste ikke til nogen af dagens nyheder" });
          return [];
        }
        log({ type: "medietema", titel: rensSprog(x.titel), data: { omraade: omr, artikler: artikler.map((a) => a.id) } });
        return [{ titel: rensSprog(x.titel), omraade: omr, artikler }];
      });
    }

    // Hukommelse: hvilket område de seneste analyser handlede om.
    const tidligere = await prisma.brief.findMany({
      where: { agentId: AGENT_ID, status: "DONE", date: { lt: new Date(`${dag}T00:00:00Z`) } },
      orderBy: { date: "desc" },
      take: 5,
      select: { date: true, items: true, analysis: true },
    });
    const hukommelse = tidligere
      .map((b) => {
        const d = b.date.toISOString().slice(0, 10);
        const a = b.analysis as Analyse | null;
        if (a?.dagens) return `${d}: område ${a.dagens.omraade}, "${a.dagens.overskrift}"`;
        return `${d}: ${((b.items as BriefPunkt[] | null) ?? []).map((i) => i.title).join(" / ")}`;
      })
      .join("\n");

    // Selvtjek af ét afsnit mod netop de kilder det nævner. Kode, sidste ord.
    const tjekAfsnit = (tekst: string, ids: string[], ekstra: Post[] = []): { afsnit: Afsnit | null; grund?: string } => {
      const poster = [...new Set(ids)].map((id) => efterId.get(id)).filter((x): x is Post => !!x && beholdte.includes(x));
      const renset = rensSprog(tekst);
      if (poster.length === 0) return { afsnit: null, grund: "det henviste ikke til nogen af dagens kilder" };
      const usporet = usporedeTal(renset, [...poster, ...ekstra]);
      if (usporet.length) return { afsnit: null, grund: `tallet ${usporet.join(", ")} kunne ikke spores til kilderne` };
      // Ordene om hvor usædvanligt et tal er, skal også kunne spores. Se overdrevneOrd().
      const overdrevet = overdrevneOrd(renset, poster);
      if (overdrevet.length) return { afsnit: null, grund: `ordene ${overdrevet.join("; ")}` };
      return { afsnit: { tekst: renset, kilder: poster.map(kildeRef) } };
    };

    const data = (poster: Post[]) =>
      JSON.stringify(
        poster.map((p) => (p.type === "tal" ? { ...p, forloeb: p.forloeb.slice(0, 13), nyt: erNyt(p, nu) } : p)),
        null,
        1
      );
    const ikkeLeveret =
      ikkeOk.map((s) => `${s.navn}: ${s.status}${s.besked ? `, ${s.besked}` : ""}`).join("\n") || "Ingen.";

    const regeltjek = async (trin: string, tekster: string[]) => {
      if (tekster.length === 0) return new Map<number, string>();
      const regel = await kaldMedLoft(k, {
        trin,
        model: MODEL_SKRIV,
        system: finnSystem(kilder),
        bruger:
          `Tjek hvert afsnit for tre brud, og kun dem: 1) giver investeringsråd eller anbefaler et konkret produkt, ` +
          `2) fortæller læseren hvad de skal gøre, 3) gengiver artikeltekst ud over overskriften. Marker kun et brud, ` +
          `når det er tydeligt; tvivl er ikke et brud. Tallene er allerede kontrolleret mod kilderne, og stil og ` +
          `nyhedsværdi er ikke din opgave. Svar for hvert nummer, og navngiv bruddet.\n\n` +
          tekster.map((t, i) => `${i + 1}. ${t}`).join("\n\n"),
        skema: RegelSkema,
        maxTokens: 3000,
        effort: "low",
      });
      return new Map(regel.data.vurderinger.filter((v) => v.brud).map((v) => [v.nummer, v.hvilken]));
    };

    // 6. Dagens analyse (Sonnet) om ét område. Området vælges i kode, se
    // vaelgOmraade(); modellen får det at vide og vælger ikke selv.
    const erDaglig = (id: string) => {
      const p = efterId.get(id);
      return !!p && p.type === "tal" && (/\d{1,2}\. [a-zæøå]+ \d{4}/.test(p.periode) || id.startsWith("eds.timer"));
    };
    const valg = vaelgOmraade({
      muligeOmraader: OMRAADER.filter((o) => tal.some((p) => postIOmraade(p.id, o))).map((o) => o.noegle),
      nyt: analyse.nyt,
      usaedvanligt: analyse.usaedvanligt,
      medier: temaer,
      seneste: tidligere.map((b) => (b.analysis as Analyse | null)?.dagens?.omraade).filter((x): x is OmraadeNoegle => !!x),
      erDaglig,
    });
    const valgtOmraade = OMRAADER.find((o) => o.noegle === valg.valgt)!;
    log({
      type: "omraadevalg",
      titel: valgtOmraade.navn,
      data: { valgt: valg.valgt, point: valg.point },
    });

    const signaler =
      `USÆDVANLIGT MOD TI ÅR\n${analyse.usaedvanligt.map((u) => `${u.id} | ${u.navn} | ${u.tekst}`).join("\n") || "Intet i dag."}\n\n` +
      `NYT INDEN FOR 48 TIMER\n${analyse.nyt.map((n) => `${n.id} | ${n.navn} | ${n.periode}`).join("\n") || "Intet i dag."}\n\n` +
      `MEDIETEMAER\n${temaer.map((t, i) => `${i + 1}. ${t.titel} (område: ${t.omraade ?? "intet"}) | ${t.artikler.map((a) => `${a.id}: ${a.titel}`).join(" ; ")}`).join("\n") || "Ingen i dag."}`;

    const skrivDagens = async (forsoeg: number, feedback: string[]) => {
      log({ type: "skriver", beslutning: "dagens analyse", data: { forsoeg } });
      const s = await kaldMedLoft(k, {
        trin: forsoeg === 1 ? "dagens analyse" : `dagens analyse, forsøg ${forsoeg}`,
        model: MODEL_SKRIV,
        system: finnSystem(kilder),
        bruger:
          `Dato: ${dag}.\n\nSkriv dagens analyse om området ${valgtOmraade.navn} (${valgtOmraade.beskrivelse}). Området er ` +
          `valgt ud fra hvad der har bevæget sig: ${valg.point.find((x) => x.omraade === valg.valgt)!.grunde.join(", ") || "intet område skilte sig ud i dag"}. ` +
          `Analysen handler om dette område. Tal fra andre områder må kun bruges som forklaring, og kun hvis de står i data.\n` +
          `- "overskrift": højst ti ord, siger hvad der sker.\n` +
          `- "tese": én til to sætninger med analysens pointe.\n` +
          `- "hvadTalleneSiger": 2 til 4 afsnit, hver 1 til 3 sætninger, hver med de id'er i "kilder" den bygger på. ` +
          `Brug kun tal fra netop de kilder. Forklar hvad tallet måler, og sæt det i forhold til forløbet.\n` +
          `- "hvadDetBetyder": én til to sætninger for en dansk virksomhed med 5 til 50 ansatte, og én til to for en ` +
          `husholdning. Ingen tal her ud over dem der står i hvadTalleneSiger. Ingen råd.\n` +
          `- "holdOeje": 1 til 3 afsnit om hvad der ville ændre billedet, med kilder. Ingen datoer eller tal der ikke står i kilderne.\n` +
          `- "medietemaer": en kommentar til HVERT medietema, 1 til 2 sætninger, med "nummer" (temaets nummer) og "kilder" ` +
          `(temaets nyheder og de tal du bruger). Kan temaet kobles til dagens tal, så gør det. Kan det ikke, så sig kort ` +
          `hvad overskrifterne handler om, og at ingen af dagens tal måler det; kilderne er så temaets nyheder. ` +
          `Brug kun tal der står i overskrifterne eller i data. Gæt aldrig på hvad der står i en artikel.\n` +
          `- "forbehold": hvad du tog forbehold for, ærligt.\n\n` +
          (feedback.length
            ? `DIT FØRSTE UDKAST HOLDT IKKE. Disse dele blev afvist:\n${feedback.map((f) => `- ${f}`).join("\n")}\nSkriv analysen igen uden de fejl.\n\n`
            : "") +
          `${signaler}\n\nDATA (fuld form). Feltet nyt er true, når tallet er udgivet inden for 48 timer.\n${data(beholdte)}\n\n` +
          `KILDER DER IKKE LEVEREDE I DAG\n${ikkeLeveret}\n\nDINE SENESTE ANALYSER\n${hukommelse || "Ingen endnu."}`,
        skema: AnalyseSkema,
        maxTokens: 12000,
        effort: "medium",
      });
      const d = s.data;
      const fjernede: string[] = [];
      const omr = valg.valgt;

      const overskrift = rensSprog(d.overskrift);
      const regelTekster = [
        `${overskrift}. ${d.tese}`,
        ...d.hvadTalleneSiger.map((a) => a.tekst),
        `${d.hvadDetBetyder.virksomhed} ${d.hvadDetBetyder.husholdning}`,
        ...d.holdOeje.map((a) => a.tekst),
        ...d.medietemaer.map((m) => m.kommentar),
      ];
      const brudt = await regeltjek(forsoeg === 1 ? "selvtjek regler" : `selvtjek regler, forsøg ${forsoeg}`, regelTekster);
      let nr = 0;
      const tag = (tekst: string, ids: string[], navn: string, ekstra: Post[] = []): Afsnit | null => {
        nr++;
        if (brudt.has(nr)) {
          fjernede.push(`${navn}: brød Finns regler (${brudt.get(nr)})`);
          log({ type: "fjernet", titel: navn, grund: `brød Finns regler (${brudt.get(nr)})`, data: { forsoeg } });
          return null;
        }
        const r = tjekAfsnit(tekst, ids, ekstra);
        if (!r.afsnit) {
          fjernede.push(`${navn}: ${r.grund}`);
          log({ type: "fjernet", titel: navn, grund: r.grund, data: { forsoeg } });
          return null;
        }
        log({ type: "punkt", titel: navn, data: { forsoeg, kilder: r.afsnit.kilder.map((x) => x.id) } });
        return r.afsnit;
      };

      const sigerIds = d.hvadTalleneSiger.flatMap((a) => a.kilder);
      const tese = tag(`${overskrift}. ${d.tese}`, sigerIds, "Tesen");
      const siger = d.hvadTalleneSiger.map((a, i) => tag(a.tekst, a.kilder, `Hvad tallene siger, afsnit ${i + 1}`)).filter((x): x is Afsnit => !!x);
      const betyder = tag(`${udenPraefiks(d.hvadDetBetyder.virksomhed)} ${udenPraefiks(d.hvadDetBetyder.husholdning)}`, sigerIds, "Hvad det betyder");
      const holdOeje = d.holdOeje.map((a, i) => tag(a.tekst, a.kilder, `Hold øje med, afsnit ${i + 1}`)).filter((x): x is Afsnit => !!x);
      const medier: Medietema[] = [];
      d.medietemaer.forEach((m) => {
        const tema = temaer[m.nummer - 1];
        if (!tema) {
          nr++;
          log({ type: "afvist", grund: `kommentar til medietema ${m.nummer}, som ikke findes` });
          return;
        }
        const kommentar = tag(m.kommentar, [...m.kilder, ...tema.artikler.map((a) => a.id)], `Medietema: ${tema.titel}`);
        medier.push({
          titel: tema.titel,
          omraade: tema.omraade,
          kommentar,
          ...(kommentar ? {} : { udenKommentar: "holdt ikke selvtjekket" as const }),
          artikler: artiklerFor(tema.artikler),
        });
      });

      const dagens: DagensAnalyse | null =
        tese && betyder && siger.length > 0
          ? {
              omraade: omr,
              overskrift,
              tese: rensSprog(d.tese),
              hvadTalleneSiger: siger,
              hvadDetBetyder: {
                virksomhed: rensSprog(udenPraefiks(d.hvadDetBetyder.virksomhed)),
                husholdning: rensSprog(udenPraefiks(d.hvadDetBetyder.husholdning)),
              },
              holdOeje,
            }
          : null;
      if (!dagens) fjernede.push("analysen havde ikke både en holdbar tese, mindst ét holdbart afsnit om tallene og en holdbar betydning");
      log({ type: "selvtjek", data: { forsoeg, dagens: !!dagens, siger: siger.length, holdOeje: holdOeje.length, medier: medier.length } });
      return { dagens, medier, fjernede, forbehold: d.forbehold.map(rensSprog) };
    };

    let skrevet = await skrivDagens(1, []);
    if (!skrevet.dagens) {
      const andet = await skrivDagens(2, skrevet.fjernede);
      if (andet.dagens) forbehold.push("Første udkast til dagens analyse holdt ikke, så den er skrevet om én gang.");
      skrevet = andet.dagens ? andet : skrevet;
    }
    analyse.dagens = skrevet.dagens;
    forbehold.push(...skrevet.forbehold);
    for (const f of skrevet.fjernede) forbehold.push(`En del af analysen blev fjernet, ${f}.`);
    if (!analyse.dagens) forbehold.push("Dagens analyse holdt ikke selvtjekket og vises ikke. Tallene herunder er beregnet direkte fra kilderne.");

    // Medietemaer uden kommentar vises stadig, med artiklerne.
    analyse.medier = temaer.map(
      (t) =>
        skrevet.medier.find((m) => m.titel === t.titel) ?? {
          titel: t.titel,
          omraade: t.omraade,
          kommentar: null,
          udenKommentar: "ikke skrevet" as const,
          artikler: artiklerFor(t.artikler),
        }
    );

    // 7. En kort analyse per område (Sonnet, ét kald), til områdesiderne.
    const omraadeData = OMRAADER.map((o) => ({
      o,
      poster: [
        ...tal.filter((p) => postIOmraade(p.id, o)),
        ...temaer.filter((t) => t.omraade === o.noegle).flatMap((t) => t.artikler),
      ],
    })).filter((x) => x.poster.some((p) => p.type === "tal"));
    if (omraadeData.length > 0) {
      log({ type: "skriver", beslutning: "områdeanalyser", data: { omraader: omraadeData.map((x) => x.o.noegle) } });
      const os = await kaldMedLoft(k, {
        trin: "områdeanalyser",
        model: MODEL_SKRIV,
        system: finnSystem(kilder),
        bruger:
          `Dato: ${dag}.\n\nSkriv en kort analyse for HVERT område herunder. "noegle" er områdets nøgle. ` +
          `"overskrift" er højst ti ord. "afsnit" er 2 til 3 afsnit, hver 1 til 3 sætninger, der siger hvad tallene ` +
          `viser og hvad det betyder for en dansk virksomhed eller husholdning. Hvert afsnit har de id'er i "kilder" ` +
          `det bygger på, og bruger kun tal fra netop dem. Ingen råd.\n\n` +
          omraadeData.map((x) => `OMRÅDE ${x.o.noegle} (${x.o.navn}: ${x.o.beskrivelse})\n${data(x.poster)}`).join("\n\n"),
        skema: OmrSkema,
        maxTokens: 12000,
        effort: "medium",
      });
      const tilladt = new Map(omraadeData.map((x) => [x.o.noegle as string, x]));
      const svarte = os.data.omraader.filter((x) => {
        if (!tilladt.has(x.noegle)) log({ type: "afvist", titel: x.overskrift, grund: `analyse for område "${x.noegle}", som ikke var bedt om` });
        return tilladt.has(x.noegle);
      });
      const tekster = svarte.flatMap((x) => x.afsnit.map((a) => a.tekst));
      const brudt = await regeltjek("selvtjek regler, områder", tekster);
      let nr = 0;
      for (const x of svarte) {
        const { o, poster } = tilladt.get(x.noegle)!;
        const afsnit: Afsnit[] = [];
        for (const a of x.afsnit) {
          nr++;
          const navn = `${o.navn}: ${rensSprog(x.overskrift)}`;
          if (brudt.has(nr)) {
            log({ type: "fjernet", titel: navn, grund: `brød Finns regler (${brudt.get(nr)})` });
            continue;
          }
          // Kun kilder fra området selv.
          const r = tjekAfsnit(a.tekst, a.kilder.filter((id) => poster.some((p) => p.id === id)));
          if (!r.afsnit) {
            log({ type: "fjernet", titel: navn, grund: r.grund });
            continue;
          }
          afsnit.push(r.afsnit);
        }
        if (afsnit.length === 0) {
          log({ type: "fjernet", titel: o.navn, grund: "ingen afsnit i områdeanalysen holdt selvtjekket" });
          continue;
        }
        analyse.omraader[o.noegle] = { overskrift: rensSprog(x.overskrift), afsnit };
        log({ type: "omraade", titel: o.navn, data: { afsnit: afsnit.length } });
      }
      const mangler = omraadeData.filter((x) => !analyse.omraader[x.o.noegle]).map((x) => x.o.navn);
      if (mangler.length) forbehold.push(`Ingen holdbar analyse i dag for: ${mangler.join(", ")}.`);
    }

    // 8. Gem.
    log({
      type: "slut",
      beslutning: "DONE",
      data: { dagens: !!analyse.dagens, medier: analyse.medier.length, omraader: Object.keys(analyse.omraader).length },
    });
    await afslut(prisma, brief.id, "DONE", null, trace, { items: [], analysis: analyse, caveats: forbehold, sourcesRead, kept });
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
  felter: { items?: BriefPunkt[]; analysis?: Analyse; caveats?: string[]; sourcesRead: number; kept: number }
) {
  const sum = await prisma.apiLedger.aggregate({ _sum: { costUsd: true }, where: { briefId } });
  await prisma.$transaction([
    prisma.brief.update({
      where: { id: briefId },
      data: {
        status,
        statusMessage: besked,
        items: (felter.items ?? undefined) as Prisma.InputJsonValue | undefined,
        analysis: (felter.analysis ?? undefined) as Prisma.InputJsonValue | undefined,
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
