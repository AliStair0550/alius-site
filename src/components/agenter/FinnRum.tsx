import Link from "next/link";
import { FinnAvatar } from "@/components/agenter/Avatar";

// Finns rum: et roligt, sandfarvet lærred med en gennemsigtig topbjælke,
// som indholdet glider under. Dybde kommer fra lag og blur, ikke fra
// skygger eller gradienter (CLAUDE.md).

export default function FinnRum({ undertitel, children }: { undertitel: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-sand text-ink font-sans">
      <header className="sticky top-0 z-30 border-b border-fog/70 bg-parchment/75 backdrop-blur-xl backdrop-saturate-150 [@media(prefers-reduced-transparency:reduce)]:bg-parchment [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none">
        <div className="max-w-[1080px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link
            href="/agenter"
            className="-ml-2 px-2 py-1.5 rounded-full font-[300] text-[0.85rem] text-moss no-underline hover:bg-moss/5 active:scale-[0.97] transition-transform"
          >
            &lsaquo; Agenter
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <FinnAvatar size={30} />
            <div className="min-w-0 leading-tight">
              <div className="font-[400] text-[0.85rem] text-ink truncate">Finn Finans</div>
              <div className="font-[300] text-[0.68rem] text-stone truncate">{undertitel}</div>
            </div>
          </div>
          <span className="w-[72px]" aria-hidden />
        </div>
      </header>

      <main className="max-w-[1080px] mx-auto px-4 sm:px-6 pt-6 md:pt-10 pb-16">{children}</main>

      <footer className="max-w-[1080px] mx-auto px-4 sm:px-6 pb-10 font-[200] text-[0.7rem] text-stone tracking-[0.05em]">
        Alius &#183; Den anden vej til vækst
      </footer>
    </div>
  );
}
