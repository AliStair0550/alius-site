"use client";
import { useState, useEffect, useRef } from "react";

// ── Fixed particle burst positions (no Math.random → no hydration mismatch) ──
const PARTICLES: { dx: number; dy: number; color: string; size: number; delay: string }[] = [
  { dx:  90, dy: -15, color:"#2D5F4A", size:8,  delay:"0ms"   },
  { dx:  76, dy: -55, color:"#4A7D68", size:5,  delay:"30ms"  },
  { dx:  40, dy: -85, color:"#B8923A", size:7,  delay:"0ms"   },
  { dx:   0, dy: -95, color:"#2D5F4A", size:6,  delay:"50ms"  },
  { dx: -40, dy: -85, color:"#FAF8F4", size:9,  delay:"20ms"  },
  { dx: -76, dy: -55, color:"#4A7D68", size:5,  delay:"40ms"  },
  { dx: -90, dy: -15, color:"#2D5F4A", size:7,  delay:"10ms"  },
  { dx: -85, dy:  30, color:"#B8923A", size:6,  delay:"60ms"  },
  { dx: -60, dy:  75, color:"#D4D0C8", size:8,  delay:"0ms"   },
  { dx: -20, dy:  95, color:"#2D5F4A", size:5,  delay:"30ms"  },
  { dx:  20, dy:  95, color:"#4A7D68", size:7,  delay:"15ms"  },
  { dx:  60, dy:  75, color:"#B8923A", size:6,  delay:"45ms"  },
  { dx:  85, dy:  30, color:"#2D5F4A", size:9,  delay:"0ms"   },
  { dx:  65, dy: -72, color:"#D4D0C8", size:5,  delay:"55ms"  },
  { dx: -65, dy: -72, color:"#4A7D68", size:6,  delay:"25ms"  },
  { dx: 110, dy:  10, color:"#2D5F4A", size:4,  delay:"35ms"  },
  { dx:-110, dy:  10, color:"#B8923A", size:4,  delay:"20ms"  },
  { dx:  10, dy: 115, color:"#2D5F4A", size:5,  delay:"40ms"  },
  { dx: -10, dy: 115, color:"#4A7D68", size:5,  delay:"10ms"  },
  { dx:  50, dy: -105,color:"#B8923A", size:4,  delay:"50ms"  },
];

// ── Floating hearts (fixed positions) ──
const FLOATERS: { x: number; rot: string; size: number; delay: string; dur: string }[] = [
  { x: -80, rot:"-15deg", size:18, delay:"0ms",   dur:"800ms"  },
  { x: -50, rot: "8deg",  size:12, delay:"80ms",  dur:"720ms"  },
  { x: -18, rot:"-6deg",  size:22, delay:"40ms",  dur:"860ms"  },
  { x:  18, rot: "12deg", size:14, delay:"120ms", dur:"780ms"  },
  { x:  50, rot:"-10deg", size:20, delay:"20ms",  dur:"840ms"  },
  { x:  80, rot: "6deg",  size:10, delay:"100ms", dur:"700ms"  },
  { x:   0, rot:"-4deg",  size:26, delay:"60ms",  dur:"900ms"  },
];

type Phase = "idle" | "swiping" | "matched";

export function CTA() {
  const [phase, setPhase]     = useState<Phase>("idle");
  const [showCTA, setShowCTA] = useState(false);
  const timer1 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timer2 = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMatch = () => {
    if (phase !== "idle") return;
    setPhase("swiping");
    timer1.current = setTimeout(() => {
      setPhase("matched");
      timer2.current = setTimeout(() => setShowCTA(true), 650);
    }, 480);
  };

  const handleReset = () => {
    setPhase("idle");
    setShowCTA(false);
  };

  useEffect(() => () => {
    timer1.current && clearTimeout(timer1.current);
    timer2.current && clearTimeout(timer2.current);
  }, []);

  return (
    <section
      id="kontakt"
      className="bg-sand py-14 md:py-18 px-6 md:px-8 flex flex-col items-center text-center overflow-hidden"
    >
      <div className="w-12 h-12 rounded-full bg-moss mb-7" />
      <h2 className="font-[300] text-[1.8rem] text-ink mb-3 tracking-[0.03em]">
        Lad os finde ud af om vi er det rigtige match.
      </h2>
      <p className="font-[200] text-[0.95rem] text-slate mb-10 max-w-[400px] leading-[1.8]">
        Lad os tage en åben snak om din virksomhed.
      </p>

      {/* ── Animation stage ── */}
      <div className="relative flex flex-col items-center" style={{ minHeight: 220 }}>

        {phase !== "matched" ? (
          /* ──────────── IDLE + SWIPING ──────────── */
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handleMatch}
              className="group flex flex-col items-center gap-3 select-none"
              aria-label="Er vi et match?"
              disabled={phase === "swiping"}
            >
              {/* Ydre mosgrøn ring */}
              <div className="relative rounded-full p-[3px] group-hover:opacity-90 transition-opacity"
                style={{
                  background: "rgba(45,95,74,0.18)",
                  transform: phase === "swiping" ? "scale(1.25)" : "scale(1)",
                  transition: "transform 300ms cubic-bezier(0.34,1.56,0.64,1)",
                }}>
                {/* Pulsering ved swiping */}
                {phase === "swiping" && (
                  <div className="absolute inset-0 rounded-full"
                    style={{ animation: "matchPulseRing 0.45s ease-out infinite", border: "2px solid #2D5F4A" }} />
                )}
                {/* Indre cirkel med mosgrøn kant */}
                <div className="w-24 h-24 rounded-full bg-parchment
                  flex items-center justify-center
                  group-hover:bg-moss/5 transition-all duration-200
                  group-active:scale-95">
                  <span
                    className={`text-[38px] leading-none transition-colors ${
                      phase === "swiping" ? "text-moss" : "text-moss/50 group-hover:text-moss"
                    }`}
                    style={{
                      animation: phase === "idle"
                        ? "matchHeartbeat 1.8s ease-in-out infinite"
                        : "matchHeartbeat 0.4s ease-in-out infinite",
                    }}>
                    {phase === "swiping" ? "♥" : "♡"}
                  </span>
                </div>
              </div>

              {phase === "idle" && (
                <span className="text-[10px] tracking-[0.2em] uppercase text-clay/60 font-[300] group-hover:text-moss transition-colors">
                  Er vi et match?
                </span>
              )}
            </button>
          </div>

        ) : (
          /* ──────────── MATCHED ──────────── */
          <div className="flex flex-col items-center gap-5 relative">

            {/* Green radial flash */}
            <div className="absolute pointer-events-none" style={{
              inset: -120,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(45,95,74,0.28) 0%, transparent 68%)",
              animation: "matchFlash 700ms ease-out forwards",
            }} />

            {/* Burst particles */}
            {PARTICLES.map((p, i) => (
              <div key={i} className="absolute rounded-full pointer-events-none"
                style={{
                  width:  p.size,
                  height: p.size,
                  backgroundColor: p.color,
                  left: "50%",
                  top:  "50%",
                  marginLeft: -p.size / 2,
                  marginTop:  -p.size / 2,
                  opacity: 0,
                  ["--dx" as string]: `${p.dx}px`,
                  ["--dy" as string]: `${p.dy}px`,
                  animation: `matchBurst 550ms cubic-bezier(0.22,1,0.36,1) ${p.delay} forwards`,
                }}
              />
            ))}

            {/* Floating hearts */}
            {FLOATERS.map((f, i) => (
              <div key={i} className="absolute pointer-events-none text-moss"
                style={{
                  fontSize:  f.size,
                  left:  `calc(50% + ${f.x}px)`,
                  bottom: 0,
                  opacity: 0,
                  ["--rot" as string]: f.rot,
                  animation: `matchFloatHeart ${f.dur} ease-out ${f.delay} forwards`,
                }}>
                ♥
              </div>
            ))}

            {/* MATCH text */}
            <div style={{ animation: "matchPopIn 550ms cubic-bezier(0.34,1.56,0.64,1) 120ms both" }}>
              <div className="text-[10px] tracking-[0.45em] uppercase text-moss font-[400] mb-1">
                Det er et
              </div>
              <div className="font-fraunces font-light italic text-[clamp(52px,9vw,88px)] text-ink leading-[0.9] tracking-[-0.02em]">
                Match.
              </div>
            </div>

            {/* Pulsing merged circle */}
            <div style={{ animation: "matchPopIn 400ms ease-out 300ms both" }}>
              <div className="w-14 h-14 rounded-full bg-moss flex items-center justify-center relative">
                <div className="absolute inset-0 rounded-full"
                  style={{ animation: "matchPulseRing 1.8s ease-out 400ms infinite", border: "2px solid #2D5F4A" }} />
                <span className="text-xl text-parchment leading-none">♥</span>
              </div>
            </div>

            {/* CTA — delayed entrance */}
            {showCTA && (
              <div className="flex flex-col items-center gap-3 mt-2"
                style={{ animation: "matchSlideIn 400ms ease-out both" }}>
                <a
                  href="mailto:hej@alius.dk"
                  className="font-[300] text-[0.82rem] tracking-[0.08em] uppercase px-9 py-3.5 bg-moss text-parchment hover:bg-moss-light transition-colors"
                >
                  Book en samtale →
                </a>
                <button
                  onClick={handleReset}
                  className="text-[9px] tracking-[0.15em] uppercase text-clay/60 hover:text-stone transition-colors font-[300]"
                >
                  Prøv igen
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="px-6 md:px-8 py-8 max-w-[1100px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4 border-t border-fog">
      <div className="font-[200] text-[0.7rem] text-stone tracking-[0.05em]">
        &copy; 2026 Alius - Brand, strategi og teknologi. Bygget som ét.
      </div>
      <div className="flex gap-6">
        <a
          href="https://www.linkedin.com/in/alialfarhan/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-[200] text-[0.7rem] text-stone tracking-[0.05em] hover:text-moss transition-colors"
        >
          LinkedIn
        </a>
        <a
          href="mailto:hej@alius.dk"
          className="font-[200] text-[0.7rem] text-stone tracking-[0.05em] hover:text-moss transition-colors"
        >
          hej@alius.dk
        </a>
      </div>
    </footer>
  );
}
