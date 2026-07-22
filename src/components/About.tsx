const values = [
  "Jeg fjerner kompleksitet.",
  "Jeg bygger færre ting, men bygger dem rigtigt.",
  "Jeg stopper, når løsningen virker.",
];

export default function About() {
  return (
    <section id="om" className="py-20 md:py-28 px-6 md:px-8 max-w-[1100px] mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-10 md:gap-16">
        {/* Ramme: ydre moss-kant + indre billede med fade */}
        <div className="p-[6px] border border-clay/60" style={{ maxHeight: "520px" }}>
          <div className="relative overflow-hidden group h-full border border-clay/30">
            <img
              src="/ali-portrait.png"
              alt="Ali Al-Farhan, grundlægger af ALIUS"
              loading="lazy"
              decoding="async"
              className="w-full object-cover object-top transition-transform duration-[1000ms] ease-out group-hover:scale-[1.015]"
            />
            <div className="absolute bottom-0 left-0 right-0 h-[24px] bg-gradient-to-t from-parchment/60 to-transparent" />
          </div>
        </div>

        <div>
          <h3 className="font-[300] text-[1.4rem] text-ink mb-5">
            Automatisering, der skaber værdi.
          </h3>
          <p className="font-[200] text-[0.92rem] text-stone leading-[1.9] mb-4">
            Jeg hedder Ali, og jeg bygger ALIUS. Jeg udvikler AI agenter,
            automatiseringer og digitale systemer, der fjerner manuelt arbejde,
            skaber overblik og frigør tid til det, der skaber værdi i din
            forretning.
          </p>
          <p className="font-[200] text-[0.92rem] text-stone leading-[1.9] mb-4">
            Min baggrund er ikke et klassisk bureau. Jeg har arbejdet med
            strategi, finans, legal tech, fødevarebranchen og dansk eksport. Jeg
            bygger ikke teknologi for teknologiens skyld. Jeg bygger løsninger,
            der løser konkrete forretningsproblemer.
          </p>
          <p className="font-[200] text-[0.92rem] text-stone leading-[1.9] mb-8">
            <strong className="font-[400] text-ink">Bygger til virkeligheden.</strong>{" "}
            Skaber værdi fra dag ét.
          </p>

          <div className="flex flex-col">
            {values.map((v, i) => (
              <div key={v} className="py-4 border-t border-clay/40 flex gap-5 items-start">
                <span className="text-[8px] tracking-[0.15em] text-clay font-[300] pt-[3px] shrink-0 tabular-nums">
                  0{i + 1}
                </span>
                <div className="font-fraunces font-light italic text-[1.05rem] text-ink">
                  {v}
                </div>
              </div>
            ))}
            <div className="border-t border-clay/40" />
          </div>

          <a
            href="/cv"
            className="font-[200] text-[0.75rem] tracking-[0.1em] uppercase text-stone hover:text-moss transition-colors mt-8 inline-block"
          >
            Se mit CV &rarr;
          </a>
        </div>
      </div>
    </section>
  );
}
