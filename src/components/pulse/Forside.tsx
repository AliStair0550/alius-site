// ============================================================
// Forsidens fire dele
//
// Siden skal forklare sig selv ved at VÆRE et overblik, ikke ved at
// beskrive at den er et. Derfor er der ingen brødtekst i toppen.
//
// Fem sekunder, tre ting: hvad ugens historie er, hvad der har flyttet
// sig, og hvor alt andet står.
//
//   1. Statuslinje      uge, opdateringstidspunkt, plads til én sætning
//   2. Signalkort       det usædvanlige, ét til fem
//   3. Nøgletalsgitter  scanningsfladen, ti rækker
//   4. Dashboardlinks   veje ned i dybden, ingen beskrivelser
//
// Kravene fra ranglisten gælder stadig: intet fagsprog, mobil først,
// hentetidspunkt synligt, farve betyder usædvanlig og aldrig dårlig.
// ============================================================

import Link from "next/link";
import { formatVaerdi } from "@/lib/pulse-enheder";
import { kildeUrl, type Kandidat } from "@/lib/pulse-rangliste";
import type { Noegletal } from "@/lib/pulse-noegletal";

const MAANEDER = [
  "januar", "februar", "marts", "april", "maj", "juni",
  "juli", "august", "september", "oktober", "november", "december",
];

/**
 * ISO-ugenummer. Uge 1 er den uge der indeholder 4. januar.
 *
 * Regnes i UTC, så ugen ikke skifter afhængigt af hvilken maskine der
 * renderer siden. Det var netop den slags der gjorde elpriserne
 * forkerte.
 */
export function ugeNummer(d: Date): number {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // Torsdag i samme uge afgør hvilket år ugen tilhører.
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const aarsStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - aarsStart.getTime()) / 86_400_000 + 1) / 7);
}

/**
 * "i dag 07:04" eller "27. juli 07:04".
 *
 * "I dag" kun når det ER i dag. Et hentetidspunkt der påstår at være
 * friskere end det er, er værre end et der er præcist.
 */
function opdateretTekst(hentet: Date, nu: Date): string {
  const sammeDag =
    hentet.getUTCFullYear() === nu.getUTCFullYear() &&
    hentet.getUTCMonth() === nu.getUTCMonth() &&
    hentet.getUTCDate() === nu.getUTCDate();
  const kl = `${String(hentet.getUTCHours()).padStart(2, "0")}:${String(
    hentet.getUTCMinutes()
  ).padStart(2, "0")}`;
  if (sammeDag) return `Opdateret i dag ${kl}`;
  return `Opdateret ${hentet.getUTCDate()}. ${MAANEDER[hentet.getUTCMonth()]} ${kl}`;
}

export function Statuslinje({
  hentet,
  nu,
  overskrift,
}: {
  hentet: Date | null;
  nu: Date;
  /**
   * Ugens sætning. Leveres af fortolkningslaget efter kalibreringen.
   *
   * Indtil da står her en optælling, ikke en fortolkning. "Tre serier
   * ligger usædvanligt langt fra det normale" er talt og kan
   * efterprøves; "renterne stiger, byggeriet bremser" er en påstand om
   * sammenhæng, og den må vi ikke skrive før vi kan holde den.
   */
  overskrift: string;
}) {
  return (
    <section className="pb-10 md:pb-14 mb-10 md:mb-14 border-b border-ink/10">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 mb-6 md:mb-8">
        <span className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60">
          Pulse &#183; uge {ugeNummer(nu)}
        </span>
        {hentet && (
          <span className="text-[11px] tracking-[0.2em] uppercase text-stone opacity-50">
            {opdateretTekst(hentet, nu)}
          </span>
        )}
      </div>

      <h1 className="font-fraunces font-light italic text-[clamp(30px,5.2vw,56px)] leading-[1.12] tracking-[-0.02em] text-ink max-w-[900px]">
        {overskrift}
      </h1>
    </section>
  );
}

/**
 * Signalkortene.
 *
 * Gitteret skal bære ét til fem kort uden at se tomt eller trængt ud.
 * Derfor auto-fit med en mindstebredde frem for et fast antal kolonner:
 * ét kort fylder rækken, fem lægger sig i to rækker af tre og to.
 */
export function Signalkort({ kort }: { kort: Kandidat[] }) {
  if (kort.length === 0) return null;

  return (
    <section className="mb-12 md:mb-16">
      <div
        className="grid gap-3 md:gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))" }}
      >
        {kort.map((k) => (
          <Signal key={`${k.seriesId}:${k.areaCode}`} k={k} />
        ))}
      </div>
    </section>
  );
}

function Signal({ k }: { k: Kandidat }) {
  const opad = k.vaerdi >= k.normal;

  return (
    <Link
      href={`/pulse/serie/${encodeURIComponent(k.seriesId)}`}
      // flex-col + mt-auto: kortene strækkes til samme højde af
      // gitteret, og tallet skubbes ned, så det står på linje på tværs
      // uanset om navnet fylder én eller tre linjer.
      className="group relative flex flex-col p-5 md:p-6 bg-white border border-ink/15 no-underline hover:border-ink/35 transition-colors"
    >
      <p className="text-[11px] tracking-[0.15em] uppercase text-stone opacity-60 mb-3 leading-[1.4]">
        {k.navn}
      </p>

      <div className="mt-auto">
        <div className="flex items-end justify-between gap-4 mb-3">
          <p className="text-[26px] font-light leading-[1] text-ink">
            {formatVaerdi(k.raaVaerdi, k.enhed)}
          </p>
          <Minikurve punkter={k.kurve} />
        </div>

        <p className="text-[12px] leading-[1.5] text-stone">
          <span className="text-moss" aria-hidden>
            {opad ? "▲" : "▼"}
          </span>{" "}
          {sjaeldenhed(k)} &#183; {periode(k.periode)}
        </p>
      </div>

      <Forklaring>
        {sjaeldenhedForklaring(k)} Klik for hele historikken.
      </Forklaring>
    </Link>
  );
}

/**
 * Forklaringen bag badgen, i almindelige ord.
 *
 * Ranglisten måler mod seriens egne seneste ti år. Det står ikke på
 * kortet, fordi kortet skal kunne scannes, men en læser der undrer sig
 * skal kunne få svaret uden at lede.
 */
function sjaeldenhedForklaring(k: Kandidat): string {
  const opad = k.vaerdi >= k.normal;
  const retning = opad ? "over" : "under";
  if (k.sjaeldenhed <= 1) {
    return `Ingen måned i de seneste ti år har ligget ${opad ? "højere" : "lavere"}.`;
  }
  if (k.sjaeldenhed <= 3) {
    return `Kun ${k.sjaeldenhed} af ${k.maaneder} måneder i de seneste ti år har ligget lige så ${opad ? "højt" : "lavt"}.`;
  }
  return `Ligger ${retning} det normale for de seneste ti år, målt på ${k.maaneder} måneder.`;
}

/**
 * Boble ved hover og ved tastaturfokus.
 *
 * Ren CSS. Hover findes ikke på mobil, og derfor er den en tilføjelse,
 * ikke vejen ind: hele kortet er et link, og det virker med en
 * tommelfinger.
 */
function Forklaring({ children }: { children: React.ReactNode }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-4 right-4 bottom-full mb-2 z-20 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0 transition-all duration-150 bg-ink text-parchment text-[12px] leading-[1.55] p-3"
    >
      {children}
    </span>
  );
}

function periode(d: Date): string {
  return `${MAANEDER[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()}`;
}

/** Samme ordvalg som ranglistens badge. Ingen ny formulering at holde i takt. */
function sjaeldenhed(k: Kandidat): string {
  const opad = k.vaerdi >= k.normal;
  if (k.sjaeldenhed <= 1) return opad ? "Højeste i ti år" : "Laveste i ti år";
  if (k.sjaeldenhed <= 3) return `Kun set ${k.sjaeldenhed} gange på ti år`;
  return opad ? "Over det normale" : "Under det normale";
}

/** Kurven ved siden af tallet. Ingen akser, ingen tal: kun formen. */
function Minikurve({ punkter }: { punkter: Kandidat["kurve"] }) {
  if (punkter.length < 2) return null;
  const v = punkter.map((p) => p.vaerdi);
  const min = Math.min(...v);
  const spaend = Math.max(...v) - min || 1;
  const w = 96;
  const h = 26;
  const d = punkter
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${((i / (punkter.length - 1)) * w).toFixed(1)} ${(
          h - ((p.vaerdi - min) / spaend) * h
        ).toFixed(1)}`
    )
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h + 4}`} width={w} height={h + 4} aria-hidden className="shrink-0">
      <path d={d} fill="none" stroke="#1A1A1A" strokeWidth={1.4} opacity={0.4} strokeLinejoin="round" />
      <circle cx={w} cy={h - ((v[v.length - 1] - min) / spaend) * h} r={2.5} fill="#2D5F4A" />
    </svg>
  );
}

export type Gitterraekke = {
  navn: string;
  tal: Noegletal;
  /** Én sætning om hvad serien måler. Vises ved hover og fokus. */
  forklaring: string;
};

/** Retningen i ord til forklaringsboblen. */
function gitterRetning(t: Noegletal): string {
  const enhed = t.serie.frequency === "QUARTERLY" ? "kvartaler" : "måneder";
  if (t.retning === "flad") return "Uændret siden sidste måling.";
  const ord = t.retning === "op" ? "Steget" : "Faldet";
  return t.stribe <= 1
    ? `${ord} siden sidste måling.`
    : `${ord} ${t.stribe} ${enhed} i træk.`;
}

/**
 * Perioden i kort form: "jul 26", "1. kvt 26", "2024".
 *
 * Står ved hvert tal, ikke som én dato over gitteret. Serierne er ikke
 * lige langt fremme: elprisen er fra i går, lønindekset fra januar.
 * Én fælles dato ville påstå at de var samtidige.
 */
function kortPeriode(d: Date, frekvens: string): string {
  const aa = String(d.getUTCFullYear()).slice(2);
  if (frekvens === "YEARLY") return String(d.getUTCFullYear());
  if (frekvens === "QUARTERLY") return `${Math.floor(d.getUTCMonth() / 3) + 1}. kvt ${aa}`;
  return `${MAANEDER[d.getUTCMonth()].slice(0, 3)} ${aa}`;
}

/**
 * Nøgletalsgitteret. Scanningsfladen.
 *
 * Som en afgangstavle: navn til venstre, tal og pil til højre, tynd
 * streg imellem. To kolonner på desktop, én på mobil. Ingen kurver,
 * ingen forklaring, ingen kort.
 */
export function Noegletalsgitter({ raekker }: { raekker: Gitterraekke[] }) {
  if (raekker.length === 0) return null;

  return (
    <section className="mb-12 md:mb-16">
      <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-12">
        {raekker.map(({ navn, tal, forklaring }) => (
          <Link
            key={tal.serie.id}
            href={`/pulse/serie/${encodeURIComponent(tal.serie.id)}`}
            className="group relative flex items-baseline justify-between gap-4 py-3 border-b border-ink/10 no-underline hover:bg-fog/40 transition-colors -mx-2 px-2"
          >
            <span className="text-[14px] leading-[1.4] text-stone group-hover:text-ink transition-colors">
              {navn}
              <span className="text-[11px] text-stone opacity-45 ml-2 whitespace-nowrap">
                {kortPeriode(tal.periode, tal.serie.frequency)}
              </span>
            </span>
            <span className="flex items-baseline gap-2 shrink-0">
              <span className="text-[15px] text-ink tabular-nums">
                {formatVaerdi(tal.vaerdi, tal.serie.unit)}
              </span>
              <span className="text-[10px] text-moss w-[9px] text-center" aria-hidden>
                {tal.retning === "op" ? "▲" : tal.retning === "ned" ? "▼" : "·"}
              </span>
              <span className="sr-only">
                {tal.retning === "op"
                  ? "steget"
                  : tal.retning === "ned"
                    ? "faldet"
                    : "uændret"}
              </span>
            </span>
            <Forklaring>
              {forklaring} {gitterRetning(tal)} Klik for hele historikken.
            </Forklaring>
          </Link>
        ))}
      </div>
    </section>
  );
}

export type Vej = { navn: string; href: string };

/**
 * Veje ned i dybden.
 *
 * Knapper frem for tekstlinks. Pilen er væk: syv pile i træk blev til
 * et mønster man læser henover i stedet for syv valg man tager stilling
 * til. Rammen gør hvert navn til et mål man kan ramme, også med en
 * tommelfinger.
 */
export function Dashboardlinks({ veje }: { veje: Vej[] }) {
  return (
    <nav className="mb-14 md:mb-16 flex flex-wrap justify-center gap-2">
      {veje.map((v) => (
        <Link
          key={v.href}
          href={v.href}
          className="px-4 py-2.5 border border-ink/15 text-[14px] tracking-[0.02em] text-ink no-underline hover:bg-ink hover:border-ink hover:text-parchment transition-colors"
        >
          {v.navn}
        </Link>
      ))}
    </nav>
  );
}
