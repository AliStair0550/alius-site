import type { SelskabsKalender } from "@/lib/regnskaber/nasdaq-kalender";

// Kommende regnskaber fra selskabernes egne finanskalendere. Siger hvem
// der ikke er dækket og hvorfor, så en tom plads ikke ligner "intet sker".

const MAANEDER = ["januar", "februar", "marts", "april", "maj", "juni", "juli", "august", "september", "oktober", "november", "december"];
const dato = (iso: string) => {
  const [, m, d] = iso.split("-").map(Number);
  return `${d}. ${MAANEDER[m - 1]}`;
};

export default function KommendeRegnskaber({ kalendere, idag }: { kalendere: SelskabsKalender[]; idag: string }) {
  const til = new Date(Date.parse(`${idag}T00:00:00Z`) + 90 * 86_400_000).toISOString().slice(0, 10);
  const kommende = kalendere
    .flatMap((k) => k.punkter.filter((p) => p.dato >= idag && p.dato <= til).map((p) => ({ ...p, navn: k.navn, url: k.url })))
    .sort((a, b) => a.dato.localeCompare(b.dato));
  const kendte = kalendere.filter((k) => k.status === "kalender").length;
  const pdf = kalendere.filter((k) => k.status === "kun_pdf").map((k) => k.navn);
  const ingen = kalendere.filter((k) => k.status === "ingen" || k.status === "ingen_datoer").map((k) => k.navn);
  const fejl = kalendere.filter((k) => k.status === "fejl").map((k) => k.navn);

  return (
    <div className="rounded-2xl bg-parchment border border-fog p-5 md:p-6">
      {kommende.length > 0 ? (
        <ul className="list-none p-0 m-0 divide-y divide-fog">
          {kommende.map((p) => (
            <li key={`${p.navn}-${p.dato}`} className="py-2.5 grid grid-cols-[6.5rem_1fr] gap-3 items-baseline">
              <span className="font-[400] text-[0.88rem] text-ink tabular-nums">{dato(p.dato)}</span>
              <span className="font-[300] text-[0.88rem] text-stone">
                <a href={p.url} rel="noopener" className="text-ink no-underline hover:text-moss">
                  {p.navn}
                </a>
                , {p.begivenhed.toLowerCase()}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-[300] text-[0.88rem] text-stone">Ingen kendte regnskabsdatoer de næste 90 dage blandt de selskaber, hvis kalender kan læses.</p>
      )}
      <p className="mt-4 font-[300] text-[0.72rem] text-slate leading-[1.55]">
        Datoer fra selskabernes egne finanskalendere på Nasdaq Copenhagen, kendt for {kendte} af {kalendere.length} selskaber.
        {pdf.length > 0 && ` Kun i en vedhæftet PDF, som ikke læses: ${pdf.join(", ")}.`}
        {ingen.length > 0 && ` Ingen finanskalender i kilden: ${ingen.join(", ")}.`}
        {fejl.length > 0 && ` Kunne ikke hentes: ${fejl.join(", ")}.`}
      </p>
    </div>
  );
}
