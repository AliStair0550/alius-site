import Link from "next/link";

const comingSoon = [
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
        Værktøjer, der styrker din forretning.
      </h2>
      <p className="font-[200] text-[0.95rem] text-stone leading-[1.9] max-w-[560px]">
        Vores værktøjer giver dig indsigt inden du tager kontakt. De er gratis og kræver ingen tilmelding.
      </p>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Active: Tankeprofil */}
        <Link
          href="/tankeprofil"
          className="p-6 border border-moss flex flex-col gap-2 group hover:bg-moss/5 transition-colors"
        >
          <div className="w-2 h-2 rounded-full bg-moss mb-1" />
          <div className="font-[400] text-[0.9rem] text-ink">Personlighedsprofil</div>
          <div className="font-[200] text-[0.7rem] text-slate">Personlighedsprofil · 4 min</div>
          <div className="font-[200] text-[0.8rem] text-stone leading-[1.7] flex-1">
            En personlighedsprofil, der giver et klart billede af, hvor du naturligt finder energi, og hvor du kan have blinde vinkler eller oversete muligheder.
          </div>
          <div className="font-[300] text-[0.72rem] tracking-[0.1em] uppercase text-moss mt-2 group-hover:opacity-70 transition-opacity">
            Start testen &rarr;
          </div>
        </Link>

        {/* Active: Pulse */}
        <Link
          href="/pulse/ledighed"
          className="p-6 border border-moss flex flex-col gap-2 group hover:bg-moss/5 transition-colors"
        >
          <div className="w-2 h-2 rounded-full bg-moss mb-1" />
          <div className="font-[400] text-[0.9rem] text-ink">Ledighedspuls</div>
          <div className="font-[200] text-[0.7rem] text-slate">Data · Opdateres månedligt</div>
          <div className="font-[200] text-[0.8rem] text-stone leading-[1.7] flex-1">
            Et opdateret billede af ledigheden i Danmark, kommune for kommune. Data fra Danmarks Statistik fortolket til indsigt.
          </div>
          <div className="font-[300] text-[0.72rem] tracking-[0.1em] uppercase text-moss mt-2 group-hover:opacity-70 transition-opacity">
            Se data &rarr;
          </div>
        </Link>

        {/* Coming soon */}
        {comingSoon.map((t) => (
          <div
            key={t.name}
            className="p-6 border border-fog flex flex-col gap-2 select-none opacity-50"
          >
            <div className="w-2 h-2 rounded-full bg-clay mb-1" />
            <div className="font-[400] text-[0.9rem] text-ink">{t.name}</div>
            <div className="font-[200] text-[0.7rem] text-slate">{t.time}</div>
            <div className="font-[200] text-[0.8rem] text-stone leading-[1.7]">
              {t.desc}
            </div>
            <div className="font-[300] text-[0.65rem] tracking-[0.12em] uppercase text-clay mt-2">
              Kommer snart
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
