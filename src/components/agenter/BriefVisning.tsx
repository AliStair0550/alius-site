import Link from "next/link";
import { FinnAvatar } from "@/components/agenter/Avatar";
import type { BriefVisning as Brief, KoerselStatus } from "@/lib/agenter/laes";
import { langDato } from "@/lib/agenter/dato";

/**
 * En linje om dagens kørsel, når den viste brief ikke er dagens.
 * Hver tilstand siges for sig: stoppet af budget er ikke det samme som
 * fejlet, og "ikke kl. 6 endnu" er ikke det samme som "udeblevet".
 */
export function dagensStatus(idag: string, time: number, vist: Brief | null, seneste: KoerselStatus | null): string | null {
  if (vist && vist.dato === idag) return null;
  const fra = vist ? ` Her er briefen fra ${langDato(vist.dato)}.` : "";
  if (seneste && seneste.dato === idag) {
    if (seneste.status === "BUDGET_STOPPED") return `Dagens brief blev stoppet af budgetloftet.${fra}`;
    if (seneste.status === "FAILED") return `Dagens brief blev ikke færdig.${fra}`;
    if (seneste.status === "RUNNING") return `Finn arbejder på dagens brief.${fra}`;
  }
  if (time < 7) return `Dagens brief kommer kl. 6.${fra}`;
  return `Dagens brief er ikke kommet.${fra}`;
}

export default function BriefVisning({
  brief,
  statuslinje,
  arkiv,
}: {
  brief: Brief | null;
  statuslinje: string | null;
  arkiv: string[];
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
        <article className="max-w-[680px]">
          <ol className="list-none p-0 m-0">
            {brief.items.map((p, i) => (
              <li
                key={i}
                className="animate-fade-up py-8 border-t border-fog first:border-t-0 first:pt-0"
                style={{ animationDelay: `${80 + i * 70}ms` }}
              >
                <h2 className="font-[300] text-[1.2rem] md:text-[1.3rem] text-ink leading-[1.4] mb-3">{p.title}</h2>
                <p className="font-[200] text-[1rem] text-stone leading-[1.85] mb-4">{p.body}</p>
                <p className="font-[300] text-[0.92rem] text-ink leading-[1.75] mb-4">
                  <span className="text-moss">Hvad det betyder. </span>
                  {p.meaning}
                </p>
                <ul className="list-none p-0 m-0 flex flex-col gap-1">
                  {p.sources.map((s) => (
                    <li key={s.id} className="font-[200] text-[0.75rem] text-slate leading-[1.6]">
                      Kilde:{" "}
                      <a href={s.url} className="text-slate underline decoration-clay underline-offset-2 hover:text-moss" rel="noopener">
                        {s.navn}
                      </a>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>

          <section className="mt-6 pt-8 border-t border-clay">
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
