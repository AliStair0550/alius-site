import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import SessionAdminPanel from "./SessionAdminPanel";
import type { Metadata } from "next";

// Token-beskyttet side: må aldrig indekseres.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};


export const dynamic = "force-dynamic";

interface MemberRow {
  id: string;
  displayName: string;
  joinedAt: Date;
  submittedAt: Date | null;
  profile: { primary: string; secondary: string; weakest: string } | null;
}

interface SessionRow {
  id: string;
  name: string;
  companyName: string | null;
  ownerEmail: string;
  ownerName: string | null;
  status: string;
  joinToken: string;
  reportToken: string;
  adminToken: string;
  expectedSize: number | null;
  createdAt: Date;
  closedAt: Date | null;
  members: MemberRow[];
}

export default async function SessionAdminPage({
  params,
}: {
  params: Promise<{ adminToken: string }>;
}) {
  const { adminToken } = await params;

  const session = (await prisma.teamSession.findUnique({
    where: { adminToken },
    include: {
      members: {
        include: {
          profile: { select: { primary: true, secondary: true, weakest: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  })) as SessionRow | null;

  if (!session) notFound();

  const serialized = {
    id: session.id,
    name: session.name,
    companyName: session.companyName,
    ownerEmail: session.ownerEmail,
    ownerName: session.ownerName,
    status: session.status,
    joinToken: session.joinToken,
    reportToken: session.reportToken,
    adminToken: session.adminToken,
    expectedSize: session.expectedSize,
    createdAt: session.createdAt.toISOString(),
    closedAt: session.closedAt?.toISOString() ?? null,
    members: session.members.map((m) => ({
      id: m.id,
      displayName: m.displayName,
      joinedAt: m.joinedAt.toISOString(),
      submittedAt: m.submittedAt?.toISOString() ?? null,
      primary: m.profile?.primary ?? null,
      secondary: m.profile?.secondary ?? null,
    })),
  };

  const statusLabel = session.status === "OPEN" ? "Åben" : session.status === "CLOSED" ? "Lukket" : "Arkiveret";

  return (
    <div className="min-h-screen bg-parchment text-ink font-sans font-light overflow-x-hidden">
      <div className="max-w-[800px] mx-auto px-5 py-12">
        <header className="mb-10 pb-8 border-b border-ink/10">
          <Link
            href="/tankeprofil/hold"
            className="text-[11px] tracking-[0.2em] uppercase text-stone opacity-50 hover:opacity-100 transition-opacity mb-6 inline-block no-underline"
          >
            &larr; Tilbage
          </Link>
          <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-2">Admin · Session</div>
          <h1 className="font-fraunces font-light text-[36px] leading-[1.1] mb-3">
            {session.companyName ?? session.name}
          </h1>
          <div className="flex items-center gap-3">
            <span
              className={`text-[11px] tracking-[0.15em] uppercase px-2 py-1 ${
                session.status === "OPEN"
                  ? "bg-moss/10 text-moss"
                  : "bg-ink/5 text-stone"
              }`}
            >
              {statusLabel}
            </span>
            <span className="text-[13px] text-stone opacity-50">
              Oprettet{" "}
              {session.createdAt.toLocaleDateString("da-DK", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </header>

        <SessionAdminPanel session={serialized} />
      </div>
    </div>
  );
}
