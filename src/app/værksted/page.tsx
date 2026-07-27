import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/page-metadata";
import { ARTICLES } from "@/lib/vaerksted";

export const metadata: Metadata = pageMetadata({
  title: "Værkstedet | Alius",
  description:
    "Tanker, eksperimenter og læringer fra værkstedet hos Alius. Her deler vi det arbejde vi laver, og de idéer vi bygger videre på.",
  path: "/værksted",
});

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: "Værkstedet",
  description:
    "Tanker, eksperimenter og læringer fra værkstedet hos Alius.",
  url: "https://alius.dk/værksted",
  publisher: {
    "@type": "Organization",
    name: "Alius",
    url: "https://alius.dk",
  },
  blogPost: ARTICLES.map((a) => ({
    "@type": "BlogPosting",
    headline: a.title,
    description: a.excerpt,
    url: `https://alius.dk${a.href}`,
    datePublished: a.date,
    author: { "@type": "Organization", name: "Alius" },
  })),
};

export default function VaerkstedPage() {
  return (
    <div className="min-h-screen bg-parchment text-ink font-sans font-light overflow-x-hidden relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(26,26,26,0.04) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="max-w-[1100px] mx-auto px-5 py-8 md:px-8 md:py-12 relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-baseline gap-4 pb-8 md:pb-16 border-b border-ink/10 mb-10 md:mb-20">
          <Link
            href="/"
            className="font-extralight text-sm tracking-[0.3em] uppercase text-ink no-underline hover:text-moss transition-colors"
          >
            &larr; Alius
          </Link>
          <div className="font-extralight text-xs tracking-[0.2em] uppercase text-stone opacity-60">
            Værkstedet
          </div>
        </header>

        {/* Hero */}
        <section className="mb-16 md:mb-24 max-w-[760px]">
          <div className="text-[11px] tracking-[0.3em] uppercase text-moss font-normal mb-8">
            Værkstedet
          </div>
          <h1 className="font-fraunces font-light text-[clamp(40px,6vw,80px)] leading-[1.0] tracking-[-0.02em] mb-10">
            Vi bygger.<br />
            <em className="italic text-moss">Og vi deler</em>.
          </h1>
          <p className="text-[19px] font-light leading-[1.6] text-stone max-w-[560px]">
            Værkstedet er stedet, hvor vi deler det arbejde vi laver:
            eksperimenterne, idéerne og de læringer der bliver til undervejs.
            Nogle bliver til maskiner. Andre bliver til noget vi kan dele.
          </p>
        </section>

        {/* Artikler */}
        <section aria-label="Artikler" className="border-t border-ink/10">
          {ARTICLES.map((a) => (
            <Link
              key={a.slug}
              href={a.href}
              className="group block border-b border-ink/10 py-10 md:py-12 no-underline transition-colors hover:bg-fog/40 -mx-5 px-5 md:-mx-8 md:px-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4 md:gap-12 items-baseline">
                <div className="flex items-center gap-3 text-[11px] tracking-[0.2em] uppercase text-stone opacity-70">
                  <span className="text-moss">{a.category}</span>
                  <span className="opacity-40">·</span>
                  <span>{a.dateLabel}</span>
                </div>
                <div className="max-w-[640px]">
                  <h2 className="font-fraunces font-light text-[clamp(26px,3.5vw,40px)] leading-[1.12] tracking-[-0.01em] text-ink mb-4 group-hover:text-moss transition-colors">
                    {a.title}
                  </h2>
                  <p className="font-[200] text-[1.05rem] text-stone leading-[1.7] mb-5">
                    {a.excerpt}
                  </p>
                  <span className="inline-flex items-center gap-3 text-[11px] tracking-[0.2em] uppercase text-moss">
                    Læs artiklen
                    <span className="transition-transform duration-300 group-hover:translate-x-1">
                      &rarr;
                    </span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </section>

        <footer className="mt-24 pt-8 border-t border-ink/10 text-[11px] text-stone opacity-50 tracking-[0.05em] leading-[1.6] max-w-[720px]">
          Værkstedet er Alius&apos; åbne notesbog. Vi bygger digitale maskiner til
          danske virksomheder og deler undervejs, hvad vi lærer.
        </footer>
      </div>
    </div>
  );
}
