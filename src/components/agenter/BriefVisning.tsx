import Link from "next/link";
import { FinnAvatar } from "@/components/agenter/Avatar";
import Glid from "@/components/agenter/Glid";
import SpoergFinn from "@/components/agenter/SpoergFinn";
import type { BriefPunkt } from "@/lib/agenter/finn/pipeline";
import type { BriefVisning as Brief } from "@/lib/agenter/laes";
import { langDato } from "@/lib/agenter/dato";

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
  return (
    <>
      <div className="animate-fade-up flex items-start gap-5 mb-12 max-w-[680px]">
        <div className="shrink-0 -mt-1">
          <FinnAvatar size={72} />
        </div>
        <div>
          <h1 className="font-[300] text-[1.8rem] md:text-[2.2rem] text-ink leading-[1.25] tracking-[0.01em] mb-2">
            Finn Finans
          </h1>
          <p className="font-[200] text-[0.95rem] text-slate leading-[1.7]">
            {brief ? `Brief, ${langDato(brief.dato)}` : "Ingen brief endnu"}
          </p>
        </div>
      </div>

      {statuslinje && (
        <p className="animate-fade-up max-w-[680px] mb-10 py-3 px-4 border-l-2 border-moss bg-sand font-[300] text-[0.85rem] text-stone leading-[1.7]">
          {statuslinje}
        </p>
      )}

      {brief && (
        <article className="max-w-[920px]">
          <ol className="list-none p-0 m-0 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {brief.items.map((p, i) => (
              <li key={i} className={i === 0 ? "md:col-span-2" : ""}>
                <Glid forsinkelse={i === 0 ? 0 : (i % 2) * 90} className="h-full">
                  <Punktkort punkt={p} nummer={i + 1} stort={i === 0} />
                </Glid>
              </li>
            ))}
          </ol>

          {kanSpoerge && (
            <SpoergFinn
              forslag={brief.items.slice(0, 3).map((p) => `Hvad betyder "${p.title}" for en lille virksomhed?`)}
            />
          )}

          <section className="mt-10 p-6 md:p-8 bg-sand border border-fog">
            <h2 className="font-[300] text-[0.72rem] tracking-[0.15em] uppercase text-slate mb-4">Det tog jeg forbehold for</h2>
            {brief.caveats.length ? (
              <ul className="list-none p-0 m-0 flex flex-col gap-3">
                {brief.caveats.map((c, i) => (
                  <li key={i} className="font-[200] text-[0.9rem] text-stone leading-[1.75]">
                    {c}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-[200] text-[0.9rem] text-stone">Finn noterede ingen forbehold.</p>
            )}
          </section>

          <div className="mt-10">
            <Link
              href={`/agenter/finn/replay/${brief.id}`}
              className="inline-flex font-[300] text-[0.78rem] tracking-[0.08em] uppercase px-6 py-3 border border-ink text-ink no-underline hover:bg-ink hover:text-parchment transition-colors"
            >
              Se hvordan det blev lavet
            </Link>
          </div>
        </article>
      )}

      {arkiv.length > 1 && (
        <nav className="mt-16 pt-8 border-t border-fog max-w-[680px]" aria-label="Tidligere briefs">
          <h2 className="font-[300] text-[0.72rem] tracking-[0.15em] uppercase text-slate mb-4">Arkiv</h2>
          <ul className="list-none p-0 m-0 flex flex-wrap gap-x-5 gap-y-2">
            {arkiv.map((d) => (
              <li key={d}>
                <Link href={`/agenter/finn/${d}`} className="font-[200] text-[0.85rem] text-stone no-underline hover:text-moss">
                  {langDato(d)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </>
  );
}

/** Ét punkt som et kort: tema, nøgletal, påstand, betydning, kilder. */
function Punktkort({ punkt: p, nummer, stort }: { punkt: BriefPunkt; nummer: number; stort: boolean }) {
  return (
    <div
      className={`group h-full flex flex-col border border-fog bg-parchment transition-[transform,border-color] duration-500 ease-out hover:-translate-y-1 hover:border-moss ${
        stort ? "p-6 md:p-10" : "p-6 md:p-7"
      }`}
    >
      <div className="flex items-center justify-between mb-5">
        <span className="flex items-center gap-2 font-[300] text-[0.66rem] tracking-[0.18em] uppercase text-moss">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-moss transition-transform duration-500 group-hover:scale-150" />
          {p.tema ?? "Økonomi"}
        </span>
        <span className="font-[200] text-[0.72rem] text-stone tabular-nums">{String(nummer).padStart(2, "0")}</span>
      </div>

      {p.noegletal && (
        <div className="mb-5">
          <div
            className={`font-[300] text-ink leading-[1.05] tracking-[-0.01em] tabular-nums ${
              stort ? "text-[2.6rem] md:text-[3.4rem]" : "text-[2rem] md:text-[2.3rem]"
            }`}
          >
            {p.noegletal.vaerdi}
          </div>
          <div className="mt-1 font-[300] text-[0.78rem] text-stone">{p.noegletal.etiket}</div>
        </div>
      )}

      <h2 className={`font-[300] text-ink leading-[1.35] mb-3 ${stort ? "text-[1.35rem] md:text-[1.55rem]" : "text-[1.12rem]"}`}>
        {p.title}
      </h2>
      <p className={`font-[200] text-stone leading-[1.8] mb-5 ${stort ? "text-[1rem] md:text-[1.05rem] max-w-[640px]" : "text-[0.95rem]"}`}>
        {p.body}
      </p>

      <div className="mt-auto">
        <p className="mb-5 py-3 px-4 border-l-2 border-moss bg-sand font-[300] text-[0.9rem] text-ink leading-[1.7]">
          <span className="block font-[300] text-[0.62rem] tracking-[0.16em] uppercase text-moss mb-1">Hvad det betyder</span>
          {p.meaning}
        </p>
        <ul className="list-none p-0 m-0 flex flex-col gap-1">
          {p.sources.map((s) => (
            <li key={s.id} className="font-[300] text-[0.72rem] text-stone leading-[1.6]">
              Kilde:{" "}
              <a href={s.url} className="text-stone underline decoration-clay underline-offset-2 hover:text-moss" rel="noopener">
                {s.navn}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

