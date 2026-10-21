// ============================================================
// Én hentning per kilde per dag
//
// Et svar der lykkedes, gemmes i source_cache under "<kilde>:<dag>".
// Køres pipelinen igen samme dag, læses svaret derfra, og kilden
// bliver ikke spurgt igen.
//
// Fejl og blokeringer gemmes IKKE. En kilde der svarede 503 i morges,
// skal have en chance til, hvis nogen kører igen i eftermiddag.
// ============================================================

import type { PrismaClient, Prisma } from "@prisma/client";
import type { Kilde, KildeSvar } from "./typer";

export async function hentMedCache(prisma: PrismaClient, kilde: Kilde, dag: string): Promise<KildeSvar> {
  const noegle = `${kilde.id}:${dag}`;
  const gemt = await prisma.sourceCache.findUnique({ where: { key: noegle } });
  if (gemt) return { ...(gemt.payload as unknown as KildeSvar), fraCache: true };

  let svar: KildeSvar;
  try {
    svar = await kilde.hent(dag);
  } catch (e) {
    // En kilde der kaster, er en fejl med en besked. Aldrig en tom liste.
    svar = {
      kilde: kilde.id,
      navn: kilde.navn,
      url: "",
      hentet: new Date().toISOString(),
      status: "fejl",
      poster: [],
      besked: (e as Error).message.slice(0, 500),
    };
  }

  if (svar.status === "ok" || svar.status === "tom") {
    await prisma.sourceCache.upsert({
      where: { key: noegle },
      create: { key: noegle, fetchedAt: new Date(svar.hentet), payload: svar as unknown as Prisma.InputJsonValue },
      update: { fetchedAt: new Date(svar.hentet), payload: svar as unknown as Prisma.InputJsonValue },
    });
  }
  return svar;
}
