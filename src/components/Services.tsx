"use client";

import { useEffect, useRef, useState } from "react";

const columns = [
  {
    label: "BRAND",
    heading: "Identitet, udtryk og oplevelse",
    desc: "Vi bygger oplevelser der styrker dit brand og får dig til at skille dig ud.",
    items: [
      { title: "Hjemmeside", sub: "Designet til at konvertere" },
      { title: "Visuel identitet", sub: "Logo, farver, typografi - ét samlet udtryk" },
      { title: "Kommunikation", sub: "Sprog der lyder som dig" },
      { title: "Digital synlighed", sub: "Synlig hvor dine kunder er" },
    ],
  },
  {
    label: "STRATEGI",
    heading: "Retning, vækst og forretning",
    desc: "Vi analyserer dit marked, skærper din position og bygger den plan der tager dig fra hvor du er til hvor du skal hen.",
    items: [
      { title: "Positionering og konkurrentanalyse", sub: "Find dit vindue i markedet" },
      { title: "Vækststrategi og skaleringsplan", sub: "Systematisk vej fra A til B" },
      { title: "Prisstrategi og forretningsmodel", sub: "Prissæt med data, ikke mavefølelse" },
      { title: "Forretningsøkonomi", sub: "Forstå dine tal. Styrk dine marginer" },
      { title: "Go-to-market og kunderejse", sub: "Fra lead til loyal kunde" },
    ],
  },
  {
    label: "TEKNOLOGI",
    heading: "Systemer, automatisering og AI",
    desc: "Vi bygger de tekniske løsninger der driver din forretning - så du bruger tid på kunder, ikke på systemer.",
    items: [
      { title: "AI-agenter og chatbots", sub: "Svar kunder 24/7, book møder automatisk" },
      { title: "Medlemsplatforme og kundeportaler", sub: "Digitalt fællesskab med betaling" },
      { title: "Automatisering og workflows", sub: "Fjern gentagne opgaver permanent" },
      { title: "CRM og systemintegration", sub: "Ét overblik, ikke ti systemer" },
    ],
  },
];

export default function Services() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="ydelser" className="py-20 md:py-28 px-6 md:px-8 max-w-[1100px] mx-auto">
      <div className="text-[0.6rem] tracking-[0.22em] uppercase text-clay font-[300] mb-8">
        Ydelser
      </div>
      <h2 className="font-[300] text-[2rem] text-ink tracking-[0.03em] mb-2 leading-[1.3]">
        Tre discipliner. Én løsning.
      </h2>
      <p className="font-[200] text-[0.95rem] text-stone leading-[1.9] mb-12">
        Hver løsning er skabt i fællesskab.
      </p>

      <div ref={sectionRef} className="grid grid-cols-1 md:grid-cols-3">
        {columns.map((col, i) => (
          <div
            key={col.label}
            className={`py-8 md:py-0 md:px-8 first:md:pl-0 last:md:pr-0 border-b md:border-b-0 md:border-r border-clay last:border-b-0 last:md:border-r-0 transition-all duration-700 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
            style={{ transitionDelay: `${i * 0.2}s` }}
          >
            <div className="text-[0.65rem] tracking-[0.12em] uppercase text-moss font-[400] mb-4">
              {col.label}
            </div>
            <h3 className="font-[300] text-[1.15rem] text-ink mb-3 leading-[1.4]">
              {col.heading}
            </h3>
            <p className="font-[200] text-[0.85rem] text-stone leading-[1.8] mb-6">
              {col.desc}
            </p>

            <div className="flex flex-col gap-4">
              {col.items.map((item) => (
                <div key={item.title} className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-moss shrink-0 mt-1.5" />
                  <div>
                    <div className="font-[300] text-[0.85rem] text-ink leading-[1.5]">
                      {item.title}
                    </div>
                    <div className="font-[200] text-[0.75rem] text-slate leading-[1.5]">
                      {item.sub}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center mt-12">
        <p className="font-[300] text-[1.1rem] text-ink text-center">
          Hvert forløb er skræddersyet. Vi starter med en samtale.
        </p>
        <a
          href="#kontakt"
          className="mt-6 font-[300] text-[0.82rem] tracking-[0.08em] uppercase px-7 py-3 bg-ink text-parchment border border-ink hover:bg-moss hover:border-moss transition-all"
        >
          Book en samtale
        </a>
      </div>
    </section>
  );
}
