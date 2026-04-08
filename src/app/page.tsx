import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import Portfolio from "@/components/Portfolio";
import Tools from "@/components/Tools";
import About from "@/components/About";
import { CTA, Footer } from "@/components/CTAFooter";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <div className="h-px bg-clay max-w-[1100px] mx-auto" />

      {/* Manifesto */}
      <section className="bg-sand py-20 md:py-28 px-6 md:px-8 flex flex-col items-center text-center">
        <p className="font-[300] text-[1.3rem] md:text-[1.6rem] text-ink leading-[1.6] max-w-[600px] italic mb-5">
          Rådgivning uden implementering er ufærdigt arbejde.
        </p>
        <span className="font-[200] text-[0.75rem] text-slate tracking-[0.1em] uppercase">
          Strategi, eksekveret.
        </span>
      </section>

      <div className="h-px bg-clay max-w-[1100px] mx-auto" />
      <Services />
      <Portfolio />
      <div className="h-px bg-clay max-w-[1100px] mx-auto" />
      <Tools />
      <div className="h-px bg-clay max-w-[1100px] mx-auto" />
      <About />
      <CTA />
      <Footer />
    </>
  );
}
