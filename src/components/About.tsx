const values = [
  { label: "Klarhed", desc: "Vi fjerner kompleksitet. Aldrig tilføjer." },
  { label: "Håndværk", desc: "Vi bygger færre ting, men bygger dem rigtigt." },
  { label: "Handling", desc: "En plan uden eksekvering er bare papir. Vi stopper når løsningen virker." },
  { label: "Ærlighed", desc: "Vi siger hvad vi mener. Også når det er ubehageligt. Du fortjener sandheden." },
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
            Brand, strategi og teknologi. Bygget som ét.
          </h3>
          <p className="font-[200] text-[0.92rem] text-stone leading-[1.9] mb-4">
            Jeg hedder Alix. Jeg bygger løsninger - ikke præsentationer. Med
            baggrund i forretningsudvikling, branding og teknisk eksekvering
            hjælper jeg virksomheder med at vokse gennem løsninger hvor strategi,
            brand og teknologi er bygget sammen.
          </p>
          <p className="font-[200] text-[0.92rem] text-stone leading-[1.9] mb-8">
            Alius blev grundlagt med en overbevisning: de bedste løsninger opstår
            når brand, strategi og teknologi ikke adskilles - men kombineres fra
            start. Derfor mestrer vi alle tre.
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
