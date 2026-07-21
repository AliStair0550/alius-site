import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import Portfolio from "@/components/Portfolio";
import Tools from "@/components/Tools";
import About from "@/components/About";
import Maskinrummet from "@/components/Maskinrummet";
import { CTA, Footer } from "@/components/CTAFooter";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <div className="h-px bg-clay max-w-[1100px] mx-auto" />
      <Services />
      <div className="h-px bg-clay max-w-[1100px] mx-auto" />
      <About />
      <div className="h-px bg-clay max-w-[1100px] mx-auto" />
      <Maskinrummet />
      <Portfolio />
      <div className="h-px bg-clay max-w-[1100px] mx-auto" />
      <Tools />
      <div className="h-px bg-clay max-w-[1100px] mx-auto" />
      <CTA />
      <Footer />
    </>
  );
}
