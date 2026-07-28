// ============================================================
// Ranglisten på /pulse
//
// Fire krav til udformningen, og de er ikke til forhandling:
//
//   1. Intet statistisk fagsprog. Ingen z, ingen sigma, ingen median.
//      En læser skal kunne afgøre om noget er usædvanligt uden at have
//      haft statistik. "Kun set to gange på ti år" kan de afgøre.
//      "2,3 sigma" kan de ikke.
//   2. Mobil er den primære visning, ikke den nedskalerede.
//   3. Hentetidspunktet skal stå på siden. Et tal uden dato er en
//      påstand uden holdbarhed.
//   4. Farve betyder usædvanlig, aldrig dårlig. En høj elpris er skidt
//      for et bageri og god for en vindmøllepark. Retningen står i
//      pilen og fortegnet, ikke i farven.
// ============================================================

import { getKommuneByCode } from "@/lib/areas";
import { formatVaerdi } from "@/lib/pulse-enheder";
import {
  kildeUrl,
  NATIONALE_OMRAADER,
  type Kandidat,
  type Rangliste,
} from "@/lib/pulse-rangliste";

const MAANEDER = [
  "januar", "februar", "marts", "april", "maj", "juni",
  "juli", "august", "september", "oktober", "november", "december",
];

function periodeTekst(d: Date): string {
  return `${MAANEDER[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function hentetTekst(d: Date): string {
  return `${d.getUTCDate()}. ${MAANEDER[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * Hvor usædvanligt, i ord.
 *
 * Bygget på hvor mange måneder i vinduet der var mindst lige så
 * yderligtgående, ikke på z. En læser kan efterprøve det mod kurven.
 *
 * De to tal kan være uenige, og så vinder optællingen.
 * Erhvervsudlånsrenten står 2,65 spredninger over midten, men niveauet
 * har været der 29 af 120 måneder, fordi renten lå fladt i årevis og
 * derefter sprang. Spredningen er lille, så alt efter springet ser
 * ekstremt ud. "Usædvanligt" ville være forkert om noget der er sket i
 * hver fjerde måned. Sidste gren påstår derfor ingen sjældenhed, kun
 * retning.
 */
function sjaeldenhedTekst(k: Kandidat, aar: number): string {
  const opad = k.vaerdi >= k.normal;
  if (k.sjaeldenhed <= 1) {
    return opad ? `Højeste på ${aar} år` : `Laveste på ${aar} år`;
  }
  if (k.sjaeldenhed <= 3) {
    return `Kun set ${k.sjaeldenhed} gange på ${aar} år`;
  }
  if (k.maaneder > 0 && k.sjaeldenhed / k.maaneder <= 0.1) {
    return `Blandt de ${Math.round((k.sjaeldenhed / k.maaneder) * 100)} procent yderste`;
  }
  return opad ? "Over det normale" : "Under det normale";
}

/**
 * De to modeller koder "hele landet" forskelligt. Serier bygget fra
 * config bruger "DK", serier fra migreringen bruger DST's egen kode
 * "000". Begge er nationale, og læseren skal ikke se forskellen.
 */
function erNational(areaCode: string): boolean {
  return NATIONALE_OMRAADER.has(areaCode);
}

function omraadeTekst(areaCode: string): string {
  if (erNational(areaCode)) return "Hele landet";
  const k = getKommuneByCode(areaCode);
  return k ? k.name : areaCode;
}

/**
 * Sammenligningsgrundlaget, skrevet ud.
 *
 * Byggebriefen: "Ændring med eksplicit sammenligningsgrundlag." Et tal
 * uden det man sammenligner med er ikke en oplysning.
 */
function sammenligning(k: Kandidat, aar: number): string {
  if (k.transform === "yoy") {
    // Årsændringen er en procent, uanset hvad serien selv måles i.
    // Transformationen ændrer enheden, og at formatere den som seriens
    // egen ville skrive "165.037 m2 over samme måned året før" om et
    // tal der er en procentvis ændring.
    const pct = (v: number) =>
      v.toLocaleString("da-DK", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const retning = k.vaerdi >= 0 ? "over" : "under";
    return `${pct(Math.abs(k.vaerdi))} procent ${retning} samme måned året før. Normalt ${pct(k.normal)} procent.`;
  }
  return `Normalt ${formatVaerdi(k.normal, k.enhed)} over de seneste ${aar} år.`;
}

export function RanglisteSektion({ data }: { data: Rangliste }) {
  if (data.kort.length === 0 && data.rolige.length === 0) return null;

  return (
    <section className="mt-4 mb-24">
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-16 mb-10 md:mb-12">
        <div className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60">
          Rangliste
        </div>
        <div>
          <h2 className="font-fraunces font-light text-[36px] md:text-[44px] leading-[1.1] tracking-[-0.01em] mb-4">
            Hvad er usædvanligt lige nu?
          </h2>
          <p className="text-stone text-[15px] leading-[1.6] max-w-[640px]">
            Hver serie måles mod sine egne seneste {data.vinduesAar} år. Det der
            ligger længst fra det normale står øverst. Farven betyder usædvanlig,
            ikke dårlig.
          </p>
          {data.hentet && (
            <p className="text-stone text-[13px] leading-[1.6] mt-3 opacity-70">
              Tallene er hentet {hentetTekst(data.hentet)}.
            </p>
          )}
        </div>
      </div>

      {data.kort.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {data.kort.map((k) => (
            <Kort key={`${k.seriesId}:${k.areaCode}`} k={k} aar={data.vinduesAar} />
          ))}
        </div>
      ) : (
        <div className="p-6 md:p-8 bg-fog/40">
          <p className="text-[15px] leading-[1.6] text-stone">
            Ingen serie ligger usædvanligt langt fra det normale i denne omgang.
            Alle {data.rolige.length} serier står i listen nedenfor.
          </p>
        </div>
      )}

      {data.rolige.length > 0 && <RoligListe rolige={data.rolige} />}
    </section>
  );
}

function Kort({ k, aar }: { k: Kandidat; aar: number }) {
  const opad = k.vaerdi >= k.normal;
  const url = kildeUrl(k.kilde, k.kildeRef);

  return (
    <article className="p-6 md:p-8 bg-fog border-l-2 border-moss">
      <header className="flex items-center gap-3 mb-4">
        <span className="text-[11px] text-moss font-medium" aria-hidden>
          {opad ? "▲" : "▼"}
        </span>
        <span className="sr-only">{opad ? "op" : "ned"}</span>
        <span className="text-[10px] tracking-[0.3em] uppercase text-moss font-normal">
          {sjaeldenhedTekst(k, aar)}
        </span>
        <span className="ml-auto text-[10px] tracking-[0.2em] uppercase text-stone opacity-40">
          {omraadeTekst(k.areaCode)}
        </span>
      </header>

      <h3 className="font-fraunces font-light italic text-[20px] md:text-[24px] leading-[1.25] text-ink mb-2 tracking-[-0.005em]">
        {k.navn}
      </h3>

      <p className="text-[28px] md:text-[32px] font-light leading-[1.1] text-ink mb-1">
        {formatVaerdi(k.raaVaerdi, k.enhed)}
      </p>
      <p className="text-[13px] text-stone opacity-70 mb-5">
        {periodeTekst(k.periode)}
      </p>

      <Kurve punkter={k.kurve} />

      <p className="text-[14px] leading-[1.6] text-stone mt-5">
        {sammenligning(k, aar)}
      </p>

      <footer className="mt-5 pt-4 border-t border-ink/10 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="text-[11px] text-stone opacity-50 leading-[1.5]">
          {k.attribution}
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
        <span className="text-[11px] text-stone opacity-50 basis-full">
          Hentet {hentetTekst(k.hentet)}
        </span>
      </footer>
    </article>
  );
}

/**
 * De 24 seneste måneder, altid på niveau.
 *
 * Også når z er beregnet på årsændring. Kurven skal vise serien, ikke
 * beregningen; ellers kan en læser ikke genkende det tal der står over.
 */
function Kurve({ punkter }: { punkter: Kandidat["kurve"] }) {
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
  const h = 90;
  const x = (i: number) => (i / (punkter.length - 1)) * w;
  const y = (val: number) => h - ((val - min) / spaend) * h;

  const d = punkter
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.vaerdi).toFixed(1)}`)
    .join(" ");

  const foerste = punkter[0];
  const sidste = punkter[punkter.length - 1];

  return (
    <svg
      viewBox={`0 0 ${w} ${h + 8}`}
      width="100%"
      style={{ maxWidth: "100%", height: "auto" }}
      role="img"
      aria-label={`Udvikling fra ${periodeTekst(foerste.periode)} til ${periodeTekst(sidste.periode)}`}
    >
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
  );
}

function RoligListe({ rolige }: { rolige: Kandidat[] }) {
  return (
    <div className="mt-10 md:mt-12">
      <h3 className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60 mb-5">
        Resten ligger inden for det normale
      </h3>
      <ul className="list-none p-0 m-0 border-t border-ink/10">
        {rolige.map((k) => (
          <li
            key={`${k.seriesId}:${k.areaCode}`}
            className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3 border-b border-ink/10"
          >
            <span className="text-[15px] text-ink leading-[1.4] basis-full md:basis-auto md:flex-1">
              {k.navn}
              {!erNational(k.areaCode) && (
                <span className="text-stone opacity-50">
                  {" "}
                  &middot; {omraadeTekst(k.areaCode)}
                </span>
              )}
            </span>
            <span className="text-[14px] text-stone">
              {formatVaerdi(k.raaVaerdi, k.enhed)}
            </span>
            <span className="text-[12px] text-stone opacity-50">
              {periodeTekst(k.periode)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
