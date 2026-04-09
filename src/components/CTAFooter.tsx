export function CTA() {
  return (
    <section
      id="kontakt"
      className="bg-sand py-20 md:py-24 px-6 md:px-8 flex flex-col items-center text-center"
    >
      <div className="w-12 h-12 rounded-full bg-moss mb-8" />
      <h2 className="font-[300] text-[1.8rem] text-ink mb-4 tracking-[0.03em]">
        Lad os finde ud af om vi er det rigtige match.
      </h2>
      <p className="font-[200] text-[0.95rem] text-slate mb-8 max-w-[400px] leading-[1.8]">
        Book 20 minutter. Ingen salgspitch, ingen forpligtelse. Bare en ærlig
        samtale om din virksomhed.
      </p>
      <a
        href="#"
        className="font-[300] text-[0.82rem] tracking-[0.08em] uppercase px-8 py-3 bg-ink text-parchment border border-ink hover:bg-moss hover:border-moss transition-all"
      >
        Book en samtale
      </a>
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
