"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// ── Beregningsgrundlag (konservativt sat) ──────────────────────────
const WEEKS_PER_YEAR = 46;
const ANNUAL_HOURS = 1628;
const EMPLOYER_OVERHEAD = 1.08;

// Book-linket peger samme sted som resten af sitet: kontakt-sektionen på forsiden.
const BOOK_HREF = "/#kontakt";

function hourlyCost(monthlySalary: number): number {
  return (monthlySalary * 12 * EMPLOYER_OVERHEAD) / ANNUAL_HOURS;
}

function annualCost(employees: number, hoursPerWeek: number, monthlySalary: number): number {
  return employees * hoursPerWeek * WEEKS_PER_YEAR * hourlyCost(monthlySalary);
}

function roundTo1000(n: number): number {
  return Math.round(n / 1000) * 1000;
}

function formatDKK(n: number): string {
  return Math.round(n).toLocaleString("da-DK");
}

function formatFte(fte: number): string {
  return fte.toFixed(1).replace(".", ",");
}

// ── Count-up ────────────────────────────────────────────────────────
// Animerer blødt op til target ved ændringer. Respekterer reduced-motion.
function useCountUp(target: number, duration = 400): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const to = target;
    const from = fromRef.current;
    let raf = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || Math.round(from) === Math.round(to)) {
      fromRef.current = to;
      raf = requestAnimationFrame(() => setDisplay(to));
      return () => cancelAnimationFrame(raf);
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const val = from + (to - from) * eased;
      fromRef.current = val;
      setDisplay(val);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
        setDisplay(to);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}

// ── Slider ──────────────────────────────────────────────────────────
function Slider({
  id,
  label,
  help,
  min,
  max,
  step = 1,
  value,
  onChange,
  display,
  valueText,
}: {
  id: string;
  label: string;
  help?: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
  display: string;
  valueText: string;
}) {
  const helpId = help ? `${id}-help` : undefined;
  return (
    <div className="py-8 border-b border-clay/60">
      <label htmlFor={id} className="block font-[300] text-[1rem] md:text-[1.05rem] text-ink leading-[1.5] mb-5">
        {label}
      </label>
      <div className="flex items-center gap-5 md:gap-8">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-describedby={helpId}
          aria-valuetext={valueText}
          className="flex-1 min-w-0 accent-ink h-1 cursor-pointer"
        />
        <div className="shrink-0 min-w-[92px] md:min-w-[132px] text-right font-fraunces font-light text-ink leading-none tabular-nums text-[1.9rem] md:text-[2.4rem]">
          {display}
        </div>
      </div>
      {help && (
        <p id={helpId} className="mt-4 font-[200] text-[0.82rem] text-slate leading-[1.6] max-w-[440px]">
          {help}
        </p>
      )}
    </div>
  );
}

// ── App ─────────────────────────────────────────────────────────────
export function BeregnerApp() {
  const [employees, setEmployees] = useState(5);
  const [hoursPerWeek, setHoursPerWeek] = useState(8);
  const [monthlySalary, setMonthlySalary] = useState(42000);

  const rawAnnual = annualCost(employees, hoursPerWeek, monthlySalary);
  const rounded = roundTo1000(rawAnnual);
  const totalHours = employees * hoursPerWeek * WEEKS_PER_YEAR;
  const fte = totalHours / ANNUAL_HOURS;

  const animated = useCountUp(rounded);
  const animatedRounded = roundTo1000(animated);

  return (
    <div className="min-h-screen bg-parchment text-ink font-sans overflow-x-hidden">
      <div className="max-w-[1080px] mx-auto px-6 md:px-8 py-8 md:py-12">
        {/* Header */}
        <header className="flex justify-between items-baseline gap-4 pb-8 md:pb-10 border-b border-clay/60 mb-14 md:mb-20">
          <Link
            href="/"
            className="font-[300] text-[0.78rem] tracking-[0.28em] uppercase text-ink no-underline hover:text-moss transition-colors"
          >
            &larr; Alius
          </Link>
          <span className="text-[0.66rem] tracking-[0.24em] uppercase text-slate/70">Beregner</span>
        </header>

        {/* Intro */}
        <section className="mb-16 md:mb-24 max-w-[720px]">
          <div className="text-[0.68rem] tracking-[0.34em] uppercase text-moss mb-7">Gevinstberegner</div>
          <h1 className="font-fraunces font-light text-[clamp(34px,7vw,72px)] leading-[1.05] tracking-[-0.02em] text-ink mb-7">
            Hvad koster manuelt arbejde jer?
          </h1>
          <p className="font-[200] text-[1.05rem] md:text-[1.15rem] text-stone leading-[1.75] max-w-[560px]">
            Tre tal. Ét svar. Se med det samme, hvad gentaget manuelt arbejde koster jer om året.
          </p>
        </section>

        {/* Beregner */}
        <section className="grid grid-cols-1 md:grid-cols-[1fr_0.85fr] gap-14 md:gap-20 items-start">
          {/* Inputs */}
          <div>
            <Slider
              id="employees"
              label="Hvor mange medarbejdere laver gentaget manuelt arbejde?"
              min={1}
              max={50}
              value={employees}
              onChange={setEmployees}
              display={String(employees)}
              valueText={`${employees} medarbejdere`}
            />
            <Slider
              id="hours"
              label="Hvor mange timer bruger hver af dem om ugen på det?"
              help="Dobbelttastning, manuelle rapporter, rykkere, flytning af data mellem systemer."
              min={1}
              max={20}
              value={hoursPerWeek}
              onChange={setHoursPerWeek}
              display={String(hoursPerWeek)}
              valueText={`${hoursPerWeek} timer om ugen`}
            />
            <Slider
              id="salary"
              label="Gennemsnitlig månedsløn inkl. alt?"
              min={25000}
              max={70000}
              step={1000}
              value={monthlySalary}
              onChange={setMonthlySalary}
              display={`${formatDKK(monthlySalary)} kr`}
              valueText={`${formatDKK(monthlySalary)} kroner om måneden`}
            />
          </div>

          {/* Resultat */}
          <div className="md:sticky md:top-12">
            <div className="border-t-2 border-moss pt-8" aria-live="polite">
              <div className="font-fraunces font-light text-ink leading-[0.98] tracking-[-0.02em] text-[clamp(40px,10vw,68px)] tabular-nums">
                {formatDKK(animatedRounded)} kr
              </div>
              <div className="font-fraunces font-light italic text-ink/80 text-[1.4rem] md:text-[1.7rem] leading-[1.15] mt-1 mb-6">
                om året
              </div>
              <p className="font-[200] text-[0.98rem] text-stone leading-[1.7] max-w-[320px]">
                bruger I på arbejde, en maskine gør bedre.
              </p>

              <dl className="mt-9 pt-7 border-t border-clay/60 space-y-4">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="font-[200] text-[0.82rem] tracking-[0.02em] text-slate">Timer om året i alt</dt>
                  <dd className="font-[300] text-[0.98rem] text-ink tabular-nums">{formatDKK(totalHours)}</dd>
                </div>
                {fte > 0.5 && (
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="font-[200] text-[0.82rem] tracking-[0.02em] text-slate">Svarer til</dt>
                    <dd className="font-[300] text-[0.98rem] text-ink tabular-nums">
                      {formatFte(fte)} fuldtidsstillinger
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </section>

        {/* Konvertering */}
        <Conversion employees={employees} hoursPerWeek={hoursPerWeek} monthlySalary={monthlySalary} />

        {/* Metode */}
        <p className="mt-20 pt-8 border-t border-clay/60 font-[200] text-[0.72rem] text-slate/80 leading-[1.7] max-w-[620px]">
          Beregningen bruger 46 arbejdsuger, 1.628 årlige timer og 8 pct. arbejdsgiveromkostninger. Konservativt sat.
        </p>
      </div>
    </div>
  );
}

// ── Konverterings-sektion ───────────────────────────────────────────
type SendState = "idle" | "sending" | "sent" | "error";

function Conversion({
  employees,
  hoursPerWeek,
  monthlySalary,
}: {
  employees: number;
  hoursPerWeek: number;
  monthlySalary: number;
}) {
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [hp, setHp] = useState(""); // honeypot
  const [state, setState] = useState<SendState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (emailOpen) inputRef.current?.focus();
  }, [emailOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "sending") return;
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setState("error");
      setErrorMsg("Skriv en gyldig e-mail.");
      return;
    }
    setState("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/beregner/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, employees, hoursPerWeek, monthlySalary, _hp: hp }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Kunne ikke sende. Prøv igen.");
      }
      setState("sent");
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Kunne ikke sende. Prøv igen.");
    }
  }

  return (
    <section className="mt-20 md:mt-28 pt-14 md:pt-16 border-t border-clay/60">
      <p className="font-[300] text-[1.25rem] md:text-[1.5rem] text-ink leading-[1.5] max-w-[600px] mb-10">
        Vil I vide, hvilke tre arbejdsgange tallet gemmer sig i? Det er præcis det, vores kortlægning finder.
      </p>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
        <a
          href={BOOK_HREF}
          className="inline-flex justify-center font-[300] text-[0.82rem] tracking-[0.08em] uppercase px-8 py-4 bg-moss text-parchment border border-moss hover:bg-moss-light hover:border-moss-light transition-all"
        >
          Book 20 minutter
        </a>
        {!emailOpen && state !== "sent" && (
          <button
            type="button"
            onClick={() => setEmailOpen(true)}
            className="inline-flex justify-center font-[300] text-[0.82rem] tracking-[0.08em] uppercase px-8 py-4 border border-clay text-ink hover:border-moss hover:text-moss transition-all"
          >
            Få beregningen på mail
          </button>
        )}
      </div>

      {emailOpen && state !== "sent" && (
        <form onSubmit={handleSubmit} className="mt-8 max-w-[440px]" noValidate>
          <label htmlFor="beregner-email" className="block font-[200] text-[0.82rem] tracking-[0.02em] text-slate mb-3">
            Jeres e-mail
          </label>
          {/* Honeypot - skjult for mennesker */}
          <div aria-hidden className="absolute w-px h-px overflow-hidden -m-px" style={{ clip: "rect(0 0 0 0)" }}>
            <label htmlFor="beregner-company">Virksomhed</label>
            <input
              id="beregner-company"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={hp}
              onChange={(e) => setHp(e.target.value)}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              ref={inputRef}
              id="beregner-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="navn@firma.dk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 min-w-0 bg-parchment border border-clay px-4 py-[14px] font-[300] text-[0.95rem] text-ink placeholder:text-slate/50 focus:border-moss focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={state === "sending"}
              className="font-[300] text-[0.82rem] tracking-[0.08em] uppercase px-7 py-[14px] bg-ink text-parchment border border-ink hover:bg-moss hover:border-moss transition-all disabled:opacity-60"
            >
              {state === "sending" ? "Sender" : "Send"}
            </button>
          </div>
          {state === "error" && (
            <p role="alert" className="mt-3 font-[200] text-[0.82rem] text-moss">
              {errorMsg}
            </p>
          )}
        </form>
      )}

      {state === "sent" && (
        <p className="mt-8 font-[300] text-[1rem] text-ink leading-[1.7] max-w-[440px]" role="status">
          Sendt. Tjek også jeres spam, maskiner ender der nogle gange.
        </p>
      )}
    </section>
  );
}
