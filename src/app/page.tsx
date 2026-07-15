import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import Portfolio from "@/components/Portfolio";
import Tools from "@/components/Tools";
import About from "@/components/About";
import { CTA, Footer } from "@/components/CTAFooter";

// ── Manifesto-animation: strøm til maskine der kører på automatik ──
const PF_MOSS = "#2D5F4A";
const PF_INK = "#1A1A1A";

function Gear({
  cx,
  cy,
  r,
  teeth,
  dir,
}: {
  cx: number;
  cy: number;
  r: number;
  teeth: number;
  dir: "cw" | "ccw";
}) {
  const bodyR = r * 0.72;
  return (
    <g
      className={dir === "cw" ? "pf-gear-cw" : "pf-gear-ccw"}
      style={{ transformBox: "view-box", transformOrigin: `${cx}px ${cy}px` }}
    >
      {Array.from({ length: teeth }).map((_, i) => {
        const a = (i / teeth) * Math.PI * 2;
        const c = Math.cos(a);
        const s = Math.sin(a);
        return (
          <line
            key={i}
            x1={cx + c * (bodyR - 1)}
            y1={cy + s * (bodyR - 1)}
            x2={cx + c * r}
            y2={cy + s * r}
            stroke={PF_MOSS}
            strokeWidth={2.4}
            strokeLinecap="round"
          />
        );
      })}
      <circle cx={cx} cy={cy} r={bodyR} fill="none" stroke={PF_MOSS} strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={bodyR * 0.34} fill={PF_MOSS} />
    </g>
  );
}

function PowerFlow() {
  return (
    <div aria-hidden className="w-full max-w-[260px]">
      <svg viewBox="0 0 250 84" className="w-full h-auto" role="presentation">
        {/* Strømkilde: lyn i en ring */}
        <circle cx={28} cy={46} r={18} fill="none" stroke={PF_MOSS} strokeWidth={1} opacity={0.3} />
        <g className="pf-bolt" style={{ transformBox: "view-box", transformOrigin: "28px 46px" }}>
          <path d="M 30 33 L 22 48 L 28 48 L 26 59 L 36 43 L 30 43 Z" fill={PF_MOSS} />
        </g>

        {/* Kabel med strøm der flyder mod maskinen */}
        <line x1={47} y1={46} x2={158} y2={46} stroke={PF_INK} strokeWidth={1} opacity={0.14} strokeLinecap="round" />
        <line
          className="pf-flow"
          x1={47}
          y1={46}
          x2={158}
          y2={46}
          stroke={PF_MOSS}
          strokeWidth={1.5}
          strokeDasharray="2 8"
          strokeLinecap="round"
        />
        <circle className="pf-spark" cx={47} cy={46} r={2.6} fill={PF_MOSS} style={{ transformBox: "view-box" }} />

        {/* Maskinen får strøm - en puls når energien ankommer */}
        <circle
          className="pf-energize"
          cx={182}
          cy={46}
          r={28}
          fill="none"
          stroke={PF_MOSS}
          strokeWidth={1}
          opacity={0}
          style={{ transformBox: "view-box", transformOrigin: "182px 46px" }}
        />

        {/* Maskine: to tandhjul der kører på automatik */}
        <Gear cx={182} cy={46} r={24} teeth={11} dir="cw" />
        <Gear cx={214} cy={24} r={14} teeth={8} dir="ccw" />
      </svg>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <div className="h-px bg-clay max-w-[1100px] mx-auto" />

      {/* Manifesto */}
      <section className="bg-sand py-20 md:py-28 px-6 md:px-8 flex flex-col items-center text-center">
        <PowerFlow />
        <p className="font-[300] text-[1.3rem] md:text-[1.6rem] text-ink leading-[1.6] max-w-[600px] mt-10">
          Sæt strøm til jeres processer. Mindre manuelt arbejde, mere forretning.
        </p>
      </section>

      <div className="h-px bg-clay max-w-[1100px] mx-auto" />
      <Services />
      <div className="h-px bg-clay max-w-[1100px] mx-auto" />
      <About />
      <Portfolio />
      <div className="h-px bg-clay max-w-[1100px] mx-auto" />
      <Tools />
      <div className="h-px bg-clay max-w-[1100px] mx-auto" />
      <CTA />
      <Footer />
    </>
  );
}
