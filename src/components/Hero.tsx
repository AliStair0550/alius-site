import AliusLogo from "./AliusLogo";

export default function Hero() {
  return (
    <section className="min-h-screen flex flex-col justify-center items-start px-6 md:px-8 pt-32 pb-20 max-w-[1100px] mx-auto relative">
      {/* Decorative circle */}
      <div className="absolute right-[8%] top-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full bg-moss animate-fade-circle hidden md:block" />

      <div className="animate-fade-up delay-200 mb-10">
        <AliusLogo width={220} />
      </div>

      <h1 className="animate-fade-up delay-500 font-[300] text-[2.2rem] md:text-[2.8rem] text-ink leading-[1.35] tracking-[0.01em] max-w-[600px] mb-5">
        Strategi, eksekveret.
      </h1>

      <p className="animate-fade-up delay-700 font-[200] text-[1.05rem] text-slate leading-[1.8] max-w-[480px] mb-8">
        Vi hjælper virksomheder med at skabe et stærkt fundament for vækst gennem positionering, branding og teknisk eksekvering.
      </p>

      <div className="animate-fade-up delay-900 flex gap-4 flex-wrap">
        <a
          href="#ydelser"
          className="font-[300] text-[0.82rem] tracking-[0.08em] uppercase px-7 py-3 bg-ink text-parchment border border-ink hover:bg-moss hover:border-moss transition-all"
        >
          Se ydelser
        </a>
        <a
          href="#vaerktoejer"
          className="font-[300] text-[0.82rem] tracking-[0.08em] uppercase px-7 py-3 border border-clay text-ink hover:border-moss hover:text-moss transition-all"
        >
          Proev vores vaerktoejer
        </a>
      </div>
    </section>
  );
}
