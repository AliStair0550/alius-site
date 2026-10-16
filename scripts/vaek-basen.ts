// ============================================================
// Væk basen før det første trin der skriver
//
// Kører i sync-series.yml lige efter testene.
//
// HVORFOR
//
// Neon sover efter fem minutters stilhed. Det første kald efter en
// opvågning kan fejle med "Can't reach database server", selvom basen
// er i orden. Den 15. oktober 2026 ramte det AUS08, som var det første
// trin der rørte basen; KONK3 få sekunder senere nåede den fint.
//
// Trinene efter dette ligger tæt nok til at basen ikke når at sove
// igen, så ét opvarmet kald dækker dem alle. Det er billigere end at
// lægge genforsøg ind i hvert gammelt sync-script.
//
// Fejler opvågningen efter alle forsøg, går trinet ud med en fejl og
// siger det. Så ved man at det var basen, ikke AUS08.
//
// SKRIVER INTET. Derfor intet skriveværn.
// ============================================================

import { PrismaClient } from "@prisma/client";
import { withDbRetry } from "../src/lib/db";

const prisma = new PrismaClient();

async function main() {
  const start = Date.now();
  // Seks forsøg med voksende pause: 0,7 + 1,4 + 2,8 + 5,6 + 11,2 sekunder,
  // godt 20 sekunder i alt. Mere end en opvågning normalt tager.
  await withDbRetry(() => prisma.$queryRaw`SELECT 1`, { attempts: 6 });
  console.log(`Basen svarer (${Date.now() - start} ms).`);
}

main()
  .catch((e) => {
    console.error(
      `Basen svarede ikke efter gentagne forsøg: ${e instanceof Error ? e.message : e}`
    );
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
