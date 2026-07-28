// ============================================================
// Nøgletalskort
//
// Samme fire krav som ranglisten, og de gælder stadig:
//
//   1. Intet statistisk fagsprog. "Steget fire måneder i træk" kan en
//      læser efterprøve mod kurven. "Positiv trendkoefficient" kan de
//      ikke.
//   2. Mobil er den primære visning.
//   3. Hentetidspunktet står på hvert kort.
//   4. Farve betyder usædvanlig, aldrig dårlig. En høj rente er skidt
//      for en låntager og god for en opsparer.
//
// Forskellen til ranglistens kort er tiden. Ranglisten viser hvad der
// er usædvanligt nu. Her skal en leder kunne se retningen: hvor har
// tallet været, hvor længe har det bevæget sig samme vej, og hvor står
// det mod sidste år.
// ============================================================

import { kildeUrl } from "@/lib/pulse-rangliste";
import { VINDUE_AAR, type Noegletal, type NoegletalResultat } from "@/lib/pulse-noegletal";

const MAANEDER = [
  "januar", "februar", "marts", "april", "maj", "juni",
  "juli", "august", "september", "oktober", "november", "december",
];

function periodeTekst(d: Date, frekvens: string): string {
  if (frekvens === "YEARLY") return String(d.getUTCFullYear());
  if (frekvens === "QUARTERLY") {
    return `${Math.floor(d.getUTCMonth() / 3) + 1}. kvartal ${d.getUTCFullYear()}`;
  }
  if (frekvens === "DAILY") {
    return `${d.getUTCDate()}. ${MAANEDER[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }
  return `${MAANEDER[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function datoTekst(d: Date): string {
  return `${d.getUTCDate()}. ${MAANEDER[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function tal(v: number, decimaler: number): string {
  return v.toLocaleString("da-DK", {
    minimumFractionDigits: decimaler,
    maximumFractionDigits: decimaler,
  });
}

/** Enheden skrives ud. Aldrig en kode, aldrig en forkortelse vi selv har fundet på. */
function vaerdiTekst(v: number, enhed: string): string {
  switch (enhed) {
    case "pct":
      return `${tal(v, 2)} procent`;
    case "antal":
      return tal(v, 0);
    case "m2":
      return `${tal(v, 0)} m2`;
    case "dkk_mwh":
      return `${tal(v, 0)} kr. per MWh`;
    case "dkk_per_enhed":
      return `${tal(v, 2)} kr.`;
    case "nettotal":
      return tal(v, 1);
    default:
      return tal(v, 1);
  }
}

/**
 * Hvad en ændring hedder i den enhed.
 *
 * Procentpoint og procent er ikke det samme, og at kalde begge dele
 * "procent" er den slags der får en læser til at regne forkert. En
 * rente der går fra 3,0 til 3,4 er steget 0,4 procentpoint, ikke 0,4
 * procent.
 */
function aendringTekst(v: number, enhed: string): string {
  const fortegn = v > 0 ? "+" : "−";
  const a = Math.abs(v);
  switch (enhed) {
    case "pct":
      return `${fortegn}${tal(a, 2)} procentpoint`;
    case "nettotal":
      return `${fortegn}${tal(a, 1)} point`;
    case "antal":
      return `${fortegn}${tal(a, 0)}`;
    case "dkk_mwh":
      return `${fortegn}${tal(a, 0)} kr.`;
    case "dkk_per_enhed":
      return `${fortegn}${tal(a, 2)} kr.`;
    default:
      return `${fortegn}${tal(a, 1)}`;
  }
}

/**
 * Retningen i ord, med striben.
 *
 * Enheden for striben følger seriens frekvens: en kvartalsserie har
 * ikke måneder, og at sige "fire måneder i træk" om fire kvartaler
 * ville være forkert med en faktor tre.
 */
function stribeTekst(n: Noegletal): string {
  const enhed = n.serie.frequency === "QUARTERLY" ? "kvartaler" : "måneder";
  const en = n.serie.frequency === "QUARTERLY" ? "kvartal" : "måned";

  if (n.retning === "flad") {
    if (n.stribe <= 1) return "Uændret siden sidste måling";
    return `Uændret i ${n.stribe} ${enhed}`;
  }
  const ord = n.retning === "op" ? "Steget" : "Faldet";
  if (n.stribe <= 1) return `${ord} siden sidste ${en}`;
  return `${ord} ${n.stribe} ${enhed} i træk`;
}

/** "Højeste i tre år". Tom streng når værdien ikke er en yderlighed. */
function yderlighedTekst(n: Noegletal): string {
  if (!n.yderlighedAar || !n.yderlighedRetning) return "";
  const ord = n.yderlighedRetning === "top" ? "Højeste" : "Laveste";
  return n.yderlighedAar === 1 ? `${ord} i et år` : `${ord} i ${n.yderlighedAar} år`;
}

export function NoegletalSektion({
  titel,
  beskrivelse,
  data,
}: {
  titel: string;
  beskrivelse: string;
  data: NoegletalResultat;
}) {
  if (data.tal.length === 0 && data.udeladte.length === 0) return null;

  return (
    <section className="mb-16 md:mb-24">
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-16 mb-8 md:mb-10">
        <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60">
          {titel}
        </div>
        <div>
          <p className="text-stone text-[15px] leading-[1.6] max-w-[640px]">
            {beskrivelse}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {data.tal.map((n) => (
          <Kort key={n.serie.id} n={n} />
        ))}
      </div>

      {data.udeladte.length > 0 && <Udeladte liste={data.udeladte} />}
    </section>
  );
}

function Kort({ n }: { n: Noegletal }) {
  const url = kildeUrl(n.serie.source, n.serie.sourceRef);
  const yder = yderlighedTekst(n);
  const pil = n.retning === "op" ? "▲" : n.retning === "ned" ? "▼" : "·";

  return (
    <article className="p-6 md:p-8 bg-fog/40">
      <header className="flex items-baseline gap-3 mb-4">
        <span className="text-[11px] text-moss font-medium" aria-hidden>
          {pil}
        </span>
        <span className="sr-only">
          {n.retning === "op" ? "op" : n.retning === "ned" ? "ned" : "uændret"}
        </span>
        <h3 className="font-fraunces font-light italic text-[19px] md:text-[21px] leading-[1.25] text-ink tracking-[-0.005em]">
          {n.serie.nameDa}
        </h3>
      </header>

      <p className="text-[30px] md:text-[34px] font-light leading-[1.05] text-ink mb-1">
        {vaerdiTekst(n.vaerdi, n.serie.unit)}
      </p>
      <p className="text-[13px] text-stone opacity-70 mb-5">
        {periodeTekst(n.periode, n.serie.frequency)}
      </p>

      <Kurve punkter={n.kurve} />

      <ul className="list-none p-0 mt-5 mb-0 space-y-1">
        <li className="text-[14px] leading-[1.6] text-stone">{stribeTekst(n)}</li>
        {n.aaretFoer !== null && (
          <li className="text-[14px] leading-[1.6] text-stone">
            {aendringTekst(n.aaretFoer, n.serie.unit)} mod samme måned sidste år
          </li>
        )}
        {yder && (
          <li className="text-[14px] leading-[1.6] text-moss">{yder}</li>
        )}
      </ul>

      <footer className="mt-5 pt-4 border-t border-ink/10 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="text-[11px] text-stone opacity-50 leading-[1.5]">
          {n.serie.attribution}
        </span>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] tracking-[0.2em] uppercase text-ink hover:text-moss transition-colors no-underline"
          >
            Se kilden &rarr;
          </a>
        )}
        {n.serie.hentet && (
          <span className="text-[11px] text-stone opacity-50 basis-full">
            Hentet {datoTekst(n.serie.hentet)}
          </span>
        )}
      </footer>
    </article>
  );
}

/**
 * Fem års månedsværdier.
 *
 * Nulpunktet markeres når serien kan være negativ, fordi en kurve der
 * krydser nul betyder noget andet end en der ikke gør. Ellers skaleres
 * kurven til sit eget spænd, som er det der viser retningen.
 */
function Kurve({ punkter }: { punkter: Noegletal["kurve"] }) {
  if (punkter.length < 2) {
    return (
      <p className="text-[12px] text-stone opacity-50">
        For få måneder til en kurve.
      </p>
    );
  }

  const v = punkter.map((p) => p.vaerdi);
  const min = Math.min(...v);
  const max = Math.max(...v);
  const spaend = max - min || 1;

  const w = 600;
  const h = 110;
  const x = (i: number) => (i / (punkter.length - 1)) * w;
  const y = (val: number) => h - ((val - min) / spaend) * h;

  const d = punkter
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.vaerdi).toFixed(1)}`)
    .join(" ");

  const nulLinje = min < 0 && max > 0 ? y(0) : null;
  const sidste = punkter[punkter.length - 1];
  const foerste = punkter[0];

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${h + 6}`}
        width="100%"
        style={{ maxWidth: "100%", height: "auto" }}
        role="img"
        aria-label={`Udvikling fra ${MAANEDER[foerste.periode.getUTCMonth()]} ${foerste.periode.getUTCFullYear()} til ${MAANEDER[sidste.periode.getUTCMonth()]} ${sidste.periode.getUTCFullYear()}`}
      >
        {nulLinje !== null && (
          <line
            x1={0}
            x2={w}
            y1={nulLinje}
            y2={nulLinje}
            stroke="#1A1A1A"
            strokeWidth={1}
            opacity={0.15}
            strokeDasharray="3 4"
          />
        )}
        <path
          d={d}
          fill="none"
          stroke="#1A1A1A"
          strokeWidth={1.6}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.55}
        />
        <circle cx={x(punkter.length - 1)} cy={y(sidste.vaerdi)} r={4} fill="#2D5F4A" />
      </svg>
      <div className="flex justify-between text-[11px] text-stone opacity-50 mt-1">
        <span>
          {MAANEDER[foerste.periode.getUTCMonth()].slice(0, 3)}{" "}
          {foerste.periode.getUTCFullYear()}
        </span>
        <span>{VINDUE_AAR} år</span>
        <span>
          {MAANEDER[sidste.periode.getUTCMonth()].slice(0, 3)}{" "}
          {sidste.periode.getUTCFullYear()}
        </span>
      </div>
    </div>
  );
}

/** Udeladte serier vises. En serie der mangler er ikke en serie uden bevægelse. */
function Udeladte({ liste }: { liste: NoegletalResultat["udeladte"] }) {
  return (
    <div className="mt-8 pt-5 border-t border-ink/10">
      <p className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60 mb-3">
        Ikke vist
      </p>
      <ul className="list-none p-0 m-0 space-y-1">
        {liste.map((u) => (
          <li key={u.seriesId} className="text-[13px] leading-[1.6] text-stone">
            <span className="text-ink">{u.navn ?? u.seriesId}</span>: {u.grund}
          </li>
        ))}
      </ul>
    </div>
  );
}
