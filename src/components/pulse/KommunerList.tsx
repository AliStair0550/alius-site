"use client";

import { useState } from "react";
import Link from "next/link";

export type KommuneRow = {
  code: string;
  name: string;
  slug: string;
  ledighed: number | null;
  befolkning: number | null;
  indkomst: number | null;
  boligvaerdi: number | null;
};

type SortKey = "navn" | "ledighed" | "befolkning" | "indkomst" | "boligvaerdi";
type SortDir = "asc" | "desc";

const SORT_OPTIONS: { key: SortKey; label: string; defaultDir: SortDir }[] = [
  { key: "navn", label: "Navn", defaultDir: "asc" },
  { key: "ledighed", label: "Ledighed", defaultDir: "asc" },
  { key: "befolkning", label: "Befolkning", defaultDir: "desc" },
  { key: "indkomst", label: "Indkomst", defaultDir: "desc" },
  { key: "boligvaerdi", label: "Boligværdi", defaultDir: "desc" },
];

function getValue(row: KommuneRow, key: SortKey): number | string | null {
  if (key === "navn") return row.name;
  if (key === "ledighed") return row.ledighed;
  if (key === "befolkning") return row.befolkning;
  if (key === "indkomst") return row.indkomst;
  if (key === "boligvaerdi") return row.boligvaerdi;
  return null;
}

function sortRows(rows: KommuneRow[], key: SortKey, dir: SortDir): KommuneRow[] {
  return [...rows].sort((a, b) => {
    const va = getValue(a, key);
    const vb = getValue(b, key);
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    if (typeof va === "string" && typeof vb === "string") {
      return dir === "asc" ? va.localeCompare(vb, "da") : vb.localeCompare(va, "da");
    }
    const na = va as number, nb = vb as number;
    return dir === "asc" ? na - nb : nb - na;
  });
}

export function KommunerList({ rows }: { rows: KommuneRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("navn");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(key: SortKey) {
    const opt = SORT_OPTIONS.find(o => o.key === key)!;
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(opt.defaultDir);
    }
  }

  const sorted = sortRows(rows, sortKey, sortDir);
  const dirArrow = sortDir === "asc" ? "↑" : "↓";

  return (
    <div>
      {/* Sort controls */}
      <div className="flex flex-wrap items-center gap-1 mb-6">
        <span className="text-[11px] tracking-[0.2em] uppercase text-stone opacity-50 mr-2">
          Sorter:
        </span>
        {SORT_OPTIONS.map(opt => {
          const active = sortKey === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => handleSort(opt.key)}
              className={`px-3 py-2.5 min-h-[44px] text-[11px] tracking-[0.15em] uppercase transition-colors border ${
                active
                  ? "bg-ink text-parchment border-ink"
                  : "bg-transparent text-stone border-ink/20 hover:border-ink/50 hover:text-ink"
              }`}
            >
              {opt.label}{active ? ` ${dirArrow}` : ""}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {sorted.map(k => (
          <Link
            key={k.code}
            href={`/pulse/kommuner/${k.slug}`}
            className="block p-5 bg-fog/30 hover:bg-fog/60 transition-colors no-underline group border border-transparent hover:border-ink/10"
          >
            <div className="flex items-baseline justify-between mb-3">
              <span className="font-fraunces font-light text-[20px] leading-[1.1] text-ink">
                {k.name}
              </span>
              <span className="text-[11px] tracking-[0.15em] uppercase text-stone opacity-40 group-hover:opacity-70 transition-opacity">
                &rarr;
              </span>
            </div>
            <div className="flex items-end gap-5">
              {k.ledighed != null && (
                <Metric
                  label="Ledighed"
                  value={`${k.ledighed.toFixed(1)}%`}
                  highlight={sortKey === "ledighed"}
                />
              )}
              {k.befolkning != null && (sortKey === "befolkning" || sortKey === "navn") && (
                <Metric
                  label="Befolkning"
                  value={Math.round(k.befolkning).toLocaleString("da-DK")}
                  highlight={sortKey === "befolkning"}
                />
              )}
              {k.indkomst != null && sortKey === "indkomst" && (
                <Metric
                  label="Indkomst"
                  value={`${Math.round(k.indkomst / 1000).toLocaleString("da-DK")} t.kr.`}
                  highlight
                />
              )}
              {k.boligvaerdi != null && sortKey === "boligvaerdi" && (
                <Metric
                  label="Boligværdi"
                  value={`${(k.boligvaerdi / 1_000_000).toLocaleString("da-DK", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mio.`}
                  highlight
                />
              )}
              {k.ledighed == null && k.befolkning == null && (
                <div className="text-[12px] text-stone opacity-40">Data hentes...</div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="text-[11px] tracking-[0.15em] uppercase text-stone opacity-50 mb-0.5">
        {label}
      </div>
      <div
        className={`font-fraunces font-light tabular-nums ${
          highlight ? "text-[20px] text-ink" : "text-[18px] text-ink"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
