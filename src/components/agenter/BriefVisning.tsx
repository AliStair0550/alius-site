import Link from "next/link";
import Glid from "@/components/agenter/Glid";
import SpoergFinn from "@/components/agenter/SpoergFinn";
import type { BriefPunkt } from "@/lib/agenter/finn/pipeline";
import type { BriefVisning as Brief } from "@/lib/agenter/laes";
import { langDato } from "@/lib/agenter/dato";
import { temaForKilde } from "@/lib/agenter/tema";

/** Temaet regnes ud fra første kilde, så også ældre briefs får det rigtige. */
const tema = (p: BriefPunkt) => (p.sources[0] ? temaForKilde(p.sources[0].id, p.sources[0].type) : (p.tema ?? "Økonomi"));

// Finns rum, indefra og ud: spørg Finn, overblik i dag, dagens brief, og
// små knapper til forbehold, replay og arkiv nederst.

export default function BriefVisning({
  brief,
  statuslinje,
  arkiv,
  kanSpoerge = false,
}: {
  brief: Brief | null;
  statuslinje: string | null;
  arkiv: string[];
  /** Kun på dagens side: Finn svarer ud fra seneste brief, ikke arkivets. */
  kanSpoerge?: boolean;
}) {
  const medTal = brief?.items.map((p, i) => ({ p, i })).filter(({ p }) => p.noegletal) ?? [];

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      {kanSpoerge && brief && (
        <SpoergFinn forslag={brief.items.slice(0, 3).map((p) => `Hvad betyder "${p.title}" for mig?`)} />
      )}

      {!kanSpoerge && brief && (
        <h1 className="font-[300] text-[1.6rem] md:text-[2rem] text-ink leading-[1.15] tracking-[-0.01em]">
          Finns brief, {langDato(brief.dato)}
        </h1>
      )}

      {statuslinje && (
        <p className="self-start rounded-full bg-parchment border border-fog px-4 py-2 font-[300] text-[0.82rem] text-stone">
          {statuslinje}
        </p>
      )}

      {!brief && <p className="font-[300] text-[1rem] text-stone">Finn har ikke skrevet sin første brief endnu.</p>}

      {brief && medTal.length > 0 && (
        <section aria-labelledby="overblik-titel">
          <Sektionstitel id="overblik-titel">Overblik i dag</Sektionstitel>
          <ul className="list-none p-0 m-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 md:gap-3">
            {medTal.map(({ p, i }) => (
              <li key={i}>
                <a
                  href={`#punkt-${i + 1}`}
                  className="block h-full rounded-2xl bg-parchment border border-fog p-4 no-underline hover:border-moss active:scale-[0.97] transition-[transform,border-color] duration-150"
                >
                  <div className="font-[300] text-[0.62rem] tracking-[0.14em] uppercase text-moss mb-2">{tema(p)}</div>
                  <div className="font-[300] text-[1.25rem] md:text-[1.4rem] text-ink leading-[1.1] tracking-[-0.015em] tabular-nums">
                    {p.noegletal!.vaerdi}
                  </div>
                  <div className="mt-1 font-[300] text-[0.72rem] text-stone leading-[1.35]">{p.noegletal!.etiket}</div>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {brief && (
        <section aria-labelledby="brief-titel">
          <Sektionstitel id="brief-titel">Dagens brief</Sektionstitel>
          <ol className="list-none p-0 m-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {brief.items.map((p, i) => (
              <li key={i} id={`punkt-${i + 1}`} className="scroll-mt-20">
                <Glid forsinkelse={(i % 3) * 70} className="h-full">
                  <Punktkort punkt={p} />
                </Glid>
              </li>
            ))}
          </ol>
        </section>
      )}

      {(brief || arkiv.length > 1) && (
        <nav aria-label="Mere om briefen" className="flex flex-wrap items-start gap-2">
          {brief && (
            <Link
              href={`/agenter/finn/replay/${brief.id}`}
              className="inline-flex rounded-full border border-clay bg-parchment px-3.5 py-1.5 font-[300] text-[0.75rem] text-ink no-underline hover:border-moss active:scale-[0.97] transition-[transform,border-color] duration-100"
            >
              Se hvordan det blev lavet
            </Link>
          )}
          {brief && (
            <details className="group open:basis-full">
              <summary className="list-none [&::-webkit-details-marker]:hidden inline-flex items-center gap-1.5 cursor-pointer rounded-full border border-clay bg-parchment px-3.5 py-1.5 font-[300] text-[0.75rem] text-ink hover:border-moss active:scale-[0.97] transition-[transform,border-color] duration-100 select-none">
                Det tog jeg forbehold for
                <span className="text-stone transition-transform duration-200 group-open:rotate-180" aria-hidden>
                  &#709;
                </span>
              </summary>
              <div className="mt-3 rounded-2xl bg-parchment border border-fog p-5 md:max-w-[680px]">
                {brief.caveats.length ? (
                  <ul className="list-none p-0 m-0 flex flex-col gap-2.5">
                    {brief.caveats.map((c, i) => (
                      <li key={i} className="font-[300] text-[0.85rem] text-stone leading-[1.65]">
                        {c}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="font-[300] text-[0.85rem] text-stone">Finn noterede ingen forbehold.</p>
                )}
              </div>
            </details>
          )}
          {arkiv.length > 1 && (
            <details className="group open:basis-full">
              <summary className="list-none [&::-webkit-details-marker]:hidden inline-flex items-center gap-1.5 cursor-pointer rounded-full border border-clay bg-parchment px-3.5 py-1.5 font-[300] text-[0.75rem] text-ink hover:border-moss active:scale-[0.97] transition-[transform,border-color] duration-100 select-none">
                Tidligere briefs
                <span className="text-stone transition-transform duration-200 group-open:rotate-180" aria-hidden>
                  &#709;
                </span>
              </summary>
              <ul className="list-none p-0 m-0 mt-3 flex flex-wrap gap-1.5">
                {arkiv.map((d) => (
                  <li key={d}>
                    <Link
                      href={`/agenter/finn/${d}`}
                      className="inline-block rounded-full bg-parchment border border-fog px-3 py-1 font-[300] text-[0.75rem] text-stone no-underline hover:border-moss hover:text-ink"
                    >
                      {langDato(d)}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </nav>
      )}
    </div>
  );
}

function Sektionstitel({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mb-3 px-1 font-[400] text-[0.72rem] tracking-[0.14em] uppercase text-stone">
      {children}
    </h2>
  );
}

/** Ét punkt som et lille, afrundet kort. */
function Punktkort({ punkt: p }: { punkt: BriefPunkt }) {
  return (
    <article className="group h-full flex flex-col rounded-2xl bg-parchment border border-fog p-5 transition-[transform,border-color] duration-300 ease-out hover:-translate-y-0.5 hover:border-moss">
      <div className="flex items-center gap-1.5 mb-3 font-[300] text-[0.62rem] tracking-[0.14em] uppercase text-moss">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-moss" />
        {tema(p)}
      </div>
      {p.noegletal && (
        <div className="mb-3">
          <div className="font-[300] text-[1.6rem] text-ink leading-[1.1] tracking-[-0.015em] tabular-nums">{p.noegletal.vaerdi}</div>
          <div className="font-[300] text-[0.72rem] text-stone">{p.noegletal.etiket}</div>
        </div>
      )}
      <h3 className="font-[400] text-[0.98rem] text-ink leading-[1.4] mb-2">{p.title}</h3>
      <p className="font-[300] text-[0.85rem] text-stone leading-[1.65] mb-4">{p.body}</p>
      <div className="mt-auto">
        <p className="rounded-xl bg-sand px-3.5 py-2.5 font-[300] text-[0.82rem] text-ink leading-[1.55] mb-3">
          <span className="block font-[400] text-[0.6rem] tracking-[0.14em] uppercase text-moss mb-0.5">Hvad det betyder</span>
          {p.meaning}
        </p>
        <ul className="list-none p-0 m-0 flex flex-col gap-0.5">
          {p.sources.map((s) => (
            <li key={s.id} className="font-[300] text-[0.68rem] text-stone leading-[1.5] truncate">
              <a href={s.url} rel="noopener" className="text-stone no-underline hover:text-moss" title={s.navn}>
                Kilde: {s.navn}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
