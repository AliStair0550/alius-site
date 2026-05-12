"use client";

import { DenmarkMap } from "./DenmarkMap";
import Link from "next/link";
import { getKommuneByCode } from "@/lib/areas";

type KommuneDataPoint = {
  areaCode: string;
  areaName: string;
  value: number;
};

type GeoData = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: {
      lau_1: string;
      label_dk: string;
      label_en: string;
      iso_3166_2: string;
    };
    geometry: {
      type: "Polygon" | "MultiPolygon";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      coordinates: any;
    };
  }>;
};

type Props = {
  geoData: GeoData;
  kommuneData: KommuneDataPoint[];
  nationalValue: number | null;
};

export function MapWithMobileFallback({
  geoData,
  kommuneData,
  nationalValue,
}: Props) {
  const sorted = [...kommuneData].sort((a, b) => b.value - a.value);
  const topTenHighest = sorted.slice(0, 10);
  const topTenLowest = sorted.slice(-10).reverse();

  return (
    <>
      {/* Desktop map: hidden below 600px */}
      <div className="hidden sm:block">
        <DenmarkMap
          geoData={geoData}
          kommuneData={kommuneData}
          nationalValue={nationalValue}
        />
      </div>

      {/* Mobile fallback: visible only below 600px */}
      <div className="block sm:hidden">
        <MobileFallback
          highest={topTenHighest}
          lowest={topTenLowest}
          nationalValue={nationalValue}
        />
      </div>
    </>
  );
}

function MobileFallback({
  highest,
  lowest,
  nationalValue,
}: {
  highest: KommuneDataPoint[];
  lowest: KommuneDataPoint[];
  nationalValue: number | null;
}) {
  return (
    <div className="space-y-8">
      <div className="text-[12px] text-stone italic mb-4">
        Brug et større skærm for at se kortet over Danmark.
      </div>
      <MobileList title="10 højeste ledighed" rows={highest} />
      <MobileList title="10 laveste ledighed" rows={lowest} />
      {nationalValue !== null && (
        <div className="text-[11px] tracking-[0.05em] text-stone opacity-60 pt-2 border-t border-ink/10">
          Landsplan: {nationalValue.toFixed(1)}%
        </div>
      )}
    </div>
  );
}

function MobileList({
  title,
  rows,
}: {
  title: string;
  rows: KommuneDataPoint[];
}) {
  return (
    <div>
      <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-3 font-normal">
        {title}
      </div>
      <ul className="border-t border-ink/10">
        {rows.map((k, i) => {
          const slug = getKommuneByCode(k.areaCode)?.slug;
          const content = (
            <>
              <span className="font-fraunces italic text-[13px] text-stone opacity-50">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[14px] text-ink">{k.areaName}</span>
              <span className="font-fraunces text-[16px] font-light text-ink tabular-nums">
                {k.value.toLocaleString("da-DK", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
                %
              </span>
            </>
          );

          if (slug) {
            return (
              <li key={k.areaCode}>
                <Link
                  href={`/pulse/ledighed/${slug}`}
                  className="grid grid-cols-[28px_1fr_auto] gap-3 items-baseline py-3 border-b border-ink/10 no-underline hover:bg-fog/30 -mx-2 px-2 transition-colors"
                >
                  {content}
                </Link>
              </li>
            );
          }
          return (
            <li
              key={k.areaCode}
              className="grid grid-cols-[28px_1fr_auto] gap-3 items-baseline py-3 border-b border-ink/10"
            >
              {content}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
