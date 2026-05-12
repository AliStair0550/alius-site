"use client";

import Link from "next/link";
import { getKommuneByCode } from "@/lib/areas";

type Kommune = {
  areaCode: string;
  areaName: string;
  value: number;
};

type Props = {
  highest: Kommune[];
  lowest: Kommune[];
  nationalValue: number | null;
};

export function KommuneRankings({ highest, lowest, nationalValue }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
      <RankingTable
        title="Højeste ledighed"
        rows={highest}
        nationalValue={nationalValue}
        direction="above"
      />
      <RankingTable
        title="Laveste ledighed"
        rows={lowest}
        nationalValue={nationalValue}
        direction="below"
      />
    </div>
  );
}

function RankingTable({
  title,
  rows,
  nationalValue,
  direction,
}: {
  title: string;
  rows: Kommune[];
  nationalValue: number | null;
  direction: "above" | "below";
}) {
  if (rows.length === 0) return null;

  return (
    <div>
      <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-4 font-normal">
        {title}
      </div>
      <ul className="border-t border-ink/10">
        {rows.map((k, i) => {
          const slug = getKommuneByCode(k.areaCode)?.slug ?? null;
          const diff = nationalValue !== null ? k.value - nationalValue : null;

          const rowContent = (
            <>
              <span className="font-fraunces italic text-[14px] text-stone opacity-50">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <span className="text-[15px] text-ink font-normal">
                  {k.areaName}
                </span>
                {diff !== null && (
                  <span className="text-[12px] text-stone opacity-60 ml-2">
                    {diff > 0 ? "+" : ""}
                    {diff.toLocaleString("da-DK", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}{" "}
                    pp {direction === "above" ? "over" : "under"} landsplan
                  </span>
                )}
              </div>
              <span className="font-fraunces text-[18px] font-light text-ink tabular-nums">
                {k.value.toLocaleString("da-DK", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
                %
              </span>
              <span
                className="text-stone opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
                aria-hidden
              >
                &rarr;
              </span>
            </>
          );

          if (slug) {
            return (
              <li key={k.areaCode}>
                <Link
                  href={`/pulse/ledighed/${slug}`}
                  className="group grid grid-cols-[28px_1fr_auto_20px] gap-4 items-baseline py-3 border-b border-ink/10 no-underline hover:bg-fog/30 -mx-2 px-2 transition-colors"
                >
                  {rowContent}
                </Link>
              </li>
            );
          }

          return (
            <li
              key={k.areaCode}
              className="grid grid-cols-[28px_1fr_auto_20px] gap-4 items-baseline py-3 border-b border-ink/10"
            >
              {rowContent}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
