import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { pageMetadata } from "@/lib/page-metadata";
import { prisma } from "@/lib/db";
import { hentSerieInfo, hentNationale, kildeOgLicens } from "@/lib/pulse-model";
import { hentNoegletal } from "@/lib/pulse-noegletal";
import { formatVaerdi, formatAendring, enhed } from "@/lib/pulse-enheder";
import { kildeUrl } from "@/lib/pulse-rangliste";
import { toMonthlyMedKilde } from "@/lib/pulse-zscore";

type Props = { params: Promise<{ id: string }> };

export const revalidate = 3600;

// Siderne renderes ved første besøg og caches derefter. Der er halvfems
// serier, og de fleste bliver aldrig slået op.
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const serie = await hentSerieInfo(prisma, decodeURIComponent(id));
  if (!serie) {
    return pageMetadata({
      title: "Serie · Alius Pulse",
      description: "Serien findes ikke.",
      path: `/pulse/serie/${id}`,
    });
  }
  return pageMetadata({
    title: `${serie.nameDa} · Alius Pulse`,
    description: `Hele historikken for ${serie.nameDa.toLowerCase()}. ${serie.attribution}.`,
    path: `/pulse/serie/${id}`,
  });
}

const MAANEDER = [
  "januar", "februar", "marts", "april", "maj", "juni",
  "juli", "august", "september", "oktober", "november", "december",
];

function periodeTekst(d: Date, frekvens: string): string {
  if (frekvens === "YEARLY") return String(d.getUTCFullYear());
  if (frekvens === "QUARTERLY")
    return `${Math.floor(d.getUTCMonth() / 3) + 1}. kvartal ${d.getUTCFullYear()}`;
  if (frekvens === "DAILY")
    return `${d.getUTCDate()}. ${MAANEDER[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  return `${MAANEDER[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export default async function SeriePage({ params }: Props) {
  const id = decodeURIComponent((await params).id);
  const serie = await hentSerieInfo(prisma, id);
  if (!serie) notFound();

  // Hele historikken, ikke fem år. Det er hele pointen med siden.
  const alle = await hentNationale(prisma, id, serie.frequency);
  if (alle.length === 0) notFound();

  const punkter = alle.map((p) => ({ periode: p.periodDate, vaerdi: p.value! }));
  const seneste = punkter[punkter.length - 1];
  const foerste = punkter[0];

  // Nøgletallene genbruges, så forsiden og den her side aldrig kan
  // fortælle to forskellige historier om samme serie.
  const n = (await hentNoegletal(prisma, [id])).tal[0] ?? null;

  // Månedsværdier over hele historikken til kurven.
  const { udfyldt } = toMonthlyMedKilde(
    punkter.map((p) => ({ period: p.periode, value: p.vaerdi }))
  );
  const kurve = [...udfyldt.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([k, v]) => ({
      periode: new Date(Date.UTC(Math.floor(k / 12), k % 12, 1)),
      vaerdi: v,
    }));

  const aar = (
    (seneste.periode.getTime() - foerste.periode.getTime()) /
    (365.25 * 86_400_000)
  ).toFixed(0);

  const url = kildeUrl(serie.source, serie.sourceRef);
  const e = enhed(serie.unit);

  return (
    <div className="min-h-screen bg-parchment text-ink font-sans font-light overflow-x-hidden">
      <div className="max-w-[900px] mx-auto px-5 py-8 md:px-8 md:py-12">
        <header className="flex justify-between items-baseline gap-4 mb-10 md:mb-14">
          <Link
            href="/pulse"
            className="font-extralight text-sm tracking-[0.3em] uppercase text-ink no-underline hover:text-moss transition-colors"
          >
            &larr; Alius &#183; Pulse
          </Link>
          <span className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60">
            Serie
          </span>
        </header>

        <section className="pb-8 mb-10 border-b border-ink/10">
          <h1 className="font-fraunces font-light italic text-[clamp(26px,4.4vw,42px)] leading-[1.15] tracking-[-0.02em] mb-6 max-w-[720px]">
            {serie.nameDa}
          </h1>
          <p className="text-[38px] md:text-[46px] font-light leading-[1] mb-1">
            {formatVaerdi(seneste.vaerdi, serie.unit)}
          </p>
          <p className="text-[13px] text-stone opacity-70">
            {periodeTekst(seneste.periode, serie.frequency)}
          </p>
        </section>

        {n && (
          <section className="mb-10">
            <ul className="list-none p-0 m-0 grid grid-cols-1 md:grid-cols-3 gap-x-8">
              <Fakta
                etiket="Retning"
                vaerdi={
                  n.retning === "flad"
                    ? "Uændret siden sidste måling"
                    : `${n.retning === "op" ? "Steget" : "Faldet"} ${
                        n.stribe <= 1
                          ? "siden sidste måling"
                          : `${n.stribe} ${
                              serie.frequency === "QUARTERLY" ? "kvartaler" : "måneder"
                            } i træk`
                      }`
                }
              />
              <Fakta
                etiket="Mod sidste år"
                vaerdi={
                  n.aaretFoer === null
                    ? "Historikken rækker ikke et år tilbage"
                    : formatAendring(
                        n.aaretFoer,
                        n.aaretFoerNiveau,
                        serie.unit,
                        "samme måned sidste år"
                      )
                }
              />
              <Fakta
                etiket="Yderlighed"
                vaerdi={
                  n.yderlighedAar && n.yderlighedRetning
                    ? `${n.yderlighedRetning === "top" ? "Højeste" : "Laveste"} i ${
                        n.yderlighedAar === 1 ? "et år" : `${n.yderlighedAar} år`
                      }`
                    : "Ikke en yderlighed i de seneste fem år"
                }
              />
            </ul>
          </section>
        )}

        <section className="mb-10">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60">
              Hele historikken
            </h2>
            <span className="text-[11px] text-stone opacity-50">
              {periodeTekst(foerste.periode, serie.frequency)} til{" "}
              {periodeTekst(seneste.periode, serie.frequency)} &#183; {aar} år
            </span>
          </div>
          <div className="bg-fog/40 p-4 md:p-6">
            <FuldKurve punkter={kurve} enhedsnavn={serie.unit} />
          </div>
          {serie.frequency === "DAILY" && (
            <p className="text-[12px] text-stone opacity-60 mt-3 leading-[1.6]">
              Kurven er månedsgennemsnit. Tallet øverst er den seneste
              faktiske måling.
            </p>
          )}
        </section>

        <section className="mb-12">
          <h2 className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60 mb-4">
            Om serien
          </h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0 text-[14px]">
            <Raekke etiket="Enhed" vaerdi={e.efter || "indekstal uden enhed"} />
            <Raekke
              etiket="Frekvens"
              vaerdi={
                {
                  DAILY: "Dagligt",
                  WEEKLY: "Ugentligt",
                  MONTHLY: "Månedligt",
                  QUARTERLY: "Kvartalsvis",
                  YEARLY: "Årligt",
                }[serie.frequency] ?? serie.frequency
              }
            />
            <Raekke etiket="Observationer" vaerdi={punkter.length.toLocaleString("da-DK")} />
            <Raekke
              etiket="Sidst hentet"
              vaerdi={
                serie.hentet
                  ? `${serie.hentet.getUTCDate()}. ${
                      MAANEDER[serie.hentet.getUTCMonth()]
                    } ${serie.hentet.getUTCFullYear()}`
                  : "ukendt"
              }
            />
          </dl>
          <p className="text-[13px] text-stone leading-[1.7] mt-5">
            {serie.attribution}.{" "}
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-moss hover:text-ink transition-colors"
              >
                Se kilden &rarr;
              </a>
            )}
          </p>
        </section>

        <footer className="pt-6 border-t border-ink/10 text-[11px] text-stone opacity-60 leading-[1.7]">
          {kildeOgLicens([serie])}
        </footer>
      </div>
    </div>
  );
}

function Fakta({ etiket, vaerdi }: { etiket: string; vaerdi: string }) {
  return (
    <li className="py-3 border-b border-ink/10 md:border-b-0">
      <span className="block text-[10px] tracking-[0.25em] uppercase text-stone opacity-55 mb-1">
        {etiket}
      </span>
      <span className="block text-[15px] leading-[1.5] text-ink">{vaerdi}</span>
    </li>
  );
}

function Raekke({ etiket, vaerdi }: { etiket: string; vaerdi: string }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 border-b border-ink/10">
      <dt className="text-stone">{etiket}</dt>
      <dd className="text-ink m-0 text-right">{vaerdi}</dd>
    </div>
  );
}

/**
 * Hele historikken som månedsværdier.
 *
 * Nulpunktet markeres når serien kan være negativ. Ellers skaleres
 * kurven til sit eget spænd, som er det der viser formen.
 */
function FuldKurve({
  punkter,
  enhedsnavn,
}: {
  punkter: Array<{ periode: Date; vaerdi: number }>;
  enhedsnavn: string;
}) {
  if (punkter.length < 2) {
    return <p className="text-[13px] text-stone opacity-60">For få perioder til en kurve.</p>;
  }

  const v = punkter.map((p) => p.vaerdi);
  const min = Math.min(...v);
  const max = Math.max(...v);
  const spaend = max - min || 1;

  const w = 900;
  const h = 220;
  const x = (i: number) => (i / (punkter.length - 1)) * w;
  const y = (val: number) => h - ((val - min) / spaend) * h;

  const d = punkter
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.vaerdi).toFixed(1)}`)
    .join(" ");

  const nulLinje = min < 0 && max > 0 ? y(0) : null;
  const sidste = punkter[punkter.length - 1];

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${h + 8}`}
        width="100%"
        style={{ maxWidth: "100%", height: "auto" }}
        role="img"
        aria-label={`Hele historikken, ${punkter.length} måneder`}
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
            strokeDasharray="4 5"
          />
        )}
        <path
          d={d}
          fill="none"
          stroke="#1A1A1A"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.6}
        />
        <circle cx={x(punkter.length - 1)} cy={y(sidste.vaerdi)} r={4} fill="#2D5F4A" />
      </svg>
      <div className="flex justify-between text-[11px] text-stone opacity-55 mt-2">
        <span>Laveste: {formatVaerdi(min, enhedsnavn)}</span>
        <span>Højeste: {formatVaerdi(max, enhedsnavn)}</span>
      </div>
    </div>
  );
}
