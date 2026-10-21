// Ikoner til løsningerne i Maskinrummet. Tegnet til Alius: tynd blæk-
// streg, ét moss-element der peger på hvad maskinen gør. Ingen fyld-
// flader, ingen skygger. 24x24, skaleres af feltet omkring.

type Tegning = () => React.ReactNode;

const S = { fill: "none", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const ink = "stroke-ink";
const moss = "stroke-moss";

const IKONER: Record<string, Tegning> = {
  // En opslået bog med et spørgsmål der får svar
  "Håndbogen": () => (
    <>
      <path className={ink} {...S} d="M3 5.5c2.6-1 5.4-1 8 .8v13c-2.6-1.8-5.4-1.8-8-.8z" />
      <path className={ink} {...S} d="M21 5.5c-2.6-1-5.4-1-8 .8v13c2.6-1.8 5.4-1.8 8-.8z" />
      <path className={moss} {...S} d="M15.3 9.3l1.4 1.4 2.6-2.8" />
    </>
  ),
  // Søjler med en linje skrevet hen over
  "Ledelsesindsigten": () => (
    <>
      <path className={ink} {...S} d="M4 20V13M9 20V9M14 20v-6M19 20V6" />
      <path className={moss} {...S} d="M3 9.5l5-3.5 5 4 6.5-5.5" />
    </>
  ),
  // Mønter med en kurve der ser frem
  "Cash Management Agenten": () => (
    <>
      <ellipse className={ink} {...S} cx="8.5" cy="17" rx="5" ry="2" />
      <path className={ink} {...S} d="M3.5 13.5c0 1.1 2.2 2 5 2s5-.9 5-2M3.5 13.5c0-1.1 2.2-2 5-2s5 .9 5 2M3.5 13.5V17M13.5 13.5V17" />
      <path className={moss} {...S} d="M14 9l3-3 2 2 3-4M19.5 4H22v2.5" />
    </>
  ),
  // En person under en lup
  "Kandidatscanneren": () => (
    <>
      <circle className={ink} {...S} cx="10" cy="10" r="6.5" />
      <path className={ink} {...S} d="M15 15l5.5 5.5" />
      <circle className={moss} {...S} cx="10" cy="8.6" r="1.8" />
      <path className={moss} {...S} d="M6.9 13.3c.7-1.5 1.8-2.2 3.1-2.2s2.4.7 3.1 2.2" />
    </>
  ),
  // Et skjold med flueben
  "Compliance Agenten": () => (
    <>
      <path className={ink} {...S} d="M12 3l7 2.6v5.6c0 4.4-3 7.7-7 9.8-4-2.1-7-5.4-7-9.8V5.6z" />
      <path className={moss} {...S} d="M8.8 12l2.2 2.2 4.3-4.6" />
    </>
  ),
  // En pulslinje i en ramme
  "Pulsmesteren": () => (
    <>
      <rect className={ink} {...S} x="3" y="4" width="18" height="16" rx="3" />
      <path className={moss} {...S} d="M5 12.5h3.2l1.6-4 2.4 8 1.8-5.2 1.2 1.2H19" />
    </>
  ),
  // Et prismærke med et øje
  "Prisvagten": () => (
    <>
      <path className={ink} {...S} d="M3.5 12.6V4.5a1 1 0 0 1 1-1h8.1L21 11.9a1 1 0 0 1 0 1.4l-7.7 7.7a1 1 0 0 1-1.4 0z" />
      <circle className={ink} {...S} cx="7.8" cy="7.8" r="1.3" />
      <path className={moss} {...S} d="M10.6 14.2c1.1-1.6 2.3-2.4 3.6-2.4s2.5.8 3.6 2.4c-1.1 1.6-2.3 2.4-3.6 2.4s-2.5-.8-3.6-2.4z" />
    </>
  ),
  // Et dokument med en klokke
  "Udbudsvagten": () => (
    <>
      <path className={ink} {...S} d="M14 3H6.5a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h6M14 3l4.5 4.5V11M14 3v4.5h4.5" />
      <path className={ink} {...S} d="M8 11h4.5M8 14h3" />
      <path className={moss} {...S} d="M15 18.5v-2.2a2.6 2.6 0 0 1 5.2 0v2.2l.8 1H14.2zM16.7 21h1.8" />
    </>
  ),
  // En skive med et ramt midtpunkt
  "Leadmotoren": () => (
    <>
      <circle className={ink} {...S} cx="11" cy="13" r="7.5" />
      <circle className={ink} {...S} cx="11" cy="13" r="4" />
      <path className={moss} {...S} d="M11 13l8.5-8.5M16.5 4.5h3v3" />
    </>
  ),
  // En faktura med et ur
  "Rykkerrobotten": () => (
    <>
      <path className={ink} {...S} d="M5 3h10l3 3v6M5 3v18l2-1.2 2 1.2 2-1.2" />
      <path className={ink} {...S} d="M8 8h6M8 11.5h4" />
      <circle className={moss} {...S} cx="17" cy="17" r="4" />
      <path className={moss} {...S} d="M17 15.2V17l1.3 1" />
    </>
  ),
  // En kuvert der åbner sig
  "Nyhedsagenten": () => (
    <>
      <path className={ink} {...S} d="M3.5 9.5V19a1 1 0 0 0 1 1h15a1 1 0 0 0 1-1V9.5L12 15z" />
      <path className={ink} {...S} d="M3.5 9.5L12 4l8.5 5.5" />
      <path className={moss} {...S} d="M8 8.5h8M9.5 11h5" />
    </>
  ),
  // En måler på et panel
  "Marketingdashboardet": () => (
    <>
      <rect className={ink} {...S} x="3" y="4" width="18" height="16" rx="3" />
      <path className={ink} {...S} d="M6.5 15.5a5.5 5.5 0 0 1 11 0" />
      <path className={moss} {...S} d="M12 15.5l3-3.6" />
      <circle className="fill-moss" cx="12" cy="15.5" r="1.3" />
    </>
  ),
  // En radar der fanger et punkt
  "SEO-radaren": () => (
    <>
      <circle className={ink} {...S} cx="12" cy="12" r="8.5" />
      <circle className={ink} {...S} cx="12" cy="12" r="4.5" />
      <path className={moss} {...S} d="M12 12l6-6" />
      <circle className="fill-moss" cx="15.7" cy="13.8" r="1.2" />
    </>
  ),
  // Et ord-felt med en gnist: bliver I nævnt
  "AI-synlighedsrapporten": () => (
    <>
      <path className={ink} {...S} d="M4 5.5h11a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H9l-4 3.5V15H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1z" />
      <path className={ink} {...S} d="M6.5 9h6M6.5 11.5h4" />
      <path className={moss} {...S} d="M19 10.5v3M17.5 12h3M20 4.5v2M19 5.5h2" />
    </>
  ),
  // En megafon med pile ud og ind
  "Annonceautomaten": () => (
    <>
      <path className={ink} {...S} d="M4 10v4a1 1 0 0 0 1 1h2l6 4V5L7 9H5a1 1 0 0 0-1 1zM7 15l1 4.5" />
      <path className={moss} {...S} d="M16.5 9.5c.9.7 1.4 1.6 1.4 2.5s-.5 1.8-1.4 2.5M19 7c1.6 1.3 2.5 3 2.5 5s-.9 3.7-2.5 5" />
    </>
  ),
};

export default function MaskinIkon({ navn }: { navn: string }) {
  const tegning = IKONER[navn];
  return (
    <div className="shrink-0 w-10 h-10 rounded-xl bg-parchment border border-clay/70 flex items-center justify-center transition-colors duration-300 group-hover:border-moss/60" aria-hidden>
      <svg viewBox="0 0 24 24" width="24" height="24">
        {tegning ? tegning() : <circle className="fill-moss" cx="12" cy="12" r="2.5" />}
      </svg>
    </div>
  );
}

