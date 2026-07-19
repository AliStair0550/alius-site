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
    <div aria-hidden className="w-full max-w-[176px] mt-6 md:mt-7 opacity-90">
      <svg viewBox="0 0 200 64" className="w-full h-auto" role="presentation">
        {/* Venstre strømkilde: lyn i en ring */}
        <circle cx={24} cy={36} r={13} fill="none" stroke={PF_MOSS} strokeWidth={1} opacity={0.3} />
        <g className="pf-bolt" style={{ transformBox: "view-box", transformOrigin: "24px 36px" }}>
          <path d="M 25 27 L 18 39 L 23 39 L 21 46 L 30 34 L 24 34 Z" fill={PF_MOSS} />
        </g>
        {/* Venstre kabel + gnist ind mod maskinen */}
        <line x1={38} y1={36} x2={83} y2={36} stroke={PF_INK} strokeWidth={1} opacity={0.14} strokeLinecap="round" />
        <line className="pf-flow" x1={38} y1={36} x2={83} y2={36} stroke={PF_MOSS} strokeWidth={1.5} strokeDasharray="2 8" strokeLinecap="round" />
        <circle className="pf-spark-l" cx={38} cy={36} r={2.4} fill={PF_MOSS} style={{ transformBox: "view-box" }} />

        {/* Højre strømkilde: lyn i en ring */}
        <circle cx={176} cy={36} r={13} fill="none" stroke={PF_MOSS} strokeWidth={1} opacity={0.3} />
        <g className="pf-bolt" style={{ transformBox: "view-box", transformOrigin: "176px 36px" }}>
          <path d="M 175 27 L 182 39 L 177 39 L 179 46 L 170 34 L 176 34 Z" fill={PF_MOSS} />
        </g>
        {/* Højre kabel + gnist ind mod maskinen */}
        <line x1={162} y1={36} x2={117} y2={36} stroke={PF_INK} strokeWidth={1} opacity={0.14} strokeLinecap="round" />
        <line className="pf-flow" x1={162} y1={36} x2={117} y2={36} stroke={PF_MOSS} strokeWidth={1.5} strokeDasharray="2 8" strokeLinecap="round" />
        <circle className="pf-spark-r" cx={162} cy={36} r={2.4} fill={PF_MOSS} style={{ transformBox: "view-box" }} />

        {/* Maskinen får strøm fra begge sider - blød puls når energien ankommer */}
        <circle
          className="pf-energize"
          cx={100}
          cy={36}
          r={20}
          fill="none"
          stroke={PF_MOSS}
          strokeWidth={1}
          opacity={0}
          style={{ transformBox: "view-box", transformOrigin: "100px 36px" }}
        />

        {/* Maskine i centrum: to tandhjul der kører på automatik */}
        <Gear cx={100} cy={36} r={17} teeth={9} dir="cw" />
        <Gear cx={100} cy={13} r={9} teeth={7} dir="ccw" />
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
