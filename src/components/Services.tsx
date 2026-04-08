const services = [
  {
    num: "01",
    name: "Fundament",
    tagline: "Vi skaber retning for din virksomhed.",
    price: "Fra 15.000 kr. - 2-4 uger",
    desc: "Alt det grundlaeggende der skal vaere paa plads foer du kan vokse. Vi bygger dit fundament fra bunden.",
    items: [
      "Positioneringsanalyse og konkurrentscan",
      "Brandidentitet - logo, farver, typografi",
      "Hjemmeside - design og udvikling",
      "Tone of voice og indholdsrammer",
      "Handlingsplan med prioriterede tiltag",
    ],
  },
  {
    num: "02",
    name: "Form",
    tagline: "Vi former din vaekststrategi.",
    price: "Fra 45.000 kr. - 4-8 uger",
    desc: "For virksomheden der har fundamentet men mangler retning for vaekst. Vi gaar i dybden med strategi.",
    items: [
      "Prisstrategi og prisoptimering",
      "Vaekststrategi - Ansoff, blue ocean, markedsanalyse",
      "Forretningsudvikling og skaleringsplan",
      "Kunderejse og konverteringsoptimering",
      "Procesoptimering og automatisering",
    ],
  },
  {
    num: "03",
    name: "Forandring",
    tagline: "Vi implementerer transformation.",
    price: "Fra 90.000 kr. - 2-4 maaneder",
    desc: "For virksomheden der ved hvad der skal ske men har brug for en partner der eksekverer. Hands-on projektledelse.",
    items: [
      "Projektledelse af hele forandringsprocessen",
      "Implementering af nye systemer og processer",
      "Organisationsudvikling og change management",
      "Tech stack-opsaetning - CRM, automatisering, integrationer",
      "Loebende sparring og justering over 3 maaneder",
    ],
  },
];

export default function Services() {
  return (
    <section id="ydelser" className="py-20 md:py-28 px-6 md:px-8 max-w-[1100px] mx-auto">
      <div className="text-[0.6rem] tracking-[0.22em] uppercase text-clay font-[300] mb-8">
        Ydelser
      </div>
      <h2 className="font-[300] text-[2rem] text-ink tracking-[0.03em] mb-4 leading-[1.3]">
        Tre pakker. En filosofi.
      </h2>
      <p className="font-[200] text-[0.95rem] text-stone leading-[1.9] max-w-[560px]">
        Hvert forloeb starter med at forstaa din virksomhed. Derefter bygger vi
        - sammen. Faste priser, klare leverancer, ingen overraskelser.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-clay border border-clay mt-10">
        {services.map((s) => (
          <div
            key={s.num}
            className="bg-parchment p-8 flex flex-col gap-3 hover:bg-sand transition-colors"
          >
            <div className="font-[100] text-[2.5rem] text-fog leading-none">
              {s.num}
            </div>
            <div className="font-[400] text-[1.15rem] text-ink tracking-[0.04em]">
              {s.name}
            </div>
            <div className="font-[300] text-[0.8rem] text-moss italic">
              {s.tagline}
            </div>
            <div className="font-[200] text-[0.75rem] text-slate tracking-[0.04em] mt-1">
              {s.price}
            </div>
            <div className="font-[200] text-[0.85rem] text-stone leading-[1.8]">
              {s.desc}
            </div>
            <ul className="mt-2 flex flex-col gap-1">
              {s.items.map((item, i) => (
                <li
                  key={i}
                  className="font-[200] text-[0.8rem] text-stone leading-[1.7] pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[0.55em] before:w-1 before:h-1 before:rounded-full before:bg-moss"
                >
                  {item}
                </li>
              ))}
            </ul>
            <a
              href="#"
              className="font-[300] text-[0.72rem] tracking-[0.1em] uppercase text-moss mt-auto pt-3 hover:opacity-70 transition-opacity"
            >
              Laes mere &rarr;
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
