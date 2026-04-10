const tools = [
  {
    name: "DISC Profiltest",
    time: "5 min",
    desc: "Forstå din ledelsesstil og dit teams dynamik.",
  },
  {
    name: "Brandstyrke-scanner",
    time: "3 min",
    desc: "10 spørgsmål der scorer dit brands sundhed.",
  },
  {
    name: "Positioneringskort",
    time: "5 min",
    desc: "Find hvide pletter i dit marked.",
  },
  {
    name: "Unit Economics",
    time: "3 min",
    desc: "Se din break-even og contribution margin.",
  },
];

export default function Tools() {
  return (
    <section id="værktøjer" className="py-20 md:py-28 px-6 md:px-8 max-w-[1100px] mx-auto">
      <div className="text-[0.6rem] tracking-[0.22em] uppercase text-clay font-[300] mb-8">
        Værktøjer
      </div>
      <h2 className="font-[300] text-[2rem] text-ink tracking-[0.03em] mb-4 leading-[1.3]">
        Forstå din virksomhed. Gratis.
      </h2>
      <p className="font-[200] text-[0.95rem] text-stone leading-[1.9] max-w-[560px]">
        Vores værktøjer giver dig indsigt inden du tager kontakt. Brug dem nu
        - de er gratis og kræver ingen tilmelding.
      </p>

      <div className="relative mt-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 select-none">
          {tools.map((t) => (
            <div
              key={t.name}
              className="p-6 border border-fog flex flex-col gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-moss mb-1" />
              <div className="font-[400] text-[0.9rem] text-ink">{t.name}</div>
              <div className="font-[200] text-[0.7rem] text-slate">{t.time}</div>
              <div className="font-[200] text-[0.8rem] text-stone leading-[1.7]">
                {t.desc}
              </div>
            </div>
          ))}
        </div>

        {/* Blur overlay */}
        <div className="absolute inset-0 backdrop-blur-[6px] bg-parchment/40 flex flex-col items-center justify-center">
          <div className="font-[300] text-[0.75rem] tracking-[0.15em] uppercase text-moss mb-2">
            Kommer snart
          </div>
          <div className="w-8 h-px bg-clay" />
        </div>
      </div>
    </section>
  );
}
