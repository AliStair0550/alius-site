const projects = [
  {
    name: "Markus Brandt",
    type: "Brandidentitet - Hjemmeside",
    desc: "Brandidentitet og hjemmeside for dansk artist og sangskriver. Bordeaux og varm guld palette.",
    image: "https://markusbrandt.dk/assets/hero.avif",
    link: "https://markusbrandt.dk",
  },
  {
    name: "Cafe Christian IX",
    type: "Hjemmeside - Design",
    desc: "Restaurant-hjemmeside med online menu, bordreservation og mobil-optimering.",
    image: "https://www.cafe-cix.dk/assets/Billede15.jpg",
    link: "https://cafe-cix.dk",
  },
  {
    name: "Smashii",
    type: "Branding - Hjemmeside",
    desc: "Streetfood brand og hjemmeside for smash burger koncept. Identitet, tone of voice og web.",
    image: "https://smashii.dk/assets/logonew.png",
    link: "https://smashii.dk",
  },
  {
    name: "SSTUDIO",
    type: "Branding - Rebrand",
    desc: "Komplet rebrand af skønhedssalon i Skive. Ny visuel identitet, hjemmeside og digital strategi.",
    image: null,
    bg: "#2a3028",
    link: "https://sstudio.dk",
  },
  {
    name: "folka",
    type: "Platform - SaaS",
    desc: "Community management platform bygget fra bunden. Next.js, Stripe Connect, Prisma.",
    image: null,
    bg: "#283038",
    link: "https://folka.dk",
  },
];

export default function Portfolio() {
  return (
    <section id="portfolio" className="bg-ink py-20 md:py-28">
      <div className="max-w-[1100px] mx-auto px-6 md:px-8 mb-12">
        <div className="text-[0.6rem] tracking-[0.22em] uppercase text-slate font-[300] mb-8">
          Portfolio
        </div>
        <h2 className="font-[300] text-[2rem] text-parchment tracking-[0.03em] leading-[1.3]">
          Strategi og eksekvering.
          <br />
          Fra samme hånd.
        </h2>
        <p className="font-[200] text-[0.9rem] text-slate mt-3 leading-[1.7] max-w-[400px]">
          Udvalgte projekter hvor vi har bygget fundament, formet strategi og
          implementeret forandring.
        </p>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 md:px-8 flex flex-col gap-5">
        {projects.map((p, i) => (
          <a
            key={i}
            href={p.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block relative aspect-[16/9] overflow-hidden group cursor-pointer"
          >
            {p.image ? (
              <img
                src={p.image}
                alt={p.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            ) : (
              <div
                className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.03]"
                style={{ background: p.bg }}
              />
            )}

            <div className="absolute inset-0 bg-ink/40 group-hover:bg-moss/80 transition-colors duration-300 flex flex-col justify-end p-6 md:p-10">
              <div className="text-[0.6rem] tracking-[0.18em] uppercase text-parchment/70 font-[300] mb-2">
                {p.type}
              </div>
              <div className="font-[300] text-[1.4rem] md:text-[1.8rem] text-parchment mb-1">
                {p.name}
              </div>
              <div className="font-[200] text-[0.82rem] text-parchment/80 leading-[1.6] max-w-[480px]">
                {p.desc}
              </div>
              <span className="mt-4 font-[300] text-[0.72rem] tracking-[0.12em] uppercase text-parchment opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Se projekt &rarr;
              </span>
            </div>
          </a>
        ))}
      </div>

      <div className="max-w-[1100px] mx-auto px-6 md:px-8 pt-10">
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
