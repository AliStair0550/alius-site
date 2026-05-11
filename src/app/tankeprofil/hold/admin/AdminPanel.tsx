"use client";

import { useState } from "react";

type TeamRequest = {
  id: string;
  name: string;
  email: string;
  company: string;
  teamSize: string;
  context: string | null;
  createdAt: string;
};

type ApprovedSession = {
  id: string;
  joinToken: string;
  adminToken: string;
  reportToken: string;
};

type ReqState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "approved"; session: ApprovedSession }
  | { status: "declined" }
  | { status: "error"; message: string };

export default function AdminPanel({
  requests,
  adminKey,
}: {
  requests: TeamRequest[];
  adminKey: string;
}) {
  const [states, setStates] = useState<Record<string, ReqState>>(
    Object.fromEntries(requests.map((r) => [r.id, { status: "idle" as const }]))
  );

  const origin = typeof window !== "undefined" ? window.location.origin : "https://alius.dk";

  async function act(id: string, action: "approve" | "decline") {
    setStates((s) => ({ ...s, [id]: { status: "loading" } }));
    try {
      const res = await fetch(`/api/team-request/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminKey },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStates((s) => ({ ...s, [id]: { status: "error", message: data.error ?? "Ukendt fejl" } }));
      } else if (action === "approve") {
        setStates((s) => ({ ...s, [id]: { status: "approved", session: data.session } }));
      } else {
        setStates((s) => ({ ...s, [id]: { status: "declined" } }));
      }
    } catch {
      setStates((s) => ({ ...s, [id]: { status: "error", message: "Netværksfejl" } }));
    }
  }

  if (requests.length === 0) {
    return (
      <div className="py-12 text-[14px] text-stone opacity-50">Ingen nye anmodninger.</div>
    );
  }

  return (
    <section>
      <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-8">Nye anmodninger</div>
      <div className="space-y-8">
        {requests.map((req) => {
          const state = states[req.id] ?? { status: "idle" };
          const date = new Date(req.createdAt).toLocaleDateString("da-DK", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div
              key={req.id}
              className={`border p-8 transition-opacity ${
                state.status === "declined" ? "border-ink/5 opacity-40" : "border-ink/10"
              }`}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="font-fraunces font-light text-[26px] leading-[1.1] mb-1">
                    {req.company}
                  </h2>
                  <div className="text-[12px] text-stone opacity-50">
                    {date} · #{req.id.slice(0, 8)}
                  </div>
                </div>
                {state.status === "approved" && (
                  <div className="text-[11px] tracking-[0.2em] uppercase text-moss">Godkendt</div>
                )}
                {state.status === "declined" && (
                  <div className="text-[11px] tracking-[0.2em] uppercase text-stone opacity-50">Afvist</div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <DataField label="Kontaktperson" value={req.name} />
                <div>
                  <div className="text-[11px] tracking-[0.2em] uppercase text-stone opacity-50 mb-1">
                    Email
                  </div>
                  <a href={`mailto:${req.email}`} className="text-[15px] text-moss hover:underline">
                    {req.email}
                  </a>
                </div>
                <DataField label="Antal deltagere" value={req.teamSize} />
              </div>

              {req.context && (
                <div className="mb-6 p-5 bg-sand/40">
                  <div className="text-[11px] tracking-[0.2em] uppercase text-stone opacity-50 mb-2">
                    Kontekst
                  </div>
                  <p className="text-[14px] leading-[1.6] whitespace-pre-wrap">{req.context}</p>
                </div>
              )}

              {state.status === "approved" && (
                <div className="mb-6 p-6 bg-moss/5 border border-moss/15 space-y-4">
                  <div className="text-[11px] tracking-[0.2em] uppercase text-moss mb-1">
                    Session oprettet
                  </div>
                  <CopyRow
                    label="Deltager-link — send til holdet"
                    url={`${origin}/tankeprofil/join/${state.session.joinToken}`}
                  />
                  <div>
                    <div className="text-[11px] text-stone opacity-50 mb-1">Din admin-side</div>
                    <a
                      href={`/tankeprofil/hold/admin/${state.session.adminToken}`}
                      className="text-[13px] text-moss hover:underline break-all"
                    >
                      {`${origin}/tankeprofil/hold/admin/${state.session.adminToken}`}
                    </a>
                  </div>
                  <p className="text-[12px] text-stone opacity-60 pt-1">
                    Velkomstmail sendt til {req.email}.
                  </p>
                </div>
              )}

              {state.status === "error" && (
                <div className="mb-4 p-3 border-l-2 border-red-600 bg-red-50/50 text-[13px] text-red-900">
                  {(state as { status: "error"; message: string }).message}
                </div>
              )}

              {(state.status === "idle" || state.status === "error") && (
                <div className="flex gap-4 pt-2">
                  <button
                    onClick={() => act(req.id, "approve")}
                    className="bg-ink text-parchment px-7 py-[14px] text-[12px] tracking-[0.2em] uppercase font-normal hover:bg-moss transition-colors cursor-pointer"
                  >
                    Godkend og send link
                  </button>
                  <button
                    onClick={() => act(req.id, "decline")}
                    className="border border-ink/20 text-ink/50 px-7 py-[14px] text-[12px] tracking-[0.2em] uppercase font-normal hover:border-ink/50 hover:text-ink transition-colors cursor-pointer"
                  >
                    Afvis
                  </button>
                </div>
              )}

              {state.status === "loading" && (
                <div className="text-[12px] text-stone opacity-50 pt-2">Behandler...</div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DataField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] tracking-[0.2em] uppercase text-stone opacity-50 mb-1">{label}</div>
      <div className="text-[15px]">{value}</div>
    </div>
  );
}

function CopyRow({ label, url }: { label: string; url: string }) {
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
