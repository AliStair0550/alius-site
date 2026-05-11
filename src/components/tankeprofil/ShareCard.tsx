"use client";

import { useRef } from "react";
import { ARCHETYPES, type QuadrantKey, type Totals } from "./data";

type ShareCardProps = {
  totals: Totals;
  pct: Totals;
  primary: QuadrantKey;
  secondary: QuadrantKey;
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function splitQuoteToLines(quote: string): [string, string] {
  const words = quote.split(" ");
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

export function ShareCardSVG({ totals, pct, primary, secondary }: ShareCardProps) {
  const primaryArch = ARCHETYPES[primary];
  const secondaryArch = ARCHETYPES[secondary];
  const W = 1080;
  const H = 1350;

  const glyphSize = 480;
  const glyphY = 420;
  const max = Math.max(totals.A, totals.B, totals.C, totals.D, 1);
  const gcx = W / 2;
  const gcy = glyphY + glyphSize / 2;
  const maxR = glyphSize * 0.32;
  const offset = glyphSize * 0.08;
  const rA = Math.max((totals.A / max) * maxR, 24);
  const rB = Math.max((totals.B / max) * maxR, 24);
  const rC = Math.max((totals.C / max) * maxR, 24);
  const rD = Math.max((totals.D / max) * maxR, 24);

  const [quoteLine1, quoteLine2] = splitQuoteToLines(primaryArch.quote);

  const pctRow = (label: QuadrantKey, value: number, yOffset: number) => {
    const name = ARCHETYPES[label].name;
    const pctStr = `${Math.round(value * 100)}%`;
    return (
      <g key={label}>
        <text
          x={-90}
          y={yOffset}
          fontFamily="Fraunces, serif"
          fontStyle="italic"
          fontSize={20}
          fill="#1A1A1A"
          textAnchor="end"
          opacity={0.6}
        >
          {name}
        </text>
        <text
          x={0}
          y={yOffset}
          fontFamily="Fraunces, serif"
          fontSize={22}
          fill="#1A1A1A"
          textAnchor="end"
        >
          {pctStr}
        </text>
      </g>
    );
  };

  return (
    <svg
      id="share-svg"
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", height: "auto" }}
    >
      <defs>
        <pattern id="dots" x={0} y={0} width={36} height={36} patternUnits="userSpaceOnUse">
          <circle cx={1} cy={1} r={1} fill="rgba(26,26,26,0.05)" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="#F9F7F2" />
      <rect width={W} height={H} fill="url(#dots)" />

      <text
        x={80}
        y={100}
        fontFamily="Jost, sans-serif"
        fontWeight={200}
        fontSize={22}
        fill="#1A1A1A"
        letterSpacing={6}
      >
        ALIUS &#183; TANKEPROFIL
      </text>
      <line x1={80} y1={130} x2={W - 80} y2={130} stroke="rgba(26,26,26,0.15)" strokeWidth={1} />

      <text
        x={80}
        y={220}
        fontFamily="Jost, sans-serif"
        fontSize={18}
        fill="#2D5F4A"
        letterSpacing={8}
        fontWeight={400}
      >
        DIN PROFIL
      </text>

      <text
        x={80}
        y={360}
        fontFamily="Fraunces, serif"
        fontStyle="italic"
        fontWeight={300}
        fontSize={156}
        fill="#1A1A1A"
        letterSpacing={-4}
      >
        {primaryArch.name}
      </text>

      <g style={{ mixBlendMode: "multiply" }}>
        <circle cx={gcx - offset} cy={gcy - offset} r={rA} fill={ARCHETYPES.A.color} opacity={0.85} />
        <circle cx={gcx + offset} cy={gcy - offset} r={rD} fill={ARCHETYPES.D.color} opacity={0.85} />
        <circle cx={gcx + offset} cy={gcy + offset} r={rC} fill={ARCHETYPES.C.color} opacity={0.85} />
        <circle cx={gcx - offset} cy={gcy + offset} r={rB} fill={ARCHETYPES.B.color} opacity={0.85} />
      </g>

      <text
        x={W / 2}
        y={glyphY + glyphSize + 80}
        fontFamily="Fraunces, serif"
        fontStyle="italic"
        fontWeight={300}
        fontSize={34}
        fill="#1A1A1A"
        textAnchor="middle"
      >
        {quoteLine1}
      </text>
      <text
        x={W / 2}
        y={glyphY + glyphSize + 130}
        fontFamily="Fraunces, serif"
        fontStyle="italic"
        fontWeight={300}
        fontSize={34}
        fill="#1A1A1A"
        textAnchor="middle"
      >
        {quoteLine2}
      </text>

      <line x1={80} y1={H - 220} x2={W - 80} y2={H - 220} stroke="rgba(26,26,26,0.15)" strokeWidth={1} />

      <text
        x={80}
        y={H - 160}
        fontFamily="Jost, sans-serif"
        fontSize={16}
        fill="#2D5F4A"
        letterSpacing={6}
        fontWeight={400}
      >
        MEDLØBER
      </text>
      <text
        x={80}
        y={H - 110}
        fontFamily="Fraunces, serif"
        fontStyle="italic"
        fontWeight={300}
        fontSize={48}
        fill="#1A1A1A"
        letterSpacing={-1}
      >
        {secondaryArch.name}
      </text>

      <g transform={`translate(${W - 80}, ${H - 170})`}>
        {pctRow("A", pct.A, 0)}
        {pctRow("B", pct.B, 22)}
        {pctRow("C", pct.C, 44)}
        {pctRow("D", pct.D, 66)}
      </g>

      <text
        x={W / 2}
        y={H - 50}
        fontFamily="Jost, sans-serif"
        fontSize={18}
        fill="rgba(26,26,26,0.5)"
        textAnchor="middle"
        letterSpacing={6}
      >
        ALIUS.DK/TANKEPROFIL
      </text>
    </svg>
  );
}

export function ShareSection({ totals, pct, primary, secondary }: ShareCardProps) {
  const frameRef = useRef<HTMLDivElement>(null);

  const downloadAsPng = () => {
    const svgEl = frameRef.current?.querySelector("svg");
    if (!svgEl) return;

    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

    const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
    styleEl.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Jost:wght@200;300;400&family=Fraunces:ital,wght@0,300;1,300&display=swap');
      text { font-family: 'Jost', sans-serif; }
    `;
    clone.insertBefore(styleEl, clone.firstChild);

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(clone);
    const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#F9F7F2";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, 1080, 1350);
      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const dlUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = dlUrl;
        a.download = "tankeprofil-alius.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(dlUrl), 1000);
      }, "image/png");
    };
    img.onerror = () => {
      alert("Kunne ikke generere billede. Prøv at højreklik på kortet i stedet.");
    };
    img.src = url;
  };

  const copyShareText = () => {
    const primaryArch = ARCHETYPES[primary];
    const secondaryArch = ARCHETYPES[secondary];
    const text = `Jeg er en ${primaryArch.name} med ${secondaryArch.name} som medløber.\n\n"${primaryArch.quote}"\n\nFind din egen personlighedsprofil på alius.dk/tankeprofil`;
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById("copy-btn-text");
      if (btn) {
        btn.textContent = "Kopieret";
        setTimeout(() => {
          btn.textContent = "Kopier tekst";
        }, 2000);
      }
    });
  };

  return (
    <div className="text-center py-16 border-t border-ink/10">
      <div className="text-[11px] tracking-[0.3em] uppercase text-moss mb-4">
        Del din profil
      </div>
      <h3 className="font-fraunces font-light text-4xl mb-2 tracking-[-0.01em]">
        Et signaturkort til LinkedIn.
      </h3>
      <p className="text-stone mb-8 text-[15px]">
        Hver personlighedsprofil har sit eget visuelle aftryk. Dit er nedenfor.
      </p>

      <div className="max-w-[520px] mx-auto mb-8 relative">
        <div
          ref={frameRef}
          className="bg-parchment shadow-[0_30px_60px_-20px_rgba(26,26,26,0.25),0_18px_30px_-12px_rgba(26,26,26,0.15)] rounded overflow-hidden"
        >
          <ShareCardSVG totals={totals} pct={pct} primary={primary} secondary={secondary} />
        </div>
      </div>

      <div className="flex gap-3 justify-center flex-wrap">
        <button
          onClick={downloadAsPng}
          className="inline-flex items-center gap-3 px-7 py-4 bg-transparent text-ink border border-ink/25 text-xs font-normal tracking-[0.2em] uppercase cursor-pointer transition-all duration-300 hover:bg-ink hover:text-parchment hover:border-ink"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="w-3.5 h-3.5"
          >
            <path d="M12 3v13m0 0l-5-5m5 5l5-5M5 21h14" />
          </svg>
          Download som billede
        </button>
        <button
          onClick={copyShareText}
          className="inline-flex items-center gap-3 px-7 py-4 bg-transparent text-ink border border-ink/25 text-xs font-normal tracking-[0.2em] uppercase cursor-pointer transition-all duration-300 hover:bg-ink hover:text-parchment hover:border-ink"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="w-3.5 h-3.5"
          >
            <rect x={9} y={9} width={13} height={13} rx={2} />
            <path d="M5 15V5a2 2 0 012-2h10" />
          </svg>
          <span id="copy-btn-text">Kopier tekst</span>
        </button>
      </div>
    </div>
  );
}
