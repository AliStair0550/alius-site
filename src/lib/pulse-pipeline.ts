// ============================================================
// Pulse pipeline orchestrator
//
// Reusable functions so the cron endpoint can call sync + signal
// regeneration without duplicating the script logic.
// ============================================================

import { PrismaClient, Prisma } from "@prisma/client";
import { getTableMetadata, getTableData, type DSTVariable } from "./dst";
import { classifyAreaCode } from "./areas";

export type SyncResult = {
  success: boolean;
  hadNewData: boolean;
  rowsInserted: number;
  rowsUpdated: number;
  rowsSkipped: number;
  newDataPeriod: string | null;
  errorMessage?: string;
};

export type SignalResult = {
  success: boolean;
  signalsGenerated: number;
  errorMessage?: string;
};

// ----------------------------------------------------------------
// Helpers (mirrors sync-aus08.ts)
// ----------------------------------------------------------------

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa");
}

function findVariable(
  variables: DSTVariable[],
  ...candidates: string[]
): DSTVariable | undefined {
  const ns = candidates.map(norm);
  return variables.find((v) =>
    ns.some((n) => norm(v.code) === n || norm(v.code).includes(n))
  );
}

function parsePeriodType(
  period: string
): "MONTH" | "QUARTER" | "YEAR" | "WEEK" {
  if (period.includes("M")) return "MONTH";
  if (period.includes("K") || period.includes("Q")) return "QUARTER";
  if (period.includes("W")) return "WEEK";
  return "YEAR";
}

// ----------------------------------------------------------------
// syncAus08
// ----------------------------------------------------------------

/**
 * Sync AUS08 from DST.
 *
 * Idempotent: if DST's lastUpdated timestamp matches our stored value,
 * exits immediately with hadNewData=false (the common case, ~29/30 days).
 */
export async function syncAus08(prisma: PrismaClient): Promise<SyncResult> {
  const TABLE_ID = "AUS08";
  const SOURCE_SLUG = "dst-aus08";

  const result: SyncResult = {
    success: false,
    hadNewData: false,
    rowsInserted: 0,
    rowsUpdated: 0,
    rowsSkipped: 0,
    newDataPeriod: null,
  };

  let fetchLogId: string | null = null;

  try {
    const metadata = await getTableMetadata(TABLE_ID);

    const source = await prisma.dataSource.upsert({
      where: { slug: SOURCE_SLUG },
      create: {
        slug: SOURCE_SLUG,
        provider: "Danmarks Statistik",
        tableId: TABLE_ID,
        name: metadata.label,
        description: metadata.description || null,
        sourceUrl: `https://www.statistikbanken.dk/${TABLE_ID}`,
        license: "CC 4.0 BY",
        updateFrequency: "MONTHLY",
        lastUpdatedAtSource: new Date(metadata.lastUpdated),
      },
      update: {
        name: metadata.label,
        description: metadata.description || null,
      },
    });

    // Change detection: compare DST's lastUpdated with our stored value
    const dstUpdated = new Date(metadata.lastUpdated);
    const ourLastSeen = source.lastUpdatedAtSource;

    if (ourLastSeen && dstUpdated.getTime() === ourLastSeen.getTime()) {
      await prisma.dataSource.update({
        where: { id: source.id },
        data: { lastFetchedAt: new Date() },
      });
      result.success = true;
      result.hadNewData = false;
      return result;
    }

    // New data — proceed with full pull
    const fetchLog = await prisma.fetchLog.create({
      data: { sourceId: source.id },
    });
    fetchLogId = fetchLog.id;

    // Find dimension variables
    const tidVar = findVariable(metadata.variables, "Tid", "TID");
    const omradeVar = findVariable(
      metadata.variables,
      "OMRÅDE",
      "OMRADE",
      "omraade"
    );
    const saesonfakVar = findVariable(
      metadata.variables,
      "SAESONFAK",
      "saeson"
    );

    if (!tidVar)
      throw new Error(
        `Could not find Tid dimension. Available: ${metadata.variables.map((v) => v.code).join(", ")}`
      );
    if (!saesonfakVar)
      throw new Error(
        `Could not find seasonal dimension. Available: ${metadata.variables.map((v) => v.code).join(", ")}`
      );

    const seasonalValue = saesonfakVar.values.find((v) => {
      const t = v.label.toLowerCase();
      return (t.includes("sæsonkorrigeret") || t.includes("saeson")) && !t.includes("ikke");
    });
    if (!seasonalValue)
      throw new Error(
        `Could not find seasonally-adjusted value in ${saesonfakVar.code}`
      );

    const filters = [
      { code: tidVar.code, values: ["*"] },
      { code: saesonfakVar.code, values: [seasonalValue.code] },
      ...(omradeVar ? [{ code: omradeVar.code, values: ["*"] }] : []),
    ];

    const datapoints = await getTableData(TABLE_ID, filters);

    // Build area name lookup
    const areaNameMap = new Map<string, string>();
    if (omradeVar) {
      for (const v of omradeVar.values) {
        areaNameMap.set(v.code, v.label);
      }
    }

    // Load existing rows for dedup
    const existingRows = await prisma.dataPoint.findMany({
      where: { sourceId: source.id },
      select: { id: true, period: true, areaCode: true, value: true },
    });
    const existingMap = new Map<string, { id: string; value: number | null }>();
    for (const row of existingRows) {
      existingMap.set(`${row.period}::${row.areaCode ?? ""}`, {
        id: row.id,
        value: row.value,
      });
    }

    type InsertRow = {
      sourceId: string;
      period: string;
      periodDate: Date;
      periodType: "MONTH" | "QUARTER" | "YEAR" | "WEEK";
      areaCode: string | null;
      areaType: "NATIONAL" | "REGION" | "LANDSDEL" | "KOMMUNE" | "OTHER";
      areaName: string | null;
      value: number | null;
      status: string | null;
      dimensions?: Record<string, string>;
    };
    const toInsert: InsertRow[] = [];
    const toUpdate: { id: string; value: number | null; status: string | null }[] = [];

    let latestPeriodSeen: string | null = null;

    for (const dp of datapoints) {
      const period = dp.period;
      if (!period) {
        result.rowsSkipped++;
        continue;
      }

      if (!latestPeriodSeen || period > latestPeriodSeen) {
        latestPeriodSeen = period;
      }

      const areaCode = omradeVar
        ? (dp.dimensions[omradeVar.code] ?? null)
        : null;
      const areaName = areaCode ? (areaNameMap.get(areaCode) ?? null) : null;
      const areaType = classifyAreaCode(areaCode);
      const periodType = parsePeriodType(period);

      // Extra dimensions (everything except area)
      const extraDims: Record<string, string> = {};
      for (const [key, val] of Object.entries(dp.dimensions)) {
        if (key !== omradeVar?.code) extraDims[key] = val;
      }

      const mapKey = `${period}::${areaCode ?? ""}`;
      const existing = existingMap.get(mapKey);

      if (!existing) {
        toInsert.push({
          sourceId: source.id,
          period,
          periodDate: dp.periodDate,
          periodType,
          areaCode,
          areaType,
          areaName,
          value: dp.value,
          status: dp.status ?? null,
          dimensions:
            Object.keys(extraDims).length > 0 ? extraDims : undefined,
        });
      } else if (existing.value !== dp.value) {
        toUpdate.push({
          id: existing.id,
          value: dp.value,
          status: dp.status ?? null,
        });
      } else {
        result.rowsSkipped++;
      }
    }

    if (toInsert.length > 0) {
      await prisma.dataPoint.createMany({ data: toInsert, skipDuplicates: true });
      result.rowsInserted = toInsert.length;
    }

    for (const u of toUpdate) {
      await prisma.dataPoint.update({
        where: { id: u.id },
        data: { value: u.value, status: u.status },
      });
      result.rowsUpdated++;
    }

    result.newDataPeriod = latestPeriodSeen;
    result.hadNewData = result.rowsInserted > 0 || result.rowsUpdated > 0;

    await prisma.fetchLog.update({
      where: { id: fetchLogId },
      data: {
        completedAt: new Date(),
        success: true,
        inserted: result.rowsInserted,
        updated: result.rowsUpdated,
        skipped: result.rowsSkipped,
        rowsAffected: result.rowsInserted + result.rowsUpdated,
        lastUpdatedAtSource: dstUpdated,
        notes: `Inserted: ${result.rowsInserted}, Updated: ${result.rowsUpdated}, Skipped: ${result.rowsSkipped}`,
      },
    });

    await prisma.dataSource.update({
      where: { id: source.id },
      data: {
        lastFetchedAt: new Date(),
        lastUpdatedAtSource: dstUpdated,
      },
    });

    result.success = true;
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    result.errorMessage = message;

    if (fetchLogId) {
      await prisma.fetchLog.update({
        where: { id: fetchLogId },
        data: {
          completedAt: new Date(),
          success: false,
          error: message,
        },
      });
    }

    return result;
  }
}

// ----------------------------------------------------------------
// regenerateSignalsForAus08
// ----------------------------------------------------------------

/**
 * Regenerate signals for AUS08.
 * Atomically replaces all existing signals so users never see a blank feed.
 */
export async function regenerateSignalsForAus08(
  prisma: PrismaClient
): Promise<SignalResult> {
  const SOURCE_SLUG = "dst-aus08";

  try {
    const { generateAllSignals } = await import("./signals/detectors");

    const source = await prisma.dataSource.findUnique({
      where: { slug: SOURCE_SLUG },
    });
    if (!source) {
      return {
        success: false,
        signalsGenerated: 0,
        errorMessage: `Source ${SOURCE_SLUG} not found`,
      };
    }

    const rows = await prisma.dataPoint.findMany({
      where: { sourceId: source.id },
      select: {
        period: true,
        periodDate: true,
        areaCode: true,
        areaName: true,
        areaType: true,
        value: true,
      },
      orderBy: { periodDate: "asc" },
    });

    // Filter out DST placeholder areas (Udlandet, Uoplyst) before analysis
    const points = rows
      .filter((r) => r.areaType !== "OTHER")
      .map((r) => ({
        period: r.period,
        periodDate: r.periodDate,
        areaCode: r.areaCode,
        areaName: r.areaName,
        areaType: r.areaType as "NATIONAL" | "REGION" | "LANDSDEL" | "KOMMUNE",
        value: r.value,
      }));

    const signals = generateAllSignals(points);

    // Atomic replace — no window where signals are absent
    await prisma.$transaction([
      prisma.signal.deleteMany({ where: { sourceId: source.id } }),
      prisma.signal.createMany({
        data: signals.map((s) => ({
          sourceId: source.id,
          type: s.type.toUpperCase() as
            | "TOP_MOVER"
            | "RECORD"
            | "STREAK"
            | "COMPARISON"
            | "TURNING_POINT"
            | "OUTLIER",
          direction:
            s.direction === "up"
              ? "UP"
              : s.direction === "down"
              ? "DOWN"
              : s.direction === "stable"
              ? "STABLE"
              : null,
          severity: s.severity,
          headline: s.headline,
          body: s.body,
          period: s.period,
          magnitude: s.magnitude,
          areaCode: s.areaCode,
          areaName: s.areaName,
          evidence: s.evidence as Prisma.InputJsonValue | undefined,
        })),
      }),
    ]);

    return {
      success: true,
      signalsGenerated: signals.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      success: false,
      signalsGenerated: 0,
      errorMessage: message,
    };
  }
}
