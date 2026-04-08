"use client";

import { useRef, useEffect } from "react";
import AliusLogo from "./AliusLogo";

function BouncingCircle() {
  const circleRef = useRef<HTMLDivElement>(null);
  const state = useRef({
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
    boxW: 400,
    boxH: 400,
    size: 120,
  });

  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    const boxW = isMobile ? 200 : 400;
    const boxH = isMobile ? 200 : 400;
    const size = isMobile ? 80 : 120;

    const speed = 0.7;
    const angle = Math.random() * Math.PI * 2;

    state.current = {
      x: Math.random() * (boxW - size),
      y: Math.random() * (boxH - size),
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      boxW,
      boxH,
      size,
    };

    if (circleRef.current) {
      circleRef.current.style.width = `${size}px`;
      circleRef.current.style.height = `${size}px`;
    }

    let raf: number;
    const tick = () => {
      const s = state.current;
      s.x += s.dx;
      s.y += s.dy;

      if (s.x <= 0) { s.x = 0; s.dx = Math.abs(s.dx); }
      if (s.x >= s.boxW - s.size) { s.x = s.boxW - s.size; s.dx = -Math.abs(s.dx); }
      if (s.y <= 0) { s.y = 0; s.dy = Math.abs(s.dy); }
      if (s.y >= s.boxH - s.size) { s.y = s.boxH - s.size; s.dy = -Math.abs(s.dy); }

      if (circleRef.current) {
        circleRef.current.style.transform = `translate(${s.x}px, ${s.y}px)`;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="absolute right-[4%] top-1/2 -translate-y-1/2 w-[200px] h-[200px] md:w-[400px] md:h-[400px] z-0 border border-fog">
      <div
        ref={circleRef}
        className="rounded-full opacity-15 will-change-transform bg-moss"
      />
    </div>
  );
}

export default function Hero() {
  return (
    <section className="min-h-screen flex flex-col justify-center items-start px-6 md:px-8 pt-32 pb-20 max-w-[1100px] mx-auto relative">
      <BouncingCircle />

      <div className="animate-fade-up delay-200 mb-10 relative z-10">
        <AliusLogo width={220} />
      </div>

      <h1 className="animate-fade-up delay-500 font-[300] text-[2.2rem] md:text-[2.8rem] text-ink leading-[1.35] tracking-[0.01em] max-w-[600px] mb-5 relative z-10">
        Strategi, eksekveret.
      </h1>

      <p className="animate-fade-up delay-700 font-[200] text-[1.05rem] text-slate leading-[1.8] max-w-[480px] mb-8 relative z-10">
        Vi hjælper virksomheder med at skabe et stærkt fundament for vækst gennem positionering, branding og teknisk eksekvering.
      </p>

      <div className="animate-fade-up delay-900 flex gap-4 flex-wrap relative z-10">
        <a
          href="#ydelser"
          className="font-[300] text-[0.82rem] tracking-[0.08em] uppercase px-7 py-3 bg-ink text-parchment border border-ink hover:bg-moss hover:border-moss transition-all"
        >
          Se ydelser
        </a>
        <a
          href="#værktøjer"
          className="font-[300] text-[0.82rem] tracking-[0.08em] uppercase px-7 py-3 border border-clay text-ink hover:border-moss hover:text-moss transition-all"
        >
          Prøv vores værktøjer
        </a>
      </div>
    </section>
  );
}
