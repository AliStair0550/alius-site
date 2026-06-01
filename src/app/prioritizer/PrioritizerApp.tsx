"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";

// ─── TYPES ─────────────────────────────────────────────────────────────────────

type Score = 1 | 2 | 3 | 4 | 5;
type MaturityCat =
  | "Vækst" | "Effektivisering" | "Digitalisering"
  | "Kundeoplevelse" | "AI & Automatisering" | "Organisation & Ledelse";
type Quadrant = "quick-win" | "strategic-bet" | "fill-in" | "avoid";
type Tier = 1 | 2 | 3 | 4;
type TabId = "initiatives" | "matrix" | "roadmap" | "report" | "ai" | "maturity";

interface Initiative {
  id: string; name: string; description: string;
  owner: string; department: string; category: MaturityCat; comments: string;
  impact: Score; effort: Score; strategic: Score; risk: Score; timeToValue: Score;
  createdAt: string;
}
interface Computed extends Initiative {
  score: number; quadrant: Quadrant; tier: Tier;
}

// ─── UTILITIES ─────────────────────────────────────────────────────────────────

const MATURITY_CATS: MaturityCat[] = [
  "Vækst", "Effektivisering", "Digitalisering",
  "Kundeoplevelse", "AI & Automatisering", "Organisation & Ledelse",
];

const TABS: { id: TabId; label: string }[] = [
  { id: "initiatives", label: "Initiativer" },
  { id: "matrix",      label: "Matrix" },
  { id: "roadmap",     label: "Roadmap" },
  { id: "report",      label: "Ledelsesrapport" },
  { id: "ai",          label: "AI-rådgiver" },
  { id: "maturity",    label: "Modenhed" },
];

const SCORE_LABELS = {
  impact:      ["","Begrænset effekt","Moderat effekt","Tydelig effekt","Stor effekt","Transformativ effekt"],
  effort:      ["","Meget lav","Lav indsats","Moderat","Høj indsats","Meget høj"],
  strategic:   ["","Ikke relevant","Delvist relevant","Moderat vigtig","Understøtter direkte","Kritisk for strategien"],
  risk:        ["","Meget lav risiko","Lav risiko","Moderat risiko","Høj risiko","Meget høj risiko"],
  timeToValue: ["","< 3 måneder","3-6 måneder","6-12 måneder","1-2 år","> 2 år"],
};

const Q_META: Record<Quadrant, { label: string; dotColor: string; textClass: string; bgAlpha: string }> = {
  "quick-win":     { label:"Hurtig gevinst",     dotColor:"#2D5F4A", textClass:"text-moss",      bgAlpha:"rgba(45,95,74,0.07)"    },
  "strategic-bet": { label:"Strategisk indsats", dotColor:"#B45309", textClass:"text-amber-600", bgAlpha:"rgba(180,83,9,0.07)"    },
  "fill-in":       { label:"Lav prioritet",      dotColor:"#6B7B75", textClass:"text-slate",     bgAlpha:"rgba(107,123,117,0.07)" },
  "avoid":         { label:"Undgå",              dotColor:"#B91C1C", textClass:"text-red-700",   bgAlpha:"rgba(185,28,28,0.06)"   },
};

const T_META: Record<Tier, { sub: string; borderClass: string; dotClass: string }> = {
  1: { sub:"Gør nu",               borderClass:"border-moss",      dotClass:"bg-moss"     },
  2: { sub:"Næste kvartal",        borderClass:"border-clay",      dotClass:"bg-clay"     },
  3: { sub:"Afvent",               borderClass:"border-clay/50",   dotClass:"bg-fog"      },
  4: { sub:"Fravælg",              borderClass:"border-clay/30",   dotClass:"bg-fog/60"   },
};

function calcScore(i: Omit<Initiative,"id"|"createdAt"> & Partial<Pick<Initiative,"id"|"createdAt">>): number {
  return Math.round((
    i.impact * 0.4 + i.strategic * 0.3 +
    (6 - i.effort) * 0.15 + (6 - i.risk) * 0.1 + (6 - i.timeToValue) * 0.05
  ) * 100) / 100;
}
function quadrant(i: Initiative): Quadrant {
  const hi = i.impact >= 3, lo = i.effort <= 3;
  if (hi && lo) return "quick-win"; if (hi) return "strategic-bet";
  if (lo) return "fill-in"; return "avoid";
}
function tier(s: number): Tier {
  if (s >= 3.5) return 1; if (s >= 2.5) return 2; if (s >= 1.5) return 3; return 4;
}
function compute(i: Initiative): Computed {
  const score = calcScore(i);
  return { ...i, score, quadrant: quadrant(i), tier: tier(score) };
}
function uid() { return Math.random().toString(36).slice(2, 10); }

// ─── SAMPLE DATA ───────────────────────────────────────────────────────────────

const SAMPLE: Initiative[] = [];

const BLANK: Omit<Initiative,"id"|"createdAt"> = {
  name:"", description:"", owner:"", department:"", category:"Vækst", comments:"",
  impact:3, effort:3, strategic:3, risk:3, timeToValue:3,
};

// ─── AI INSIGHTS ───────────────────────────────────────────────────────────────

type InsightType = "opportunity" | "warning" | "info";
interface Insight { headline: string; body: string; type: InsightType }

function generateInsights(items: Computed[]): Insight[] {
  if (!items.length) return [];
  const candidates: Insight[] = [];
  const sorted = [...items].sort((a, b) => b.score - a.score);
  const top    = sorted[0];
  const qw     = items.filter(i => i.quadrant === "quick-win");
  const sb     = items.filter(i => i.quadrant === "strategic-bet");
  const av     = items.filter(i => i.quadrant === "avoid");
  const hiE    = items.filter(i => i.effort >= 4);
  const hiR    = items.filter(i => i.risk >= 4);
  const tier1  = items.filter(i => i.tier === 1);
  const avgScore = items.reduce((s, i) => s + i.score, 0) / items.length;

  // ── 1. Topinitiativ (altid) ────────────────────────────────────────────────
  candidates.push({
    type: "opportunity",
    headline: `${top.name} er porteføljens stærkeste initiativ med en score på ${top.score.toFixed(2)}.`,
    body: `Impact ${top.impact}/5 og strategisk relevans ${top.strategic}/5 placerer dette øverst. ${
      top.quadrant === "quick-win"
        ? `Med lav indsats (${top.effort}/5) er gevinsten tilgængelig hurtigt — anbefales igangsat i indeværende kvartal.`
        : `Det kræver betydelig indsats (${top.effort}/5), men den strategiske gevinst er proportional og bør planlægges nu.`
    }`,
  });

  // ── 2. Hurtige gevinster ───────────────────────────────────────────────────
  if (qw.length === 0) {
    candidates.push({ type:"warning",
      headline: "Porteføljen mangler hurtige gevinster.",
      body: "Ingen initiativer befinder sig i Hurtig gevinst-kvadranten. Overvej om eksisterende initiativer kan scopejusteres eller deles op for hurtigere og billigere værdirealisering." });
  } else if (qw.length >= 2) {
    const best2 = [...qw].sort((a,b) => b.score - a.score).slice(0, 2);
    candidates.push({ type:"opportunity",
      headline: `${qw.length} initiativer kan levere hurtige gevinster med lav indsats.`,
      body: `${best2.map(i=>i.name).join(" og ")} har begge høj impact og lav implementeringsindsats. Start med disse for at skabe momentum, finansiere de tyngre initiativer og bevise konceptet.` });
  }

  // ── 3. Undgå-kvadrant ─────────────────────────────────────────────────────
  if (av.length === 1) {
    candidates.push({ type:"warning",
      headline: `${av[0].name} bør genovervejes inden igangsætning.`,
      body: `Lav forretningseffekt (impact ${av[0].impact}/5) kombineret med meget høj indsats (effort ${av[0].effort}/5) er en ufordelagtig kombination. Initiativet bør scopejusteres markant, opdeles eller fravalges.` });
  } else if (av.length > 1) {
    candidates.push({ type:"warning",
      headline: `${av.length} initiativer befinder sig i Undgå-kvadranten.`,
      body: `${av.map(i=>i.name).join(", ")} kombinerer lav forretningseffekt med høj indsats. Overvej at fravælge eller fundamentalt redefinere disse initiativer, da de forbruger kapacitet uden proportional gevinst.` });
  }

  // ── 4. Kapacitetspres ─────────────────────────────────────────────────────
  if (hiE.length >= 2) {
    candidates.push({ type:"warning",
      headline: `${hiE.length} ressourcetunge initiativer konkurrerer om den samme kapacitet.`,
      body: `${hiE.map(i=>i.name).join(", ")} kræver alle høj til meget høj indsats. Parallel implementering risikerer forsinkelse og kvalitetstab. En sekventiel plan med klare start- og slutdatoer anbefales stærkt.` });
  }

  // ── 5. Strategiske indsatser ──────────────────────────────────────────────
  if (sb.length >= 2) {
    candidates.push({ type:"info",
      headline: `${sb.length} strategiske indsatser kræver flerårig planlægning og tydelig sponsorship.`,
      body: `${sb.map(i=>i.name).join(" og ")} er begge høj-impact initiativer, men med høj implementeringsindsats. Dedikér et projektteam, etablér styregruppe og sæt realistiske milepæle over 12-24 måneder.` });
  } else if (sb.length === 1) {
    candidates.push({ type:"info",
      headline: `${sb[0].name} er en langsigtet strategisk investering.`,
      body: `Impact ${sb[0].impact}/5 gør dette strategisk attraktivt, men indsats på ${sb[0].effort}/5 kræver dedikeret budget og ledelsesmæssig opbakning. Faseret implementering anbefales.` });
  }

  // ── 6. Risikoprofil ───────────────────────────────────────────────────────
  if (hiR.length >= 1) {
    candidates.push({ type:"warning",
      headline: `${hiR.length === 1 ? hiR[0].name + " bærer" : hiR.length + " initiativer bærer"} forhøjet risiko.`,
      body: `${hiR.map(i=>i.name).join(" og ")} scorer ${hiR.map(i=>i.risk).join(" hhv. ")} på risiko. Anbefal en proof-of-concept-fase og en dedikeret risikomitigationsplan inden fuld ressourcebevilling.` });
  }

  // ── 7. Tier 1-portefølje ──────────────────────────────────────────────────
  if (tier1.length >= 3) {
    candidates.push({ type:"info",
      headline: `${tier1.length} initiativer er klar til igangsætning nu (score ≥ 3.5).`,
      body: `Med en porteføljegns. på ${avgScore.toFixed(1)} er der solid strategisk drivkraft. Start med de hurtige gevinster for at frigøre kapacitet og bygge organisatorisk momentum.` });
  } else if (tier1.length === 0 && items.length >= 3) {
    candidates.push({ type:"warning",
      headline: "Ingen initiativer når tærsklen for øjeblikkelig igangsætning (score ≥ 3.5).",
      body: `Gennemsnitsscore er ${avgScore.toFixed(1)}. Overvej om initiativernes impact og strategiske relevans er tilstrækkeligt vurderet, eller om porteføljens ambitionsniveau bør justeres.` });
  }

  // ── 8. Kategorigab ────────────────────────────────────────────────────────
  const cats    = new Set(items.map(i => i.category));
  const missing = MATURITY_CATS.filter(c => !cats.has(c));
  if (missing.length >= 2 && items.length >= 4) {
    candidates.push({ type:"info",
      headline: `${missing.length} strategiske fokusområder er ikke dækket.`,
      body: `${missing.slice(0,3).join(", ")} mangler i porteføljen. Overvej om dette er en bevidst prioritering, eller om virksomheden har blinde vinkler i sin strategiske planlægning.` });
  }

  // Sikr mindst 3 indsigter — tilføj en generel anbefaling ved behov
  if (candidates.length < 3 && items.length >= 2) {
    candidates.push({ type:"info",
      headline: `Porteføljens samlede prioriteringsscore er ${avgScore.toFixed(1)} ud af 5.`,
      body: `${sorted.slice(0,2).map(i=>i.name).join(" og ")} udgør de stærkeste initiativer. Fokusér ledelsesenergi og ressourcer her for at maksimere porteføljens samlede strategiske afkast.` });
  }

  return candidates.slice(0, 5);
}

// ─── EXECUTIVE SUMMARY ─────────────────────────────────────────────────────────

function generateSummary(items: Computed[]): string {
  if (!items.length) return "Tilføj initiativer for at generere en analyse.";
  const sorted = [...items].sort((a,b) => b.score - a.score);
  const t1 = sorted.filter(i => i.tier === 1);
  const t2 = sorted.filter(i => i.tier === 2);
  const t4 = sorted.filter(i => i.tier === 4);
  const qw = sorted.filter(i => i.quadrant === "quick-win");
  const sb = sorted.filter(i => i.quadrant === "strategic-bet");
  const parts: string[] = [];

  if (t1.length > 0) {
    const names = t1.map(i => i.name);
    parts.push(t1.length === 1
      ? `Analysen identificerer ${names[0]} som det højest prioriterede initiativ i porteføljen med en samlet score på ${t1[0].score.toFixed(1)}.`
      : `Analysen identificerer ${names.slice(0,-1).join(", ")} og ${names[names.length-1]} som de mest prioriterede initiativer med scores på henholdsvis ${t1.map(i=>i.score.toFixed(1)).join(", ")}.`
    );
  }
  if (qw.length > 0) {
    const n = qw.map(i=>i.name);
    parts.push(n.length === 1
      ? `${n[0]} er identificeret som en klar hurtig gevinst, der leverer høj forretningsmæssig effekt med relativ lav implementeringsindsats og med fordel igangsættes i indeværende kvartal.`
      : `${n.join(" og ")} er identificeret som hurtige gevinster, der kombinerer høj effekt med lav til moderat implementeringsindsats og bør prioriteres i nærmeste fremtid.`
    );
  }
  if (sb.length > 0) {
    parts.push(sb.length === 1
      ? `${sb[0].name} vurderes som en strategisk langtidsinvestering, der kræver dedikeret ressourceplanlægning og tydelig executiv sponsorship.`
      : `${sb.map(i=>i.name).join(" og ")} kategoriseres som strategiske indsatser, der kræver større ressourceinvestering og bør indgå i en flerårig planlægningshorisont.`
    );
  }
  if (t2.length > 0) {
    parts.push(`Det anbefales at planlægge ${t2.map(i=>i.name).join(", ")} som del af næste kvartals prioriteringer, efterfulgt af løbende opfølgning på fremdrift og ressourcetilgængelighed.`);
  }
  if (t4.length > 0) {
    parts.push(t4.length === 1
      ? `${t4[0].name} anbefales fravalgt i den aktuelle planperiode, da initiativet ikke opfylder tærsklen for tilstrækkelig strategisk effekt relativt til den krævede indsats.`
      : `${t4.map(i=>i.name).join(" og ")} anbefales nedprioriteret grundet utilstrækkelig strategisk effekt i forhold til ressourcekravet.`
    );
  }
  return parts.join(" ") || `Porteføljen indeholder ${items.length} initiativer med en gennemsnitlig score på ${(items.reduce((s,i)=>s+i.score,0)/items.length).toFixed(2)}.`;
}

// ─── SMALL COMPONENTS ──────────────────────────────────────────────────────────

function ScorePicker({ label, field, value, onChange }: {
  label: string; field: keyof typeof SCORE_LABELS; value: Score; onChange: (v: Score) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[10px] font-[400] tracking-[0.1em] uppercase text-ink">{label}</span>
        <span className="text-[10px] text-slate font-[300]">{SCORE_LABELS[field][value]}</span>
      </div>
      <div className="flex gap-1.5">
        {([1,2,3,4,5] as Score[]).map(n => (
          <button key={n} type="button" onClick={() => onChange(n)}
            className={`flex-1 py-2.5 text-[13px] border transition-all ${
              value === n
                ? "bg-moss text-parchment border-moss font-[400]"
                : "border-clay/50 text-stone hover:border-moss/60 hover:text-ink font-[300]"
            }`}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 3.5 ? "#2D5F4A" : score >= 2.5 ? "#B45309" : "#D4D0C8";
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[13px] font-[400] text-ink tabular-nums w-7">{score.toFixed(1)}</span>
      <div className="flex-1 h-[3px] bg-fog">
        <div style={{ width:`${(score/5)*100}%`, backgroundColor:color }} className="h-full transition-all duration-500" />
      </div>
    </div>
  );
}

function QBadge({ q }: { q: Quadrant }) {
  const m = Q_META[q];
  return (
    <span className={`text-[9px] tracking-[0.1em] uppercase px-2 py-0.5 border border-current/30 ${m.textClass}`}>
      {m.label}
    </span>
  );
}

function TBadge({ t }: { t: Tier }) {
  return (
    <span className={`text-[9px] tracking-[0.1em] uppercase px-2 py-0.5 border ${T_META[t].borderClass} text-stone font-[300]`}>
      {T_META[t].sub}
    </span>
  );
}

// ─── MODAL ─────────────────────────────────────────────────────────────────────

// ─── EMPTY STATE ───────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-2 h-2 rounded-full bg-moss mb-8" />
      <h2 className="font-fraunces font-light italic text-[clamp(28px,4vw,48px)] text-ink leading-[1.1] mb-4 max-w-[560px]">
        Hvad skal vi gøre nu — og hvad kan vente?
      </h2>
      <p className="text-[15px] text-stone font-[300] leading-[1.8] max-w-[440px] mb-12">
        Tilføj dine initiativer, scorer dem på fem parametre og se øjeblikkeligt hvilke der skal prioriteres — og hvilke der kan fravalges.
      </p>

      {/* Steps */}
      <div className="flex flex-col md:flex-row gap-4 mb-14 max-w-[680px] w-full text-left">
        {[
          { n:"01", t:"Opret initiativer",   d:"Tilføj de projekter og idéer du overvejer at igangsætte." },
          { n:"02", t:"Score hvert initiativ", d:"Vurdér effekt, indsats, strategi, risiko og tidshorisont." },
          { n:"03", t:"Se prioriteterne",     d:"Matrix og handlingsplan bygger sig automatisk." },
        ].map(s => (
          <div key={s.n} className="flex-1 border border-clay/35 px-6 py-5">
            <div className="text-[9px] tracking-[0.25em] uppercase text-moss font-[400] mb-2">{s.n}</div>
            <div className="font-fraunces font-light text-[17px] text-ink mb-1.5">{s.t}</div>
            <div className="text-[12px] text-stone font-[300] leading-[1.6]">{s.d}</div>
          </div>
        ))}
      </div>

      <button onClick={onAdd}
        className="bg-moss text-parchment px-12 py-4 text-[12px] tracking-[0.22em] uppercase hover:bg-moss-light transition-colors font-[300]">
        + Opret dit første initiativ
      </button>
    </div>
  );
}

// ─── MODAL ─────────────────────────────────────────────────────────────────────

function Modal({ initial, onSave, onClose }: {
  initial: Initiative | null;
  onSave: (i: Initiative) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    impact: initial?.impact ?? 3 as Score,
    effort: initial?.effort ?? 3 as Score,
    strategic: initial?.strategic ?? 3 as Score,
    risk: initial?.risk ?? 3 as Score,
    timeToValue: initial?.timeToValue ?? 3 as Score,
  });

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) => setForm(f => ({ ...f, [k]: v }));

  const fullForm = { ...BLANK, ...form };
  const preview  = useMemo(() => calcScore(fullForm), [form]);
  const previewTier = tier(preview);
  const previewQ    = quadrant({ ...fullForm, id:"", createdAt:"" } as Initiative);

  const isNew = !initial;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/70 backdrop-blur-sm overflow-y-auto p-4 md:p-8"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-[620px] bg-parchment my-8">

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-clay/25">
          <h2 className="font-fraunces font-light text-[22px] text-ink">
            {isNew ? "Opret initiativ" : "Rediger initiativ"}
          </h2>
          <button onClick={onClose}
            className="text-clay hover:text-ink text-[24px] leading-none transition-colors">&times;</button>
        </div>

        <div className="px-8 py-7 space-y-5">
          {/* Name — stor og prominent */}
          <div>
            <input
              autoFocus
              value={form.name}
              onChange={e => set("name", e.target.value)}
              className="w-full border-0 border-b-2 border-clay/40 bg-transparent pb-3 text-[22px] font-fraunces font-light text-ink placeholder:text-clay/50 focus:outline-none focus:border-moss transition-colors"
              placeholder="Hvad hedder initiativet?" />
          </div>

          {/* Description */}
          <div>
            <textarea
              value={form.description}
              onChange={e => set("description", e.target.value)}
              rows={2}
              className="w-full border border-clay/30 bg-sand/30 px-4 py-3 text-[14px] font-[300] text-stone placeholder:text-clay/50 focus:outline-none focus:border-moss transition-colors resize-none"
              placeholder="Beskriv initiativet kort og hvad det skal opnå... (valgfrit)" />
          </div>

          {/* Scoring */}
          <div className="pt-2">
            {/* Live preview */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-clay/25">
              <span className="text-[10px] tracking-[0.25em] uppercase text-stone font-[300]">Scoring</span>
              <div className="flex items-center gap-3">
                <div className="flex items-baseline gap-1">
                  <span className="font-fraunces font-light text-[32px] text-ink leading-none">{preview.toFixed(1)}</span>
                  <span className="text-[11px] text-clay font-[300]">/ 5</span>
                </div>
                <div className="flex items-center gap-2">
                  <QBadge q={previewQ} />
                  <TBadge t={previewTier} />
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <ScorePicker label="Effekt"             field="impact"      value={form.impact}      onChange={v => set("impact",v)} />
              <ScorePicker label="Implementeringsindsats" field="effort"  value={form.effort}      onChange={v => set("effort",v)} />
              <ScorePicker label="Strategisk relevans" field="strategic"  value={form.strategic}   onChange={v => set("strategic",v)} />
              <ScorePicker label="Risiko"              field="risk"       value={form.risk}        onChange={v => set("risk",v)} />
              <ScorePicker label="Tid til gevinst"     field="timeToValue" value={form.timeToValue} onChange={v => set("timeToValue",v)} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-8 py-5 border-t border-clay/25">
          <button onClick={onClose}
            className="text-[11px] tracking-[0.1em] uppercase text-stone hover:text-ink transition-colors font-[300]">
            Annuller
          </button>
          <button
            onClick={() => {
              if (!form.name.trim()) return;
              onSave({
                ...BLANK, ...form,
                id: initial?.id ?? uid(),
                createdAt: initial?.createdAt ?? new Date().toISOString(),
              });
            }}
            disabled={!form.name.trim()}
            className="bg-moss text-parchment px-10 py-3 text-[12px] tracking-[0.18em] uppercase hover:bg-moss-light transition-colors disabled:opacity-40 font-[300]">
            {isNew ? "Opret initiativ" : "Gem ændringer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── INITIATIVES TAB ───────────────────────────────────────────────────────────

function InitiativesTab({ items, onEdit, onDelete, onAdd }: {
  items: Computed[];
  onEdit: (i: Initiative) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}) {
  const sorted = [...items].sort((a, b) => b.score - a.score);

  if (items.length === 0) return <EmptyState onAdd={onAdd} />;

  return (
    <div>
      {/* Minimal stats row */}
      <div className="flex flex-wrap items-center gap-8 mb-8 pb-6 border-b border-clay/25">
        {[
          { l:"Initiativer",       v: String(items.length) },
          { l:"Hurtige gevinster", v: String(items.filter(i=>i.quadrant==="quick-win").length) },
          { l:"Gør nu",            v: String(items.filter(i=>i.tier===1).length) },
          { l:"Gennemsnitsscore",  v: (items.reduce((s,i)=>s+i.score,0)/items.length).toFixed(1) },
        ].map((s, idx) => (
          <div key={s.l} className={`${idx > 0 ? "pl-8 border-l border-clay/25" : ""}`}>
            <div className="text-[9px] tracking-[0.2em] uppercase text-clay font-[300] mb-1">{s.l}</div>
            <div className="font-fraunces font-light text-[34px] text-ink leading-none">{s.v}</div>
          </div>
        ))}
        <button onClick={onAdd}
          className="ml-auto bg-moss text-parchment px-7 py-3 text-[11px] tracking-[0.18em] uppercase hover:bg-moss-light transition-colors font-[300]">
          + Nyt initiativ
        </button>
      </div>

      {/* Initiative rows — clean cards */}
      <div className="space-y-2">
        {sorted.map((item) => (
          <div key={item.id}
            className="flex items-center gap-6 px-6 py-5 border border-clay/20 hover:border-clay/40 hover:bg-fog/15 transition-all group">
            <div className="flex-1 min-w-0">
              <div className="font-fraunces font-light text-[19px] text-ink leading-tight truncate">{item.name}</div>
              {item.description && (
                <div className="text-[12px] text-stone font-[300] mt-1 truncate">{item.description}</div>
              )}
            </div>
            <div className="flex-shrink-0 hidden md:block">
              <QBadge q={item.quadrant} />
            </div>
            <div className="flex-shrink-0 w-32 hidden md:block">
              <ScoreBar score={item.score} />
            </div>
            <div className="flex-shrink-0 hidden md:block">
              <TBadge t={item.tier} />
            </div>
            <div className="flex-shrink-0 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onEdit(item)}
                className="text-[10px] tracking-[0.1em] uppercase text-stone hover:text-moss transition-colors font-[300]">
                Rediger
              </button>
              <button onClick={() => onDelete(item.id)}
                className="text-[10px] tracking-[0.1em] uppercase text-clay hover:text-red-600 transition-colors font-[300]">
                Slet
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MATRIX TAB ────────────────────────────────────────────────────────────────

function MatrixTab({ items }: { items: Computed[] }) {
  const [hovId, setHovId] = useState<string | null>(null);

  // Bigger canvas for more presence
  const W = 800, H = 580;
  const P = { l: 60, r: 740, t: 40, b: 510 };
  const PW = P.r - P.l, PH = P.b - P.t;
  const xF  = (e: number) => P.l + (e - 1) / 4 * PW;
  const yF  = (i: number) => P.b - (i - 1) / 4 * PH;
  const DX  = xF(3), DY = yF(3);

  // Centered label positions per quadrant
  const QC = {
    "quick-win":     { cx:(P.l+DX)/2,   cy:(P.t+DY)/2   },
    "strategic-bet": { cx:(DX+P.r)/2,   cy:(P.t+DY)/2   },
    "fill-in":       { cx:(P.l+DX)/2,   cy:(DY+P.b)/2   },
    "avoid":         { cx:(DX+P.r)/2,   cy:(DY+P.b)/2   },
  } as const;

  const Q_LABELS = {
    "quick-win":     { line1:"Hurtig",    line2:"gevinst"   },
    "strategic-bet": { line1:"Strategisk", line2:"indsats"  },
    "fill-in":       { line1:"Lav",       line2:"prioritet" },
    "avoid":         { line1:"Undgå",     line2:""          },
  } as const;

  // Stronger quadrant backgrounds
  const Q_BG: Record<Quadrant, string> = {
    "quick-win":     "rgba(45,95,74,0.10)",
    "strategic-bet": "rgba(180,83,9,0.08)",
    "fill-in":       "rgba(107,123,117,0.08)",
    "avoid":         "rgba(185,28,28,0.08)",
  };

  return (
    <div>
      <div className="bg-sand/30 border border-clay/25 overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 580 }}>
          <defs>
            <radialGradient id="qw-grad"  cx="30%" cy="35%"><stop offset="0%" stopColor="#2D5F4A" stopOpacity="0.13"/><stop offset="100%" stopColor="#2D5F4A" stopOpacity="0.04"/></radialGradient>
            <radialGradient id="sb-grad"  cx="70%" cy="35%"><stop offset="0%" stopColor="#B45309" stopOpacity="0.11"/><stop offset="100%" stopColor="#B45309" stopOpacity="0.03"/></radialGradient>
            <radialGradient id="fi-grad"  cx="30%" cy="70%"><stop offset="0%" stopColor="#6B7B75" stopOpacity="0.10"/><stop offset="100%" stopColor="#6B7B75" stopOpacity="0.03"/></radialGradient>
            <radialGradient id="av-grad"  cx="70%" cy="70%"><stop offset="0%" stopColor="#B91C1C" stopOpacity="0.10"/><stop offset="100%" stopColor="#B91C1C" stopOpacity="0.02"/></radialGradient>
          </defs>

          {/* Quadrant fills with gradient */}
          <rect x={P.l}  y={P.t} width={DX-P.l} height={DY-P.t} fill="url(#qw-grad)" />
          <rect x={DX}   y={P.t} width={P.r-DX}  height={DY-P.t} fill="url(#sb-grad)" />
          <rect x={P.l}  y={DY}  width={DX-P.l}  height={P.b-DY} fill="url(#fi-grad)" />
          <rect x={DX}   y={DY}  width={P.r-DX}  height={P.b-DY} fill="url(#av-grad)" />

          {/* Quadrant border lines */}
          <rect x={P.l} y={P.t} width={DX-P.l} height={DY-P.t} fill="none" stroke={Q_META["quick-win"].dotColor}     strokeWidth={0.6} strokeOpacity={0.2}/>
          <rect x={DX}  y={P.t} width={P.r-DX}  height={DY-P.t} fill="none" stroke={Q_META["strategic-bet"].dotColor} strokeWidth={0.6} strokeOpacity={0.2}/>
          <rect x={P.l} y={DY}  width={DX-P.l}  height={P.b-DY} fill="none" stroke={Q_META["fill-in"].dotColor}       strokeWidth={0.6} strokeOpacity={0.15}/>
          <rect x={DX}  y={DY}  width={P.r-DX}  height={P.b-DY} fill="none" stroke={Q_META["avoid"].dotColor}         strokeWidth={0.6} strokeOpacity={0.15}/>

          {/* Center dividers */}
          <line x1={DX} y1={P.t} x2={DX} y2={P.b} stroke="rgba(26,26,26,0.15)" strokeWidth={1.5}/>
          <line x1={P.l} y1={DY} x2={P.r} y2={DY} stroke="rgba(26,26,26,0.15)" strokeWidth={1.5}/>

          {/* Large centered quadrant labels */}
          {(Object.keys(QC) as Quadrant[]).map(q => {
            const { cx, cy } = QC[q];
            const { line1, line2 } = Q_LABELS[q];
            const col = Q_META[q].dotColor;
            const count = items.filter(i => i.quadrant === q).length;
            return (
              <g key={q}>
                <text x={cx} y={cy - (line2 ? 10 : 4)} textAnchor="middle"
                  fontSize={18} fill={col} fontFamily="Fraunces,Georgia,serif"
                  fontWeight={300} fontStyle="italic" opacity={0.55}>
                  {line1}
                </text>
                {line2 && (
                  <text x={cx} y={cy + 16} textAnchor="middle"
                    fontSize={18} fill={col} fontFamily="Fraunces,Georgia,serif"
                    fontWeight={300} fontStyle="italic" opacity={0.55}>
                    {line2}
                  </text>
                )}
                {/* Count badge */}
                {count > 0 && (
                  <text x={cx} y={cy + (line2 ? 42 : 28)} textAnchor="middle"
                    fontSize={11} fill={col} fontFamily="Jost,sans-serif"
                    fontWeight={400} opacity={0.5} letterSpacing={1}>
                    {count} initiativ{count !== 1 ? "er" : ""}
                  </text>
                )}
              </g>
            );
          })}

          {/* Axis labels */}
          <text x={(P.l+P.r)/2} y={H - 10} textAnchor="middle" fontSize={11} fill="rgba(26,26,26,0.35)" fontFamily="Jost,sans-serif" letterSpacing={2}>INDSATS →</text>
          <text transform={`rotate(-90) translate(-${(P.t+P.b)/2} 20)`} textAnchor="middle" fontSize={11} fill="rgba(26,26,26,0.35)" fontFamily="Jost,sans-serif" letterSpacing={2}>EFFEKT →</text>

          {/* Scale labels — only 1 and 5 at extremes */}
          <text x={xF(1)} y={P.b+18} textAnchor="middle" fontSize={9} fill="rgba(26,26,26,0.28)" fontFamily="Jost,sans-serif">lav</text>
          <text x={xF(5)} y={P.b+18} textAnchor="middle" fontSize={9} fill="rgba(26,26,26,0.28)" fontFamily="Jost,sans-serif">høj</text>
          <text x={P.l-8} y={yF(1)+4} textAnchor="end" fontSize={9} fill="rgba(26,26,26,0.28)" fontFamily="Jost,sans-serif">lav</text>
          <text x={P.l-8} y={yF(5)+4} textAnchor="end" fontSize={9} fill="rgba(26,26,26,0.28)" fontFamily="Jost,sans-serif">høj</text>

          {/* Initiative dots */}
          {items.map(item => {
            const x   = xF(item.effort), y = yF(item.impact);
            const hov = hovId === item.id;
            const col = Q_META[item.quadrant].dotColor;
            const TW  = Math.max(180, item.name.length * 7 + 28);
            const tx  = x + 18 > W - TW - 12 ? x - TW - 12 : x + 18;
            const ty  = y - 48 < P.t + 10 ? y + 10 : y - 52;
            return (
              <g key={item.id} onMouseEnter={() => setHovId(item.id)} onMouseLeave={() => setHovId(null)} style={{ cursor:"pointer" }}>
                {/* Glow ring on hover */}
                {hov && <circle cx={x} cy={y} r={24} fill={col} opacity={0.1}/>}
                {hov && <circle cx={x} cy={y} r={16} fill={col} opacity={0.15}/>}
                {/* Dot */}
                <circle cx={x} cy={y} r={hov ? 11 : 8} fill={col} opacity={hov ? 1 : 0.82} style={{ transition:"all 180ms" }}/>
                {/* Name label always visible (not on hover) */}
                {!hov && (
                  <text x={x} y={y - 14} textAnchor="middle" fontSize={10} fill="rgba(26,26,26,0.6)"
                    fontFamily="Jost,sans-serif" fontWeight={300} style={{ pointerEvents:"none" }}>
                    {item.name.length > 18 ? item.name.slice(0, 17) + "…" : item.name}
                  </text>
                )}
                {/* Rich tooltip on hover */}
                {hov && (
                  <g style={{ pointerEvents:"none" }}>
                    <rect x={tx} y={ty} width={TW} height={50} fill="#1A1A1A" rx={3}/>
                    <rect x={tx} y={ty} width={TW} height={3} fill={col} rx={1}/>
                    <text x={tx+12} y={ty+20} fontSize={13} fill="rgba(250,248,244,0.95)" fontFamily="Jost,sans-serif" fontWeight={400}>{item.name}</text>
                    <text x={tx+12} y={ty+37} fontSize={10} fill="rgba(250,248,244,0.4)" fontFamily="Jost,sans-serif">
                      Score {item.score.toFixed(2)} · {Q_META[item.quadrant].label} · P{item.tier}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-5 flex flex-wrap gap-6">
        {(Object.entries(Q_META) as [Quadrant, typeof Q_META[Quadrant]][]).map(([q, m]) => (
          <div key={q} className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: m.dotColor }} />
            <span className="text-[12px] text-stone font-[300]">{m.label}</span>
            <span className="text-[11px] text-clay font-[300]">
              ({items.filter(i => i.quadrant === q).length})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ROADMAP TAB ───────────────────────────────────────────────────────────────

const TIER_INFO: Record<Tier, { title:string; sub:string; note:string; bg:string; accent:string }> = {
  1: { title:"Prioritet 1", sub:"Gør nu",               note:"Score ≥ 3.5", bg:"bg-moss/5",    accent:"border-l-moss"    },
  2: { title:"Prioritet 2", sub:"Planlæg næste kvartal", note:"2.5 – 3.5",   bg:"bg-sand/60",  accent:"border-l-clay"    },
  3: { title:"Prioritet 3", sub:"Afvent",                note:"1.5 – 2.5",   bg:"bg-fog/30",   accent:"border-l-clay/50" },
  4: { title:"Prioritet 4", sub:"Fravælg",               note:"< 1.5",        bg:"bg-fog/15",   accent:"border-l-clay/30" },
};

function RoadmapTab({ items }: { items: Computed[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {([1,2,3,4] as Tier[]).map(t => {
        const ti = items.filter(i => i.tier === t).sort((a,b) => b.score-a.score);
        const inf = TIER_INFO[t];
        return (
          <div key={t} className={`border border-clay/30 ${inf.bg}`}>
            <div className="px-5 py-4 border-b border-clay/20 flex items-baseline justify-between">
              <div className="flex items-baseline gap-3">
                <span className="text-[10px] tracking-[0.2em] uppercase text-stone font-[400]">{inf.title}</span>
                <span className="font-fraunces font-light italic text-[17px] text-ink">{inf.sub}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-clay font-[300]">{inf.note}</span>
                <span className="text-[11px] font-[400] text-slate border border-clay/40 w-6 h-6 flex items-center justify-center leading-none">{ti.length}</span>
              </div>
            </div>
            <div className="p-3 space-y-2 min-h-[110px]">
              {ti.length === 0 ? (
                <div className="py-8 text-center text-[11px] text-clay font-[300]">Ingen initiativer i denne prioritet</div>
              ) : ti.map(item => (
                <div key={item.id} className={`bg-parchment border-l-2 ${inf.accent} border-y border-r border-clay/15 px-4 py-3 flex items-center justify-between`}>
                  <div className="min-w-0 mr-3">
                    <div className="text-[13px] font-[400] text-ink truncate">{item.name}</div>
                    <div className="text-[10px] text-slate font-[300] mt-0.5">{item.category} · {item.owner || item.department}</div>
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <QBadge q={item.quadrant}/>
                    <span className="text-[13px] font-[400] text-ink tabular-nums">{item.score.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── REPORT TAB ────────────────────────────────────────────────────────────────

function ReportTab({ items }: { items: Computed[] }) {
  const summary = useMemo(() => generateSummary(items), [items]);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    const full = `ALIUS PRIORITIZER — LEDELSESRAPPORT\n${new Date().toLocaleDateString("da-DK",{day:"numeric",month:"long",year:"numeric"})}\n\nANALYSE\n${summary}\n\nINITIATIVOVERSIGT\n${[...items].sort((a,b)=>b.score-a.score).map(i=>`${i.name}: ${i.score.toFixed(2)} — ${Q_META[i.quadrant].label} — ${T_META[i.tier].sub}`).join("\n")}`;
    navigator.clipboard.writeText(full).then(() => { setCopied(true); setTimeout(()=>setCopied(false),2500); });
  };

  return (
    <div className="max-w-[820px]">
      {/* Meta */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        {[
          { l:"Genereret",             v:new Date().toLocaleDateString("da-DK",{day:"numeric",month:"long",year:"numeric"}) },
          { l:"Initiativer analyseret",v:items.length.toString() },
          { l:"Gennemsnitlig score",   v:items.length ? (items.reduce((s,i)=>s+i.score,0)/items.length).toFixed(2)+" / 5":"—" },
        ].map(s => (
          <div key={s.l} className="border-l-2 border-clay/40 pl-4">
            <div className="text-[9px] tracking-[0.2em] uppercase text-clay font-[300] mb-1">{s.l}</div>
            <div className="text-[14px] font-[400] text-ink">{s.v}</div>
          </div>
        ))}
      </div>

      {/* Summary block */}
      <div className="border border-clay/30 bg-sand/30 px-8 py-7 mb-6">
        <div className="text-[9px] tracking-[0.3em] uppercase text-moss font-[400] mb-4">Ledelsesoversigt</div>
        <p className="font-fraunces font-light italic text-[16px] leading-[1.85] text-ink">{summary}</p>
      </div>

      {/* Table */}
      <div className="border border-clay/30 mb-6">
        <div className="px-5 py-3 border-b border-clay/20 bg-sand/40">
          <span className="text-[9px] tracking-[0.25em] uppercase text-stone font-[300]">Komplet initiativoversigt · sorteret efter score</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-clay/15">
              {["Initiativ","Impact","Effort","Strategisk","Risiko","Tid","Score","Kvadrant","Prioritet"].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-[8px] tracking-[0.15em] uppercase text-slate font-[400]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...items].sort((a,b)=>b.score-a.score).map((item,i) => (
              <tr key={item.id} className={`border-b border-clay/10 ${i%2===1?"bg-sand/20":""}`}>
                <td className="px-4 py-2.5 text-[12px] font-[400] text-ink max-w-[160px] truncate">{item.name}</td>
                {[item.impact,item.effort,item.strategic,item.risk,item.timeToValue].map((v,j) => (
                  <td key={j} className="px-4 py-2.5 text-[12px] text-stone font-[300] text-center">{v}</td>
                ))}
                <td className="px-4 py-2.5 text-[12px] font-[400] text-ink">{item.score.toFixed(2)}</td>
                <td className="px-4 py-2.5"><QBadge q={item.quadrant}/></td>
                <td className="px-4 py-2.5"><TBadge t={item.tier}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={copy} className="px-5 py-2.5 border border-moss text-moss text-[10px] tracking-[0.12em] uppercase hover:bg-moss hover:text-parchment transition-colors font-[300]">
          {copied ? "✓ Kopieret" : "Kopier rapport"}
        </button>
        <button onClick={() => window.print()} className="px-5 py-2.5 border border-clay/50 text-stone text-[10px] tracking-[0.12em] uppercase hover:border-ink hover:text-ink transition-colors font-[300]">
          Print / PDF
        </button>
      </div>
    </div>
  );
}

// ─── AI TAB ────────────────────────────────────────────────────────────────────

function AITab({ items }: { items: Computed[] }) {
  const insights = useMemo(() => generateInsights(items), [items]);
  const iconMap: Record<InsightType, string> = { opportunity:"↑", warning:"!", info:"·" };
  const styleMap: Record<InsightType, string> = {
    opportunity: "border-moss/30 bg-moss/5 text-moss",
    warning:     "border-amber-200 bg-amber-50/40 text-amber-700",
    info:        "border-clay/30 bg-sand/40 text-slate",
  };

  return (
    <div className="max-w-[800px]">
      <div className="mb-8 pb-6 border-b border-clay/25">
        <div className="text-[9px] tracking-[0.3em] uppercase text-moss font-[400] mb-3">AI-rådgiver</div>
        <h2 className="font-fraunces font-light italic text-[22px] text-ink mb-2">Porteføljeanalyse</h2>
        <p className="text-[13px] text-stone font-[300] leading-relaxed max-w-[540px]">
          Indsigterne nedenfor er baseret på din porteføljes scoringer og placering i prioriteringsmodellen. De opdateres automatisk ved ændringer.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="py-12 text-center text-stone text-[14px] font-[300] border border-clay/20">
          Tilføj initiativer for at aktivere AI-rådgiveren.
        </div>
      ) : (
        <div className="space-y-3 mb-10">
          {insights.map((ins, i) => (
            <div key={i} className={`border px-6 py-5 ${styleMap[ins.type]}`}>
              <div className="flex items-start gap-4">
                <div className="text-[15px] font-[400] mt-0.5 w-5 flex-shrink-0 text-center">{iconMap[ins.type]}</div>
                <div>
                  <div className="font-[400] text-[13px] text-ink mb-1.5">{ins.headline}</div>
                  <div className="text-[12px] text-stone font-[300] leading-relaxed">{ins.body}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Portfolio distribution */}
      {items.length > 0 && (
        <div className="border-t border-clay/20 pt-6">
          <div className="text-[9px] tracking-[0.25em] uppercase text-clay font-[300] mb-4">Porteføljeoversigt</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {(Object.entries(Q_META) as [Quadrant, typeof Q_META[Quadrant]][]).map(([q,m]) => {
              const count = items.filter(i => i.quadrant === q).length;
              const pct = items.length ? Math.round(count/items.length*100) : 0;
              return (
                <div key={q} className="border border-clay/20 px-4 py-3">
                  <div className="text-[10px] font-[300] text-stone mb-1.5">{m.label}</div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-fraunces font-light text-[24px] text-ink leading-none">{count}</span>
                    <span className="text-[10px] text-clay font-[300]">{pct}%</span>
                  </div>
                  <div className="mt-2 h-1 bg-fog">
                    <div className="h-full transition-all" style={{ width:`${pct}%`, backgroundColor:m.dotColor }}/>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tier distribution */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {([1,2,3,4] as Tier[]).map(t => {
              const count = items.filter(i => i.tier === t).length;
              return (
                <div key={t} className="border border-clay/20 px-4 py-3">
                  <div className="text-[10px] font-[300] text-stone mb-1.5">P{t} · {T_META[t].sub}</div>
                  <div className="font-fraunces font-light text-[24px] text-ink leading-none">{count}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MATURITY TAB ──────────────────────────────────────────────────────────────

function MaturityTab({ items }: { items: Computed[] }) {
  const stats = useMemo(() => {
    return MATURITY_CATS.map(cat => {
      const ci = items.filter(i => i.category === cat);
      return {
        cat, count: ci.length,
        totalEffort: ci.reduce((s,i) => s+i.effort, 0),
        avgScore: ci.length ? ci.reduce((s,i)=>s+i.score,0)/ci.length : 0,
        tier1: ci.filter(i=>i.tier===1).length,
      };
    }).sort((a,b) => b.count - a.count);
  }, [items]);

  const maxCount = Math.max(...stats.map(s => s.count), 1);

  const catIcons: Record<MaturityCat, string> = {
    "Vækst": "↑", "Effektivisering": "◇", "Digitalisering": "○",
    "Kundeoplevelse": "♡", "AI & Automatisering": "△", "Organisation & Ledelse": "□",
  };

  return (
    <div className="max-w-[820px]">
      <div className="mb-8 pb-6 border-b border-clay/25">
        <div className="text-[9px] tracking-[0.3em] uppercase text-moss font-[400] mb-3">Modenhedsmodel</div>
        <h2 className="font-fraunces font-light italic text-[22px] text-ink mb-2">Strategisk fokusfordeling</h2>
        <p className="text-[13px] text-stone font-[300] leading-relaxed max-w-[540px]">
          Oversigt over hvor virksomhedens initiativer og investeringer koncentrerer sig på tværs af de seks strategiske fokusområder.
        </p>
      </div>

      <div className="space-y-3">
        {stats.map(s => (
          <div key={s.cat} className="border border-clay/25 px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-[14px] text-clay/60 w-5 text-center">{catIcons[s.cat as MaturityCat]}</span>
                <span className="text-[13px] font-[400] text-ink">{s.cat}</span>
                {s.count === 0 && (
                  <span className="text-[8px] tracking-[0.15em] uppercase text-clay border border-clay/30 px-2 py-0.5 font-[300]">Ikke dækket</span>
                )}
                {s.tier1 > 0 && (
                  <span className="text-[8px] tracking-[0.12em] uppercase text-moss border border-moss/30 px-2 py-0.5 font-[300]">{s.tier1} gør nu</span>
                )}
              </div>
              <div className="flex items-center gap-6">
                {[
                  { l:"initiativer", v:s.count.toString() },
                  { l:"samlet effort", v:s.totalEffort.toString() },
                  { l:"gns. score", v:s.avgScore > 0 ? s.avgScore.toFixed(1) : "—" },
                ].map(stat => (
                  <div key={stat.l} className="text-right">
                    <div className="text-[8px] uppercase tracking-wide text-clay font-[300]">{stat.l}</div>
                    <div className="text-[15px] font-[400] text-ink">{stat.v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-full h-[3px] bg-fog">
              <div className="h-full bg-moss transition-all duration-700" style={{ width:`${(s.count/maxCount)*100}%` }}/>
            </div>
          </div>
        ))}
      </div>

      {/* Gap analysis */}
      {(() => {
        const uncovered = stats.filter(s => s.count === 0);
        if (!uncovered.length || !items.length) return null;
        return (
          <div className="mt-6 border border-clay/25 bg-sand/30 px-6 py-5">
            <div className="text-[9px] tracking-[0.2em] uppercase text-stone font-[300] mb-2">Anbefaling</div>
            <p className="text-[13px] text-stone font-[300] leading-relaxed">
              <strong className="text-ink font-[400]">{uncovered.map(u=>u.cat).join(", ")}</strong> er ikke repræsenteret i den nuværende portefølje.
              Overvej om dette er en bevidst strategisk fravalg eller en blind vinkel der kræver initiativer.
            </p>
          </div>
        );
      })()}
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────────

export function PrioritizerApp() {
  const [initiatives, setInitiatives] = useState<Initiative[]>(SAMPLE);
  const [tab, setTab] = useState<TabId>("initiatives");
  const [modal, setModal] = useState<{ open: boolean; editing: Initiative | null }>({ open:false, editing:null });

  useEffect(() => {
    const stored = localStorage.getItem("alius-prioritizer-v1");
    if (stored) { try { setInitiatives(JSON.parse(stored)); } catch {} }
  }, []);

  useEffect(() => {
    localStorage.setItem("alius-prioritizer-v1", JSON.stringify(initiatives));
  }, [initiatives]);

  const computed = useMemo(() => initiatives.map(compute), [initiatives]);

  const save = useCallback((i: Initiative) => {
    setInitiatives(prev => prev.find(p => p.id === i.id) ? prev.map(p => p.id===i.id?i:p) : [...prev, i]);
    setModal({ open:false, editing:null });
  }, []);

  const del = useCallback((id: string) => {
    if (!confirm("Slet dette initiativ?")) return;
    setInitiatives(prev => prev.filter(i => i.id !== id));
  }, []);

  const exportCSV = () => {
    const headers = ["Navn","Beskrivelse","Ansvarlig","Afdeling","Kategori","Impact","Effort","Strategisk","Risiko","Tid til gevinst","Score","Prioritet","Kvadrant"];
    const rows = [...computed].sort((a,b) => b.score-a.score).map(i => [
      i.name, i.description, i.owner, i.department, i.category,
      i.impact, i.effort, i.strategic, i.risk, i.timeToValue,
      i.score.toFixed(2), `P${i.tier} - ${T_META[i.tier].sub}`, Q_META[i.quadrant].label,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,"'")}"`).join(",")).join("\n");
    const blob = new Blob(["﻿"+csv], { type:"text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `alius-prioritizer-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-parchment font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-ink">
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/værktøjer" className="text-parchment/35 hover:text-parchment/70 text-[10px] tracking-[0.25em] uppercase transition-colors font-[300]">
              ← Alius
            </Link>
            <span className="text-parchment/15 text-lg font-[100]">|</span>
            <span className="text-parchment text-[11px] tracking-[0.22em] uppercase font-[300]">Prioriteringsværktøj</span>
            <span className="text-[8px] tracking-[0.15em] uppercase bg-moss/25 text-moss-light px-2 py-0.5 font-[400]">Beta</span>
          </div>
          <div className="flex items-center gap-3">
            {computed.length > 0 && (
              <button onClick={exportCSV}
                className="text-parchment/45 hover:text-parchment/80 text-[10px] tracking-[0.12em] uppercase border border-parchment/15 hover:border-parchment/35 px-4 py-1.5 transition-colors font-[300]">
                Eksport CSV
              </button>
            )}
            {computed.length > 0 && (
              <button onClick={() => setModal({ open:true, editing:null })}
                className="bg-moss text-parchment text-[10px] tracking-[0.18em] uppercase px-5 py-1.5 hover:bg-moss-light transition-colors font-[300]">
                + Nyt initiativ
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="sticky top-14 z-40 bg-parchment border-b border-clay/40">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-5 py-3.5 text-[10px] tracking-[0.14em] uppercase border-b-2 transition-colors font-[300] ${
                  tab === t.id ? "border-moss text-moss" : "border-transparent text-slate hover:text-ink"
                }`}>
                {t.label}
              </button>
            ))}
            <div className="ml-auto flex items-center pr-2">
              <span className="text-[9px] tracking-[0.1em] uppercase text-clay font-[300]">{computed.length} initiativ{computed.length !== 1 ? "er" : ""}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-[1400px] mx-auto px-6 py-10">
        {tab === "initiatives" && <InitiativesTab items={computed} onEdit={i => setModal({ open:true, editing:i })} onDelete={del} onAdd={() => setModal({ open:true, editing:null })}/>}
        {tab === "matrix"      && <MatrixTab items={computed}/>}
        {tab === "roadmap"     && <RoadmapTab items={computed}/>}
        {tab === "report"      && <ReportTab items={computed}/>}
        {tab === "ai"          && <AITab items={computed}/>}
        {tab === "maturity"    && <MaturityTab items={computed}/>}
      </main>

      {/* Modal */}
      {modal.open && (
        <Modal initial={modal.editing} onSave={save} onClose={() => setModal({ open:false, editing:null })}/>
      )}
    </div>
  );
}
