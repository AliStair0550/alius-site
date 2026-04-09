"use client";

import { useRef, useEffect } from "react";
import AliusLogo from "./AliusLogo";

function BouncingCircles() {
  const circleRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];

  const states = useRef([
    { x: 0, y: 0, dx: 0, dy: 0 },
    { x: 0, y: 0, dx: 0, dy: 0 },
    { x: 0, y: 0, dx: 0, dy: 0 },
  ]);

  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    const boxW = isMobile ? 200 : 400;
    const boxH = isMobile ? 220 : 420;
    const size = isMobile ? 60 : 90;

    const speeds = [0.35, 0.45, 0.3];

    states.current = speeds.map((speed) => {
      const angle = Math.random() * Math.PI * 2;
      return {
        x: Math.random() * (boxW - size),
        y: Math.random() * (boxH - size),
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
      };
    });

    circleRefs.forEach((ref) => {
      if (ref.current) {
        ref.current.style.width = `${size}px`;
        ref.current.style.height = `${size}px`;
      }
    });

    let raf: number;
    const tick = () => {
      states.current.forEach((s, i) => {
        s.x += s.dx;
        s.y += s.dy;

        if (s.x <= 0) { s.x = 0; s.dx = Math.abs(s.dx); }
        if (s.x >= boxW - size) { s.x = boxW - size; s.dx = -Math.abs(s.dx); }
        if (s.y <= 0) { s.y = 0; s.dy = Math.abs(s.dy); }
        if (s.y >= boxH - size) { s.y = boxH - size; s.dy = -Math.abs(s.dy); }

        if (circleRefs[i].current) {
          circleRefs[i].current!.style.transform = `translate(${s.x}px, ${s.y}px)`;
        }
      });
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const labels = ["BRAND", "STRATEGI", "TEKNOLOGI"];

  return (
    <div className="absolute right-[10%] top-[55%] -translate-y-1/2 w-[200px] h-[200px] md:w-[400px] md:h-[400px] z-0">
      {circleRefs.map((ref, i) => (
        <div
          key={i}
          ref={ref}
          className="absolute will-change-transform flex flex-col items-center"
        >
          <div
            className="rounded-full"
            style={{
              background: "#2D5F4A",
              opacity: 0.12,
              width: "100%",
              aspectRatio: "1",
            }}
          />
          <span
            className="font-[200] text-slate uppercase text-center mt-2"
            style={{ fontSize: "10px", letterSpacing: "0.1em", opacity: 0.5 }}
          >
            {labels[i]}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Hero() {
  return (
    <section className="min-h-screen flex flex-col justify-center items-start px-6 md:px-8 pt-32 pb-20 max-w-[1100px] mx-auto relative">
      <BouncingCircles />

      <div className="animate-fade-up delay-200 mb-10 relative z-10">
        <AliusLogo width={220} />
      </div>

      <h1 className="animate-fade-up delay-500 font-[300] text-[1.8rem] md:text-[2.2rem] text-ink leading-[1.35] tracking-[0.01em] max-w-[600px] mb-5 relative z-10">
        Brand. Strategi. Teknologi.<br />Bygget som ét.
      </h1>

      <p className="animate-fade-up delay-700 font-[200] text-[1.05rem] text-slate leading-[1.8] max-w-[480px] mb-8 relative z-10">
        Vi bygger stærke løsninger for virksomheder, der vil vokse, skille sig ud og skabe kundeoplevelser, der huskes.
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
