import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { TeamTestClient } from "@/components/tankeprofil/TeamTestClient";
import type { Metadata } from "next";

// Token-beskyttet side: må aldrig indekseres.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};


export const dynamic = "force-dynamic";

interface SessionRow {
  id: string;
  name: string;
  companyName: string | null;
  status: string;
}

export default async function JoinPage({
  params,
}: {
  params: Promise<{ joinToken: string }>;
}) {
  const { joinToken } = await params;

  const session = (await prisma.teamSession.findUnique({
    where: { joinToken },
    select: { id: true, name: true, companyName: true, status: true },
  })) as SessionRow | null;

  if (!session || session.status !== "OPEN") notFound();

  return (
    <TeamTestClient
      joinToken={joinToken}
      companyName={session.companyName ?? session.name}
    />
  );
}
