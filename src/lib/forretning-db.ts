// ============================================================
// Forretningens database
//
// Tankeprofilen, holdsessionerne og henvendelserne. Egen database,
// egen Prisma-klient, egen kvote.
//
// HVORFOR DEN LIGGER FOR SIG
//
// Indtil 9. oktober 2026 laa forretningen i samme base som Pulse.
// Pulse braendte den faelles maanedskvote paa 5 GB op to gange, og
// naar kvoten er opbrugt, holder basen op med at svare for ALT der
// roerer den. Altsaa ogsaa for et menneske der er ved at udfylde sin
// tankeprofil, og for en holdsession der skal oprettes.
//
// Forholdet var 0,5 MB mod 90 MB. Forretningen fyldte en halv procent
// af basen og baerer hele vaerdien. Den skulle ikke kunne vaeltes af en
// nabo der fylder hundrede og firs gange mere.
//
// Ingen relation krydsede graensen mellem de to, saa adskillelsen
// kostede ingen datamodel.
//
// HVAD DER HOERER TIL HER
//
// Profile, TeamSession, TeamMember, TeamRequest. Se
// prisma/forretning.prisma. Alt om serier og observationer hoerer i
// @/lib/db, som peger paa Pulses base.
//
// Vaelger du forkert klient, fejler det med det samme og hoejlydt:
// tabellen findes ikke i den anden base. Det er med vilje bedre end en
// tom liste.
//
// GENFORSOEG
//
// withDbRetry og isTransientDbError genbruges fra @/lib/db. De handler
// om Neons opvaagnen fra nul og er ens for begge baser.
// ============================================================

import { PrismaClient } from "@/generated/forretning";

const globalForForretning = globalThis as unknown as {
  forretningPrisma: PrismaClient | undefined;
};

export const forretningPrisma =
  globalForForretning.forretningPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForForretning.forretningPrisma = forretningPrisma;
}

export { withDbRetry, isTransientDbError } from "@/lib/db";
