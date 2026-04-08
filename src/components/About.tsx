const values = [
  { label: "Klarhed", desc: "Vi fjerner kompleksitet. Aldrig tilføjer." },
  { label: "Håndværk", desc: "Færre ting, gjort rigtigt." },
  { label: "Handling", desc: "Strategi uden eksekvering er ufuldstændig." },
  {
    label: "Ærlighed",
    desc: "Vi siger hvad vi mener. Også når det er ubehageligt.",
  },
];

export default function About() {
  return (
    <section id="om" className="py-20 md:py-28 px-6 md:px-8 max-w-[1100px] mx-auto">
      <div className="text-[0.6rem] tracking-[0.22em] uppercase text-clay font-[300] mb-8">
        Om
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-10 md:gap-16">
        {/* Photo placeholder */}
        <div className="aspect-[3/4] bg-fog flex items-center justify-center relative max-h-[500px]">
          <div className="w-20 h-20 rounded-full bg-moss opacity-25" />
          <span className="absolute bottom-4 left-4 text-[0.55rem] tracking-[0.15em] uppercase text-slate font-[300]">
            Foto placeholder
          </span>
        </div>

        <div>
          <h3 className="font-[300] text-[1.4rem] text-ink mb-5">
            Strategi og eksekvering.
            <br />
            Fra samme hånd.
          </h3>
          <p className="font-[200] text-[0.92rem] text-stone leading-[1.9] mb-4">
            Jeg hedder Alix. Jeg bygger virksomheder - ikke PowerPoints. Med
            baggrund i forretningsudvikling og teknisk eksekvering hjælper jeg
            SMV&apos;er med at gå fra uklar retning til konkret fundament.
          </p>
          <p className="font-[200] text-[0.92rem] text-stone leading-[1.9] mb-8">
            Alius blev grundlagt med en overbevisning: rådgivning uden
            implementering er ufuldstændigt arbejde. Derfor leverer vi begge
            dele.
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
        </div>
      </div>
    </section>
  );
}
