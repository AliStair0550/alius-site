// ============================================================
// Henter børsnoterede selskabers regnskaber fra Erhvervsstyrelsen
//
// Run with:
//   set -a && . ./.env.local && set +a
//   npx tsx scripts/sync-regnskaber.ts [--dry] [--fra=YYYY-MM-DD] [cvr ...]
//
// Skriver i tabellen regnskabstal. Kører i GitHub Actions som et trin i
// sync-series.yml; skriveværnet nægter lokalt. --dry læser og
// kontrollerer alt, men skriver intet, og må køres hvor som helst.
//
// Standardvinduet er 45 dage bagud efter offentliggørelse. Første gang,
// og efter en pause, køres det med --fra for at få historikken med.
//
// Hvert selskab ender i præcis én tilstand, og de skrives ud til sidst.
// Fejler ét, fortsætter resten, og kørslen afsluttes med fejl.
// ============================================================

import { PrismaClient, Prisma } from "@prisma/client";
import { withDbRetry } from "../src/lib/db";
import { SELSKABER, type Selskab } from "../config/selskaber";
import { hentIndleveringer, hentXbrl } from "../src/lib/regnskaber/virk";
import { laesEsef } from "../src/lib/regnskaber/esef";
import { kontroller, planlaeg, type Gaeldende } from "../src/lib/regnskaber/plan";
import { kraevSkriveret } from "./write-guard";

const DRY = process.argv.includes("--dry");
const FRA_ARG = process.argv.find((a) => a.startsWith("--fra="))?.slice("--fra=".length);
if (FRA_ARG && !/^\d{4}-\d{2}-\d{2}$/.test(FRA_ARG)) {
  console.error(`--fra skal være YYYY-MM-DD, ikke "${FRA_ARG}"`);
  process.exit(1);
}
const FRA = FRA_ARG ?? new Date(Date.now() - 45 * 86_400_000).toISOString().slice(0, 10);
const KUN = process.argv.slice(2).filter((a) => !a.startsWith("-"));

const prisma = new PrismaClient();

type Optaelling = { nye: number; revideret: number; uaendret: number; konflikter: number; sprunget: number };

type Udfald =
  | ({ slags: "skrevet"; indleveringer: number } & Optaelling)
  | { slags: "allerede_laest"; indleveringer: number }
  | { slags: "ingen_i_vindue" }
  | ({ slags: "toerloeb"; indleveringer: number } & Optaelling)
  | { slags: "fejl"; besked: string };

const dato = (d: Date) => d.toISOString().slice(0, 10);

async function koerSelskab(s: Selskab): Promise<Udfald> {
  // Ældste først, så en senere omarbejdelse bliver revisionen af den tidligere.
  const alle = (await hentIndleveringer(s.cvr, FRA)).reverse();
  if (alle.length === 0) return { slags: "ingen_i_vindue" };
  const sum: Optaelling = { nye: 0, revideret: 0, uaendret: 0, konflikter: 0, sprunget: 0 };
  const medEsef = alle.filter((i) => {
    const hvorfor = !i.esefUrl
      ? "ingen ESEF-instans i indleveringen"
      : s.springOver?.find((x) => x.sagsNummer === i.sagsNummer)?.grund ??
        (s.valutaskifte && i.periodeSlut < s.valutaskifte.fraPeriodeSlut
          ? `før valutaskiftet fra ${s.valutaskifte.foer} til ${s.valuta}; sammenligningstallene kommer omregnet i senere regnskaber`
          : null);
    if (hvorfor) {
      console.log(`   SPRINGES OVER ${i.slags} ${i.periodeStart}..${i.periodeSlut} (${i.sagsNummer}): ${hvorfor}`);
      sum.sprunget++;
    }
    return !hvorfor;
  });
  if (medEsef.length === 0) return { slags: "ingen_i_vindue" };

  // Navnet efterprøves på det NYESTE regnskab først. Bekræfter det CVR'et,
  // kan ældre filer uden navn godtages. Se kontroller().
  const laest = new Map<string, ReturnType<typeof laesEsef>>();
  const nyeste = medEsef[medEsef.length - 1];
  const lNyeste = laesEsef(await hentXbrl(nyeste.esefUrl!));
  laest.set(nyeste.sagsNummer, lNyeste);
  kontroller(s, lNyeste);
  const navnBekraeftet = s.navnIRegnskab !== null && lNyeste.navn !== null;

  const laeste = new Set(
    (await withDbRetry(() => prisma.regnskabstal.findMany({ where: { cvr: s.cvr, sagsNummer: { in: medEsef.map((i) => i.sagsNummer) } }, distinct: ["sagsNummer"], select: { sagsNummer: true } }))).map((r) => r.sagsNummer)
  );
  const nyeIndleveringer = medEsef.filter((i) => !laeste.has(i.sagsNummer));
  if (nyeIndleveringer.length === 0) return { slags: "allerede_laest", indleveringer: medEsef.length };


  for (const i of nyeIndleveringer) {
    const l = laest.get(i.sagsNummer) ?? laesEsef(await hentXbrl(i.esefUrl!));
    kontroller(s, l, navnBekraeftet);
    for (const k of l.konflikter) console.log(`   KONFLIKT i ${i.slags} ${i.periodeSlut} (${i.sagsNummer}), ikke skrevet: ${k}`);
    sum.konflikter += l.konflikter.length;

    const gaeldende: Gaeldende[] = (
      await withDbRetry(() => prisma.regnskabstal.findMany({ where: { cvr: s.cvr, isCurrent: true }, select: { begreb: true, periodeStart: true, periodeSlut: true, vaerdi: true, valuta: true, decimaler: true } }))
    ).map((r) => ({ begreb: r.begreb, start: dato(r.periodeStart), slut: dato(r.periodeSlut), vaerdi: Number(r.vaerdi), valuta: r.valuta, decimaler: r.decimaler }));
    const plan = planlaeg(gaeldende, l.fakta);
    sum.nye += plan.nye.length;
    sum.revideret += plan.revideret.length;
    sum.uaendret += plan.uaendret;
    console.log(`   ${i.slags} ${i.periodeStart}..${i.periodeSlut} (off. ${i.offentliggjort.slice(0, 10)}): ${plan.nye.length} nye, ${plan.revideret.length} revideret, ${plan.uaendret} uændret`);
    for (const r of plan.revideret) {
      console.log(`      REVISION ${r.fakta.begreb} ${r.fakta.start}..${r.fakta.slut}: ${r.foer} -> ${r.fakta.vaerdi} ${r.fakta.valuta}`);
    }
    if (DRY) continue;

    const raekke = (f: (typeof l.fakta)[number]): Prisma.RegnskabstalCreateManyInput => ({
      cvr: s.cvr,
      begreb: f.begreb,
      element: f.element,
      periodeStart: new Date(`${f.start}T00:00:00Z`),
      periodeSlut: new Date(`${f.slut}T00:00:00Z`),
      vaerdi: f.vaerdi,
      valuta: f.valuta,
      decimaler: f.decimaler,
      sagsNummer: i.sagsNummer,
      indleveringSlags: i.slags,
      offentliggjort: new Date(i.offentliggjort),
      kildeUrl: i.esefUrl!,
    });
    // Ens tal skrives ikke igen: to gældende rækker for samme periode må
    // ikke opstå. En indlevering uden ét nyt tal efterlader derfor ingen
    // række og læses igen næste dag. Det koster ét hent og ændrer intet.
    const nye = [...plan.nye, ...plan.revideret.map((r) => r.fakta)];
    await withDbRetry(() =>
      prisma.$transaction([
        ...plan.revideret.map((r) =>
          prisma.regnskabstal.updateMany({
            where: { cvr: s.cvr, begreb: r.fakta.begreb, periodeStart: new Date(`${r.fakta.start}T00:00:00Z`), periodeSlut: new Date(`${r.fakta.slut}T00:00:00Z`), isCurrent: true },
            data: { isCurrent: false },
          })
        ),
        prisma.regnskabstal.createMany({ data: nye.map(raekke) }),
      ])
    );
  }
  return DRY ? { slags: "toerloeb", indleveringer: nyeIndleveringer.length, ...sum } : { slags: "skrevet", indleveringer: nyeIndleveringer.length, ...sum };
}

async function main() {
  if (!DRY) kraevSkriveret("sync-regnskaber.ts");
  const selskaber = KUN.length ? SELSKABER.filter((s) => KUN.includes(s.cvr)) : SELSKABER;
  const ukendte = KUN.filter((c) => !SELSKABER.some((s) => s.cvr === c));
  if (ukendte.length) {
    console.error(`Ukendte CVR'er: ${ukendte.join(", ")}. Tilføj dem i config/selskaber.ts.`);
    process.exit(1);
  }
  console.log(`Regnskaber offentliggjort fra ${FRA}${DRY ? ", TØRLØB, skriver intet" : ""}. ${selskaber.length} selskaber.\n`);

  const udfald: { s: Selskab; u: Udfald }[] = [];
  for (const s of selskaber) {
    console.log(`[${s.navn}, ${s.cvr}]`);
    let u: Udfald;
    try {
      u = await koerSelskab(s);
    } catch (e) {
      u = { slags: "fejl", besked: (e as Error).message };
      console.log(`   FEJL: ${u.besked}`);
    }
    udfald.push({ s, u });
  }

  console.log("\nOPSUMMERING");
  for (const { s, u } of udfald) {
    const t =
      u.slags === "skrevet" || u.slags === "toerloeb"
        ? `${u.slags === "toerloeb" ? "tørløb" : "skrevet"}: ${u.indleveringer} indleveringer, ${u.nye} nye, ${u.revideret} revideret, ${u.uaendret} uændret` +
          (u.konflikter ? `, ${u.konflikter} modsigelser i regnskabet ikke skrevet` : "") +
          (u.sprunget ? `, ${u.sprunget} indleveringer sprunget over` : "")
        : u.slags === "allerede_laest"
          ? `allerede læst (${u.indleveringer} indleveringer i vinduet)`
          : u.slags === "ingen_i_vindue"
            ? "ingen regnskab med ESEF offentliggjort i vinduet"
            : `FEJL: ${u.besked}`;
    console.log(`  ${s.navn.padEnd(22)} ${t}`);
  }
  await prisma.$disconnect();
  if (udfald.some((x) => x.u.slags === "fejl")) process.exit(1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
