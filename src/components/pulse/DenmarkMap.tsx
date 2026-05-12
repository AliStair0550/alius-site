"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getKommuneByCode } from "@/lib/areas";
import { geometryToSvgPath, getColorForValue, MAP_VIEWBOX } from "@/lib/map-projection";

type KommuneFeature = {
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
};

type GeoData = {
  type: "FeatureCollection";
  features: KommuneFeature[];
};

type KommuneDataPoint = {
  areaCode: string;
  areaName: string;
  value: number;
};

type Props = {
  geoData: GeoData;
  kommuneData: KommuneDataPoint[];
  nationalValue: number | null;
};

export function DenmarkMap({ geoData, kommuneData, nationalValue }: Props) {
  const router = useRouter();
  const [hovered, setHovered] = useState<{
    code: string;
    name: string;
    value: number | null;
    x: number;
    y: number;
  } | null>(null);

  const dataMap = new Map<string, KommuneDataPoint>();
  for (const k of kommuneData) {
    dataMap.set(k.areaCode, k);
  }

  const allValues = kommuneData.map((k) => k.value).filter((v) => v !== null);
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);

  const handleClick = (code: string) => {
    const kommune = getKommuneByCode(code);
    if (kommune) {
      router.push(`/pulse/ledighed/${kommune.slug}`);
    }
  };

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`}
        width="100%"
        style={{ maxWidth: "100%", height: "auto" }}
        className="cursor-pointer"
        onMouseLeave={() => setHovered(null)}
      >
        {geoData.features.map((feature, i) => {
          const code = feature.properties.lau_1;
          const data = dataMap.get(code);
          const value = data?.value ?? null;
          const fill = getColorForValue(value, minVal, maxVal);
          const isHovered = hovered?.code === code;

          return (
            <path
              key={`${code}-${i}`}
              d={geometryToSvgPath(feature.geometry)}
              fill={fill}
              stroke="#F9F7F2"
              strokeWidth={isHovered ? 1.5 : 0.5}
              opacity={hovered && !isHovered ? 0.6 : 1}
              onMouseEnter={(e) => {
                const bbox = (e.target as SVGGraphicsElement).getBBox();
                setHovered({
                  code,
                  name: feature.properties.label_dk,
                  value,
                  x: bbox.x + bbox.width / 2,
                  y: bbox.y,
                });
              }}
              onClick={() => handleClick(code)}
              style={{ transition: "opacity 150ms" }}
            />
          );
        })}

        {/* Tooltip */}
        {hovered && (
          <g
            transform={`translate(${hovered.x}, ${hovered.y - 10})`}
            style={{ pointerEvents: "none" }}
          >
            <rect x={-70} y={-44} width={140} height={38} fill="#1A1A1A" rx={2} />
            <text
              x={0}
              y={-26}
              fontSize={11}
              fill="#F9F7F2"
              textAnchor="middle"
              fontFamily="inherit"
              fontWeight={500}
            >
              {hovered.name}
            </text>
            <text
              x={0}
              y={-12}
              fontSize={14}
              fill="#F9F7F2"
              textAnchor="middle"
              fontFamily="Fraunces, Georgia, serif"
              fontStyle="italic"
              fontWeight={300}
            >
              {hovered.value !== null
                ? `${hovered.value.toLocaleString("da-DK", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}%`
                : "Ingen data"}
            </text>
          </g>
        )}
      </svg>

      {/* Legend */}
      <div className="mt-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-8 text-[12px] text-stone">
        <div className="flex items-center gap-3">
          <span className="text-[11px] tracking-[0.25em] uppercase">Ledighed</span>
          <div className="flex items-center gap-2">
            <span>{minVal.toFixed(1)}%</span>
            <div
              className="h-2 w-32 rounded-sm"
              style={{
                background: `linear-gradient(to right, ${getColorForValue(minVal, minVal, maxVal)}, ${getColorForValue((minVal + maxVal) / 2, minVal, maxVal)}, ${getColorForValue(maxVal, minVal, maxVal)})`,
              }}
            />
            <span>{maxVal.toFixed(1)}%</span>
          </div>
        </div>
        {nationalValue !== null && (
          <div className="text-stone opacity-60 text-[11px] tracking-[0.05em]">
            Landsplan: {nationalValue.toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );
}
