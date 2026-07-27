// ============================================================
// Batched DataPoint writes
//
// Erstatter mønsteret "findFirst + update/create per række", som var
// årsagen til at sync-workflowet ramte sit 30-minutters timeout:
// ét round-trip per række mod en pooled Neon-forbindelse er ~90 ms,
// så 6.628 rækker tog ~10 minutter selv når intet havde ændret sig.
//
// I stedet: én læsning af alle eksisterende rækker for kilden,
// sammenligning i hukommelsen, og skrivning med createMany/updateMany.
// ============================================================

import type { Prisma, PrismaClient } from "@prisma/client";

export type PendingPoint = {
  period: string;
  periodDate: Date;
  periodType: "MONTH" | "QUARTER" | "YEAR" | "WEEK";
  areaCode: string | null;
  areaType: "NATIONAL" | "REGION" | "LANDSDEL" | "KOMMUNE" | "OTHER";
  areaName: string | null;
  value: number | null;
  status?: string | null;
  dimensions?: Record<string, string> | null;
};

export type BatchWriteResult = {
  inserted: number;
  updated: number;
  unchanged: number;
  /** Rækker droppet fordi en tidligere række i samme payload havde samme nøgle. */
  duplicates: number;
};

// ----------------------------------------------------------------
// Nøgler
//
// De fleste datasæt identificeres entydigt af (periode, område).
// KONK4 gør ikke: alle 20 brancher deler areaCode = NULL og adskilles
// kun af dimensions-JSON. Derfor er nøglen konfigurerbar.
// ----------------------------------------------------------------

export type KeyParts = {
  period: string;
  areaCode: string | null;
  dimensions: Record<string, unknown> | null;
};

export type KeyFn = (p: KeyParts) => string;

/** Standardnøgle: (periode, område). Bruges af 8 af de 10 kilder. */
export const areaKey: KeyFn = (p) => `${p.period}::${p.areaCode ?? ""}`;

/**
 * Nøgle der også inddrager navngivne felter fra dimensions-JSON.
 * Til datasæt hvor flere rækker deler (periode, område),
 * fx KONK4: dimensionKey("BRANCHE_CODE", "VIRKTYPE_CODE").
 */
export function dimensionKey(...fields: string[]): KeyFn {
  return (p) => {
    const d = p.dimensions ?? {};
    return [p.period, p.areaCode ?? "", ...fields.map((f) => String(d[f] ?? ""))].join("::");
  };
}

// ----------------------------------------------------------------

// Postgres tillader 65535 bind-parametre per statement. DataPoint har
// 11 kolonner, så 1.000 rækker per createMany holder god afstand.
const INSERT_CHUNK = 1000;
const UPDATE_CHUNK = 1000;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function asDimensions(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

/**
 * Skriver rækker til DataPoint for én kilde.
 *
 * Semantikken er den samme som den den erstatter: en række der findes
 * med uændret værdi røres ikke, en der findes med ny værdi opdateres,
 * og en der ikke findes indsættes. Forskellen er antallet af round-trips:
 * fra 2N til cirka 1 + N/1000.
 */
export async function writeDataPoints(
  prisma: PrismaClient,
  sourceId: string,
  rows: PendingPoint[],
  keyOf: KeyFn = areaKey
): Promise<BatchWriteResult> {
  const result: BatchWriteResult = {
    inserted: 0,
    updated: 0,
    unchanged: 0,
    duplicates: 0,
  };

  // 1. Én læsning af alt hvad kilden allerede har.
  const existingRows = await prisma.dataPoint.findMany({
    where: { sourceId },
    select: {
      id: true,
      period: true,
      areaCode: true,
      value: true,
      status: true,
      dimensions: true,
    },
  });

  const existing = new Map<
    string,
    { id: string; value: number | null; status: string | null }
  >();
  for (const row of existingRows) {
    const key = keyOf({
      period: row.period,
      areaCode: row.areaCode,
      dimensions: asDimensions(row.dimensions),
    });
    // Hvis basen allerede indeholder dubletter på nøglen, vinder den
    // første. Det matcher findFirst-adfærden den erstatter.
    if (!existing.has(key)) {
      existing.set(key, { id: row.id, value: row.value, status: row.status });
    }
  }

  // 2. Sammenlign i hukommelsen.
  type InsertRow = Prisma.DataPointCreateManyInput;
  const toInsert: InsertRow[] = [];
  const toUpdate: { id: string; value: number | null; status: string | null }[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const key = keyOf({
      period: row.period,
      areaCode: row.areaCode,
      dimensions: row.dimensions ?? null,
    });

    if (seen.has(key)) {
      result.duplicates++;
      continue;
    }
    seen.add(key);

    const status = row.status ?? null;
    const prior = existing.get(key);

    if (!prior) {
      toInsert.push({
        sourceId,
        period: row.period,
        periodDate: row.periodDate,
        periodType: row.periodType,
        areaCode: row.areaCode,
        areaType: row.areaType,
        areaName: row.areaName,
        value: row.value,
        status,
        dimensions: (row.dimensions ?? undefined) as Prisma.InputJsonValue | undefined,
      });
    } else if (prior.value !== row.value || prior.status !== status) {
      toUpdate.push({ id: prior.id, value: row.value, status });
    } else {
      result.unchanged++;
    }
  }

  // 3. Indsæt i portioner.
  for (const batch of chunk(toInsert, INSERT_CHUNK)) {
    const res = await prisma.dataPoint.createMany({
      data: batch,
      skipDuplicates: true,
    });
    result.inserted += res.count;
  }

  // 4. Opdatér i portioner, grupperet efter ny værdi.
  //
  // Revisioner er sjældne (2.030 rækker ud af 71.034 nogensinde), så
  // antallet af grupper er lille i praksis. Rækker der skal have samme
  // nye værdi kan opdateres i ét statement.
  const groups = new Map<
    string,
    { value: number | null; status: string | null; ids: string[] }
  >();
  for (const u of toUpdate) {
    const gk = `${u.value === null ? "null" : u.value}::${u.status ?? ""}`;
    const group = groups.get(gk) ?? { value: u.value, status: u.status, ids: [] };
    group.ids.push(u.id);
    groups.set(gk, group);
  }

  for (const group of groups.values()) {
    for (const ids of chunk(group.ids, UPDATE_CHUNK)) {
      const res = await prisma.dataPoint.updateMany({
        where: { id: { in: ids } },
        data: { value: group.value, status: group.status },
      });
      result.updated += res.count;
    }
  }

  return result;
}
