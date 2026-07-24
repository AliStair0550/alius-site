import Link from "next/link";

export default function Tools() {
  return (
    <section id="værktøjer" className="py-20 md:py-28 px-6 md:px-8 max-w-[1100px] mx-auto">
      <div className="text-[0.6rem] tracking-[0.22em] uppercase text-clay font-[300] mb-8">
        Værktøjer
      </div>
      <h2 className="font-[300] text-[2rem] text-ink tracking-[0.03em] mb-4 leading-[1.3]">
        Små værktøjer. Store muligheder.
      </h2>
      <p className="font-[200] text-[0.95rem] text-stone leading-[1.9] max-w-[560px]">
        Vores værktøjer giver dig indsigt inden du tager kontakt. De er gratis og kræver ingen tilmelding.
      </p>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Tankeprofil */}
        <Link href="/tankeprofil" className="p-6 border border-moss flex flex-col gap-2 group hover:bg-moss/5 transition-colors">
          <div className="w-2 h-2 rounded-full bg-moss mb-1" />
          <div className="font-[400] text-[0.9rem] text-ink">Personlighedsprofil</div>
          <div className="font-[200] text-[0.7rem] text-slate">Personlighedsprofil · 4 min</div>
          <div className="font-[200] text-[0.8rem] text-stone leading-[1.7] flex-1">
            En personlighedsprofil til dig og dit team, der viser hvor I naturligt finder energi - og hvor I kan have blinde vinkler eller oversete muligheder.
          </div>
          <div className="font-[300] text-[0.72rem] tracking-[0.1em] uppercase text-moss mt-2 group-hover:opacity-70 transition-opacity">
            Start testen &rarr;
          </div>
        </Link>

        {/* Prioritizer */}
        <Link href="/prioritizer" className="p-6 border border-moss flex flex-col gap-2 group hover:bg-moss/5 transition-colors">
          <div className="w-2 h-2 rounded-full bg-moss mb-1" />
          <div className="font-[400] text-[0.9rem] text-ink">Prioriteringsværktøj</div>
          <div className="font-[200] text-[0.7rem] text-slate">Strategi · Gratis · Beta</div>
          <div className="font-[200] text-[0.8rem] text-stone leading-[1.7] flex-1">
            Scoringsmodel, effekt/indsats-matrix og ledelsesrapport. Prioritér initiativer evidensbaseret frem for intuitivt.
          </div>
          <div className="font-[300] text-[0.72rem] tracking-[0.1em] uppercase text-moss mt-2 group-hover:opacity-70 transition-opacity">
            Åbn værktøj &rarr;
          </div>
        </Link>

        {/* Pulse */}
        <Link href="/pulse" className="p-6 border border-moss flex flex-col gap-2 group hover:bg-moss/5 transition-colors">
          <div className="w-2 h-2 rounded-full bg-moss mb-1" />
          <div className="font-[400] text-[0.9rem] text-ink">Pulse</div>
          <div className="font-[200] text-[0.7rem] text-slate">Data · Opdateres automatisk</div>
          <div className="font-[200] text-[0.8rem] text-stone leading-[1.7] flex-1">
            Ledighed, konkurser og mere. Danske erhvervs- og samfundsdata fra åbne kilder, fortolket til indsigt hver måned.
          </div>
          <div className="font-[300] text-[0.72rem] tracking-[0.1em] uppercase text-moss mt-2 group-hover:opacity-70 transition-opacity">
            Se data &rarr;
          </div>
        </Link>

        {/* Frihedstænkere */}
        <Link href="/frihedstænkere" className="p-6 border border-moss flex flex-col gap-2 group hover:bg-moss/5 transition-colors">
          <div className="w-2 h-2 rounded-full bg-moss mb-1" />
          <div className="font-[400] text-[0.9rem] text-ink">Frihedstænkere</div>
          <div className="font-[200] text-[0.7rem] text-slate">Idébibliotek · 38 tænkere</div>
          <div className="font-[200] text-[0.8rem] text-stone leading-[1.7] flex-1">
            Et bibliotek over tænkere der har formet vores forståelse af frihed, magt og civilisation, fra Platon til Byung-Chul Han.
          </div>
          <div className="font-[300] text-[0.72rem] tracking-[0.1em] uppercase text-moss mt-2 group-hover:opacity-70 transition-opacity">
            Udforsk &rarr;
          </div>
        </Link>
      </div>
    </section>
  );
}
