import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-parchment text-ink font-sans font-light flex items-center justify-center px-5 py-12">
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(26,26,26,0.04) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="relative z-10 max-w-[560px] text-center">
        <div className="text-[11px] tracking-[0.4em] uppercase text-moss mb-6">
          Linket er ikke aktivt
        </div>
        <h1 className="font-fraunces font-light italic text-[clamp(48px,6vw,80px)] leading-[0.95] tracking-[-0.03em] mb-8">
          Denne session<br />er lukket.
        </h1>
        <p className="text-[17px] leading-[1.6] text-stone mb-10">
          Linket er enten udløbet, eller sessionen er blevet lukket af administratoren. Kontakt den der sendte dig linket.
        </p>
        <Link
          href="/tankeprofil"
          className="inline-flex items-center gap-4 bg-ink text-parchment px-9 py-[22px] text-[13px] font-normal tracking-[0.25em] uppercase no-underline transition-all duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-moss hover:gap-6 group"
        >
          Tag din egen profil
          <span className="transition-transform duration-[350ms] group-hover:translate-x-1">
            &rarr;
          </span>
        </Link>
      </div>
    </div>
  );
}
