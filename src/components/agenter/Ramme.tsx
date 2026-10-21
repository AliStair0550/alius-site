import Link from "next/link";
import AliusLogo from "@/components/AliusLogo";

/** Samme ramme som kontaktsiden: logo, en lille etiket, indhold, fod. */
export default function Ramme({ etiket, children }: { etiket: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-parchment text-ink font-sans">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12">
        <header className="flex justify-between items-center pb-10 md:pb-14 mb-12 md:mb-16 border-b border-fog">
          <Link href="/" aria-label="Alius, til forsiden">
            <AliusLogo width={80} />
          </Link>
          <Link
            href="/agenter"
            className="font-[300] text-[0.72rem] tracking-[0.15em] uppercase text-slate no-underline hover:text-ink transition-colors"
          >
            {etiket}
          </Link>
        </header>
        {children}
        <footer className="mt-24 pt-8 border-t border-fog font-[200] text-[0.7rem] text-stone tracking-[0.05em]">
          Alius &#183; Den anden vej til vækst
        </footer>
      </div>
    </div>
  );
}
