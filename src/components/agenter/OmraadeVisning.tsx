import Link from "next/link";
import Glid from "@/components/agenter/Glid";
import { AfsnitTekst, DagensKort, Elpris, Sektionstitel, omraadeSti } from "@/components/agenter/AnalyseVisning";
import type { Analyse } from "@/lib/agenter/finn/analyse";
import { OMRAADER, type Omraade } from "@/lib/agenter/finn/omraader";
import type { OmraadeSerie, OmraadeTal, RegnskabsLinje } from "@/lib/agenter/omraade-data";
import RegnskabsOversigt from "@/components/agenter/RegnskabsOversigt";
import KommendeRegnskaber from "@/components/agenter/KommendeRegnskaber";
import type { SelskabsKalender } from "@/lib/regnskaber/nasdaq-kalender";
import SpoergFinn from "@/components/agenter/SpoergFinn";
import { periodeTekst } from "@/lib/agenter/kilder/pulse";
import { formatAendring, formatVaerdi } from "@/lib/pulse-enheder";
import { langDato } from "@/lib/agenter/dato";

// Et område, dybt: dagens analyse hvis den handler om området, Finns
// læsning af området, og tallene selv med fem års forløb. Tallene kommer
// direkte fra Pulse og er ikke skrevet af en model.

export default function OmraadeVisning({
  o,
  analyse,
  briefDato,
  caveats,
  tal,
  regnskaber,
  kalendere,
  idag,
}: {
  o: Omraade;
  analyse: Analyse | null;
  briefDato: string | null;
  caveats: string[];
  tal: OmraadeTal;
  /** Kun på siden om virksomheder. */
  regnskaber?: RegnskabsLinje[];
  /** Kun på siden om virksomheder. null når kalenderne ikke kunne hentes. */
  kalendere?: SelskabsKalender[] | null;
  idag: string;
}) {
  const laesning = analyse?.omraader[o.noegle];
  const usaedvanligt = analyse?.usaedvanligt.filter((u) => u.omraade === o.noegle) ?? [];
  const nyt = analyse?.nyt.filter((n) => n.omraade === o.noegle) ?? [];
  const medier = analyse?.medier.filter((m) => m.omraade === o.noegle) ?? [];
  // Hvorfor der ikke er en læsning i dag, som Finn selv skrev det.
  const hvorforIkke = caveats.find((c) => c.startsWith("Ingen holdbar analyse i dag for:") && c.includes(o.navn));

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      <header>
        <div className="font-[300] text-[0.66rem] tracking-[0.14em] uppercase text-moss mb-2">Område</div>
        <h1 className="font-[300] text-[1.9rem] md:text-[2.4rem] text-ink leading-[1.1] tracking-[-0.015em]">{o.navn}</h1>
        <p className="mt-3 font-[300] text-[1rem] text-stone leading-[1.6] max-w-[640px]">{o.beskrivelse}</p>
        <nav aria-label="Områder" className="mt-5 flex flex-wrap gap-1.5">
          {OMRAADER.map((x) => (
            <Link
              key={x.noegle}
              href={omraadeSti(x.noegle)}
              aria-current={x.noegle === o.noegle ? "page" : undefined}
              className={`inline-flex rounded-full border px-3 py-1 font-[300] text-[0.75rem] no-underline active:scale-[0.97] transition-[transform,border-color] duration-100 ${
                x.noegle === o.noegle ? "border-moss bg-moss text-parchment" : "border-clay bg-parchment text-ink hover:border-moss"
              }`}
            >
              {x.navn}
            </Link>
          ))}
        </nav>
      </header>

      {analyse && (
        <SpoergFinn
          omraade={{ noegle: o.noegle, navn: o.navn }}
          forslag={[
            ...(laesning ? [`Hvad betyder "${laesning.overskrift}" for mig?`] : []),
            ...(o.noegle === "energi" && analyse.elpris.length ? ["Hvornår er strømmen billigst i dag?"] : []),
            `Hvad er det vigtigste tal i ${o.navn.toLowerCase()} lige nu?`,
          ]}
        />
      )}

      {analyse?.dagens?.omraade === o.noegle && (
        <section aria-labelledby="dagens-titel">
          <Sektionstitel id="dagens-titel">Dagens analyse handler om {o.navn.toLowerCase()}</Sektionstitel>
          <Glid>
            <DagensKort d={analyse.dagens} />
          </Glid>
        </section>
      )}

      <section aria-labelledby="laesning-titel">
        <Sektionstitel id="laesning-titel">Finns læsning{briefDato ? `, ${langDato(briefDato)}` : ""}</Sektionstitel>
        {laesning ? (
          <article className="rounded-2xl bg-parchment border border-fog p-5 md:p-7">
            <h2 className="font-[300] text-[1.25rem] md:text-[1.45rem] text-ink leading-[1.25] tracking-[-0.01em] mb-4">{laesning.overskrift}</h2>
            <div className="flex flex-col gap-4 max-w-[720px]">
              {laesning.afsnit.map((a, i) => (
                <AfsnitTekst key={i} afsnit={a} />
              ))}
            </div>
          </article>
        ) : (
          <p className="rounded-2xl bg-parchment border border-fog px-5 py-4 font-[300] text-[0.88rem] text-stone leading-[1.6]">
            {!analyse
              ? "Finn har ikke skrevet en analyse endnu. Tallene herunder kommer direkte fra kilderne."
              : hvorforIkke
                ? "Finns læsning af området holdt ikke hans selvtjek i dag og vises derfor ikke. Tallene herunder kommer direkte fra kilderne."
                : "Briefen er fra før områdesiderne og har ingen læsning af området. Tallene herunder kommer direkte fra kilderne."}
          </p>
        )}
      </section>

      {o.noegle === "energi" && analyse && analyse.elpris.length > 0 && (
        <section aria-labelledby="elpris-titel">
          <Sektionstitel id="elpris-titel">Elprisen i dag, time for time</Sektionstitel>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
            {analyse.elpris.map((e) => (
              <Elpris key={e.kode} dag={e} />
            ))}
          </div>
        </section>
      )}

      {(usaedvanligt.length > 0 || nyt.length > 0) && (
        <section aria-labelledby="bevaeger-titel">
          <Sektionstitel id="bevaeger-titel">Det der bevæger sig</Sektionstitel>
          <ul className="list-none p-0 m-0 grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {usaedvanligt.map((u) => (
              <li key={`u-${u.id}`} className="rounded-2xl bg-parchment border border-fog p-4">
                <span className="block font-[400] text-[0.9rem] text-ink">
                  {u.opad ? "↑" : "↓"} {u.navn}: <span className="tabular-nums">{u.vaerdi}</span>
                </span>
                <span className="block mt-0.5 font-[300] text-[0.78rem] text-stone">{u.tekst}, {u.periode}</span>
              </li>
            ))}
            {nyt.map((n) => (
              <li key={`n-${n.id}`} className="rounded-2xl bg-parchment border border-fog p-4">
                <span className="block font-[300] text-[0.6rem] tracking-[0.14em] uppercase text-moss mb-1">Nyt tal</span>
                <span className="block font-[400] text-[0.9rem] text-ink">
                  {n.navn}, {n.periode}: <span className="tabular-nums">{n.vaerdi}</span>
                </span>
                {n.aendring && <span className="block mt-0.5 font-[300] text-[0.78rem] text-stone">{n.aendring}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {kalendere !== undefined && (
        <section aria-labelledby="kalender-titel">
          <Sektionstitel id="kalender-titel">Kommende regnskaber</Sektionstitel>
          {kalendere ? (
            <KommendeRegnskaber kalendere={kalendere} idag={idag} />
          ) : (
            <p className="rounded-2xl bg-parchment border border-fog px-5 py-4 font-[300] text-[0.85rem] text-stone">
              Selskabernes finanskalendere kunne ikke hentes fra Nasdaq lige nu.
            </p>
          )}
        </section>
      )}

      {regnskaber && regnskaber.length > 0 && (
        <section aria-labelledby="regnskaber-titel">
          <Sektionstitel id="regnskaber-titel">De store børsnoterede selskaber, seneste regnskab</Sektionstitel>
          <RegnskabsOversigt linjer={regnskaber} />
        </section>
      )}

      <section aria-labelledby="tal-titel">
        <Sektionstitel id="tal-titel">Tallene, de seneste fem år</Sektionstitel>
        <ul className="list-none p-0 m-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tal.serier.map((s, i) => (
            <li key={s.id}>
              <Glid forsinkelse={(i % 3) * 60} className="h-full">
                <SerieKort s={s} />
              </Glid>
            </li>
          ))}
        </ul>
        {tal.mangler.length > 0 && (
          <p className="mt-3 px-1 font-[300] text-[0.75rem] text-stone">Kunne ikke vises: {tal.mangler.join("; ")}.</p>
        )}
      </section>

      {medier.length > 0 && (
        <section aria-labelledby="medier-titel">
          <Sektionstitel id="medier-titel">I medierne</Sektionstitel>
          <ul className="list-none p-0 m-0 grid grid-cols-1 md:grid-cols-2 gap-3">
            {medier.map((m, i) => (
              <li key={i} className="rounded-2xl bg-parchment border border-fog p-5">
                <h3 className="font-[400] text-[0.98rem] text-ink leading-[1.4] mb-2">{m.titel}</h3>
                {m.kommentar && <AfsnitTekst afsnit={m.kommentar} />}
                <ul className="list-none p-0 m-0 mt-3 flex flex-col gap-1">
                  {m.artikler.map((x) => (
                    <li key={x.url} className="font-[300] text-[0.75rem] leading-[1.45]">
                      <a href={x.url} rel="noopener" className="text-stone no-underline hover:text-moss">
                        {x.titel}
                      </a>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav className="flex flex-wrap gap-2">
        <Link
          href="/agenter/finn"
          className="inline-flex rounded-full border border-clay bg-parchment px-3.5 py-1.5 font-[300] text-[0.75rem] text-ink no-underline hover:border-moss active:scale-[0.97] transition-[transform,border-color] duration-100"
        >
          Tilbage til dagens brief
        </Link>
      </nav>
    </div>
  );
}

/** Én serie: seneste tal, ændring mod året før og en lille kurve. */
function SerieKort({ s }: { s: OmraadeSerie }) {
  const nu = new Date(`${s.seneste.periode}T00:00:00Z`);
  const aendring =
    s.aarFoer !== null ? formatAendring(s.seneste.vaerdi - s.aarFoer.vaerdi, s.aarFoer.vaerdi, s.unit, "end året før") : null;
  return (
    <Link
      href={`/pulse/serie/${encodeURIComponent(s.id)}`}
      className="flex h-full flex-col rounded-2xl bg-parchment border border-fog p-4 no-underline hover:border-moss transition-colors duration-150"
    >
      <span className="font-[400] text-[0.85rem] text-ink leading-[1.35]">{s.navn}</span>
      <span className="mt-2 font-[300] text-[1.35rem] text-ink leading-[1.1] tracking-[-0.015em] tabular-nums">{formatVaerdi(s.seneste.vaerdi, s.unit)}</span>
      <span className="mt-0.5 font-[300] text-[0.72rem] text-stone">{periodeTekst(nu, s.frekvens)}</span>
      {aendring && <span className="mt-1 font-[300] text-[0.75rem] text-stone leading-[1.4]">{aendring}</span>}
      <Kurve punkter={s.kurve} navn={s.navn} />
      <span className="mt-auto pt-2 font-[300] text-[0.62rem] text-slate">{s.attribution}</span>
    </Link>
  );
}

/** Månedsgennemsnit som en tynd linje. Nyeste punkt markeret. */
function Kurve({ punkter, navn }: { punkter: { periode: string; vaerdi: number }[]; navn: string }) {
  if (punkter.length < 2) return null;
  const B = 240;
  const H = 56;
  const min = Math.min(...punkter.map((p) => p.vaerdi));
  const max = Math.max(...punkter.map((p) => p.vaerdi));
  const spaend = max - min || 1;
  const xy = punkter.map((p, i) => [(i / (punkter.length - 1)) * (B - 6) + 3, H - 4 - ((p.vaerdi - min) / spaend) * (H - 8)] as const);
  const [sx, sy] = xy[xy.length - 1];
  const foerste = punkter[0].periode.slice(0, 4);
  const sidste = punkter[punkter.length - 1].periode.slice(0, 4);
  return (
    <figure className="m-0 mt-3">
      <svg viewBox={`0 0 ${B} ${H}`} className="w-full h-14" role="img" aria-label={`${navn}, månedsgennemsnit fra ${foerste} til ${sidste}`}>
        <polyline points={xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")} fill="none" className="stroke-moss" strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={sx} cy={sy} r={2.6} className="fill-moss" />
      </svg>
      <figcaption className="flex justify-between font-[300] text-[0.6rem] text-slate tabular-nums" aria-hidden>
        <span>{foerste}</span>
        <span>{sidste}</span>
      </figcaption>
    </figure>
  );
}
