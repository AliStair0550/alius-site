"use client";

import { useState } from "react";

type Card = {
  title: string;
  desc: string;
  result: string;
  stack: string;
};

const TABS: { label: string; cards: Card[] }[] = [
  {
    label: "Salg og kunder",
    cards: [
      {
        title: "Leadmotoren",
        desc: "Finder virksomheder der ligner jeres bedste kunder, researcher dem og skriver udkast til første henvendelse.",
        result: "10 kvalificerede emner om ugen, klar til at sende.",
        stack: "Bygger på CVR-data og jeres eget CRM eller regneark.",
      },
      {
        title: "Rykkerrobotten",
        desc: "Overvåger forfaldne fakturaer og sender venlige, eskalerende påmindelser i jeres tone.",
        result: "Kortere betalingstid uden ubehagelige samtaler.",
        stack: "Kobles på Dinero, Billy eller e-conomic.",
      },
      {
        title: "Nyhedsbrevsmotoren",
        desc: "Skriver udkast til jeres nyhedsbrev ud fra måneden der gik: nye varer, omtale, sæson.",
        result: "Konsistent udsendelse uden blank skærm.",
        stack: "Kobles på jeres nyhedsbrevssystem.",
      },
      {
        title: "Rekrutteringssilen",
        desc: "Læser ansøgninger, matcher mod jobkravene og laver en kort sammenfatning af hver kandidat.",
        result: "Shortlist på en time i stedet for en weekend.",
        stack: "Kobles på jeres indbakke.",
      },
    ],
  },
  {
    label: "Overvågning",
    cards: [
      {
        title: "Regelvagten",
        desc: "Overvåger nye regler og krav for jeres branche og sender et kort resumé hver uge i klart sprog.",
        result: "Ingen overraskelser ved kontrolbesøg.",
        stack: "Leveres direkte i Outlook eller Gmail.",
      },
      {
        title: "Omtalevagten",
        desc: "Følger omtale af jer, jeres konkurrenter og jeres branche. Samlet i en ugentlig rapport.",
        result: "I reagerer før alle andre.",
        stack: "Leveres i jeres indbakke eller Teams.",
      },
      {
        title: "Prisvagten",
        desc: "Overvåger konkurrenternes priser og lagerstatus.",
        result: "I ved altid hvor I ligger i markedet.",
        stack: "Ugentlig rapport i jeres indbakke.",
      },
      {
        title: "Udbudsvagten",
        desc: "Overvåger offentlige udbud og matcher dem mod jeres profil.",
        result: "Relevante udbud i indbakken. Ingen manuel søgning.",
        stack: "Leveres i jeres indbakke.",
      },
    ],
  },
  {
    label: "Overblik",
    cards: [
      {
        title: "Håndbogen",
        desc: "Jeres procedurer, priser og aftaler samlet ét sted. Medarbejderne spørger, maskinen svarer.",
        result: "Nye medarbejdere i gang på dage. Færre afbrydelser af chefen.",
        stack: "Bygger på jeres dokumenter i Microsoft 365 eller Google Drive.",
      },
      {
        title: "Bestyrelsesbriefen",
        desc: "Trækker tallene fra jeres regnskabssystem og skriver månedens status i klart sprog. Klar før mødet.",
        result: "Mødeforberedelse fra en dag til ti minutter.",
        stack: "Kobles direkte på Dinero, Billy eller e-conomic.",
      },
      {
        title: "Cash Management",
        desc: "Fremskriver kassebeholdningen ud fra fakturaer, faste omkostninger og sæson.",
        result: "I ser pengeproblemer to måneder før de rammer.",
        stack: "Bygger på jeres regnskabsdata.",
      },
    ],
  },
  {
    label: "Marketing",
    cards: [
      {
        title: "Marketingdashboardet",
        desc: "Samler tallene fra Google, Meta og LinkedIn ét sted med en månedlig kommentar i klart sprog.",
        result: "I ved hvad hver krone giver igen.",
        stack: "Kobles på jeres annoncekonti.",
      },
      {
        title: "SEO-vagten",
        desc: "Overvåger placeringer, tekniske fejl og konkurrenternes indhold. Månedlig prioriteret liste.",
        result: "I ved præcis hvad der skal fikses først.",
        stack: "Kobles på Google Search Console.",
      },
      {
        title: "AI-synlighedsrapporten",
        desc: "Måler om ChatGPT, Claude og Gemini anbefaler jer eller konkurrenten, når kunderne spørger.",
        result: "I ved hvor I står i den nye søgning.",
        stack: "Månedlig rapport i jeres indbakke.",
      },
      {
        title: "Annonceautomaten",
        desc: "Genererer og tester annoncevarianter mod jeres bedste, og pauser taberne automatisk.",
        result: "Lavere pris per kunde uden bureau.",
        stack: "Kobles på Meta og Google Ads.",
      },
    ],
  },
];

function ExampleCard({ card }: { card: Card }) {
  return (
    <article className="border border-clay/70 p-5 md:p-6 flex flex-col transition-colors duration-300 hover:border-moss/50 hover:bg-fog/30">
      <h3 className="font-[400] text-[1.05rem] text-ink mb-2.5 tracking-[0.01em]">{card.title}</h3>
      <p className="font-[200] text-[0.85rem] text-stone leading-[1.75] mb-5 flex-1">{card.desc}</p>
      <div className="mb-5">
        <div className="text-[0.58rem] tracking-[0.18em] uppercase text-moss font-[400] mb-1.5">Resultat</div>
        <p className="font-[300] text-[0.86rem] text-ink leading-[1.55]">{card.result}</p>
      </div>
      <p className="font-[200] text-[0.72rem] text-slate leading-[1.55] pt-3.5 border-t border-clay/50">{card.stack}</p>
    </article>
  );
}

export default function Maskinrummet() {
  const [active, setActive] = useState(0);

  return (
    <section id="maskinrummet" className="py-20 md:py-28 px-6 md:px-8 max-w-[1100px] mx-auto">
      {/* Header */}
      <h2 className="font-[300] text-[2rem] text-ink tracking-[0.03em] mb-4 leading-[1.3]">
        Maskinrummet
      </h2>
      <p className="font-[200] text-[0.95rem] text-stone leading-[1.9] mb-12 max-w-[620px]">
        Et indblik i de digitale maskiner, vi bygger. Skræddersyet til jeres forretning og integreret med de systemer, I allerede arbejder i.
      </p>

      {/* Faner */}
      <div className="flex gap-6 md:gap-8 border-b border-clay/60 mb-10 overflow-x-auto portfolio-track">
        {TABS.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActive(i)}
            className={`pb-3 -mb-px whitespace-nowrap text-[0.7rem] tracking-[0.14em] uppercase font-[400] border-b-2 transition-colors ${
              active === i ? "text-ink border-moss" : "text-slate border-transparent hover:text-ink"
            }`}
            aria-pressed={active === i}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Kort */}
      <div key={active} className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 animate-fade-up">
        {TABS[active].cards.map((card) => (
          <ExampleCard key={card.title} card={card} />
        ))}
      </div>

      {/* Afslutning: to-delt strategibjælke */}
      <div className="mt-16 md:mt-24 bg-sand border border-clay/60 p-8 md:p-12">
        <h3 className="font-[300] text-[1.4rem] text-ink tracking-[0.02em] mb-8">
          Sådan kommer vi derhen
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          <div>
            <div className="text-[0.65rem] tracking-[0.14em] uppercase text-moss font-[400] mb-3">
              01 AI-strategien
            </div>
            <p className="font-[200] text-[0.88rem] text-stone leading-[1.8]">
              Vi kortlægger hvor maskinerne skaber målbar værdi hos jer, og prioriterer efter gevinst og byggetid.
            </p>
          </div>
          <div>
            <div className="text-[0.65rem] tracking-[0.14em] uppercase text-moss font-[400] mb-3">
              02 Implementeringen
            </div>
            <p className="font-[200] text-[0.88rem] text-stone leading-[1.8]">
              Vi bygger, træner jeres medarbejdere og bliver til det kører.
            </p>
          </div>
        </div>
      </div>

      {/* Link til kontakt */}
      <p className="mt-8 font-[200] text-[0.9rem] text-slate leading-[1.8]">
        Jeres rutine er ikke her?{" "}
        <a href="#kontakt" className="text-moss hover:text-ink transition-colors underline underline-offset-4 decoration-clay">
          Fortæl om dit problem.
        </a>
      </p>
    </section>
  );
}
