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
  const ri = r * 0.76; // rod / dalbund
  const hubR = r * 0.32;
  const slice = (Math.PI * 2) / teeth;
  const g = slice * 0.26; // halv tand-bredde
  const pt = (ang: number, rad: number) =>
    `${(cx + Math.cos(ang) * rad).toFixed(2)} ${(cy + Math.sin(ang) * rad).toFixed(2)}`;
  let d = "";
  for (let i = 0; i < teeth; i++) {
    const c = i * slice;
    d += `${i === 0 ? "M" : "L"} ${pt(c - g, r)} L ${pt(c + g, r)} L ${pt(c + g, ri)} L ${pt(c + slice - g, ri)} `;
  }
  d += "Z";
  return (
    <g
      className={dir === "cw" ? "pf-gear-cw" : "pf-gear-ccw"}
      style={{ transformBox: "view-box", transformOrigin: `${cx}px ${cy}px` }}
    >
      <path d={d} fill="none" stroke={PF_MOSS} strokeWidth={1.4} strokeLinejoin="round" />
      <circle cx={cx} cy={cy} r={hubR} fill="none" stroke={PF_MOSS} strokeWidth={1.1} />
      <circle cx={cx} cy={cy} r={1.5} fill={PF_MOSS} />
    </g>
  );
}

function PowerFlow() {
  return (
    <div aria-hidden className="w-full max-w-[200px] mt-10 md:mt-12">
      <svg viewBox="0 5 176 66" className="w-full h-auto" role="presentation">
        {/* Strømkilde: lyn i en ring */}
        <circle cx={24} cy={38} r={15} fill="none" stroke={PF_MOSS} strokeWidth={1} opacity={0.3} />
        <g className="pf-bolt" style={{ transformBox: "view-box", transformOrigin: "24px 38px" }}>
          <path d="M 25 28 L 18 41 L 23 41 L 21 49 L 31 36 L 25 36 Z" fill={PF_MOSS} />
        </g>

        {/* Kabel med strøm der flyder mod maskinen */}
        <line x1={40} y1={38} x2={110} y2={38} stroke={PF_INK} strokeWidth={1} opacity={0.14} strokeLinecap="round" />
        <line
          className="pf-flow"
          x1={40}
          y1={38}
          x2={110}
          y2={38}
          stroke={PF_MOSS}
          strokeWidth={1.5}
          strokeDasharray="2 8"
          strokeLinecap="round"
        />
        <circle className="pf-spark" cx={40} cy={38} r={2.4} fill={PF_MOSS} style={{ transformBox: "view-box" }} />

        {/* Maskinen får strøm - en blød puls når energien ankommer */}
        <circle
          className="pf-energize"
          cx={130}
          cy={38}
          r={22}
          fill="none"
          stroke={PF_MOSS}
          strokeWidth={1}
          opacity={0}
          style={{ transformBox: "view-box", transformOrigin: "130px 38px" }}
        />

        {/* Maskine: to tandhjul der kører på automatik */}
        <Gear cx={130} cy={38} r={20} teeth={9} dir="cw" />
        <Gear cx={156} cy={20} r={11} teeth={7} dir="ccw" />
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
        <p className="font-[300] text-[1.3rem] md:text-[1.6rem] text-ink leading-[1.6] max-w-[600px]">
          Sæt strøm til jeres processer. Mindre manuelt arbejde, mere forretning.
        </p>
        <PowerFlow />
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
