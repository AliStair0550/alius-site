// ============================================================
// Værn mod at køre destruktive Prisma-kommandoer mod produktion
//
// Run with: npx tsx scripts/db-guard.ts <kommandonavn>
//
// Baggrund: den 27. juli 2026 ville `prisma migrate dev` have nulstillet
// produktionsdatabasen. Kommandoen er standard, den stod i README, og
// den ramte produktion fordi DATABASE_URL lå i .env, som Prisma CLI
// indlæser automatisk.
//
// Skemadriften der udløste det er lukket, men trykket på aftrækkeren
// findes stadig. Dette script er sikringen: det nægter at lade
// destruktive kommandoer køre mod en produktionsvært.
// ============================================================

/**
 * Værter der aldrig må rammes af en destruktiv kommando.
 *
 * Matchet er på delstreng, så både pooled og direkte Neon-endpoints
 * fanges af samme mønster.
 */
const PRODUCTION_HOSTS = [
  "ep-rough-forest-alz77jsq", // Neon, alius-site produktion
];

const command = process.argv[2] ?? "ukendt kommando";
const url = process.env.DATABASE_URL;

if (!url) {
  console.error(
    `\n  DATABASE_URL er ikke sat.\n\n` +
      `  Det er med vilje: produktionsstrengen er flyttet ud af .env, som\n` +
      `  Prisma CLI indlæser automatisk, og ind i .env.local, som den ikke gør.\n\n` +
      `  Skal du køre mod produktion bevidst:\n` +
      `      set -a && . ./.env.local && set +a && <din kommando>\n`
  );
  process.exit(1);
}

let host = "";
try {
  host = new URL(url).host;
} catch {
  console.error(`  DATABASE_URL kunne ikke parses.`);
  process.exit(1);
}

const isProduction = PRODUCTION_HOSTS.some((h) => host.includes(h));

if (isProduction) {
  console.error(
    `\n  STOP. "${command}" er destruktiv og peger på produktion.\n\n` +
      `      vært:  ${host}\n\n` +
      `  Kommandoen ville slette data i alle tabeller, herunder\n` +
      `  observations og series.\n\n` +
      `  Skal skemaet ændres i produktion, er vejen:\n` +
      `      1. Ret prisma/schema.prisma\n` +
      `      2. npm run db:diff        (viser SQL, kører ingenting)\n` +
      `      3. npm run db:apply       (kører SQL, additivt)\n` +
      `      4. npx prisma migrate resolve --applied <navn>\n\n` +
      `  Se CLAUDE.md, afsnittet om databasen.\n`
  );
  process.exit(1);
}

console.log(`  db-guard: "${command}" mod ${host} - ikke produktion, fortsætter.`);
