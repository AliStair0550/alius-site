"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics";

export function TeamRequestForm() {
  const [submitted, setSubmitted] = useState(false);
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
      context: formData.get("context"),
      _hp: formData.get("_hp"),
    };

    try {
      const res = await fetch("/api/team-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Der opstod en fejl. Prøv igen om lidt.");
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
      trackEvent("kontakt_sendt");
    } catch (err) {
      console.error("[TeamRequestForm] Submit error:", err);
      setError("Kunne ikke sende anmodningen. Tjek din internetforbindelse og prøv igen.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-sand p-10 md:p-12 animate-[fadeIn_0.5s_ease-out]">
        <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-4">
          Modtaget
        </div>
        <h3 className="font-fraunces font-light text-[32px] leading-[1.1] mb-4 tracking-[-0.01em]">
          Tak. Vi vender tilbage inden for <em className="italic">24 timer</em>.
        </h3>
        <p className="text-stone text-[15px] leading-[1.6] max-w-[480px]">
          Du hører fra os på den email du har skrevet. Imens kan du tage din egen Personlighedsprofil hvis du ikke allerede har gjort det.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Honeypot - bots fill it, real browsers won't touch an obscure name */}
      <div aria-hidden="true" style={{ display: "none" }}>
        <input type="text" name="_hp" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field label="Dit navn" name="name" required disabled={submitting} />
        <Field label="Din email" name="email" type="email" required disabled={submitting} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field label="Virksomhed" name="company" required disabled={submitting} />
        <Field label="Cirka antal deltagere" name="teamSize" placeholder="fx 6" required disabled={submitting} />
      </div>
      <TextArea
        label="Kort om jer"
        name="context"
        placeholder="Hvad er det for et hold, og hvad håber I at få ud af det?"
        rows={4}
        disabled={submitting}
      />

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
        {submitting ? "Sender..." : "Send anmodning"}
        <span className="transition-transform duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1">
          &rarr;
        </span>
      </button>
    </form>
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

function TextArea({
  label,
  name,
  placeholder,
  rows = 3,
  disabled,
}: {
  label: string;
  name: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] tracking-[0.2em] uppercase text-stone opacity-60 mb-2 block">
        {label}
      </span>
      <textarea
        name={name}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className="w-full px-0 py-3 bg-transparent border-0 border-b border-ink/25 text-[16px] font-light text-ink outline-none placeholder:text-stone/40 focus:border-ink transition-colors resize-none disabled:opacity-50"
      />
    </label>
  );
}
