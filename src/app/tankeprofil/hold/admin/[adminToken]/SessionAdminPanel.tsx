"use client";

import { useState } from "react";

type Member = {
  id: string;
  displayName: string;
  joinedAt: string;
  submittedAt: string | null;
  primary: string | null;
  secondary: string | null;
};

type Session = {
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
  createdAt: string;
  closedAt: string | null;
  members: Member[];
};

export default function SessionAdminPanel({ session }: { session: Session }) {
  const [status, setStatus] = useState(session.status);
  const [toggling, setToggling] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://alius.dk";
  const joinUrl = `${origin}/tankeprofil/join/${session.joinToken}`;
  const reportUrl = `${origin}/tankeprofil/rapport/${session.reportToken}`;
  const adminUrl = `${origin}/tankeprofil/hold/admin/${session.adminToken}`;

  const submitted = session.members.filter((m) => m.submittedAt).length;
  const total = session.members.length;
  const expected = session.expectedSize ?? total;

  async function toggleStatus() {
    setToggling(true);
    const action = status === "OPEN" ? "close" : "reopen";
    try {
      const res = await fetch(`/api/session/${session.adminToken}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) setStatus(action === "close" ? "CLOSED" : "OPEN");
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="space-y-10">
      {/* Kontaktperson */}
      <section>
        <SectionLabel>Kontaktperson</SectionLabel>
        <p className="text-[16px] mb-1">{session.ownerName ?? "—"}</p>
        <a href={`mailto:${session.ownerEmail}`} className="text-[14px] text-moss hover:underline">
          {session.ownerEmail}
        </a>
      </section>

      {/* Fremgang */}
      <section className="pt-8 border-t border-ink/10">
        <div className="flex items-baseline gap-4 mb-4">
          <SectionLabel>Fremgang</SectionLabel>
          <span className="text-[13px] text-stone opacity-50">
            {submitted}/{expected} udfyldt
          </span>
        </div>

        <ProgressDots expected={expected} submitted={submitted} total={total} />

        {session.members.length > 0 ? (
          <div className="mt-6 space-y-0">
            {session.members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between py-3 border-b border-ink/5"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      m.submittedAt ? "bg-moss" : "bg-ink/15"
                    }`}
                  />
                  <span className="text-[14px]">{m.displayName}</span>
                </div>
                <div className="flex items-center gap-4">
                  {m.primary && (
                    <span className="text-[12px] text-stone opacity-60 font-mono">
                      {m.primary}/{m.secondary}
                    </span>
                  )}
                  <span className="text-[12px] text-stone opacity-40">
                    {m.submittedAt
                      ? new Date(m.submittedAt).toLocaleDateString("da-DK", {
                          day: "numeric",
                          month: "short",
                        })
                      : "Afventer"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-stone opacity-50 mt-4">Ingen deltagere endnu.</p>
        )}
      </section>

      {/* Links */}
      <section className="pt-8 border-t border-ink/10 space-y-6">
        <SectionLabel>Links</SectionLabel>
        <CopyLink label="Deltager-link — send til holdet" url={joinUrl} />
        <CopyLink label="Rapport-link" url={reportUrl} />
        <CopyLink label="Denne admin-side" url={adminUrl} />
      </section>

      {/* Handlinger */}
      <section className="pt-8 border-t border-ink/10 flex flex-wrap gap-4 items-center">
        <button
          onClick={toggleStatus}
          disabled={toggling}
          className={`px-7 py-[14px] text-[12px] tracking-[0.2em] uppercase font-normal transition-colors cursor-pointer disabled:opacity-50 ${
            status === "OPEN"
              ? "border border-ink/20 text-ink/60 hover:border-ink/60 hover:text-ink"
              : "bg-ink text-parchment hover:bg-moss"
          }`}
        >
          {toggling ? "..." : status === "OPEN" ? "Luk session" : "Genåbn session"}
        </button>
        <a
          href={`mailto:${session.ownerEmail}?subject=Alius Personlighedsprofil — ${
            session.companyName ?? session.name
          }`}
          className="text-[13px] text-moss hover:underline"
        >
          Skriv til kunden &rarr;
        </a>
      </section>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] tracking-[0.2em] uppercase text-stone opacity-50 mb-3">
      {children}
    </div>
  );
}

function ProgressDots({
  expected,
  submitted,
  total,
}: {
  expected: number;
  submitted: number;
  total: number;
}) {
  const dots = Math.min(Math.max(expected, total), 30);
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: dots }).map((_, i) => (
        <span
          key={i}
          className={`w-3 h-3 rounded-full transition-colors ${
            i < submitted ? "bg-moss" : i < total ? "bg-ink/20" : "bg-ink/8"
          }`}
        />
      ))}
    </div>
  );
}

function CopyLink({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div>
      <div className="text-[11px] text-stone opacity-50 mb-1">{label}</div>
      <div className="flex items-start gap-3">
        <span className="text-[13px] font-mono text-ink break-all flex-1 select-all">{url}</span>
        <button
          onClick={copy}
          className={`flex-shrink-0 text-[11px] tracking-[0.15em] uppercase px-3 py-1.5 transition-colors cursor-pointer ${
            copied
              ? "bg-moss/10 text-moss"
              : "border border-ink/15 text-stone hover:border-ink/40 hover:text-ink"
          }`}
        >
          {copied ? "✓" : "Kopier"}
        </button>
      </div>
    </div>
  );
}
