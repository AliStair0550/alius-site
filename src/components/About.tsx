const values = [
  { label: "Klarhed", desc: "Vi fjerner kompleksitet. Aldrig tilføjer." },
  { label: "Håndværk", desc: "Vi bygger færre ting, men bygger dem rigtigt." },
  { label: "Handling", desc: "En plan uden eksekvering er bare papir. Vi stopper når løsningen virker." },
];

export default function About() {
  return (
    <section id="om" className="py-20 md:py-28 px-6 md:px-8 max-w-[1100px] mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-10 md:gap-16">
        <div className="relative overflow-hidden group" style={{ maxHeight: "500px" }}>
          <img
            src="/ali.jpg"
            alt="Ali"
            className="w-full object-cover object-top transition-transform duration-[1000ms] ease-out group-hover:scale-[1.015]"
            style={{ mixBlendMode: "multiply" }}
          />
          <div className="absolute bottom-0 left-0 right-0 h-[30px] bg-gradient-to-t from-parchment/60 to-transparent" />
          <div className="absolute bottom-0 left-[5%] right-[5%] h-[2px] bg-clay" />
        </div>

        <div>
          <h3 className="font-[300] text-[1.4rem] text-ink mb-5">
            Brand, strategi og teknologi. Bygget som ét.
          </h3>
          <p className="font-[200] text-[0.92rem] text-stone leading-[1.9] mb-4">
            Jeg hedder Ali. Jeg bygger løsninger, ikke præsentationer. Med
            baggrund i forretningsudvikling, branding og tech udvikling
            hjælper jeg virksomheder med at vokse gennem løsninger hvor strategi,
            brand og teknologi er bygget sammen.
          </p>
          <p className="font-[200] text-[0.92rem] text-stone leading-[1.9] mb-8">
            Alius blev grundlagt med en overbevisning: De bedste løsninger
            opstår når brand, strategi og teknologi ikke adskilles, men
            kombineres fra start.
          </p>

          <div className="flex flex-col gap-3">
            {values.map((v) => (
              <div key={v.label} className="flex items-baseline gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-moss shrink-0 mt-0.5" />
                <div className="font-[200] text-[0.85rem] text-stone leading-[1.6]">
                  <strong className="font-[400] text-ink">{v.label}</strong> -{" "}
                  {v.desc}
                </div>
              </div>
            ))}
          </div>

          <a
            href="#"
            className="font-[200] text-[0.75rem] tracking-[0.1em] uppercase text-stone border-b border-stone pb-0.5 hover:text-moss hover:border-moss transition-colors mt-8 inline-block"
          >
            Se alle projekter og mit CV &rarr;
          </a>
        </div>
      </div>
    </section>
  );
}
