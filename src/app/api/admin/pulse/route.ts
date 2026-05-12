import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const expected = process.env.ADMIN_SECRET;

  if (!expected || key !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sources = await prisma.dataSource.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      fetchLogs: { orderBy: { createdAt: "desc" }, take: 3 },
    },
  });

  const result = await Promise.all(
    sources.map(async (src) => {
      const datapointCount = await prisma.dataPoint.count({ where: { sourceId: src.id } });
      const recentDatapoints = await prisma.dataPoint.findMany({
        where: { sourceId: src.id },
        orderBy: { periodDate: "desc" },
        take: 5,
        select: { period: true, periodDate: true, value: true, status: true, areaCode: true },
      });
      return {
        source: {
          id: src.id,
          slug: src.slug,
          name: src.name,
          unit: src.unit,
          lastFetchedAt: src.lastFetchedAt,
          lastUpdatedAtSource: src.lastUpdatedAtSource,
        },
        counts: { datapoints: datapointCount },
        recentDatapoints,
        recentFetchLogs: src.fetchLogs.map((l) => ({
          createdAt: l.createdAt,
          success: l.success,
          error: l.error,
          inserted: l.inserted,
          updated: l.updated,
          skipped: l.skipped,
        })),
      };
    })
  );

  return NextResponse.json({ ok: true, sources: result });
}
