"use client";

import { useEffect, useRef } from "react";

// Astro Ball: ti sekunder fra bane 1 (sekund 10 til 20 i optagelsen fra
// App Store-anmeldelsen), med kædereaktionen efter to sekunder. Sekund 8,5
// til 10 er undgået: der ligger en iOS-notifikation over spillet.
// 360 x 780, H.264, uden lyd, 229 KB. Videoen står på højkant i et kort på tværs, så
// siderne fyldes med det samme billede, sløret og mørkt, i spillets egen
// baggrund (#0B0D13).
//
// Videoen hentes først når kortet nærmer sig, og spiller kun mens det er
// i billedet. Med reduceret bevægelse står stillbilledet.

const BAGGRUND = "#0B0D13";

export default function AstroBallViz() {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          if (v.preload !== "auto") {
            v.preload = "auto";
            v.src = "/astroball.mp4";
          }
          v.play().catch(() => {
            // Afspilning afvist (fx strømsparetilstand): stillbilledet står.
          });
        } else {
          v.pause();
        }
      },
      { rootMargin: "200px 0px", threshold: 0 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: BAGGRUND }}>
      <div
        aria-hidden
        className="absolute inset-0 scale-125 opacity-50 blur-2xl"
        style={{ backgroundImage: "url(/astroball-poster.jpg)", backgroundSize: "cover", backgroundPosition: "center 35%" }}
      />
      <video
        ref={video}
        poster="/astroball-poster.jpg"
        muted
        loop
        playsInline
        preload="none"
        aria-label="Astro Ball spillet på iPhone: en komet rammer en sprængklods, og kædereaktionen rydder halvdelen af banen"
        className="absolute top-0 left-1/2 h-full w-auto -translate-x-1/2 transition-transform duration-[600ms] ease-out group-hover:scale-[1.03]"
        style={{ aspectRatio: "360 / 780" }}
      />
    </div>
  );
}
