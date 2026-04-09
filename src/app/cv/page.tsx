import type { Metadata } from "next";
import { Footer } from "@/components/CTAFooter";

export const metadata: Metadata = {
  title: "Ali Al-Farhan - CV | ALIUS",
  description: "Strategisk projektleder og forretningsudvikler.",
};

const experience = [
  {
    company: "Arbejdernes Landsbank",
    logo: "/cv-AL.png",
    period: "2024 - 2026",
    roles: [
      {
        title: "Strategisk Projektleder",
        desc: "Skabte fremdrift i bankens vigtigste udviklingsinitiativer. Sikrede at projekter blev planlagt og gennemført effektivt på tværs af organisationen. Opbyggede bankens Cash Management område - både produkt- og rådgivningssiden.",
      },
    ],
  },
  {
    company: "Karnov Group",
    logo: "/cv-karnov.png",
    period: "2020 - 2024",
    roles: [
      {
        title: "Business Strategy Manager",
        desc: "Faciliterede og drev strategiprocessen på tværs af Danmark og Sverige. Ansvarlig for omsætning af strategi til eksekverbare initiativer i tæt samarbejde med ledelsen.",
      },
      {
        title: "PMO Portfolio Specialist",
        desc: "Rapportering og understøttelse af den samlede projektportefølje. Sikrede omdannelse og lancering af en norsk platform skræddersyet til det danske marked.",
      },
      {
        title: "Business Analyst",
        desc: "Forhandlede samarbejdsaftaler, tovholder på rapportering og analyse af Cost of Sales, gennemførte økonomiske analyser og bidrog til tværgående projekter.",
      },
    ],
  },
  {
    company: "Molt Wengel advokatkontor",
    logo: "/cv-moltwengel.png",
    period: "2019 - 2020",
    roles: [
      {
        title: "Business Development Consultant",
        desc: "Ledte processer med fokus på effektivisering og standardisering af juridiske arbejdsgange. Drev Legal Tech-projekter, herunder et automatiseringsprojekt der genererede leads til den kommercielle afdeling.",
      },
    ],
  },
  {
    company: "Sens Food",
    logo: "/cv-Sensfood.png",
    period: "2017 - 2019",
    roles: [
      {
        title: "Selvstændig iværksætteri",
        desc: "Udviklede madprodukter med fokus på dressinger, eksekverede på marketingindsatser og opbyggede relationer til supermarkedskæder og producenter.",
      },
    ],
  },
  {
    company: "Udenrigsministeriet",
    logo: "/cv-UM.png",
    period: "2016 - 2017",
    roles: [
      {
        title: "Trade Consultant i UAE",
        desc: "Etablering af lokale partnerskaber på tværs af industrier, udarbejdelse af brancheanalyser samt koordinering af diplomatiske delegationer.",
      },
    ],
  },
];

const education = [
  { school: "Aarhus Universitet", period: "2015 - 2018", degree: "MSc. Finance and International Business" },
  { school: "Warsaw School of Economics", period: "2016", degree: "Brand Management and Social Media Marketing" },
  { school: "London School of Economics", period: "2015", degree: "Personal Mastery in the Art of Negotiating" },
  { school: "University of California, San Diego", period: "2015", degree: "Accounting and Finance" },
  { school: "Aalborg Universitet", period: "2012 - 2015", degree: "BSc. Business Administration & Economics" },
];

const certifications = [
  { name: "PRINCE2", org: "Mannaz", year: "2025" },
  { name: "Præsentationsteknik", org: "Mannaz", year: "2024" },
  { name: "Projektledelse PMP", org: "Mannaz", year: "2023" },
  { name: "SQL", org: "Teknologisk Institut", year: "2022" },
  { name: "Consulting 101", org: "Consulting & Leadership Academy / QVARTS", year: "2019" },
];

export default function CVPage() {
  return (
    <>
      <nav className="flex justify-between items-center px-8 py-5 border-b border-fog bg-parchment">
        <a href="/" className="font-[300] text-[0.78rem] tracking-[0.1em] uppercase text-slate hover:text-ink transition-colors">
          &larr; Tilbage
        </a>
      </nav>

      <main className="max-w-[900px] mx-auto px-6 md:px-8 py-16 md:py-24">
        {/* Header */}
        <div className="mb-16">
          <h1 className="font-[300] text-[2rem] md:text-[2.4rem] text-ink tracking-[0.02em] leading-[1.3] mb-3">
            Ali Al-Farhan
          </h1>
          <p className="font-[200] text-[1rem] text-slate leading-[1.7] mb-6">
            Strategisk projektleder og forretningsudvikler.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <span className="font-[200] text-[0.8rem] text-stone">København</span>
            <a href="https://www.linkedin.com/in/alialfarhan/" target="_blank" rel="noopener noreferrer" className="font-[200] text-[0.8rem] text-moss hover:opacity-70 transition-opacity">
              LinkedIn
            </a>
          </div>
        </div>

        {/* Erhvervserfaring */}
        <section className="mb-16">
          <div className="flex items-center gap-4 mb-10">
            <div className="text-[0.65rem] tracking-[0.15em] uppercase text-moss font-[400]">
              Erhvervserfaring
            </div>
            <div className="flex-1 h-px bg-clay" />
          </div>

          <div className="flex flex-col gap-12">
            {experience.map((exp) => (
              <div key={exp.company} className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 md:gap-8">
                <div className="flex items-start gap-3">
                  {"logo" in exp && exp.logo && (
                    <img src={exp.logo} alt={exp.company} className="w-[28px] h-[28px] object-cover rounded-[4px] shrink-0 mt-0.5" style={{ clipPath: "inset(8%)" }} />
                  )}
                  <div>
                    <div className="font-[400] text-[0.9rem] text-ink">{exp.company}</div>
                    <div className="font-[200] text-[0.75rem] text-slate">{exp.period}</div>
                  </div>
                </div>
                <div className="flex flex-col gap-6">
                  {exp.roles.map((role) => (
                    <div key={role.title}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-moss" />
                        <div className="font-[300] text-[0.9rem] text-ink">{role.title}</div>
                      </div>
                      <div className="font-[200] text-[0.82rem] text-stone leading-[1.8] pl-[18px]">
                        {role.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Uddannelse & Certifikater */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          <section>
            <div className="flex items-center gap-4 mb-10">
              <div className="text-[0.65rem] tracking-[0.15em] uppercase text-moss font-[400]">
                Uddannelse
              </div>
              <div className="flex-1 h-px bg-clay" />
            </div>

            <div className="flex flex-col gap-6">
              {education.map((edu) => (
                <div key={edu.school}>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-moss" />
                    <div className="font-[300] text-[0.85rem] text-ink">{edu.school}</div>
                  </div>
                  <div className="pl-[18px]">
                    <div className="font-[200] text-[0.78rem] text-stone">{edu.degree}</div>
                    <div className="font-[200] text-[0.72rem] text-slate">{edu.period}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-4 mb-10">
              <div className="text-[0.65rem] tracking-[0.15em] uppercase text-moss font-[400]">
                Certifikater
              </div>
              <div className="flex-1 h-px bg-clay" />
            </div>

            <div className="flex flex-col gap-6">
              {certifications.map((cert) => (
                <div key={cert.name}>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-moss" />
                    <div className="font-[300] text-[0.85rem] text-ink">{cert.name}</div>
                  </div>
                  <div className="pl-[18px]">
                    <div className="font-[200] text-[0.78rem] text-stone">{cert.org}</div>
                    <div className="font-[200] text-[0.72rem] text-slate">{cert.year}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* CTA */}
        <div className="mt-20 pt-12 border-t border-clay flex flex-col items-center text-center">
          <p className="font-[300] text-[1.1rem] text-ink mb-6">
            Interesseret i et samarbejde?
          </p>
          <a
            href="/#kontakt"
            className="font-[300] text-[0.82rem] tracking-[0.08em] uppercase px-7 py-3 bg-ink text-parchment border border-ink hover:bg-moss hover:border-moss transition-all"
          >
            Book en samtale
          </a>
        </div>
      </main>

      <Footer />
    </>
  );
}
