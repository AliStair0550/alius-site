import { opsummerOversigt, periodeMaaneder, valutaEnhed } from "@/lib/agenter/kilder/regnskaber";
import type { RegnskabsLinje } from "@/lib/agenter/omraade-data";

// De store børsnoterede selskabers seneste regnskab, regnet i kode.
// Beløb i hvert selskabs egen valuta; kun procenterne kan sammenlignes på
// tværs. Perioderne er ikke ens: et kvartal hos de fleste, et halvår hos
// dem der ikke aflægger kvartalsregnskab.

const daTal = (v: number, dec: number) => v.toLocaleString("da-DK", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const mio = (v: number) => daTal(Math.round(v / 1e6), 0);
const pct = (v: number) => `${v > 0 ? "+" : v < 0 ? "-" : ""}${daTal(Math.abs(v), 1)} %`;

export default function RegnskabsOversigt({ linjer }: { linjer: RegnskabsLinje[] }) {
  const med = linjer.filter((l) => l.udsnit);
  const uden = linjer.filter((l) => !l.udsnit);
  const sorteret = [...med].sort((a, b) => (b.udsnit!.aendring ?? -Infinity) - (a.udsnit!.aendring ?? -Infinity));
  const o = opsummerOversigt(med.map((l) => l.udsnit!.aendring));

  return (
    <div className="rounded-2xl bg-parchment border border-fog p-5 md:p-6">
      {o.median !== null && (
        <p className="font-[300] text-[1rem] md:text-[1.1rem] text-ink leading-[1.55] max-w-[720px]">
          {o.hoejere} af {o.med} selskaber havde højere omsætning i deres seneste regnskab end i samme periode året før. Medianen er {pct(o.median)}.
        </p>
      )}
      <p className="mt-2 font-[300] text-[0.78rem] text-stone leading-[1.55] max-w-[720px]">
        Beløb i mio. i selskabets egen regnskabsvaluta. Perioden er den korteste i regnskabet, oftest et kvartal. Regnskaberne er hentet fra
        Erhvervsstyrelsen, som modtager dem dage til uger efter selskabets børsmeddelelse.
      </p>

      <ul className="list-none p-0 m-0 mt-5 divide-y divide-fog">
        {sorteret.map(({ cvr, navn, udsnit: u }) => (
          <li key={cvr} className="py-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5">
            <span className="font-[400] text-[0.9rem] text-ink">{navn}</span>
            <span className={`font-[400] text-[0.9rem] tabular-nums text-right ${u!.aendring !== null && u!.aendring < 0 ? "text-stone" : "text-moss"}`}>
              {u!.aendring !== null ? pct(u!.aendring) : "intet år før"}
            </span>
            <span className="font-[300] text-[0.75rem] text-stone">
              {periodeMaaneder(u!.omsaetning.start, u!.omsaetning.slut)}: omsætning {mio(u!.omsaetning.vaerdi)} {valutaEnhed(u!.valuta)}
            </span>
            <span className="font-[300] text-[0.75rem] text-stone text-right tabular-nums">
              {u!.resultat ? `resultat ${mio(u!.resultat.nu.vaerdi)}${u!.resultat.foer ? ` (${mio(u!.resultat.foer.vaerdi)})` : ""}` : ""}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 font-[300] text-[0.7rem] text-slate">Resultat efter skat; året før i parentes. Kilde: Erhvervsstyrelsen, selskabernes ESEF-regnskaber.</p>
      {uden.length > 0 && (
        <p className="mt-1 font-[300] text-[0.7rem] text-slate">Mangler: {uden.map((l) => `${l.navn} (${l.hvorforIkke})`).join(", ")}.</p>
      )}
    </div>
  );
}
