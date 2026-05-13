"use client";

import { useState } from "react";

type BrancheRow = {
  code: string;
  label: string;
  currentTotal: number;
  previousTotal: number;
  change: number;
  pctChange: number;
};

type Props = {
  rows: BrancheRow[];
  currentPeriodLabel: string;
  previousPeriodLabel: string;
};

export function BrancheRankings({
  rows,
  currentPeriodLabel,
  previousPeriodLabel,
}: Props) {
  const [sortBy, setSortBy] = useState<"change" | "current">("change");

  const sorted = [...rows].sort((a, b) => {
    if (sortBy === "current") return b.currentTotal - a.currentTotal;
    return b.pctChange - a.pctChange;
  });

  // Find max absolute pct change for bar scaling
  const maxAbsPct = Math.max(...rows.map((r) => Math.abs(r.pctChange)), 1);

  return (
    <div>
      {/* Sort toggle */}
      <div className="flex items-center gap-2 mb-6 text-[11px] tracking-[0.2em] uppercase">
        <span className="text-stone opacity-60 mr-1">Sortér:</span>
        <button
          onClick={() => setSortBy("change")}
          className={`px-3 py-2.5 min-h-[44px] transition-colors border ${
            sortBy === "change"
              ? "text-ink border-ink"
              : "text-stone border-ink/20 hover:border-ink/50 hover:text-ink"
          }`}
        >
          Ændring
        </button>
        <button
          onClick={() => setSortBy("current")}
          className={`px-3 py-2.5 min-h-[44px] transition-colors border ${
            sortBy === "current"
              ? "text-ink border-ink"
              : "text-stone border-ink/20 hover:border-ink/50 hover:text-ink"
          }`}
        >
          Antal
        </button>
      </div>

      {/* Header row */}
      <div className="hidden md:grid grid-cols-[1fr_120px_140px_180px] gap-4 pb-3 border-b border-ink/10 text-[10px] tracking-[0.2em] uppercase text-stone opacity-60">
        <div>Branche</div>
        <div className="text-right">{currentPeriodLabel}</div>
        <div className="text-right">{previousPeriodLabel}</div>
        <div className="text-right">Ændring</div>
      </div>

      {/* Rows */}
      <ul className="border-t border-ink/10 md:border-t-0">
        {sorted.map((row) => (
          <li
            key={row.code}
            className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_120px_140px_180px] gap-2 md:gap-4 items-baseline py-4 border-b border-ink/10"
          >
            {/* Branche name */}
            <div className="text-[14px] md:text-[15px] text-ink">
              {row.label}
            </div>

            {/* Current period total */}
            <div className="hidden md:block text-right font-fraunces text-[18px] font-light tabular-nums text-ink">
              {row.currentTotal.toLocaleString("da-DK")}
            </div>

            {/* Previous period total */}
            <div className="hidden md:block text-right text-[13px] tabular-nums text-stone opacity-60">
              {row.previousTotal.toLocaleString("da-DK")}
            </div>

            {/* Change with bar */}
            <div className="text-right">
              <div className="flex items-center justify-end gap-3">
                {/* Bar */}
                <div className="hidden md:block relative w-24 h-1.5 bg-fog/60 overflow-hidden">
                  <div
                    className="absolute top-0 bottom-0 transition-all"
                    style={{
                      backgroundColor:
                        row.pctChange > 0
                          ? "rgba(180, 83, 9, 0.5)"
                          : "rgba(45, 95, 74, 0.5)",
                      width: `${(Math.abs(row.pctChange) / maxAbsPct) * 100}%`,
                      ...(row.pctChange > 0 ? { left: 0 } : { right: 0 }),
                    }}
                  />
                </div>
                {/* Text */}
                <span
                  className={`font-fraunces font-light italic text-[16px] md:text-[18px] tabular-nums ${
                    row.pctChange > 0
                      ? "text-[#B45309]"
                      : row.pctChange < 0
                      ? "text-moss"
                      : "text-stone"
                  }`}
                >
                  {row.pctChange > 0 ? "+" : ""}
                  {row.pctChange.toFixed(0)}%
                </span>
              </div>
              {/* Mobile: show current total below */}
              <div className="md:hidden text-[12px] text-stone opacity-60 mt-1">
                {row.currentTotal.toLocaleString("da-DK")} konkurser
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center gap-6 text-[11px] text-stone opacity-70">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-3 h-1.5"
            style={{ backgroundColor: "rgba(180, 83, 9, 0.5)" }}
          />
          <span>Flere konkurser</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-3 h-1.5"
            style={{ backgroundColor: "rgba(45, 95, 74, 0.5)" }}
          />
          <span>Færre konkurser</span>
        </div>
      </div>
    </div>
  );
}
