import Link from "next/link";
import AliusLogo from "@/components/AliusLogo";
import { PAUSE_FRA } from "@/lib/pulse-pause";

/**
 * Det besøgende ser mens Pulse holder pause.
 *
 * En side der siger hvad der er sket, frem for en 404. Linkene findes
 * stadig fra værktøjssiden og i søgemaskiner, og en død side ville
 * efterlade indtrykket af noget der gik i stykker.
 *
 * Ingen databaseadgang. Det er hele pointen.
 */
export default function PaaPause() {
  return (
    <div className="min-h-screen bg-parchment text-ink font-sans font-light">
      <div className="max-w-[720px] mx-auto px-6 md:px-8 py-8 md:py-12 min-h-screen flex flex-col">
        <header className="flex justify-between items-center pb-10 mb-16 border-b border-fog">
          <Link href="/" aria-label="Alius, til forsiden">
            <AliusLogo width={80} />
          </Link>
          <span className="text-[11px] tracking-[0.3em] uppercase text-stone opacity-60">
            Pulse
          </span>
        </header>

        <div className="flex-1">
          <p className="text-[11px] tracking-[0.3em] uppercase text-moss mb-8">
            På pause
          </p>

          <h1 className="font-fraunces font-light italic text-[clamp(30px,5.5vw,52px)] leading-[1.15] tracking-[-0.02em] mb-8 max-w-[560px]">
            Pulse holder pause.
          </h1>

          <div className="max-w-[520px] space-y-5 text-[16px] leading-[1.75] text-stone">
            <p>
              Pulse hentede dansk økonomisk statistik hver dag og fortolkede
              den. Siden {PAUSE_FRA} står den stille, fordi driften kostede
              mere end den gav.
            </p>
            <p>
              Tallene er der stadig. Godt 193.000 observationer fra 90 serier,
              med hele revisionshistorikken. Der kommer bare ikke nye ind lige
              nu.
            </p>
            <p>
              Skal I bruge økonomiske nøgletal til noget konkret, laver vi det
              som opgave i stedet. Det er alligevel dér det bliver til noget
              der kan bruges.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 mt-12">
            <Link
              href="/kontakt"
              className="font-[300] text-[0.82rem] tracking-[0.08em] uppercase px-7 py-3.5 bg-ink text-parchment border border-ink hover:bg-moss hover:border-moss transition-all no-underline"
            >
              Tag en snak
            </Link>
            <Link
              href="/værktøjer"
              className="font-[300] text-[0.82rem] tracking-[0.08em] uppercase px-7 py-3.5 border border-clay text-ink hover:border-moss hover:text-moss transition-all no-underline"
            >
              Se de andre værktøjer
            </Link>
          </div>
        </div>

        <footer className="mt-20 pt-8 border-t border-fog text-[11px] text-stone opacity-60 tracking-[0.05em]">
          Alius &#183; Den anden vej til vækst
        </footer>
      </div>
    </div>
  );
}
