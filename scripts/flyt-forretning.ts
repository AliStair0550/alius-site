// ============================================================
// Flyt forretningens data til dens egen database
//
// Engangsopgave, skrevet 14. august og koert 9. oktober 2026. Kopierer Profile, TeamSession,
// TeamMember og TeamRequest fra den faelles base over i den nye.
//
// KOERES SAADAN
//
//   npx tsx scripts/flyt-forretning.ts --toerloeb   (viser kun tal)
//   npx tsx scripts/flyt-forretning.ts              (skriver)
//
// Begge adresser skal staa i .env.local:
//   DATABASE_URL             den gamle, faelles base (kilde)
//   FORRETNING_DATABASE_URL  den nye (maal)
//
// HVORFOR DEN IKKE KALDER kraevSkriveret()
//
// Skrivevaernet findes for at holde tilbagevendende hentejob vaek fra
// udviklermaskiner, hvor tidszone og sprog kan aendre TALLENE. Se
// CLAUDE.md, afsnittet "Hvor skrivning sker".
//
// Det her er ikke et hentejob. Det er en migration, og migrationer
// koeres i haanden fra en udviklermaskine i det her projekt, praecis
// som npm run db:apply. Proeven i CLAUDE.md er: kan resultatet afhaenge
// af hvilken maskine der startede koerslen? Nej. Der laeses og skrives
// de samme vaerdier; datoer gaar gennem Prisma som absolutte
// tidspunkter og formateres aldrig undervejs.
//
// Til gengaeld har den sine egne vaern, som staar nedenfor.
//
// DEN ROERER ALDRIG KILDEN
//
// Der laeses fra den gamle base. Der slettes intet. Gaar noget galt,
// staar originalen uroert, og man kan proeve igen.
// ============================================================

import { Prisma, PrismaClient } from "../src/generated/forretning";

const TOERLOEB = process.argv.includes("--toerloeb");

/**
 * Prismas laesetype for Json rummer null, skrivetypen goer ikke.
 *
 * Profile.totals og .selections er erklaeret Json uden spoergsmaalstegn,
 * saa de burde aldrig vaere null. Men JSON-null og SQL-null er to
 * forskellige ting i Postgres, og en blind cast ville lave den ene om
 * til den anden uden at nogen opdagede det. Derfor det udtrykkelige
 * skel her frem for `as any`.
 */
function somJson(v: Prisma.JsonValue): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return v === null ? Prisma.JsonNull : (v as Prisma.InputJsonValue);
}

function vaert(url: string): string {
  const m = url.match(/@([^/?]+)/);
  return m ? m[1] : "(ukendt vaert)";
}

async function main() {
  const kildeUrl = process.env.DATABASE_URL;
  const maalUrl = process.env.FORRETNING_DATABASE_URL;

  // Fravaer er en egen tilstand og skal siges hoejt, ikke blive til nul.
  if (!kildeUrl) throw new Error("DATABASE_URL mangler. Kilden er ukendt, ikke tom.");
  if (!maalUrl) throw new Error("FORRETNING_DATABASE_URL mangler. Maalet er ukendt, ikke tomt.");
  if (vaert(kildeUrl) === vaert(maalUrl)) {
    throw new Error(
      `Kilde og maal peger paa samme vaert (${vaert(kildeUrl)}). ` +
        "Det ville kopiere data oven i sig selv. Stopper."
    );
  }

  const kilde = new PrismaClient({ datasourceUrl: kildeUrl });
  const maal = new PrismaClient({ datasourceUrl: maalUrl });

  console.log("kilde:", vaert(kildeUrl));
  console.log("maal :", vaert(maalUrl));
  console.log(TOERLOEB ? "TOERLOEB - der skrives intet\n" : "");

  const tael = async (p: PrismaClient) => ({
    Profile: await p.profile.count(),
    TeamSession: await p.teamSession.count(),
    TeamMember: await p.teamMember.count(),
    TeamRequest: await p.teamRequest.count(),
  });

  const foer = await tael(kilde);
  const maalFoer = await tael(maal);

  console.log("tabel          kilde   maal foer");
  for (const k of Object.keys(foer) as (keyof typeof foer)[]) {
    console.log(`  ${k.padEnd(13)} ${String(foer[k]).padStart(5)}  ${String(maalFoer[k]).padStart(9)}`);
  }
  console.log("");

  const maalHarNoget = Object.values(maalFoer).some((n) => n > 0);
  if (maalHarNoget && !TOERLOEB) {
    throw new Error(
      "Maalet indeholder allerede raekker. Kopiering oveni ville enten " +
        "fejle paa noegler eller lave dubletter. Toem maalet foerst, " +
        "eller undersoeg hvorfor der staar noget."
    );
  }

  if (TOERLOEB) {
    console.log("Toerloeb slut. Intet skrevet.");
    await kilde.$disconnect();
    await maal.$disconnect();
    return;
  }

  // Raekkefoelgen foelger fremmednoeglerne: TeamMember peger paa baade
  // Profile og TeamSession, TeamRequest peger paa TeamSession.
  const profiler = await kilde.profile.findMany();
  await maal.profile.createMany({
    data: profiler.map((p) => ({
      ...p,
      totals: somJson(p.totals),
      selections: somJson(p.selections),
    })),
  });
  console.log(`  Profile     : ${profiler.length} kopieret`);

  const sessioner = await kilde.teamSession.findMany();
  await maal.teamSession.createMany({ data: sessioner });
  console.log(`  TeamSession : ${sessioner.length} kopieret`);

  const medlemmer = await kilde.teamMember.findMany();
  await maal.teamMember.createMany({ data: medlemmer });
  console.log(`  TeamMember  : ${medlemmer.length} kopieret`);

  const anmodninger = await kilde.teamRequest.findMany();
  await maal.teamRequest.createMany({ data: anmodninger });
  console.log(`  TeamRequest : ${anmodninger.length} kopieret`);

  // Efterproevning. Uenige tal skal stoppe koerslen, ikke staa i en log
  // som nogen maaske laeser.
  const efter = await tael(maal);
  console.log("\ntabel          kilde   maal efter");
  let uenig = false;
  for (const k of Object.keys(foer) as (keyof typeof foer)[]) {
    const ok = foer[k] === efter[k];
    if (!ok) uenig = true;
    console.log(
      `  ${k.padEnd(13)} ${String(foer[k]).padStart(5)}  ${String(efter[k]).padStart(10)}  ${ok ? "ok" : "UENIGE"}`
    );
  }

  await kilde.$disconnect();
  await maal.$disconnect();

  if (uenig) throw new Error("Antallet stemmer ikke. Kilden er uroert; undersoeg foer du skifter DATABASE_URL.");
  console.log("\nAlle tal stemmer. Kilden er uroert og kan ryddes senere.");
}

main().catch((e) => {
  console.error("\nFEJL:", e instanceof Error ? e.message : e);
  process.exit(1);
});
