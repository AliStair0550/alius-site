import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { analyzeTeam, type Participant } from "@/lib/team-analysis";
import { TeamReportView } from "@/components/tankeprofil/TeamReportView";
import type { QuadrantKey } from "@/components/tankeprofil/data";

export const dynamic = "force-dynamic";

interface MemberRow {
  id: string;
  displayName: string;
  submittedAt: Date | null;
  profile: {
    id: string;
    totals: unknown;
    primary: string;
    secondary: string;
    weakest: string;
    accessToken: string;
  };
}

interface SessionRow {
  id: string;
  companyName: string | null;
  name: string;
  status: string;
  expectedSize: number | null;
  members: MemberRow[];
}

export default async function RapportPage({
  params,
}: {
  params: Promise<{ reportToken: string }>;
}) {
  const { reportToken } = await params;

  const session = (await prisma.teamSession.findUnique({
    where: { reportToken },
    select: {
      id: true,
      companyName: true,
      name: true,
      status: true,
      expectedSize: true,
      members: {
        select: {
          id: true,
          displayName: true,
          submittedAt: true,
          profile: {
            select: {
              id: true,
              totals: true,
              primary: true,
              secondary: true,
              weakest: true,
              accessToken: true,
            },
          },
        },
      },
    },
  })) as SessionRow | null;

  if (!session) notFound();

  const submittedMembers = session.members.filter((m) => m.submittedAt !== null);

  const participants: Participant[] = submittedMembers.map((m) => {
    const raw = m.profile.totals as Record<string, number>;
    return {
      id: m.id,
      name: m.displayName,
      totals: {
        A: raw.A ?? 0,
        B: raw.B ?? 0,
        C: raw.C ?? 0,
        D: raw.D ?? 0,
      },
      primary: m.profile.primary as QuadrantKey,
      secondary: m.profile.secondary as QuadrantKey,
      weakest: m.profile.weakest as QuadrantKey,
      accessToken: m.profile.accessToken,
    };
  });

  const analysis = analyzeTeam(participants);
  const companyName = session.companyName ?? session.name;
  const sessionOpen = session.status === "OPEN";
  const totalExpected = session.expectedSize ?? session.members.length;
  const totalSubmitted = submittedMembers.length;

  return (
    <main className="min-h-screen bg-parchment text-ink font-sans font-light">
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(26,26,26,0.04) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="relative z-10 max-w-[800px] mx-auto px-5 md:px-8 py-16 md:py-24">
        <TeamReportView
          companyName={companyName}
          sessionOpen={sessionOpen}
          totalExpected={totalExpected}
          totalSubmitted={totalSubmitted}
          analysis={analysis}
        />
      </div>
    </main>
  );
}
