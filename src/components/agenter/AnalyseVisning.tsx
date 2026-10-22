import Link from "next/link";
import Glid from "@/components/agenter/Glid";
import type { Afsnit, Analyse, DagensAnalyse, ElprisDag, Medietema } from "@/lib/agenter/finn/analyse";
import { OMRAADER, omraade, type OmraadeNoegle } from "@/lib/agenter/finn/omraader";

// Finns analyseudgave, fra 22. oktober 2026. Rækkefølgen er fast, men
// indholdet skifter med tallene: dagens analyse handler om det område der
// har bevæget sig, og det usædvanlige, nyt i dag og medierne er tomme de
// dage der intet er. En tom sektion vises ikke; den siger det i stedet.

const navn = (o: OmraadeNoegle | null) => (o ? (omraade(o)?.navn ?? o) : "Økonomi");

/** Områdets egen side. */
export const omraadeSti = (o: OmraadeNoegle) => `/agenter/finn/${o}`;

export default function AnalyseVisning({ a }: { a: Analyse }) {
  const omraader = OMRAADER.filter((o) => a.omraader[o.noegle]);

  return (
    <>
      {a.overblik.length > 0 && (
        <section aria-labelledby="overblik-titel">
          <Sektionstitel id="overblik-titel">Overblik i dag</Sektionstitel>
          <ul className="list-none p-0 m-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 md:gap-3">
            {a.overblik.map((f) => (
              <li key={f.id}>
                <Link
                  href={omraadeSti(f.omraade)}
                  className="block h-full rounded-2xl bg-parchment border border-fog p-4 no-underline hover:border-moss active:scale-[0.97] transition-[transform,border-color] duration-150"
                >
                  <div className="font-[300] text-[0.62rem] tracking-[0.14em] uppercase text-moss mb-2">{f.tema}</div>
                  <div className="font-[300] text-[1.25rem] md:text-[1.4rem] text-ink leading-[1.1] tracking-[-0.015em] tabular-nums">
                    {f.vaerdi}
                  </div>
                  <div className="mt-1 font-[300] text-[0.72rem] text-stone leading-[1.35]">{f.etiket}</div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {a.dagens ? (
        <section id="dagens-analyse" aria-labelledby="dagens-titel" className="scroll-mt-20">
          <Sektionstitel id="dagens-titel">Dagens analyse</Sektionstitel>
          <Glid>
            <DagensKort d={a.dagens} />
          </Glid>
        </section>
      ) : (
        <p className="rounded-2xl bg-parchment border border-fog px-5 py-4 font-[300] text-[0.88rem] text-stone leading-[1.6]">
          Dagens analyse holdt ikke Finns selvtjek og vises derfor ikke. Tallene herunder er beregnet direkte fra kilderne.
        </p>
      )}

      {a.elpris.length > 0 && (
        <section id="elpris" aria-labelledby="elpris-titel" className="scroll-mt-20">
          <Sektionstitel id="elpris-titel">Elprisen i dag, time for time</Sektionstitel>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
            {a.elpris.map((e) => (
              <Glid key={e.kode}>
                <Elpris dag={e} />
              </Glid>
            ))}
          </div>
        </section>
      )}

      {(a.usaedvanligt.length > 0 || a.nyt.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-4">
          {a.usaedvanligt.length > 0 && (
            <section aria-labelledby="usaedvanligt-titel">
              <Sektionstitel id="usaedvanligt-titel">Usædvanligt mod de seneste ti år</Sektionstitel>
              <ul className="list-none p-0 m-0 flex flex-col gap-2.5">
                {a.usaedvanligt.map((u) => (
                  <li key={u.id}>
                    <a
                      href={u.url}
                      rel="noopener"
                      className="flex items-start gap-3 rounded-2xl bg-parchment border border-fog p-4 no-underline hover:border-moss transition-colors duration-150"
                    >
                      <span className="mt-0.5 font-[300] text-[1.1rem] text-moss leading-none" aria-hidden>
                        {u.opad ? "↑" : "↓"}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-[400] text-[0.9rem] text-ink leading-[1.4]">
                          {u.navn}: <span className="tabular-nums">{u.vaerdi}</span>
                        </span>
                        <span className="block mt-0.5 font-[300] text-[0.78rem] text-stone leading-[1.5]">
                          {u.tekst}, {u.periode}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {a.nyt.length > 0 && (
            <section aria-labelledby="nyt-titel">
              <Sektionstitel id="nyt-titel">Nye tal de seneste 48 timer</Sektionstitel>
              <ul className="list-none p-0 m-0 flex flex-col gap-2.5">
                {a.nyt.map((n) => (
                  <li key={n.id}>
                    <a
                      href={n.url}
                      rel="noopener"
                      className="block rounded-2xl bg-parchment border border-fog p-4 no-underline hover:border-moss transition-colors duration-150"
                    >
                      <span className="block font-[300] text-[0.62rem] tracking-[0.14em] uppercase text-moss mb-1">{navn(n.omraade)}</span>
                      <span className="block font-[400] text-[0.9rem] text-ink leading-[1.4]">
                        {n.navn}, {n.periode}: <span className="tabular-nums">{n.vaerdi}</span>
                      </span>
                      {n.aendring && <span className="block mt-0.5 font-[300] text-[0.78rem] text-stone">{n.aendring}</span>}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {a.medier.length > 0 && (
        <section aria-labelledby="medier-titel">
          <Sektionstitel id="medier-titel">I medierne</Sektionstitel>
          <ul className="list-none p-0 m-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {a.medier.map((m, i) => (
              <li key={i}>
                <Glid forsinkelse={(i % 3) * 70} className="h-full">
                  <article className="h-full flex flex-col rounded-2xl bg-parchment border border-fog p-5">
                    <div className="font-[300] text-[0.62rem] tracking-[0.14em] uppercase text-moss mb-2">{navn(m.omraade)}</div>
                    <h3 className="font-[400] text-[0.98rem] text-ink leading-[1.4] mb-2">{m.titel}</h3>
                    <MedieKommentar m={m} />
                    <ul className="list-none p-0 m-0 mt-auto pt-3 flex flex-col gap-1">
                      {m.artikler.map((x) => (
                        <li key={x.url} className="font-[300] text-[0.75rem] leading-[1.45]">
                          <a href={x.url} rel="noopener" className="text-stone no-underline hover:text-moss">
                            {x.titel}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </article>
                </Glid>
              </li>
            ))}
          </ul>
        </section>
      )}

      {omraader.length > 0 && (
        <section aria-labelledby="omraader-titel">
          <Sektionstitel id="omraader-titel">Område for område</Sektionstitel>
          <ul className="list-none p-0 m-0 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {omraader.map((o, i) => {
              const x = a.omraader[o.noegle]!;
              return (
                <li key={o.noegle}>
                  <Glid forsinkelse={(i % 2) * 70} className="h-full">
                    <article className="h-full rounded-2xl bg-parchment border border-fog p-5 md:p-6">
                      <div className="font-[300] text-[0.62rem] tracking-[0.14em] uppercase text-moss mb-2">{o.navn}</div>
                      <h3 className="font-[400] text-[1.02rem] text-ink leading-[1.4] mb-3">{x.overskrift}</h3>
                      <div className="flex flex-col gap-3">
                        {x.afsnit.map((s, j) => (
                          <AfsnitTekst key={j} afsnit={s} />
                        ))}
                      </div>
                      <Link
                        href={omraadeSti(o.noegle)}
                        className="mt-4 inline-flex rounded-full border border-clay bg-parchment px-3.5 py-1.5 font-[300] text-[0.75rem] text-ink no-underline hover:border-moss active:scale-[0.97] transition-[transform,border-color] duration-100"
                      >
                        Dyk ned i {o.navn.toLowerCase()}
                      </Link>
                    </article>
                  </Glid>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}

/** Dagens analyse som ét kort. Bruges på Finns side og på områdets side. */
export function DagensKort({ d }: { d: DagensAnalyse }) {
  return (
    <article className="rounded-3xl bg-parchment border border-fog p-6 md:p-9">
      <div className="flex items-center gap-1.5 mb-4 font-[300] text-[0.66rem] tracking-[0.14em] uppercase text-moss">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-moss" />
        {navn(d.omraade)}
      </div>
      <h3 className="font-[300] text-[1.5rem] md:text-[2rem] text-ink leading-[1.15] tracking-[-0.015em] max-w-[760px]">
        {d.overskrift}
      </h3>
      <p className="mt-4 font-[300] text-[1rem] md:text-[1.1rem] text-stone leading-[1.65] max-w-[720px]">{d.tese}</p>

      <h4 className="mt-8 mb-3 font-[400] text-[0.66rem] tracking-[0.14em] uppercase text-stone">Hvad tallene siger</h4>
      <ol className="list-none p-0 m-0 flex flex-col gap-4 max-w-[720px]">
        {d.hvadTalleneSiger.map((x, i) => (
          <li key={i} className="border-l-2 border-moss pl-4">
            <AfsnitTekst afsnit={x} />
          </li>
        ))}
      </ol>

      <h4 className="mt-8 mb-3 font-[400] text-[0.66rem] tracking-[0.14em] uppercase text-stone">Hvad det betyder</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Betyder titel="For en virksomhed" tekst={d.hvadDetBetyder.virksomhed} />
        <Betyder titel="For en husholdning" tekst={d.hvadDetBetyder.husholdning} />
      </div>

      {d.holdOeje.length > 0 && (
        <>
          <h4 className="mt-8 mb-3 font-[400] text-[0.66rem] tracking-[0.14em] uppercase text-stone">Hold øje med</h4>
          <ul className="list-none p-0 m-0 flex flex-col gap-3 max-w-[720px]">
            {d.holdOeje.map((x, i) => (
              <li key={i}>
                <AfsnitTekst afsnit={x} />
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}

/** Finns kommentar til et medietema, eller hvorfor der ikke er en. Aldrig tomt. */
export function MedieKommentar({ m }: { m: Medietema }) {
  if (m.kommentar) return <AfsnitTekst afsnit={m.kommentar} />;
  const grund =
    m.udenKommentar === "holdt ikke selvtjekket"
      ? "Finns kommentar til temaet holdt ikke selvtjekket og vises ikke."
      : m.udenKommentar === "ikke skrevet"
        ? "Finn har ikke koblet temaet til dagens tal."
        : "Ingen kommentar fra Finn til dette tema.";
  return <p className="font-[300] text-[0.82rem] text-slate leading-[1.6] italic">{grund} Overskrifterne herunder.</p>;
}

export function Sektionstitel({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mb-3 px-1 font-[400] text-[0.72rem] tracking-[0.14em] uppercase text-stone">
      {children}
    </h2>
  );
}

/** Et afsnit og de kilder det bygger på, så hvert tal kan følges. */
export function AfsnitTekst({ afsnit }: { afsnit: Afsnit }) {
  return (
    <div>
      <p className="font-[300] text-[0.9rem] text-stone leading-[1.7]">{afsnit.tekst}</p>
      <ul className="list-none p-0 m-0 mt-1.5 flex flex-wrap gap-1.5">
        {afsnit.kilder.map((k) => (
          <li key={k.id} className="max-w-full">
            <a
              href={k.url}
              rel="noopener"
              title={k.navn}
              className="inline-block max-w-full truncate rounded-full bg-sand px-2.5 py-0.5 font-[300] text-[0.66rem] text-stone no-underline hover:text-moss"
            >
              {k.navn}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Betyder({ titel, tekst }: { titel: string; tekst: string }) {
  return (
    <p className="rounded-2xl bg-sand px-4 py-3.5 font-[300] text-[0.9rem] text-ink leading-[1.6]">
      <span className="block font-[400] text-[0.6rem] tracking-[0.14em] uppercase text-moss mb-1">{titel}</span>
      {tekst}
    </p>
  );
}

const kr = (n: number) => new Intl.NumberFormat("da-DK", { maximumFractionDigits: 0 }).format(n);
const tt = (t: number) => String(t).padStart(2, "0");

/** Døgnets timepriser som søjler. Billigste time i moss, dyreste i ink. */
export function Elpris({ dag: e }: { dag: ElprisDag }) {
  const max = Math.max(...e.timer.map((t) => t.pris), 1);
  const min = Math.min(...e.timer.map((t) => t.pris), 0);
  const spaend = max - min || 1;
  const B = 24;
  const H = 120;
  const nul = H - ((0 - min) / spaend) * H;
  return (
    <figure className="m-0 rounded-2xl bg-parchment border border-fog p-5">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-4">
        <span className="font-[400] text-[0.95rem] text-ink">{e.navn}</span>
        <span className="font-[300] text-[0.78rem] text-stone tabular-nums">gennemsnit {kr(e.snit)} kr. per MWh</span>
      </figcaption>
      <svg
        viewBox={`0 0 ${e.timer.length * B} ${H}`}
        className="w-full h-[120px]"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Elpris ${e.navn} time for time. Billigst kl. ${tt(e.billigst.time)} med ${kr(e.billigst.pris)} kr., dyrest kl. ${tt(e.dyrest.time)} med ${kr(e.dyrest.pris)} kr. per MWh.`}
      >
        {e.timer.map((t, i) => {
          const y = H - ((t.pris - min) / spaend) * H;
          const fill = t.time === e.billigst.time ? "fill-moss" : t.time === e.dyrest.time ? "fill-ink" : "fill-clay";
          return <rect key={t.time} x={i * B + 2} width={B - 4} y={Math.min(y, nul)} height={Math.max(Math.abs(nul - y), 1)} rx={2} className={fill} />;
        })}
      </svg>
      <div className="flex justify-between mt-1.5 font-[300] text-[0.62rem] text-slate tabular-nums" aria-hidden>
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>23</span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2.5 m-0">
        <div className="rounded-xl bg-sand px-3.5 py-2.5">
          <dt className="font-[400] text-[0.6rem] tracking-[0.14em] uppercase text-moss">Billigst</dt>
          <dd className="m-0 font-[300] text-[0.85rem] text-ink tabular-nums">
            kl. {tt(e.billigst.time)}-{tt((e.billigst.time + 1) % 24)}, {kr(e.billigst.pris)} kr.
          </dd>
        </div>
        <div className="rounded-xl bg-sand px-3.5 py-2.5">
          <dt className="font-[400] text-[0.6rem] tracking-[0.14em] uppercase text-ink">Dyrest</dt>
          <dd className="m-0 font-[300] text-[0.85rem] text-ink tabular-nums">
            kl. {tt(e.dyrest.time)}-{tt((e.dyrest.time + 1) % 24)}, {kr(e.dyrest.pris)} kr.
          </dd>
        </div>
      </dl>
    </figure>
  );
}
