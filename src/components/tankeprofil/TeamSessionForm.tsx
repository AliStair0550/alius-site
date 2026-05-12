"use client";

import { useState } from "react";

type SessionResult = {
  joinUrl: string;
  adminUrl: string;
  joinToken: string;
};

export function TeamSessionForm() {
  const [result, setResult] = useState<SessionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      company: formData.get("company"),
      teamSize: formData.get("teamSize"),
    };

    try {
      const res = await fetch("/api/team-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(body.error ?? "Der opstod en fejl. Prøv igen om lidt.");
        setSubmitting(false);
        return;
      }

      setResult({ joinUrl: body.joinUrl, adminUrl: body.adminUrl, joinToken: body.joinToken });
    } catch (err) {
      console.error("[TeamSessionForm] Submit error:", err);
      setError("Kunne ikke oprette sessionen. Tjek din internetforbindelse og prøv igen.");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return <SuccessPanel result={result} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field label="Dit navn" name="name" required disabled={submitting} />
        <Field label="Din email" name="email" type="email" required disabled={submitting} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field label="Virksomhed / holdet" name="company" required disabled={submitting} />
        <Field label="Antal deltagere" name="teamSize" placeholder="fx 6" required disabled={submitting} />
      </div>

      {error && (
        <div className="p-4 border-l-2 border-red-600 bg-red-50/50 text-[14px] text-red-900 leading-[1.5]">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center gap-4 bg-ink text-parchment px-9 py-[22px] text-[13px] font-normal tracking-[0.25em] uppercase cursor-pointer transition-all duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-moss hover:gap-6 disabled:opacity-50 disabled:pointer-events-none group"
      >
        {submitting ? "Opretter..." : "Opret hold-link"}
        <span className="transition-transform duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1">
          &rarr;
        </span>
      </button>
    </form>
  );
}

function SuccessPanel({ result }: { result: SessionResult }) {
  const [emails, setEmails] = useState("");
  const [sending, setSending] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ sent: number; failed: number } | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  async function sendInvites(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emails
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (parsed.length === 0) return;

    setSending(true);
    setInviteError(null);

    try {
      const res = await fetch(`/api/team-session/${result.joinToken}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: parsed }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setInviteError(body.error ?? "Noget gik galt.");
      } else {
        setInviteResult({ sent: body.sent, failed: body.failed });
        setEmails("");
      }
    } catch {
      setInviteError("Kunne ikke sende invitationer.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="animate-[fadeIn_0.5s_ease-out] space-y-10">
      {/* Join link */}
      <div className="bg-sand p-8 md:p-10">
        <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-4">
          Hold-link klar
        </div>
        <h3 className="font-fraunces font-light text-[28px] leading-[1.1] mb-4 tracking-[-0.01em]">
          Del dette link med dit hold.
        </h3>
        <p className="text-stone text-[14px] leading-[1.6] mb-6 max-w-[440px]">
          Alle der klikker linket kan tage testen og bidrage til holdrapporten. De behøver ikke en konto.
        </p>
        <div className="border border-ink/15 bg-parchment p-4 flex flex-col md:flex-row items-start md:items-center gap-3">
          <span className="text-[14px] text-moss break-all flex-1">{result.joinUrl}</span>
          <button
            onClick={() => navigator.clipboard.writeText(result.joinUrl)}
            className="text-[11px] tracking-[0.2em] uppercase border border-ink/25 px-4 py-2 hover:bg-ink hover:text-parchment hover:border-ink transition-colors cursor-pointer flex-shrink-0"
          >
            Kopier
          </button>
        </div>
      </div>

      {/* Invite by email */}
      <div>
        <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-3">
          Inviter direkte
        </div>
        <h3 className="font-fraunces font-light text-[22px] leading-[1.2] mb-3 tracking-[-0.01em]">
          Send invitationer fra Alius.
        </h3>
        <p className="text-[14px] text-stone leading-[1.6] mb-5 max-w-[440px]">
          Skriv emailadresserne på dem du vil invitere, adskilt af komma eller mellemrum. De modtager et link direkte fra Alius.
        </p>

        {inviteResult ? (
          <div className="p-4 border-l-2 border-moss bg-moss/5 text-[14px] text-ink leading-[1.5]">
            {inviteResult.sent} invitation{inviteResult.sent !== 1 ? "er" : ""} sendt.
            {inviteResult.failed > 0 && (
              <span className="opacity-60 ml-2">({inviteResult.failed} fejlede)</span>
            )}
            <button
              onClick={() => { setInviteResult(null); }}
              className="ml-4 text-moss hover:underline text-[13px] cursor-pointer"
            >
              Send flere &rarr;
            </button>
          </div>
        ) : (
          <form onSubmit={sendInvites} className="space-y-3">
            <textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="anna@firma.dk, bo@firma.dk, charlotte@firma.dk"
              rows={3}
              disabled={sending}
              className="w-full px-4 py-3 bg-transparent border border-ink/20 text-[15px] font-light text-ink outline-none placeholder:text-stone/40 focus:border-ink transition-colors resize-none disabled:opacity-50"
            />
            {inviteError && (
              <div className="text-[13px] text-red-700">{inviteError}</div>
            )}
            <button
              type="submit"
              disabled={sending || emails.trim().length === 0}
              className="inline-flex items-center gap-3 bg-ink text-parchment px-7 py-[14px] text-[12px] font-normal tracking-[0.2em] uppercase cursor-pointer transition-all duration-300 hover:bg-moss disabled:opacity-40 disabled:pointer-events-none group"
            >
              {sending ? "Sender..." : "Send invitationer"}
              <span className="transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
            </button>
          </form>
        )}
      </div>

      {/* Admin link */}
      <div className="border-t border-ink/10 pt-8">
        <div className="text-[11px] tracking-[0.2em] uppercase text-stone opacity-50 mb-1">
          Dit admin-link (gem til dig selv)
        </div>
        <p className="text-[13px] text-stone opacity-70 leading-[1.5] mb-2">
          Følg fremgangen og se holdrapporten her.
        </p>
        <a
          href={result.adminUrl}
          className="text-[13px] text-moss hover:underline break-all"
        >
          {result.adminUrl}
        </a>
        <p className="text-[12px] text-stone opacity-50 mt-3">
          Begge links er sendt til din email.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  disabled,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] tracking-[0.2em] uppercase text-stone opacity-60 mb-2 block">
        {label}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-0 py-3 bg-transparent border-0 border-b border-ink/25 text-[16px] font-light text-ink outline-none placeholder:text-stone/40 focus:border-ink transition-colors disabled:opacity-50"
      />
    </label>
  );
}
