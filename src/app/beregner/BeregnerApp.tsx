"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// ── Beregningsgrundlag (konservativt sat) ──────────────────────────
const WEEKS_PER_YEAR = 46;
const ANNUAL_HOURS = 1628;
const EMPLOYER_OVERHEAD = 1.08;

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
          <h1 className="font-fraunces font-light text-[clamp(34px,7vw,72px)] leading-[1.05] tracking-[-0.02em] text-ink">
            Hvad koster manuelt arbejde jer?
          </h1>
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

          {/* Resultat - overblik */}
          <div className="md:sticky md:top-12">
            <div className="border-t-2 border-moss pt-8" aria-live="polite">
              <div className="text-[0.66rem] tracking-[0.24em] uppercase text-slate/70 mb-4">
                Manuelt arbejde koster jer
              </div>
              <div className="font-fraunces font-light text-ink leading-[0.98] tracking-[-0.02em] text-[clamp(40px,10vw,68px)] tabular-nums">
                {formatDKK(animatedRounded)} kr
              </div>
              <div className="font-fraunces font-light italic text-ink/80 text-[1.4rem] md:text-[1.7rem] leading-[1.15] mt-1">
                om året
              </div>
              <div className="mt-4 font-[200] text-[0.78rem] text-slate/80 tabular-nums leading-[1.6]">
                {employees} medarbejdere · {hoursPerWeek} t/uge · {formatDKK(monthlySalary)} kr/md
              </div>

              {/* Nøgletal - hurtigt overblik */}
              <dl className="grid grid-cols-2 gap-y-6 gap-x-5 mt-8 py-7 border-y border-clay/60">
                <div>
                  <dt className="font-[200] text-[0.72rem] tracking-[0.03em] text-slate mb-1.5">Om måneden</dt>
                  <dd className="font-[300] text-[1.2rem] text-ink tabular-nums">{formatDKK(animatedRounded / 12)} kr</dd>
                </div>
                <div>
                  <dt className="font-[200] text-[0.72rem] tracking-[0.03em] text-slate mb-1.5">Timer om året</dt>
                  <dd className="font-[300] text-[1.2rem] text-ink tabular-nums">{formatDKK(totalHours)}</dd>
                </div>
                <div>
                  <dt className="font-[200] text-[0.72rem] tracking-[0.03em] text-slate mb-1.5">Gns. timepris</dt>
                  <dd className="font-[300] text-[1.2rem] text-ink tabular-nums">{formatDKK(hourlyCost(monthlySalary))} kr</dd>
                </div>
              </dl>

              <div className="mt-7 max-w-[340px]">
                <p className="font-[300] text-[1.05rem] text-ink leading-[1.5] mb-2">
                  Sæt strøm til jeres processer.
                </p>
                <p className="font-[200] text-[0.92rem] text-stone leading-[1.7]">
                  Fra manuelt arbejde til intelligente løsninger, der skaber mere tid til forretningen.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Kortlægning - interaktivt lead-trin, live-koblet til beregneren */}
        <KortlaegningStep
          employees={employees}
          hoursPerWeek={hoursPerWeek}
          monthlySalary={monthlySalary}
          annualCost={rounded}
        />

        {/* Metode */}
        <p className="mt-20 pt-8 border-t border-clay/60 font-[200] text-[0.72rem] text-slate/80 leading-[1.7] max-w-[620px]">
          Beregningen bruger 46 arbejdsuger, 1.628 årlige timer og 8 pct. arbejdsgiveromkostninger. Konservativt sat.
        </p>
      </div>
    </div>
  );
}

// ── Kortlægning: interaktivt lead-trin ──────────────────────────────
const ROUTINES = [
  "Fakturaer",
  "Tilbud",
  "Rapporter",
  "Kundesvar",
  "Rykkere",
  "Dobbelttastning",
  "Vagtplaner",
  "Bogføring",
  "Andet",
] as const;

const MAX_ROUTINES = 3;
const CONTACT_EMAIL = "hej@alius.dk";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function KortlaegningStep({
  employees,
  hoursPerWeek,
  monthlySalary,
  annualCost,
}: {
  employees: number;
  hoursPerWeek: number;
  monthlySalary: number;
  annualCost: number;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [touched, setTouched] = useState(false);

  const emailValid = EMAIL_RE.test(email.trim());

  function toggle(routine: string) {
    setSelected((prev) => {
      if (prev.includes(routine)) return prev.filter((r) => r !== routine);
      if (prev.length >= MAX_ROUTINES) return prev; // fjerde valg ignoreres
      return [...prev, routine];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!emailValid || status === "sending") return;

    setStatus("sending");
    try {
      const res = await fetch("/api/beregner/kortlaegning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          employees,
          hoursPerWeek,
          monthlySalary,
          routines: selected,
          note: note.trim(),
        }),
      });
      if (!res.ok) throw new Error("request failed");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="mt-20 md:mt-28 pt-14 md:pt-16 border-t border-clay/60">
      <div className="max-w-[640px]">
        {/* Overskrift */}
        <h2 className="font-fraunces font-light text-[clamp(28px,5vw,44px)] leading-[1.12] tracking-[-0.01em] text-ink mb-3">
          Lad os kortlægge de manuelle processer sammen.
        </h2>
        <p className="font-[200] text-[1rem] text-stone leading-[1.7] mb-3">
          Vælg op til tre.
        </p>
        {/* Fordelingslinje - genberegnes live ud fra det aktuelle årstal */}
        <p className="font-[200] text-[0.82rem] text-slate/80 leading-[1.6] mb-9 tabular-nums">
          Jeres <span className="text-ink">{formatDKK(annualCost)} kr/år</span> gemmer sig i konkrete rutiner.
        </p>

        {/* Chips */}
        <div className="flex flex-wrap gap-2.5 mb-9">
          {ROUTINES.map((routine) => {
            const on = selected.includes(routine);
            const full = !on && selected.length >= MAX_ROUTINES;
            return (
              <button
                key={routine}
                type="button"
                aria-pressed={on}
                disabled={full}
                onClick={() => toggle(routine)}
                className={`text-[0.85rem] tracking-[0.01em] px-4 py-2.5 border transition-all duration-200 ${
                  on
                    ? "border-moss bg-moss/[0.1] text-moss font-[400]"
                    : full
                    ? "border-clay/60 text-slate/40 cursor-not-allowed"
                    : "border-clay text-stone hover:border-moss hover:text-moss cursor-pointer"
                }`}
              >
                {routine}
              </button>
            );
          })}
        </div>

        {/* Valgfrit tekstfelt */}
        <div className="mb-7">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Beskriv rutinen med jeres egne ord"
            rows={4}
            disabled={status === "sent"}
            className="w-full px-4 py-3 bg-transparent border border-ink/20 text-[0.95rem] font-[200] text-ink outline-none placeholder:text-slate/50 focus:border-ink transition-colors resize-none disabled:opacity-50"
          />
          <p className="mt-1.5 font-[200] text-[0.72rem] text-slate/70">Valgfrit</p>
        </div>

        {/* Mail + afsendelse / bekræftelse */}
        {status === "sent" ? (
          <div className="flex flex-col items-start gap-6 py-2">
            <div className="relative w-11 h-11">
              <span className="kort-signal absolute inset-0 rounded-full border border-moss" />
              <span
                className="kort-signal absolute inset-0 rounded-full border border-moss"
                style={{ animationDelay: "200ms" }}
              />
              <div className="kort-pop absolute inset-0 rounded-full bg-moss" />
            </div>
            <p className="kort-sent-in font-fraunces font-light italic text-[clamp(1.5rem,4vw,2rem)] text-ink leading-[1.15]">
              Tak. Vi vender retur.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {/* Honeypot */}
            <input
              type="text"
              name="company_website"
              tabIndex={-1}
              autoComplete="off"
              value=""
              onChange={() => {}}
              className="absolute -left-[9999px] w-px h-px opacity-0"
              aria-hidden="true"
            />
            <label htmlFor="kort-email" className="block font-[200] text-[0.82rem] tracking-[0.02em] text-slate mb-2">
              Jeres email
            </label>
            <input
              id="kort-email"
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="navn@virksomhed.dk"
              required
              disabled={status === "sending"}
              className="w-full px-0 py-3 bg-transparent border-0 border-b border-ink/25 text-[1.05rem] font-[300] text-ink outline-none placeholder:text-slate/40 focus:border-ink transition-colors disabled:opacity-50"
            />
            {touched && !emailValid && (
              <p className="mt-2 font-[200] text-[0.8rem] text-stone">
                Skriv en gyldig email, så vi kan vende retur.
              </p>
            )}

            <button
              type="submit"
              disabled={status === "sending"}
              className={`w-full mt-7 inline-flex justify-center items-center font-[300] text-[0.82rem] tracking-[0.12em] uppercase px-8 py-[18px] bg-moss text-parchment border border-moss transition-all duration-300 hover:bg-moss-light hover:border-moss-light disabled:pointer-events-none ${
                status === "sending" ? "kort-sending" : ""
              }`}
            >
              {status === "sending" ? "Sender..." : "Lad os tale sammen"}
            </button>

            {status === "error" && (
              <p className="mt-4 font-[200] text-[0.9rem] text-stone leading-[1.6]">
                Noget gik galt. Skriv direkte til{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-moss border-b border-moss/30 hover:border-moss">
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
