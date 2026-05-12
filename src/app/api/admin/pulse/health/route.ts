import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthorized } from "@/lib/admin-auth";

export async function GET(req: Request) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sources = await prisma.dataSource.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { dataPoints: true, signals: true } },
      fetchLogs: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          createdAt: true,
          completedAt: true,
          success: true,
          rowsAffected: true,
          error: true,
          notes: true,
        },
      },
    },
  });

  const now = new Date();
  const result = sources.map((s) => {
    const lastFetch = s.fetchLogs[0];
    const successfulFetches = s.fetchLogs.filter((f) => f.success).length;
    const totalFetches = s.fetchLogs.length;
    const lastFetchAge = s.lastFetchedAt
      ? Math.floor(
          (now.getTime() - s.lastFetchedAt.getTime()) / (1000 * 60 * 60)
        )
      : null;

    // Health indicators
    const expectedFreshness = ({
      WEEKLY: 7 * 24,
      MONTHLY: 35 * 24,
      QUARTERLY: 90 * 24,
      YEARLY: 365 * 24,
      ON_DEMAND: null,
    } as Record<string, number | null>)[s.updateFrequency ?? ""] ?? null;

    let healthStatus: "healthy" | "warning" | "stale" | "never-fetched";
    if (!s.lastFetchedAt) {
      healthStatus = "never-fetched";
    } else if (expectedFreshness && lastFetchAge && lastFetchAge > expectedFreshness) {
      healthStatus = "stale";
    } else if (lastFetch && !lastFetch.success) {
      healthStatus = "warning";
    } else {
      healthStatus = "healthy";
    }

    return {
      source: {
        slug: s.slug,
        provider: s.provider,
        tableId: s.tableId,
        name: s.name,
        updateFrequency: s.updateFrequency,
      },
      counts: s._count,
      health: {
        status: healthStatus,
        lastFetchedAt: s.lastFetchedAt,
        lastFetchAgeHours: lastFetchAge,
        lastUpdatedAtSource: s.lastUpdatedAtSource,
      },
      recentFetches: {
        successfulOfTotal: `${successfulFetches}/${totalFetches}`,
        last: s.fetchLogs.slice(0, 5),
      },
    };
  });

  return NextResponse.json({
    ok: true,
    serverTime: now.toISOString(),
    sources: result,
  });
}
