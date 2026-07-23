import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Forbigående forbindelsesfejl - typisk Neon der er skaleret til nul (cold start)
// eller et kortvarigt netværksblip. Ikke et data- eller kodeproblem.
const TRANSIENT_DB_ERROR =
  /Can't reach database server|Connection terminated|server closed the connection|Timed out fetching a new connection|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN/i;

export function isTransientDbError(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  // Prisma: P1001 (kan ikke nå), P1002 (timeout), P1008 (op-timeout), P1017 (lukket)
  if (code && /^P100[1278]$/.test(code)) return true;
  const message = err instanceof Error ? err.message : String(err);
  return TRANSIENT_DB_ERROR.test(message);
}

// Kør fn og genforsøg ved forbigående DB-forbindelsesfejl med voksende pause,
// så en Neon cold start (databasen vågner) rides af i stedet for at fejle straks.
export async function withDbRetry<T>(
  fn: () => Promise<T>,
  opts: { attempts?: number; baseDelayMs?: number } = {}
): Promise<T> {
  const attempts = opts.attempts ?? 4;
  const baseDelayMs = opts.baseDelayMs ?? 700;
  let lastErr: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === attempts - 1 || !isTransientDbError(err)) throw err;
      // 700ms, 1400ms, 2800ms -> ~4,9s samlet ventetid, rigeligt til en Neon-opvågning
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt));
    }
  }
  throw lastErr;
}
