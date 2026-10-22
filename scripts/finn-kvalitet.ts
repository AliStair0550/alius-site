// ============================================================
// Ugentligt kvalitetstjek af Finns analyser
//
// Run with (i GitHub Actions, agent-finn-kvalitet.yml):
//   npx tsx scripts/finn-kvalitet.ts [--dage=7] [--dry]
//
// Læser de seneste dages færdige analyser, måler i kode og lader Sonnet
// vurdere hvert afsnit mod de data det henviser til. Gemmer rapporten i
// quality_reports og beder Vercel sende den som mail.
//
// --dry: kun målingerne, ingen modelkald, intet skrives. Må køres lokalt.
// Alle modelkald går gennem kaldMedLoft og budgetloftet.
// ============================================================

import { prisma } from "../src/lib/db";
import { laesBudgetConfig, BudgetStop } from "../src/lib/agenter/budget";
import { kaldMedLoft, nyKlient } from "../src/lib/agenter/claude";
import { MODEL_SKRIV } from "../src/lib/agenter/priser";
import { AGENT_ID } from "../src/lib/agenter/finn/pipeline";
import type { Analyse } from "../src/lib/agenter/finn/analyse";
import type { KildeSvar, Post } from "../src/lib/agenter/kilder/typer";
import {
  VurderingSkema,
  afsnitTilVurdering,
  dataLinje,
  maal,
  opsummer,
  score,
  type Dag,
  type DagsVurdering,
} from "../src/lib/agenter/finn/kvalitet";
import { kraevSkriveret } from "./write-guard";

const DRY = process.argv.includes("--dry");
const DAGE = Number(process.argv.find((a) => a.startsWith("--dage="))?.slice(7) ?? 7);
if (!Number.isInteger(DAGE) || DAGE < 1 || DAGE > 31) {
  console.error("--dage skal være et heltal fra 1 til 31");
  process.exit(1);
}

const SYSTEM = [
  {
    type: "text" as const,
    text:
      "Du er redaktør og gennemgår en AI-analytikers tekster om dansk økonomi. Analytikeren skriver for en dansk " +
      "virksomhed med 5 til 50 ansatte og en almindelig husholdning. Tallene er allerede kontrolleret i kode; de står " +
      "i kilderne. Du vurderer det koden ikke kan: om teksten holder.\n\n" +
      "Giv hvert afsnit en score fra 1 til 5 på fire kriterier:\n" +
      "- pointe: følger påstanden af de data afsnittet henviser til? 1 = påstanden støttes ikke eller modsiges af data.\n" +
      "- sammenligning: er sammenligningen fair? Rigtig periode, sæsonkorrektion respekteret, løbende priser nævnt, " +
      "ikke æbler mod pærer. 1 = misvisende.\n" +
      "- relevans: siger det noget en lille virksomhed eller husholdning kan bruge? 1 = ligegyldigt.\n" +
      "- klarhed: forstår en ikke-økonom det ved første læsning? 1 = uforståeligt.\n" +
      "3 er acceptabelt. Giv kun 1 eller 2, når der er en konkret fejl, og beskriv den i 'problem' med højst 25 ord. " +
      "Ellers er problem null. Vær streng, men ikke pedantisk: stil og ordvalg er ikke fejl.\n" +
      "'samlet' er to til tre sætninger om dagens tekster som helhed.",
  },
];

async function dataForDag(dag: string): Promise<Map<string, Post>> {
  // Nøglerne er "<kilde>@<version>:<dag>". Er en kilde gemt i flere
  // versioner samme dag, bruges den nyeste version.
  const raekker = await prisma.sourceCache.findMany({ where: { key: { endsWith: `:${dag}` } }, select: { key: true, payload: true } });
  const nyeste = new Map<string, { version: number; poster: Post[] }>();
  for (const r of raekker) {
    const m = r.key.match(/^(.+?)(?:@(\d+))?:\d{4}-\d{2}-\d{2}$/);
    if (!m) continue;
    const v = Number(m[2] ?? 0);
    const f = nyeste.get(m[1]);
    if (!f || v > f.version) nyeste.set(m[1], { version: v, poster: (r.payload as unknown as KildeSvar).poster ?? [] });
  }
  return new Map([...nyeste.values()].flatMap((x) => x.poster).map((p) => [p.id, p]));
}

async function main() {
  if (!DRY) kraevSkriveret("finn-kvalitet.ts");
  const start = new Date();
  // Til og med i dag: mandagens rapport kører efter morgenens analyse.
  const idag = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const til = new Date(idag.getTime() + 86_400_000);
  const fra = new Date(til.getTime() - DAGE * 86_400_000);

  const briefs = await prisma.brief.findMany({
    where: { agentId: AGENT_ID, status: "DONE", date: { gte: fra, lt: til } },
    orderBy: [{ date: "asc" }, { finishedAt: "desc" }],
    select: { id: true, date: true, analysis: true, costUsd: true },
  });
  // Den seneste færdige brief per dag; en omkørsel erstatter morgenens.
  const perDag = new Map<string, (typeof briefs)[number]>();
  for (const b of briefs) {
    const d = b.date.toISOString().slice(0, 10);
    if (!perDag.has(d) && b.analysis) perDag.set(d, b);
  }
  // Dage med en færdig brief, men ingen analyse (briefs fra før analyseudgaven).
  const udenAnalyse = [...new Set(briefs.map((b) => b.date.toISOString().slice(0, 10)))].filter((d) => !perDag.has(d));
  if (perDag.size === 0) {
    console.log(`Ingen færdige analyser fra ${fra.toISOString().slice(0, 10)} til ${til.toISOString().slice(0, 10)}. Intet at tjekke.`);
    process.exitCode = 1;
    return;
  }

  const dage: Dag[] = [];
  for (const [dato, b] of perDag) {
    const t = await prisma.trace.findUnique({ where: { briefId: b.id }, select: { steps: true } });
    const trin = (t?.steps as { type: string }[] | null) ?? [];
    dage.push({
      dato,
      analyse: b.analysis as unknown as Analyse,
      costUsd: Number(b.costUsd ?? 0),
      skrevet: trin.filter((x) => x.type === "punkt").length,
      fjernet: trin.filter((x) => x.type === "fjernet").length,
    });
  }
  const maalinger = { ...maal(dage), udenAnalyse };
  console.log("MÅLINGER", JSON.stringify(maalinger, null, 1));
  if (DRY) {
    console.log("Tørløb: ingen vurdering, intet skrevet.");
    return;
  }

  const k = { prisma, agentId: AGENT_ID, briefId: null, cfg: laesBudgetConfig(), klient: nyKlient() };
  const vurderinger: DagsVurdering[] = [];
  let stoppet: string | null = null;
  for (const d of dage) {
    const afsnit = afsnitTilVurdering(d.analyse);
    if (afsnit.length === 0) {
      vurderinger.push({ dato: d.dato, samlet: "Ingen afsnit at vurdere.", vurderinger: [], ubesvaret: [] });
      continue;
    }
    const data = await dataForDag(d.dato);
    const bruger =
      `Finns tekster ${d.dato}. Hvert afsnit står med de data det henviser til.\n\n` +
      afsnit
        .map((a, i) => {
          const linjer = a.kilder.map((id) => (data.has(id) ? dataLinje(data.get(id)!) : `${id} | (data for kilden findes ikke længere i cachen)`));
          return `${i + 1}. [${a.sted}]\n${a.tekst}\nDATA:\n${linjer.join("\n")}`;
        })
        .join("\n\n");
    try {
      const r = await kaldMedLoft(k, { trin: "kvalitet", model: MODEL_SKRIV, system: SYSTEM, bruger, skema: VurderingSkema, maxTokens: 6000, effort: "low" });
      const svar = new Map(r.data.vurderinger.map((v) => [v.nummer, v]));
      vurderinger.push({
        dato: d.dato,
        samlet: r.data.samlet,
        vurderinger: afsnit.flatMap((a, i) => {
          const v = svar.get(i + 1);
          return v
            ? [{ sted: a.sted, tekst: a.tekst, pointe: score(v.pointe), sammenligning: score(v.sammenligning), relevans: score(v.relevans), klarhed: score(v.klarhed), problem: v.problem }]
            : [];
        }),
        ubesvaret: afsnit.filter((_, i) => !svar.has(i + 1)).map((a) => a.sted),
      });
      console.log(`${d.dato}: ${svar.size} af ${afsnit.length} afsnit vurderet`);
    } catch (e) {
      if (e instanceof BudgetStop) {
        stoppet = e.grund;
        console.log(`Stoppet af budgetloftet ved ${d.dato}: ${e.grund}`);
        break;
      }
      throw e;
    }
  }

  const pris = await prisma.apiLedger.aggregate({ _sum: { costUsd: true }, where: { agentId: AGENT_ID, step: "kvalitet", ts: { gte: start } } });
  const o = opsummer(vurderinger);
  const rapport = await prisma.qualityReport.create({
    data: {
      agentId: AGENT_ID,
      periodeFra: fra,
      periodeTil: idag,
      maalinger: { ...maalinger, ...(stoppet ? { stoppetAfBudget: stoppet } : {}) },
      vurderinger: { dage: vurderinger, opsummering: o } as unknown as object,
      costUsd: pris._sum.costUsd ?? 0,
    },
  });
  console.log(`Rapport ${rapport.id}: ${o.antal} afsnit vurderet, snit ${JSON.stringify(o.snit)}, ${o.svage.length} svage, pris $${Number(pris._sum.costUsd ?? 0).toFixed(4)}`);

  // Mailen sendes fra Vercel, som har mailnøglen.
  const hemmelighed = process.env.ADMIN_SECRET;
  if (!hemmelighed) {
    console.log("ADMIN_SECRET er ikke sat. Rapporten er gemt, men ikke sendt.");
    process.exitCode = 1;
    return;
  }
  const svar = await fetch(`${process.env.SITE_URL ?? "https://alius.dk"}/api/agenter/kvalitet`, {
    method: "POST",
    headers: { authorization: `Bearer ${hemmelighed}`, "content-type": "application/json" },
    body: JSON.stringify({ id: rapport.id }),
    signal: AbortSignal.timeout(30_000),
  }).catch((e) => ({ status: 0, text: async () => (e as Error).message }));
  const tekst = await svar.text();
  console.log(`Mail: ${svar.status} ${tekst.slice(0, 200)}`);
  if (svar.status !== 200) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error("Fatal:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
