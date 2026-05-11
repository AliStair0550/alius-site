import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import AdminPanel from "./AdminPanel";

export const dynamic = "force-dynamic";

interface ReqRow {
  id: string;
  name: string;
  email: string;
  company: string;
  teamSize: string;
  context: string | null;
  createdAt: Date;
}

interface SessRow {
  id: string;
  name: string;
  companyName: string | null;
  ownerEmail: string;
  ownerName: string | null;
  adminToken: string;
  expectedSize: number | null;
  createdAt: Date;
  members: { submittedAt: Date | null }[];
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret || key !== adminSecret) {
    notFound();
  }

  const requests = (await prisma.teamRequest.findMany({
    where: { status: "NEW" },
    orderBy: { createdAt: "desc" },
  })) as ReqRow[];

  const sessions = (await prisma.teamSession.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    include: { members: { select: { submittedAt: true } } },
  })) as SessRow[];

  const serializedRequests = requests.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    company: r.company,
    teamSize: r.teamSize,
    context: r.context,
    createdAt: r.createdAt.toISOString(),
  }));

  const serializedSessions = sessions.map((s) => ({
    id: s.id,
    name: s.name,
    companyName: s.companyName,
    ownerEmail: s.ownerEmail,
    ownerName: s.ownerName,
    adminToken: s.adminToken,
    expectedSize: s.expectedSize,
    createdAt: s.createdAt.toISOString(),
    submitted: s.members.filter((m) => m.submittedAt !== null).length,
    total: s.members.length,
  }));

  return (
    <div className="min-h-screen bg-parchment text-ink font-sans font-light overflow-x-hidden">
      <div className="max-w-[900px] mx-auto px-5 py-12">
        <header className="mb-12 pb-8 border-b border-ink/10">
          <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-2">Admin</div>
          <h1 className="font-fraunces font-light text-[40px] leading-[1.1] mb-3">Hold</h1>
          <div className="flex gap-6 text-[13px] text-stone opacity-60">
            <span>
              {serializedRequests.length} ny{serializedRequests.length !== 1 ? "e" : ""}{" "}
              anmodning{serializedRequests.length !== 1 ? "er" : ""}
            </span>
            <span>
              {serializedSessions.length} aktiv{serializedSessions.length !== 1 ? "e" : ""}{" "}
              session{serializedSessions.length !== 1 ? "er" : ""}
            </span>
          </div>
        </header>

        <AdminPanel requests={serializedRequests} adminKey={key} />

        {serializedSessions.length > 0 && (
          <section className="mt-16">
            <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-8">
              Aktive sessioner
            </div>
            <div className="space-y-3">
              {serializedSessions.map((s) => {
                const expected = s.expectedSize ?? s.total;
                const dots = Math.min(Math.max(expected, s.total), 20);
                return (
                  <Link
                    key={s.id}
                    href={`/tankeprofil/hold/admin/${s.adminToken}`}
                    className="flex items-center justify-between p-6 border border-ink/10 hover:border-ink/30 transition-colors group"
                  >
                    <div>
                      <div className="font-normal text-[17px] mb-1 group-hover:text-moss transition-colors">
                        {s.companyName ?? s.name}
                      </div>
                      <div className="text-[12px] text-stone opacity-50">
                        {s.ownerName ?? s.ownerEmail} · {s.submitted}/{expected} udfyldt
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 ml-6 flex-shrink-0">
                      {Array.from({ length: dots }).map((_, i) => (
                        <span
                          key={i}
                          className={`w-2.5 h-2.5 rounded-full transition-colors ${
                            i < s.submitted ? "bg-moss" : "bg-ink/10"
                          }`}
                        />
                      ))}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
