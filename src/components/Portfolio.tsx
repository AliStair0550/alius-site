const projects = [
  {
    name: "SSTUDIO",
    type: "Branding - Rebrand",
    desc: "Komplet rebrand af skønhedssalon i Skive. Ny visuel identitet, hjemmeside og digital strategi.",
    image: "/stylister.avif",
    cornerLogo: "/sstudio-logo.svg",
    link: "https://sstudio.dk",
    layout: "image-left" as const,
  },
  {
    name: "Smashii",
    type: "Branding - Hjemmeside",
    desc: "Streetfood brand og hjemmeside for smash burger koncept. Identitet, tone of voice og web.",
    bg: "#3D2060",
    logo: "https://smashii.dk/assets/logonew.png",
    link: "https://smashii.dk",
    layout: "image-right" as const,
  },
  {
    name: "Cafe Christian IX",
    type: "Hjemmeside - Design",
    desc: "Restaurant-hjemmeside med online menu, bordreservation og mobil-optimering.",
    bgImage: "https://www.cafe-cix.dk/assets/Billede34.jpg",
    logo: "https://www.cafe-cix.dk/assets/logo-white.png",
    link: "https://cafe-cix.dk",
    layout: "image-left" as const,
  },
  {
    name: "Markus Brandt",
    type: "Brandidentitet - Hjemmeside",
    desc: "Brandidentitet og hjemmeside for dansk artist og sangskriver. Bordeaux og varm guld palette.",
    image: "https://markusbrandt.dk/assets/hero.avif",
    overlay: { title: "Markus Brandt" },
    link: "https://markusbrandt.dk",
    layout: "image-right" as const,
  },
  {
    name: "folka",
    type: "Platform - SaaS",
    desc: "Community management platform bygget fra bunden. Next.js, Stripe Connect, Prisma.",
    image: "/biking.avif",
    link: "https://folka.dk",
    layout: "full" as const,
  },
];

function ProjectImage({ p }: { p: (typeof projects)[number] }) {
  if ("image" in p && p.image) {
    return (
      <>
        <img
          src={p.image}
          alt={p.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.02]"
        />
        {"overlay" in p && p.overlay && (
          <>
            <div className="absolute inset-0 bg-ink/40 z-10" />
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
              <div className="font-[400] text-[1.8rem] text-parchment tracking-[0.04em]">
                {p.overlay.title}
              </div>
            </div>
          </>
        )}
        {"cornerLogo" in p && p.cornerLogo && (
          <img
            src={p.cornerLogo}
            alt={`${p.name} logo`}
            className="absolute bottom-4 right-4 w-[100px] z-10 opacity-80"
          />
        )}
      </>
    );
  }
  if ("bgImage" in p && p.bgImage) {
    return (
      <>
        <img
          src={p.bgImage}
          alt={p.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.02]"
        />
        <div className="absolute inset-0 bg-ink/50" />
        {"logo" in p && p.logo && (
          <img
            src={p.logo}
            alt={`${p.name} logo`}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] z-10"
            style={{ filter: "sepia(1) saturate(1.5) brightness(0.78) hue-rotate(5deg)" }}
          />
        )}
      </>
    );
  }
  if ("bg" in p && p.bg) {
    return (
      <div
        className="absolute inset-0 flex items-center justify-center transition-transform duration-[600ms] ease-out group-hover:scale-[1.02]"
        style={{ background: p.bg }}
      >
        {"logo" in p && p.logo && (
          <img
            src={p.logo}
            alt={`${p.name} logo`}
            className="w-[300px]"
          />
        )}
      </div>
    );
  }
  return null;
}

function ProjectInfo({ p }: { p: (typeof projects)[number] }) {
  return (
    <div className="flex flex-col justify-center">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-1.5 h-1.5 rounded-full bg-moss" />
        <div className="text-[0.6rem] tracking-[0.18em] uppercase text-clay font-[300]">
          {p.type}
        </div>
      </div>
      <div className="font-[400] text-[1.3rem] text-parchment mb-2">
        {p.name}
      </div>
      <div className="font-[200] text-[0.85rem] text-fog leading-[1.7] mb-4">
        {p.desc}
      </div>
      <span className="font-[300] text-[0.72rem] tracking-[0.1em] uppercase text-moss hover:opacity-70 transition-opacity">
        Se projekt &rarr;
      </span>
    </div>
  );
}

export default function Portfolio() {
  return (
    <section id="portfolio" className="bg-ink py-20 md:py-28">
      <div className="max-w-[1100px] mx-auto px-6 md:px-8 mb-16">
        <div className="text-[0.6rem] tracking-[0.22em] uppercase text-slate font-[300] mb-8">
          Portfolio
        </div>
        <h2 className="font-[300] text-[2.2rem] text-parchment tracking-[0.03em] leading-[1.3]">
          Fra idé til virkelighed.
        </h2>
        <p className="font-[200] text-[0.9rem] text-slate mt-4 leading-[1.7]">
          Udvalgte projekter.
        </p>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 md:px-8">
        {projects.map((p, i) => (
          <div key={i}>
            <a
              href={p.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block group"
            >
              {p.layout === "full" ? (
                <div className="relative aspect-[16/10] overflow-hidden rounded-sm">
                  <ProjectImage p={p} />
                  <div className="absolute inset-0 bg-ink/30" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 z-10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-moss" />
                      <div className="text-[0.6rem] tracking-[0.18em] uppercase text-slate font-[300]">
                        {p.type}
                      </div>
                    </div>
                    <div className="font-[400] text-[1.3rem] text-parchment mb-2">
                      {p.name}
                    </div>
                    <div className="font-[200] text-[0.85rem] text-slate leading-[1.7] max-w-[480px] mb-4">
                      {p.desc}
                    </div>
                    <span className="font-[300] text-[0.72rem] tracking-[0.1em] uppercase text-moss">
                      Se projekt &rarr;
                    </span>
                  </div>
                </div>
              ) : (
                <div className={`grid grid-cols-1 md:grid-cols-[1fr_0.55fr] gap-8 md:gap-12 ${
                  p.layout === "image-right" ? "md:grid-cols-[0.55fr_1fr]" : ""
                }`}>
                  {p.layout === "image-right" && (
                    <ProjectInfo p={p} />
                  )}
                  <div className="aspect-[16/10] relative overflow-hidden rounded-sm">
                    <ProjectImage p={p} />
                  </div>
                  {p.layout === "image-left" && (
                    <ProjectInfo p={p} />
                  )}
                </div>
              )}
            </a>

            {i < projects.length - 1 && (
              <div className="h-px bg-clay/30 my-16 md:my-20" />
            )}
          </div>
        ))}
      </div>

      <div className="max-w-[1100px] mx-auto px-6 md:px-8 pt-16">
        <a
          href="#"
          className="font-[200] text-[0.75rem] tracking-[0.1em] uppercase text-slate border-b border-slate pb-0.5 hover:text-moss hover:border-moss transition-colors"
        >
          Se alle projekter og mit CV &rarr;
        </a>
      </div>
    </section>
  );
}
