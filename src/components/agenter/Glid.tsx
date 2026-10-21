"use client";

// Lader et element glide ind, når det kommer til syne. Roligt: kort
// bevægelse, ingen fjeder. Respekterer reduceret bevægelse, og uden
// JavaScript står indholdet bare der.

import { useEffect, useRef, useState } from "react";

export default function Glid({
  children,
  forsinkelse = 0,
  className = "",
}: {
  children: React.ReactNode;
  forsinkelse?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [synlig, setSynlig] = useState(false);
  const [klar, setKlar] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      return;
    }
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSynlig(true);
          obs.disconnect();
        }
      },
      // Udløses så snart en pixel er inde. Et kort nederst på siden når
      // ellers aldrig helt ind, og indhold må aldrig blive hængende usynligt.
      { rootMargin: "0px", threshold: 0 }
    );
    // Skjul først, når vi ved at observatøren kan vise det igen.
    const t = setTimeout(() => setKlar(true), 0);
    obs.observe(el);
    return () => {
      clearTimeout(t);
      obs.disconnect();
    };
  }, []);

  const skjult = klar && !synlig;
  return (
    <div
      ref={ref}
      className={`transition-[opacity,transform] duration-700 ease-out ${skjult ? "opacity-0 translate-y-6" : "opacity-100 translate-y-0"} ${className}`}
      style={{ transitionDelay: synlig ? `${forsinkelse}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}
