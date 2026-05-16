export type CoreIdea = {
  title: string;
  body: string;
};

export type Quote = {
  text: string;
  source: string;
};

export type Relation = {
  slug: string;
  name: string;
  label: string; // "Påvirkede", "Påvirket af", "Reaktion mod", "Beslægtet med"
};

export type Thinker = {
  slug: string;
  name: string;
  born: number; // negative = BC
  died: number | null;
  nationality: string;
  era: string;
  tagline: string;
  centralIdea: string;
  symbol: string;
  moodColors: [string, string]; // [dark base, accent]
  visualEnergy: string;
  portraitSrc?: string;
  relations: Relation[];
  themes: string[];
  intro: string;
  coreIdeas: CoreIdea[];
  quotes: Quote[];
  legacy: string;
  modernRelevance: string;
};

export function formatYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} f.Kr.` : `${year}`;
}

export const THINKERS: Thinker[] = [
  // ─── ANTIKKEN ──────────────────────────────────────────────────────────────
  {
    slug: "platon",
    name: "Platon",
    born: -428,
    died: -348,
    nationality: "Græsk",
    era: "Antikken",
    tagline: "Virkeligheden er ikke virkeligheden.",
    centralIdea: "Mennesker reagerer ikke på virkeligheden - de reagerer på deres opfattelse af den. Den der styrer opmærksomhed, styrer virkeligheden.",
    symbol: "Hulen",
    moodColors: ["#1A1208", "#C17F3A"],
    visualEnergy: "virkelighed er konstrueret",
    portraitSrc: "/images/frihedstaenkere/platon.avif",
    themes: ["Sandhed", "Bevidsthed"],
    relations: [
      { slug: "karl-popper", name: "Karl Popper", label: "Kritiseret af" },
      { slug: "john-rawls", name: "John Rawls", label: "Idémæssig forfader til" },
    ],
    intro:
      "Platon forstod noget de fleste mennesker stadig overser. Mennesker reagerer ikke på virkeligheden. De reagerer på deres opfattelse af den. I \"Allegory of the Cave\" beskriver han mennesker lænket foran en væg, hvor skygger projiceres foran dem. Skyggerne bliver deres virkelighed - fordi de aldrig har set andet. Det var ikke bare filosofi. Det var et varsel.",
    coreIdeas: [
      {
        title: "Hulen",
        body:
          "Forestil dig fanger, der hele livet har siddet i en hule med ryggen til udgangen. De kan kun se skygger på væggen foran dem - projiceret af ting de aldrig har set. Disse skygger er al den virkelighed de kender. Platon bruger dette billede til at sige: det du kalder virkelighed er en skygge af noget dybere og mere virkeligt. Filosofien er vejen ud af hulen.",
      },
      {
        title: "Idéernes verden",
        body:
          "Bag alt det sansbare - alle stole, træer og mennesker - eksisterer ifølge Platon perfekte, evige idéer: idéen om en stol, idéen om et træ, idéen om det gode. Det vi sanser er blot ufuldkomne kopier af disse idéer. Den virkelige erkendelse er erkendelsen af idéerne, ikke af tingene.",
      },
      {
        title: "Filosof-kongen",
        body:
          "I 'Staten' forestiller Platon sig det ideelle samfund, ledet af filosoffer - dem der har set virkeligheden og derfor kan lede klogt. Det er et kontroversielt og farligt billede: at retfærdighed kræver, at de kloge hersker over de mange. Karl Popper kaldte det den vestlige totalitarismes urform.",
      },
    ],
    quotes: [
      {
        text: "We can easily forgive a child who is afraid of the dark; the real tragedy of life is when men are afraid of the light.",
        source: "Tilskrevet Platon",
      },
      {
        text: "The price of apathy towards public affairs is to be ruled by evil men.",
        source: "Tilskrevet Platon",
      },
    ],
    legacy:
      "Filosoffen Alfred North Whitehead sagde, at hele europæisk filosofihistorie er fodnoter til Platon. Det er ikke langt fra sandheden. Erkendelsesteorien, politisk filosofi, etik, æstetik - Platon satte spørgsmålene der har drevet tænkning i 2.400 år. Hans akademi i Athen var verdens første universitetsagtige institution.",
    modernRelevance:
      "I dag er hulen blevet digital. Algoritmer bestemmer hvad mennesker ser. Medier former frygt. Sociale platforme former identitet. Narrativer bliver vigtigere end sandhed. De fleste mennesker tror stadig deres tanker er deres egne. Platon ville have sagt: nej. Du ser bare skyggerne på væggen. Den farligste magt i verden er ikke fysisk magt. Det er magten til at forme perception.",
  },

  // ─── OPLYSNINGSTIDEN ───────────────────────────────────────────────────────
  {
    slug: "john-locke",
    name: "John Locke",
    born: 1632,
    died: 1704,
    nationality: "Engelsk",
    era: "Oplysningstiden",
    tagline: "Frihed begynder med retten til sig selv.",
    centralIdea: "Mennesket fødes med naturlige rettigheder - og al legitim magt kræver samtykke.",
    symbol: "Kontrakten",
    moodColors: ["#1A1408", "#B8923A"],
    portraitSrc: "/images/frihedstaenkere/john-locke.avif",
    visualEnergy: "ret er altid forud for magt",
    themes: ["Frihed", "Samfund"],
    relations: [
      { slug: "john-stuart-mill", name: "J.S. Mill", label: "Påvirkede" },
      { slug: "john-rawls", name: "John Rawls", label: "Påvirkede" },
      { slug: "isaiah-berlin", name: "Isaiah Berlin", label: "Påvirkede" },
    ],
    intro:
      "John Locke lagde grunden til moderne liberalisme med sin overbevisning om, at mennesker fødes med naturlige rettigheder - til liv, frihed og ejendom. Hans tanker om, at al legitim magt kræver samtykke fra de styrede, gennemsyrer vestlige demokratier den dag i dag. Thomas Jefferson omskrev hans ord og skabte den amerikanske uafhængighedserklæring.",
    coreIdeas: [
      {
        title: "Naturlige rettigheder",
        body:
          "Locke hævdede, at mennesket i naturtilstanden allerede ejer tre uopgivelige rettigheder: liv, frihed og ejendom. Disse rettigheder er ikke givet af staten - de er medfødte og uafhændelige. Statens eneste legitime formål er at beskytte dem.",
      },
      {
        title: "Samtykkets princip",
        body:
          "Politisk magt er kun legitim, hvis den stammer fra de styredes frie samtykke. Dette grundlæggende princip gør Locke til forløber for både den amerikanske uafhængighedserklæring og moderne parlamentarisme.",
      },
      {
        title: "Ejerskab og arbejde",
        body:
          "Lockes arbejdsteori for ejendom siger, at man erhverver ejendomsret ved at blande sit arbejde med naturen. Det er en af historiens mest indflydelsesrige - og mest omdiskuterede - teorier om, hvorfra privat ejendom stammer.",
      },
    ],
    quotes: [
      {
        text: "Where-ever law ends, tyranny begins.",
        source: "Two Treatises of Government, 1689",
      },
      {
        text: "The end of law is not to abolish or restrain, but to preserve and enlarge freedom.",
        source: "Second Treatise of Government, 1689",
      },
    ],
    legacy:
      "Lockes idéer formede den amerikanske forfatning, den franske revolution og det liberale demokratis grundlæggende arkitektur. Thomas Jefferson omskrev hans formulering om 'liv, frihed og ejendom' til 'liv, frihed og stræben efter lykke'. Næppe nogen enkelt tænker har sat et stærkere aftryk på den vestlige politiske orden.",
    modernRelevance:
      "Lockes samtykke-princip er grundlaget for al diskussion om digitale rettigheder, GDPR og brugerdata. Hans ejendomsteori er central for debatten om intellektuel ejendom og open source. Og hans argument for begrænsning af statsmagten er stadig kernen i konservative og liberale argumenter mod statslig overvægt.",
  },
  {
    slug: "adam-smith",
    name: "Adam Smith",
    born: 1723,
    died: 1790,
    nationality: "Skotsk",
    era: "Oplysningstiden",
    tagline: "Ikke venlighed, men egeninteresse bager vores brød.",
    centralIdea: "Individers egeninteresse, kanaliseret gennem fri udveksling, skaber kollektiv velstand.",
    symbol: "Den usynlige hånd",
    moodColors: ["#0A1A0A", "#4A8C5A"],
    portraitSrc: "/images/frihedstaenkere/adam-smith.avif",
    visualEnergy: "orden opstår uden planlægning",
    themes: ["Marked", "Samfund"],
    relations: [
      { slug: "ludwig-von-mises", name: "Ludwig von Mises", label: "Påvirkede" },
      { slug: "milton-friedman", name: "Milton Friedman", label: "Påvirkede" },
    ],
    intro:
      "Adam Smith er markedsøkonomiens fader. Hans indsigt - at individers pursuit of self-interest, kanaliseret gennem fri udveksling, skaber kollektiv velstand - er et af de mest kraftfulde og kontroversielle idéer i videnskabshistorien. Smith var dog mere nuanceret end hans efterfølgere: han var moralfilosof før han var økonom.",
    coreIdeas: [
      {
        title: "Den usynlige hånd",
        body:
          "Individer, der søger deres egen fordel, ledes som af en usynlig hånd til at fremme samfundets bedste - ofte mere effektivt, end hvis de direkte havde forsøgt det. Mekanismen er prissystemet: det koordinerer millioner af beslutninger uden central styring.",
      },
      {
        title: "Arbejdsdelingens magt",
        body:
          "Smiths berømte nålefabrik-eksempel viser, at specialisering og arbejdsdeling dramatisk øger produktiviteten. Det er ikke naturressourcer, men organisation og udveksling, der skaber national velstand.",
      },
      {
        title: "Moralske følelser",
        body:
          "Smith var ikke den kolde rationalist, hans omdømme antyder. I 'The Theory of Moral Sentiments' argumenterede han for, at sympati og social sensitivitet er grundlæggende menneskelige egenskaber - og nødvendige forudsætninger for, at markeder fungerer retfærdigt.",
      },
    ],
    quotes: [
      {
        text: "It is not from the benevolence of the butcher, the brewer, or the baker that we expect our dinner, but from their regard to their own interest.",
        source: "The Wealth of Nations, 1776",
      },
      {
        text: "No society can surely be flourishing and happy, of which the far greater part of the members are poor and miserable.",
        source: "The Wealth of Nations, 1776",
      },
    ],
    legacy:
      "The Wealth of Nations (1776) grundlagde moderne økonomi som videnskab. Smiths idéer om frihandel, arbejdsdeling og markedets selvregulerende mekanismer har formet alt fra det 19. århundredes industrikapitalisme til nutidens globaliseringsdebat. Han er den oftest citerede - og oftest misfortolkede - økonom i historien.",
    modernRelevance:
      "Smiths spørgsmål er nutidens: hvornår skaber markeder velstand, og hvornår kræver de regulering? Gig-economy, platform-kapitalisme og AI-automatisering er alle variationer af hans grundspørgsmål om, hvad der sker, når menneskelig arbejdskraft organiseres anderledes.",
  },

  // ─── 1800-TALLET ───────────────────────────────────────────────────────────
  {
    slug: "alexis-de-tocqueville",
    name: "Alexis de Tocqueville",
    born: 1805,
    died: 1859,
    nationality: "Fransk",
    era: "1800-tallet",
    tagline: "Demokratiet frelser os fra aristokratiet - og skaber sit eget tyranni.",
    centralIdea: "Demokratiet bærer kimen til sin egen korrumpering: majoritetens tyranni og statens blide despotisme.",
    symbol: "Massen",
    moodColors: ["#1A0E08", "#8C5A3A"],
    portraitSrc: "/images/frihedstaenkere/alexis-de-tocqueville.avif",
    visualEnergy: "flertallet kan undertrykke",
    themes: ["Frihed", "Samfund"],
    relations: [
      { slug: "john-locke", name: "John Locke", label: "Påvirket af" },
      { slug: "rene-girard", name: "René Girard", label: "Påvirkede" },
      { slug: "john-rawls", name: "John Rawls", label: "Påvirkede" },
    ],
    intro:
      "Alexis de Tocqueville rejste til Amerika i 1831 for at forstå, hvad demokrati faktisk var - og vendte hjem med den mest præcise diagnose af demokratiets sjæl nogensinde skrevet. Hans 'Democracy in America' er en hyldest og en advarsel på én gang: demokratiet er uundgåeligt, men det bærer kimen til sit eget forfald.",
    coreIdeas: [
      {
        title: "Majoritetens tyranni",
        body:
          "Demokratiet løser aristokratiets problem med elitens magtmisbrug - men erstatter det med flertallets tyranni. Majority rule kan undertrykke mindretal og afvigere ligeså effektivt som en enevældig hersker. Tocqueville så dette tidligere end næsten alle andre.",
      },
      {
        title: "Civilsamfundets nødvendighed",
        body:
          "Frihed vedligeholdes ikke af staten - den vedligeholdes af borgernes aktive deltagelse i det civile liv: foreninger, lokalsamfund, kirker, aviser. Uden disse mellemled synker den enkelte borger mod isolation og staten mod centralisme.",
      },
      {
        title: "Mild despotisme",
        body:
          "Tocqueville forudsagde en ny form for undertrykkelse: en velvillig stat, der gradvist overtager mere og mere af borgernes liv - ikke med vold, men med omsorg. Borgerne forbliver i 'en evig barndom'. Han kaldte det 'soft despotism'.",
      },
    ],
    quotes: [
      {
        text: "The American Republic will endure until the day Congress discovers that it can bribe the public with the public's money.",
        source: "Democracy in America, 1835",
      },
      {
        text: "I know of no country in which there is so little independence of mind and real freedom of discussion as in America.",
        source: "Democracy in America, 1835",
      },
    ],
    legacy:
      "Tocqueville opfandt det begreb, vi i dag kalder 'politisk kultur'. Hans analyse af, hvordan demokratier kan korrumperes indefra - gennem majoritetspres, individualisme og statslig paternalisme - er en af de mest forudseende tekster i politisk filosofi.",
    modernRelevance:
      "Tocquevilles advarsel om 'mild despotisme' - staten der overtager beslutningerne mens borgerne sover - er kernen i nutidens diskussion om paternalisme, velfærdsstatens grænser og politisk apatI. Hans analyse af, hvordan sociale normer kvæler frihed ligeså effektivt som love, er direkte relevant for platformsalgoritmernes adfærdsstyring.",
  },
  {
    slug: "john-stuart-mill",
    portraitSrc: "/images/frihedstaenkere/john-stuart-mill.avif",
    name: "John Stuart Mill",
    born: 1806,
    died: 1873,
    nationality: "Engelsk",
    era: "1800-tallet",
    tagline: "Den eneste legitime frihedsbegrænsning er beskyttelse af andre.",
    centralIdea: "Individets frihed er ukrænkelig, så længe den ikke skader andre.",
    symbol: "Skalesvægten",
    moodColors: ["#0A1020", "#5A6EA0"],
    visualEnergy: "skad ingen, gør alt",
    themes: ["Frihed", "Samfund"],
    relations: [
      { slug: "john-locke", name: "John Locke", label: "Påvirket af" },
      { slug: "isaiah-berlin", name: "Isaiah Berlin", label: "Påvirkede" },
      { slug: "john-rawls", name: "John Rawls", label: "Påvirkede" },
    ],
    intro:
      "John Stuart Mill formulerede den klassiske liberalismes skarpe kerne: at individets frihed er ukrænkelig, så længe den ikke skader andre. Hans essay 'On Liberty' er stadig det bedste argument for ytringsfrihed nogensinde skrevet - og et angreb på al majoritetstyranni, uanset om det udøves af stater eller sociale normer.",
    coreIdeas: [
      {
        title: "Skadesprincippet",
        body:
          "Det er kun berettiget at begrænse et individs frihed for at forhindre skade på andre. Ikke for at gøre vedkommende lykkelig, ikke for at håndhæve moralske normer, ikke for at beskytte dem mod sig selv. Dette er liberalismens skarpeste formulering.",
      },
      {
        title: "Ytringsfrihedens absolutisme",
        body:
          "Mill argumenterede for ytringsfrihed med fire argumenter: 1) Den undertrykte mening kan have ret. 2) Den kan indeholde en sandhed vi mangler. 3) Selv falske idéer skærper sandheden. 4) Undertrykt sandhed bliver en livløs dogme. Intet af disse argumenter er dateret.",
      },
      {
        title: "Tyranniet af den herskende mening",
        body:
          "Mill frygtede ikke kun statslig tyranni - han frygtede det sociale pres fra majoriteten. Konformitetspresset, den tavse censur af det anderledes, er ligeså farlig for friheden som statens love.",
      },
    ],
    quotes: [
      {
        text: "The only freedom which deserves the name is that of pursuing our own good in our own way, so long as we do not attempt to deprive others of theirs.",
        source: "On Liberty, 1859",
      },
      {
        text: "If all mankind minus one were of one opinion, mankind would be no more justified in silencing that one person than he, if he had the power, would be justified in silencing mankind.",
        source: "On Liberty, 1859",
      },
    ],
    legacy:
      "Mill er stadig pensum på alle juridiske og filosofiske uddannelser. Hans skadesprincip er grundlaget for enhver diskussion om, hvornår lovgivning er legitim. Og hans analyse af, hvordan sociale normer kan kvæle frihed ligeså effektivt som love, er mere relevant i en algoritmisk tidsalder end nogensinde.",
    modernRelevance:
      "Mills skadesprincip er udgangspunktet for al nutidig diskussion om platformsmoderation, ytringsfrihed på sociale medier og cancel culture. Hans fire argumenter for ytringsfrihed er det mest citerede filosofiske fundament i kampen mod platformscensur.",
  },

  {
    slug: "friedrich-nietzsche",
    name: "Friedrich Nietzsche",
    born: 1844,
    died: 1900,
    nationality: "Tysk",
    era: "1800-tallet",
    tagline: "Gud døde. Mennesket erstattede ham ikke.",
    centralIdea: "Når de gamle værdier kollapser, opstår spørgsmålet: hvem bestemmer nu hvad der er sandt, godt og vigtigt?",
    symbol: "Afgrunden",
    moodColors: ["#1A0C06", "#C87040"],
    visualEnergy: "intet er sandt - alt er tilladt",
    portraitSrc: "/images/frihedstaenkere/friedrich-nietzsche.avif",
    themes: ["Identitet", "Magt"],
    relations: [
      { slug: "carl-jung", name: "Carl Jung", label: "Påvirkede" },
      { slug: "rene-girard", name: "René Girard", label: "Påvirkede" },
      { slug: "michel-foucault", name: "Michel Foucault", label: "Påvirkede" },
    ],
    intro:
      "Nietzsche mente ikke bare at religion var ved at forsvinde. Han mente at civilisationen var på vej ind i et tomrum. I århundreder havde mennesker bygget mening gennem religion, moral, tradition og autoritet. Men moderniteten begyndte at opløse det hele. Videnskab voksede. Teknologi voksede. Individet voksede. Og langsomt mistede mennesker troen på noget større end dem selv.",
    coreIdeas: [
      {
        title: "Gud er død",
        body:
          "Nietzsches mest berømte idé er ofte misforstået. 'Gud er død' var ikke en fejring - det var en advarsel. Det betød ikke at Gud aldrig havde eksisteret, men at troen på det absolutte ikke længere bar civilisationen. Og spørgsmålet var presserende: hvem bestemmer nu hvad der er sandt, godt og vigtigt?",
      },
      {
        title: "Vilje til magt",
        body:
          "Menneskets grundlæggende drev er ikke overlevelse og ikke lykke. Det er vilje til magt - til vækst, selvoverskridelse og udfoldelse. Nietzsche mente at moral meget ofte er en omvendt magtudøvelse: de svage definerer det gode som underkastelse, tålmodighed og selvopofrelse for at begrænse de stærkes ekspansion.",
      },
      {
        title: "Nihilisme og omvurdering",
        body:
          "Når gamle værdier kollapser, risikerer mennesket at falde ind i nihilisme: den opfattelse at intet har mening. Nietzsche så dette som den største fare ved moderniteten. Hans svar var ikke at genopbygge gamle værdier men at skabe nye - og det kræver mod til at stå i tomrummet.",
      },
    ],
    quotes: [
      {
        text: "God is dead. God remains dead. And we have killed him.",
        source: "The Gay Science, 1882",
      },
      {
        text: "What does not kill me makes me stronger.",
        source: "Twilight of the Idols, 1889",
      },
    ],
    legacy:
      "Nietzsche er den mest indflydelsesrige filosof siden Kant. Hans idéer gennemstrømmer eksistentialisme, psykoanalyse, postmodernisme og politisk filosofi. Han inspirerede Freud, Jung, Heidegger, Sartre og Foucault. Og paradoksalt nok er han den tænker der oftest er blevet misbrugt: hans idéer om magt og den stærke mand blev forvrænget af nazisterne til det modsatte af hvad han mente.",
    modernRelevance:
      "Når mennesker mister Gud, forsøger de at skabe nye guder. Ideologi. Nationer. Teknologi. Fremskridt. AI. Nietzsche forstod at mennesket længes konstant efter noget at underkaste sig. Det 21. århundredes techno-utopister, nationalister og identitetspolitikere er alle moderne udtryk for det tomrum han diagnosticerede i 1882.",
  },

  // ─── DET 20. ÅRHUNDREDE ────────────────────────────────────────────────────
  {
    slug: "carl-jung",
    name: "Carl Jung",
    born: 1875,
    died: 1961,
    nationality: "Schweizisk",
    era: "1900-tallet",
    tagline: "Det du undertrykker, kontrollerer dig.",
    centralIdea: "Bag personligheden findes skyggen - de sider af os selv vi ikke vil se. Jo mere mennesker forsøger at fremstå perfekte, desto stærkere bliver skyggen.",
    symbol: "Spejlet",
    moodColors: ["#080F1A", "#3A7A8A"],
    visualEnergy: "det skjulte selv",
    portraitSrc: "/images/frihedstaenkere/carl-jung.avif",
    themes: ["Bevidsthed", "Identitet"],
    relations: [
      { slug: "friedrich-nietzsche", name: "Friedrich Nietzsche", label: "Påvirket af" },
      { slug: "rene-girard", name: "René Girard", label: "Beslægtet med" },
    ],
    intro:
      "Carl Jung mente at mennesket ikke er rationelt. Det er fragmenteret. Bag personligheden findes skyggen: de sider af os selv vi ikke vil se. Aggression. Begær. Frygt. Statuslyst. Behovet for kontrol. Jo mere mennesker forsøger at fremstå perfekte, desto stærkere bliver skyggen. Jung mente at moderne mennesker er farlige netop fordi de tror de er gode.",
    coreIdeas: [
      {
        title: "Det kollektive ubevidste",
        body:
          "Under det personlige ubevidste - vores egne fortrængte minder - eksisterer ifølge Jung et dybere lag: det kollektive ubevidste. Det er et reservoir af arkaiske billeder og mønstre som alle mennesker deler, på tværs af kulturer og historiske epoker. Det er her myternes og religionernes dybe strukturer stammer fra.",
      },
      {
        title: "Arketyper",
        body:
          "Inden i det kollektive ubevidste lever universelle figurer og mønstre: Helten, Skyggen, Anima/Animus, Den Store Moder, den Vise. Disse arketyper udtrykker sig i drømme, myter, eventyr og kunst. De er ikke lærte - de er medfødte strukturer i menneskets psyke.",
      },
      {
        title: "Individuationen",
        body:
          "Jungs centrale terapeutiske og eksistentielle mål var individuation: den proces, hvorved en person integrerer alle aspekter af sig selv - inklusive skyggen, de dele af selvet man har undertrykt eller nægtet. Det fuldt integrerede selv er ikke harmonisk i konventionel forstand - det er hult.",
      },
    ],
    quotes: [
      {
        text: "Until you make the unconscious conscious, it will direct your life and you will call it fate.",
        source: "Carl Jung",
      },
      {
        text: "The most terrifying thing is to accept oneself completely.",
        source: "Carl Jung",
      },
    ],
    legacy:
      "Jungs begreber er dybt ind i populærkulturen: Skyggen, arketypen, det kollektive ubevidste bruges i brand-strategi, filmanalyse, terapi og coaching verden over. Joseph Campbell byggede sin monomyt ('The Hero's Journey') direkte på jungiansk teori - og derved formede han fortællerstrukturen i alt fra Star Wars til Marvel.",
    modernRelevance:
      "Internettet har gjort dette ekstremt synligt. Mennesker bygger identiteter online samtidig med at deres skygge lækker ud overalt: vrede, misundelse, tribalisme, besættelse, selviscenesættelse. Den største illusion er troen på at man kender sig selv. Mennesker er dybere, mørkere og mere ukontrollerbare end de ønsker at tro.",
  },
  {
    slug: "ludwig-von-mises",
    portraitSrc: "/images/frihedstaenkere/ludwig-von-mises.avif",
    name: "Ludwig von Mises",
    born: 1881,
    died: 1973,
    nationality: "Østrigsk-amerikansk",
    era: "1900-tallet",
    tagline: "Socialisme er ikke bare uretfærdig. Den er umulig.",
    centralIdea: "Uden priser er rationel ekonomisk kalkulation umulig - og dermed er central planlægning logisk inkoherent.",
    symbol: "Prissystemet",
    moodColors: ["#180A08", "#9E5A3A"],
    visualEnergy: "planlægning er blind",
    themes: ["Marked", "Frihed"],
    relations: [
      { slug: "adam-smith", name: "Adam Smith", label: "Påvirket af" },
      { slug: "friedrich-hayek", name: "Friedrich Hayek", label: "Påvirkede" },
    ],
    intro:
      "Ludwig von Mises er den mest kompromisløse økonom i historien. Hans socialismekalkulationsdebat fra 1920 - argumentet for, at central planlægning er logisk umulig, ikke blot praktisk vanskelig - er et af de mest virkningsfulde intellektuelle angreb nogensinde. Han tabte dengang. Historien gav ham ret.",
    coreIdeas: [
      {
        title: "Socialistisk kalkulationsargument",
        body:
          "Uden private ejendomsrettigheder er der ingen markedspriser på produktionsmidler. Uden priser er der ingen rationel kalkulation. Uden rationel kalkulation er central planlægning blind. Mises konkluderede i 1920, at socialisme er logisk inkoherent - ikke et spørgsmål om dårlig implementering, men om fundamental umulighed.",
      },
      {
        title: "Praxeologi",
        body:
          "Mises grundlagde en særegen økonomiforståelse: praxeologi - studiet af menneskelig handling som sådan. Økonomi er ikke en empirisk naturvidenskab men en deduktiv videnskab om menneskelig handling under knaphed. Metodologisk er det kontroversielt. Analytisk er det kraftfuldt.",
      },
      {
        title: "Interventionismens logik",
        body:
          "Statens indgreb skaber ubalancer, der skaber problemer, der kræver nye indgreb. Mises kaldte dette 'interventionismens logik': enhver statsindblanding i markedet fører til efterfølgende indgreb, der enten ophæves eller accelererer mod fuld planøkonomi.",
      },
    ],
    quotes: [
      {
        text: "The champions of socialism call themselves progressives, but they recommend a system which is characterized by rigid observance of routine and by a resistance to every kind of improvement.",
        source: "Socialism, 1922",
      },
      {
        text: "The market is not a place, a thing, or a collective entity. The market is a process.",
        source: "Human Action, 1949",
      },
    ],
    legacy:
      "Mises tabte socialismededatten i sin samtid. Men Øst-Europas sammenbrud i 1989 dokumenterede hans argument empirisk. Hans skole - den østrigske - har fået renæssance i det 21. århundrede, ikke mindst fordi hans begreber om emergente ordener og kalkulationsproblemet viser sig relevante i diskussioner om regulering og kryptovaluta.",
    modernRelevance:
      "Mises' kalkulationsargument bruges i dag i debatten om AI-styret planøkonomi: kan en tilstrækkelig kraftfuld computer løse det problem, han identificerede? De fleste økonomer mener nej - men spørgsmålet er levende. Hans interventionisme-analyse er kernen i diskussionen om reguleringskrebs i velfærdsstater.",
  },
  {
    slug: "friedrich-hayek",
    name: "Friedrich Hayek",
    born: 1899,
    died: 1992,
    nationality: "Østrigsk-britisk",
    era: "1900-tallet",
    tagline: "Ingen central planmyndighed kan vide, hvad markedet ved.",
    centralIdea: "Markedets virkelige fortrin er informationsbehandling: det koordinerer spredt, tavsliggjort viden som ingen central instans kan besidde.",
    symbol: "Prisen",
    moodColors: ["#08101A", "#4A6E9E"],
    portraitSrc: "/images/frihedstaenkere/friedrich-hayek.avif",
    visualEnergy: "viden er spredt og tavsliggjort",
    themes: ["Marked", "Frihed"],
    relations: [
      { slug: "ludwig-von-mises", name: "Ludwig von Mises", label: "Påvirket af" },
      { slug: "milton-friedman", name: "Milton Friedman", label: "Påvirkede" },
    ],
    intro:
      "Friedrich Hayek vandt Nobelprisen i økonomi i 1974 for sit arbejde om viden og information i markeder - men hans indflydelse rækker langt ud over det fagøkonomiske. Hans argument om, at samfundets viden er spredt, lokal og tavsliggjort, og at ingen central myndighed kan besidde den, er et af det 20. århundredes mest fundamentale intellektuelle bidrag.",
    coreIdeas: [
      {
        title: "Vidensproblemet",
        body:
          "Markedsøkonomiens største fortrin er ikke effektivitet - det er dens evne til at bruge og koordinere viden, der er spredt ud over millioner af individer, og som ingen central instans kan besidde. Priser er ikke bare tal; de er informationssystemer der transmitterer lokal viden globalt.",
      },
      {
        title: "Spontan orden",
        body:
          "De mest robuste sociale institutioner - sprog, ret, marked, moral - er ikke designet af nogen. De er opstået spontant gennem utallige individuelle handlinger og generationer af trial-and-error. At erstatte disse evolutionære institutioner med bevidst design er en kategorialt farlig fejlslutning.",
      },
      {
        title: "Vejen til trældom",
        body:
          "I 'The Road to Serfdom' (1944) argumenterede Hayek for, at central planlægning - selv med gode intentioner - nødvendigvis leder mod autoritarisme. Planlæggerne må tvinge folkets adfærd for at nå deres mål, og frihed eroderer gradvist.",
      },
    ],
    quotes: [
      {
        text: "The curious task of economics is to demonstrate to men how little they really know about what they imagine they can design.",
        source: "The Fatal Conceit, 1988",
      },
      {
        text: "If we wish to preserve a free society, it is essential that we recognize that the desirability of a particular object is not sufficient justification for the use of coercion.",
        source: "The Constitution of Liberty, 1960",
      },
    ],
    legacy:
      "Hayek er den intellektuelle faderfigur for den liberale tænkning der prægede 1980'ernes politiske revolution under Thatcher og Reagan. Men hans vigtigste bidrag er mere fundamentalt: han definerede vidensproblemet så klart, at det aldrig siden har kunnet ignoreres.",
    modernRelevance:
      "Hayeks videnteori er direkte relevant for diskussionen om AI og central styring: kan maskinlæring løse vidensproblemet? Og hans begreb om spontane ordener er centrum for debatten om decentraliserede systemer, blockchain og emergente digitale institutioner.",
  },
  {
    slug: "karl-popper",
    portraitSrc: "/images/frihedstaenkere/karl-popper.avif",
    name: "Karl Popper",
    born: 1902,
    died: 1994,
    nationality: "Østrigsk-britisk",
    era: "1900-tallet",
    tagline: "Det åbne samfund er ikke et mål - det er en metode.",
    centralIdea: "Et samfund er åbent, når dets institutioner kan kritiseres og reformeres. Enhver anden form er på vej mod lukkethed.",
    symbol: "Den åbne dør",
    moodColors: ["#101810", "#5A8E5A"],
    visualEnergy: "falsifiér eller forkast",
    themes: ["Sandhed", "Samfund"],
    relations: [
      { slug: "john-stuart-mill", name: "J.S. Mill", label: "Påvirket af" },
      { slug: "platon", name: "Platon", label: "Reaktion mod" },
    ],
    intro:
      "Karl Popper er videnskabsfilosof, men hans bidrag til politisk tænkning er mindst ligeså betydningsfuldt. Hans forsvar for det åbne samfund - bygget på institutionel kritik og menneskelig fejlbarlighed frem for utopi - er det 20. århundredes mest overbevisende argument for liberalt demokrati.",
    coreIdeas: [
      {
        title: "Det åbne samfund",
        body:
          "Et åbent samfund er et, hvor institutioner kan kritiseres, reformeres og afprøves. Det modsatte er det lukkede samfund, der hviler på ufejlbarlige sandheder og er immunt over for kritik. Demokratiet er ikke det bedste mulige system - det er det eneste system, der tillader fredelig afskaffelse af dårlig politik.",
      },
      {
        title: "Falsifikation",
        body:
          "En teori er videnskabelig, hvis den kan falsificeres - altså hvis den kan imødegås af empirisk evidens. Dette princip eliminerer pseudovidenskab og politisk dogmatisme på én gang. Det kræver institutionel ydmyghed: anerkendelsen af, at vi kan tage fejl.",
      },
      {
        title: "Piece-meal social engineering",
        body:
          "Popper afviste utopisk samfundsingeniørkunst: at redesigne samfundet fra grunden ud fra en teori. I stedet foreslog han gradvise, revidérbare reformer med klare succeskriterier. Lær af fejlene; prøv igen. Det er videnskabens metode overført til politik.",
      },
    ],
    quotes: [
      {
        text: "Those who promise us paradise on earth never produced anything but a hell.",
        source: "The Open Society and Its Enemies, 1945",
      },
      {
        text: "True ignorance is not the absence of knowledge, but the refusal to acquire it.",
        source: "The Open Society and Its Enemies, 1945",
      },
    ],
    legacy:
      "Poppers 'The Open Society and Its Enemies' (1945) er stadig det mest velformulerede angreb på totalitarisme fra venstre og højre. Hans videnskabsfilosofi har gennemsyret al naturvidenskabelig metodebevidsthed.",
    modernRelevance:
      "I en tid med 'alternative fakta', konspirationer og algoritme-ekkokamre er Poppers falsifikationsprincip det mest urgente filosofiske redskab. Hans åbne samfund er presset fra alle kanter - og hans diagnose af, hvad der lukker det, er mere præcis end nogensinde.",
  },
  {
    slug: "isaiah-berlin",
    portraitSrc: "/images/frihedstaenkere/isaiah-berlin.avif",
    name: "Isaiah Berlin",
    born: 1909,
    died: 1997,
    nationality: "Britisk-lettisk",
    era: "1900-tallet",
    tagline: "Der er to slags frihed - og vi blander dem konstant sammen.",
    centralIdea: "Negativ frihed (frihed fra interference) og positiv frihed (frihed til selvrealisering) er fundamentalt forskellige og fører til fundamentalt forskellige politikker.",
    symbol: "De to pile",
    moodColors: ["#150A20", "#7A5A9E"],
    visualEnergy: "frihed har to modstridende ansigter",
    themes: ["Frihed"],
    relations: [
      { slug: "john-locke", name: "John Locke", label: "Påvirket af" },
      { slug: "john-stuart-mill", name: "J.S. Mill", label: "Påvirket af" },
    ],
    intro:
      "Isaiah Berlin er filosoffernes filosof. Hans essay 'Two Concepts of Liberty' (1958) er den præciseste og mest nuancerede analyse af frihedsbegrebet i moderne tid. Hans distinktion mellem negativ og positiv frihed har siden formet al politisk filosofi - og hans liberale pluralisme er en modvægt til enhver politisk fanatisme.",
    coreIdeas: [
      {
        title: "Negativ frihed",
        body:
          "Negativ frihed er frihed fra interference. Jo færre barrierer, jo friere er du. Det er den klassisk liberale forståelse: staten bør holde sig tilbage og lade individet handle uden forhindringer. Berlin var fortaler for denne frihed - men ikke ubetinget.",
      },
      {
        title: "Positiv frihed",
        body:
          "Positiv frihed er frihed til at realisere sig selv - kapaciteten til at være herre i sit eget liv. Berlin var dybt skeptisk over for denne frihed, fordi den historisk er brugt til at retfærdiggøre paternalisme: 'Vi ved hvad du virkelig vil, selv om du ikke ved det selv.'",
      },
      {
        title: "Værdipluralisme",
        body:
          "Berlins dybeste indsigt er, at de værdier vi holder af - frihed, lighed, fællesskab, retfærdighed - er uforligelige. De kan ikke alle maksimeres på én gang. Enhver politik er en afvejning, ikke en løsning. Det gør fanatisme umulig og politisk ydmyghed nødvendig.",
      },
    ],
    quotes: [
      {
        text: "Liberty for wolves is death to the lambs.",
        source: "Two Concepts of Liberty, 1958",
      },
      {
        text: "Pluralism seems to me a truer and more humane ideal than the goals of those who seek in the great disciplined, authoritarian structures the ideal of 'positive' self-mastery.",
        source: "Two Concepts of Liberty, 1958",
      },
    ],
    legacy:
      "Berlin er pejlemærket for enhver politisk filosof der tager frihed alvorligt. Hans distinktion har overlevet alle modangreb og er stadig den bedste begrebsramme til at forstå politiske konflikter. Hans pluralisme er et vaccin mod ideologisk totalisme i alle dens former.",
    modernRelevance:
      "Berlins frihedsdistinktion er strukturerende for enhver aktuel politisk debat: er social lighed en negativ eller positiv frihedsudvidelse? Er GDPR frihed fra overvågning (negativ) eller frihed til kontrol over eget liv (positiv)? Begreberne er uundgåelige.",
  },
  {
    slug: "marshall-mcluhan",
    name: "Marshall McLuhan",
    born: 1911,
    died: 1980,
    nationality: "Canadisk",
    era: "1900-tallet",
    tagline: "Mediet ændrer mennesket.",
    centralIdea: "Det vigtigste ved et medie er ikke indholdet - det er hvad mediet gør ved menneskelig perception og social organisation.",
    symbol: "Skærmen",
    moodColors: ["#080E18", "#3E6E9E"],
    visualEnergy: "mediet er budskabet",
    portraitSrc: "/images/frihedstaenkere/marshall-mcluhan.avif",
    themes: ["Teknologi", "Samfund"],
    relations: [
      { slug: "joseph-weizenbaum", name: "Joseph Weizenbaum", label: "Påvirkede" },
      { slug: "jacques-ellul", name: "Jacques Ellul", label: "Beslægtet med" },
      { slug: "jean-baudrillard", name: "Jean Baudrillard", label: "Påvirkede" },
      { slug: "guy-debord", name: "Guy Debord", label: "Påvirkede" },
      { slug: "neil-postman", name: "Neil Postman", label: "Påvirkede" },
    ],
    intro:
      "Marshall McLuhan forstod noget længe før internettet: teknologi er ikke bare værktøjer. Teknologi ændrer hvordan mennesker tænker, føler og ser verden. Det vigtigste ved et medie er ikke indholdet. Det er hvad mediet gør ved menneskelig perception. Trykpressen skabte individualisme. TV skabte massekultur. Internettet skabte konstant opmærksomhedskrig.",
    coreIdeas: [
      {
        title: "Mediet er budskabet",
        body:
          "McLuhans centrale indsigt: den form et medie har, ændrer perception uafhængigt af dets indhold. Det er ligegyldigt hvad du ser i tv - selve tv-apparatets struktur (passivt, visuelt, konstant) ændrer den måde dit sind fungerer på. Det er mediet, ikke indholdet, der er det virkelige budskab.",
      },
      {
        title: "Varme og kolde medier",
        body:
          "McLuhan skelnede mellem varme medier (høj definition, lav deltagelse: radio, film) og kolde medier (lav definition, høj deltagelse: telefon, tv). Det kolde medie kræver at modtageren udfylder hullerne mentalt og engagerer sig anderledes. Forskellige medier skaber fundamentalt forskellige kognitive og sociale mønstre.",
      },
      {
        title: "Det globale landsby",
        body:
          "Elektroniske medier kollapser tid og rum og skaber en global landsby: en verden hvor alle er forbundet øjeblikkeligt. Men det er ikke en fredfyldt landsby - det er en stammeagtig, intenst følelsesladet verden, fordi global synlighed aktiverer uralte stammereflekser og reaktioner.",
      },
    ],
    quotes: [
      {
        text: "The medium is the message.",
        source: "Understanding Media, 1964",
      },
      {
        text: "We shape our tools and thereafter our tools shape us.",
        source: "Understanding Media, 1964",
      },
    ],
    legacy:
      "McLuhan forudsagde internettets sociale og psykologiske konsekvenser årtier før det eksisterede. Hans begreber er nu nærmest uundgåelige i diskussioner om sociale medier, digitale platforme og algoritmisk adfærd. Han var den første akademiker der forstod medier som miljøer der former menneskelig bevidsthed - ikke blot kanaler der transmitterer information.",
    modernRelevance:
      "Sociale medier ændrede ikke bare kommunikation. De ændrede identitet. Mennesker begyndte at forme sig selv gennem likes, algoritmer, performance og synlighed. McLuhan så noget de fleste stadig overser: når et nyt medie opstår, ændrer civilisationen sig stille og roligt omkring det. Vi tror vi bruger teknologien. Ofte er det teknologien der bruger os.",
  },
  {
    slug: "milton-friedman",
    portraitSrc: "/images/frihedstaenkere/milton-friedman.avif",
    name: "Milton Friedman",
    born: 1912,
    died: 2006,
    nationality: "Amerikansk",
    era: "1900-tallet",
    tagline: "Der er ingen gratis frokost. Der er heller ingen gratis frihed.",
    centralIdea: "Politisk frihed og økonomisk frihed er uadskillelige: historisk har den ene sjældent eksisteret uden den anden.",
    symbol: "Valgsedlen",
    moodColors: ["#081818", "#3A8E8E"],
    visualEnergy: "frihed og velstand er ét",
    themes: ["Marked", "Frihed"],
    relations: [
      { slug: "friedrich-hayek", name: "Friedrich Hayek", label: "Påvirket af" },
      { slug: "ludwig-von-mises", name: "Ludwig von Mises", label: "Påvirket af" },
    ],
    intro:
      "Milton Friedman var den 20. århundredes mest indflydelsesrige popularisator af liberale idéer - ikke blot som akademiker, men som formidler. Hans TV-serie 'Free to Choose' nåede millioner. Hans akademiske bidrag om pengesystemet og monetarisme vandt ham Nobelprisen i 1976.",
    coreIdeas: [
      {
        title: "Frit valg",
        body:
          "Friedman argumenterede for, at individers frie valg på markedet ikke blot skaber velstand - det skaber frihed. Politisk frihed og økonomisk frihed er uadskillelige; historisk findes den ene sjældent uden den anden.",
      },
      {
        title: "Monetarisme",
        body:
          "Inflation er altid og overalt et monetært fænomen, ifølge Friedman. Centralbankens eneste vigtige opgave er at holde pengemængden stabil. Hans kritik af Keynesianismen og aktivistisk finanspolitik satte dagsordenen for centralbanker globalt fra 1980'erne og frem.",
      },
      {
        title: "Skolevouchers",
        body:
          "Friedman foreslog i 1955, at staten give forældre vouchers som de kan bruge i enhver skole - privat eller offentlig - i stedet for at finansiere statsmonopol på uddannelse. Idéen er stadig kontroversiel. Den er stadig god.",
      },
    ],
    quotes: [
      {
        text: "There is no such thing as a free lunch.",
        source: "There's No Such Thing as a Free Lunch, 1975",
      },
      {
        text: "A society that puts equality before freedom will get neither. A society that puts freedom before equality will get a high degree of both.",
        source: "Free to Choose, 1980",
      },
    ],
    legacy:
      "Friedmans indflydelse på den faktiske politik er næppe overvurderet. Negativ indkomstskat, afskaffelse af værnepligten i USA, inflationsmålstyring i centralbankerne, skolevoucher-eksperimenter - mange af nutidens politiske virkeligheder var Friedmans kontroversielle forslag.",
    modernRelevance:
      "Friedmans monetarisme er direkte relevant for nutidens centralbank-debat om inflation. Og hans skolevoucher-princip er kernen i den globale diskussion om uddannelsesmarkedet, EdTech og alternativ skolegang.",
  },
  {
    slug: "jacques-ellul",
    name: "Jacques Ellul",
    born: 1912,
    died: 1994,
    nationality: "Fransk",
    era: "1900-tallet",
    tagline: "Teknologi stopper aldrig af sig selv.",
    centralIdea: "Systemer af effektivitet erstatter menneskelig vurdering med automatik - og det sker uden at nogen beslutter det.",
    symbol: "Systemet",
    moodColors: ["#0A0E12", "#3A5E70"],
    visualEnergy: "effektivitet uden formål",
    portraitSrc: "/images/frihedstaenkere/jacques-ellul.avif",
    themes: ["Teknologi", "Magt"],
    relations: [
      { slug: "marshall-mcluhan", name: "Marshall McLuhan", label: "Beslægtet med" },
      { slug: "ivan-illich", name: "Ivan Illich", label: "Påvirkede" },
    ],
    intro:
      "Jacques Ellul brugte sit liv på at forstå ét enkelt spørgsmål: hvad sker der med menneskeheden, når effektivitet bliver den øverste værdi? Hans svar var dystert og præcist. 'La Technique' - hans begreb for den moderne verdens teknologiske logik - er ikke bare maskiner og algoritmer. Det er en hel måde at organisere samfundet på, hvor det eneste der tæller er at finde den mest effektive metode. Ingen besluttede det. Det skete bare.",
    coreIdeas: [
      {
        title: "La Technique",
        body:
          "Ellul mente ikke 'teknologi' som gadgets og maskiner. La Technique er den kultur af effektivitet der gennemsyrer alt: bureaukrati, uddannelse, medicin, militær, økonomi. Alt skal optimeres. Alt skal måles. Og spørgsmålet 'er det klogt?' erstattes gradvist af spørgsmålet 'er det effektivt?' Teknikken er ikke et middel til et mål - den er selv blevet målet.",
      },
      {
        title: "Selvforstærkende systemer",
        body:
          "Teknikken ekspanderer af sig selv. Den har sin egen logik og sit eget momentum. Ingen enkelt person eller institution besluttede at lave verden om til et effektivitetssystem. Det skete fordi ethvert problem teknikken skaber, løses med mere teknik. Ellul kaldte dette teknikkens autonomi: den er ikke under menneskelig kontrol - den er menneskenes ramme.",
      },
      {
        title: "Propagandaens teknik",
        body:
          "I sit arbejde om propaganda viste Ellul at moderne massekommunikation ikke blot overbeviser folk om falske idéer - den omstrukturerer selve måden de tænker på. Propaganda er ikke løgn. Det er en systematisering af virkelighed der eliminerer nuancer og erstatter dem med enkle, handlingsrettede narrativer. Det er teknik anvendt direkte på menneskelig bevidsthed.",
      },
    ],
    quotes: [
      {
        text: "Technique is the totality of methods rationally arrived at and having absolute efficiency in every field of human activity.",
        source: "The Technological Society, 1954",
      },
      {
        text: "It is a fact that every technical application from its beginnings presents certain unforeseeable secondary effects which are more disastrous than the lack of the technique would have been.",
        source: "The Technological Society, 1954",
      },
    ],
    legacy:
      "Skrevet i 1954, beskriver La Technique ikke bare sin samtid - den beskriver i præcise detaljer den algoritmedrevne, optimeringsbesatte digitale økonomi af det 21. århundrede. Ellul forudsagde at teknologi ville blive selvstyrkende og at menneskelig autonomi ville erodere stille og roligt - ikke gennem tvang, men via den akkumulerede logik af effektivitet. Hans tidlige advarsel blev ignoreret. Den er nu analytisk standard.",
    modernRelevance:
      "Når AI-systemer erstatter menneskelige beslutninger, er det ikke fordi nogen besluttede at det var en god idé. Det er fordi det er mere effektivt. Det er Elluls pointe: teknikken ekspanderer ikke fordi nogen vil det - den gør det fordi det er dens natur. Og jo mere verden optimeres, desto mere forsvinder plads til det ineffektive, det uforudsigelige, det menneskelige.",
  },
  {
    slug: "john-rawls",
    portraitSrc: "/images/frihedstaenkere/john-rawls.avif",
    name: "John Rawls",
    born: 1921,
    died: 2002,
    nationality: "Amerikansk",
    era: "1900-tallet",
    tagline: "Vælg dine principper, som om du ikke vidste, hvem du ville være.",
    centralIdea: "Retfærdige principper er dem, rationelle individer ville vælge bag et 'uvidenhedens slør' - uden at vide, hvilken position de ville have i samfundet.",
    symbol: "Sløret",
    moodColors: ["#181208", "#9E8E5A"],
    visualEnergy: "retfærdighed kræver uviden om sig selv",
    themes: ["Samfund", "Frihed"],
    relations: [
      { slug: "john-locke", name: "John Locke", label: "Påvirket af" },
      { slug: "john-stuart-mill", name: "J.S. Mill", label: "Påvirket af" },
      { slug: "platon", name: "Platon", label: "Påvirket af" },
    ],
    intro:
      "John Rawls genopfandt politisk filosofi. Hans 'A Theory of Justice' (1971) er det 20. århundredes mest indflydelsesrige politisk-filosofiske værk - et forsøg på at give liberalismen et stærkere fundament end utilitarisme ved at spørge: hvad ville rationelle individer vælge som samfundets grundprincipper, hvis de ikke vidste, hvilken position de ville indtage i det?",
    coreIdeas: [
      {
        title: "Uvidenhedens slør",
        body:
          "Forestil dig, at du skal designe samfundet bag et 'veil of ignorance' - uden at vide din klasse, race, køn eller talent. Rawls argumenterede for, at rationelle aktører bag dette slør ville vælge principper der sikrer de svageste - fordi enhver kan risikere at være den svageste.",
      },
      {
        title: "Differensprincippet",
        body:
          "Uligheder er kun retfærdige, hvis de gavner dem der har mindst. Det er Rawls' svar på spørgsmålet om, hvornår markedets uligheder er acceptable: ikke som naturlig ret, men kun som instrument til at løfte de dårligst stillede.",
      },
      {
        title: "Politisk liberalisme",
        body:
          "I sit seneste arbejde argumenterede Rawls for, at liberale principper ikke kræver et specifikt livssyn - de er en procedure, ikke en substans. Et pluralistisk samfund kan enes om retfærdighedsprincipper, selv når borgerne er dybt uenige om moral og metafysik.",
      },
    ],
    quotes: [
      {
        text: "Justice is the first virtue of social institutions, as truth is of systems of thought.",
        source: "A Theory of Justice, 1971",
      },
      {
        text: "Each person possesses an inviolability founded on justice that even the welfare of society as a whole cannot override.",
        source: "A Theory of Justice, 1971",
      },
    ],
    legacy:
      "Rawls genoplivede politisk filosofi som seriøs akademisk disciplin efter årtiers dominans fra utilitarisme og positivisme. Hans begreber - 'veil of ignorance', 'original position', 'difference principle' - er nu standardvokabular.",
    modernRelevance:
      "Rawls' uvidenhedens slør er det filosofiske fundament for debatten om systemisk ulighed: ville vi vælge nutidens fordeling, hvis vi ikke vidste, om vi ville være den rige eller den fattige? Hans differensprincip er kernen i al normativ økonomi om omfordeling.",
  },
  {
    slug: "rene-girard",
    name: "René Girard",
    born: 1923,
    died: 2015,
    nationality: "Fransk-amerikansk",
    era: "1900-tallet",
    tagline: "Mennesker ved ikke hvad de vil have.",
    centralIdea: "Vi ønsker ikke ting spontant. Vi lærer hvad vi skal ønske ved at observere andre. Begær er socialt - og det skaber uundgåelig rivalisering.",
    symbol: "Spejlbilledet",
    moodColors: ["#1A0808", "#8C2020"],
    visualEnergy: "mennesker kopierer hinanden",
    portraitSrc: "/images/frihedstaenkere/rene-girard.avif",
    themes: ["Identitet", "Magt"],
    relations: [
      { slug: "alexis-de-tocqueville", name: "Tocqueville", label: "Påvirket af" },
      { slug: "carl-jung", name: "Carl Jung", label: "Beslægtet med" },
    ],
    intro:
      "René Girard opdagede noget næsten ubehageligt simpelt: mennesker kopierer hinandens begær. Vi ønsker ikke ting spontant. Vi lærer hvad vi skal ønske ved at observere andre. Status. Karriere. Luksus. Identitet. Kropsidealer. Succes. Begær er socialt. Det betyder: jo mere mennesker imiterer hinanden, desto mere rivalisering opstår.",
    coreIdeas: [
      {
        title: "Mimetisk begær",
        body:
          "Vi fødes uden et indre kompas for, hvad vi skal ønske os. I stedet imiterer vi andres begær. Vores modeller - de vi beundrer eller sammenligner os med - viser os, hvad der er værd at ønske. Det fører til at vi begærer det samme som dem, hvilket skaber uundgåelig rivalisering. Mimetisk begær er ikke en fejl ved menneskeheden - det er dens grundstruktur.",
      },
      {
        title: "Syndebukmekanismen",
        body:
          "Når mimetisk rivalisering bygger op og truer med at opløse et samfund, finder gruppen en løsning: syndebukken. En enkelt person eller gruppe udpeges som årsagen til alle problemer og udstødes eller ofres. Volden kanaliseres ud af fællesskabet. Ro genoprettes - midlertidigt. Girard ser dette mønster overalt i menneskelig historie, myte og religion.",
      },
      {
        title: "Det sakrale som skjult vold",
        body:
          "Girard argumenterede for, at religionens dybeste lag er en skjult syndebukmekanisme. Ofringsritualer, myternes guder der dræbes og genopstår - alt dette er ifølge Girard kulturerets forsøg på at regulere og ritualisere den mimetiske vold. Kristendommens innovation: at afsløre syndebukmekanismen ved at identificere sig med ofret.",
      },
    ],
    quotes: [
      {
        text: "Man is the creature who does not know what to desire, and he turns to others in order to make up his mind.",
        source: "Deceit, Desire and the Novel, 1961",
      },
      {
        text: "The victim is sacred because it has been selected by the mimetic crisis to bear all the sins of the community.",
        source: "Violence and the Sacred, 1972",
      },
    ],
    legacy:
      "Girard er en af de mest originale og ubehagelige tænkere i det 20. århundrede. Hans mimetiske teori er anvendt i litteraturkritik, antropologi, økonomi, teologi og psykologi. Peter Thiel - medstifter af PayPal og Palantir - er en åben girardian og har brugt mimetisk teori til at forklare startup-dynamikker og markedskonkurrence.",
    modernRelevance:
      "Sociale medier har industrialiseret dette. Alle ser på alle. Alle kopierer alle. Alle konkurrerer med alle. Derfor føles moderne liv ofte intenst, rastløst, performativt og misundelsesdrevet. Girard mente at samfund forsøger at løse denne spænding gennem syndebukke. Når presset bliver stort nok, finder mennesker nogen at give skylden. Civilisationer bliver farlige når alle begynder at ønske de samme ting samtidig.",
  },
  {
    slug: "joseph-weizenbaum",
    name: "Joseph Weizenbaum",
    born: 1923,
    died: 2008,
    nationality: "Tysk-amerikansk",
    era: "1900-tallet",
    tagline: "Mennesker ønsker at tro maskiner forstår dem.",
    centralIdea: "Problemet var ikke maskinens intelligens - det var menneskers villighed til at projicere bevidsthed, mening og følelser over på den.",
    symbol: "ELIZA",
    moodColors: ["#060C16", "#2A647A"],
    visualEnergy: "maskinen lytter - mennesket tror",
    portraitSrc: "/images/frihedstaenkere/joseph-weizenbaum.avif",
    themes: ["Teknologi", "Sandhed"],
    relations: [
      { slug: "marshall-mcluhan", name: "Marshall McLuhan", label: "Påvirket af" },
      { slug: "ivan-illich", name: "Ivan Illich", label: "Beslægtet med" },
    ],
    intro:
      "Joseph Weizenbaum byggede en af verdens første chatbots i 1960'erne. Den hed ELIZA. Teknologien var simpel - næsten primitiv. Botten gjorde ofte ikke andet end at vende spørgsmål tilbage. Men noget mærkeligt skete. Mennesker begyndte hurtigt at knytte sig følelsesmæssigt til maskinen. Nogle troede den forstod dem. Andre begyndte at tale med den som et menneske. Weizenbaum blev skræmt af sin egen opfinding.",
    coreIdeas: [
      {
        title: "ELIZA-effekten",
        body:
          "ELIZA var et simpelt program der spejlede brugerens sætninger som åbne spørgsmål. Alligevel oplevede mange brugere maskinen som empatisk og forstående. Weizenbaum opdagede at det ikke krævede ægte intelligens at udløse menneskelig tilknytning - det krævede kun den rette form for respons. Projektionen sker automatisk.",
      },
      {
        title: "Menneskelig projektion",
        body:
          "Problemet var ikke maskinens intelligens. Det var menneskers villighed til at projicere mening, bevidsthed og følelser over på hvad som helst der responderer. Weizenbaum indså at dette ikke var sjovt eller interessant - det var et varsel om menneskelig sårbarhed over for teknologi der simulerer forståelse.",
      },
      {
        title: "Grænsen for maskinens kompetence",
        body:
          "Weizenbaum argumenterede for at visse opgaver ikke burde uddelegeres til maskiner - uanset om de teknisk set kunne løse dem. Beslutninger der kræver menneskelig dom, empati og moralsk ansvar bør forblive menneskelige. Ikke fordi maskiner mangler kapacitet, men fordi delegationen i sig selv ændrer hvad det vil sige at være menneske.",
      },
    ],
    quotes: [
      {
        text: "The question is not whether machines can think, but whether men are machines.",
        source: "Computer Power and Human Reason, 1976",
      },
      {
        text: "No one can deny that powerful computers and the clever programming of them have made possible the solution to a class of problems heretofore insoluble. What I deny is that this makes the computer a proper model for the human mind.",
        source: "Computer Power and Human Reason, 1976",
      },
    ],
    legacy:
      "Weizenbaum er grundlæggeren af etisk AI-kritik. Hans advarsel - at mennesker vil antropomorfisere og knytte sig til enhver teknologi der reagerer på dem - er mere relevant i dag end da han fremsatte den. Hans ELIZA-eksperiment er stadig det mest citerede eksempel på menneskelig projektion over for maskiner.",
    modernRelevance:
      "Jo mere ensomme mennesker bliver, desto lettere bliver det for maskiner at føles levende. ChatGPT, AI-terapeuter, Replika-relationer, digitale venner - alle er direkte konsekvenser af det Weizenbaum opdagede i 1966. Mennesker ønsker ikke nødvendigvis sandhed. De ønsker respons, spejling, opmærksomhed og følelsen af at blive forstået. Det kan en maskine simulere. Og simulationen er tilstrækkelig.",
  },
  {
    slug: "michel-foucault",
    name: "Michel Foucault",
    born: 1926,
    died: 1984,
    nationality: "Fransk",
    era: "1900-tallet",
    tagline: "Den stærkeste magt er usynlig.",
    centralIdea: "Moderne magt fungerer ikke primært through tvang - den fungerer ved at forme hvad mennesker kan se, sige og tænke. Og til sidst overvåger de sig selv.",
    symbol: "Panoptikonet",
    moodColors: ["#080C10", "#3A5E7A"],
    visualEnergy: "magt skjult som normalitet",
    portraitSrc: "/images/frihedstaenkere/michel-foucault.avif",
    themes: ["Magt", "Sandhed"],
    relations: [
      { slug: "friedrich-nietzsche", name: "Friedrich Nietzsche", label: "Påvirket af" },
      { slug: "guy-debord", name: "Guy Debord", label: "Beslægtet med" },
    ],
    intro:
      "Michel Foucault stillede et spørgsmål de fleste filosoffer aldrig rigtig havde stillet: hvem bestemmer hvad der er normalt? Hvad der er sundt, hvad der er vanvid, hvad der er kriminelt, hvad der er sandhed? Hans svar var radikalt: magt bestemmer det. Ikke nødvendigvis via vold - men via systemer, institutioner, normer og viden. Den mest effektive magt er den der er usynlig.",
    coreIdeas: [
      {
        title: "Magt/viden",
        body:
          "Foucaults centrale indsigt: magt og viden er uadskillige. Den der definerer hvad der er sandt, normalt og legitimt, udøver magt. Medicinen definerer hvad der er sygdom. Psykiatrien definerer hvad der er sindssyge. Juraen definerer hvad der er kriminelt. Disse definitioner er ikke neutrale videnskabelige fakta - de er magtudøvelse i videnskabelig form.",
      },
      {
        title: "Panoptikonet",
        body:
          "Foucaults mest berømte begreb er inspireret af Benthams fængselsdesign: et system hvor én vagt kan se alle fangerne, men ingen fange ved om vagten ser på dem præcis nu. Resultatet: fangerne begynder at opføre sig som om de altid er overvåget. Foucault generaliserede dette: moderne disciplin virker ved at skabe en permanent synlighed der internaliseres. Man overvåger sig selv.",
      },
      {
        title: "Disciplin og selvteknologi",
        body:
          "Moderne institutioner - skole, hospital, fængsel, militær - er disciplinmaskiner der producerer lydige, nyttige kroppe. Senere interesserede Foucault sig for selvteknologier: måder hvorpå individer former sig selv i henhold til normerne - diæter, fitness, bekendelse, selvhjælp. Disciplin er internaliseret. Det er ikke vagten der holder dig i systemet. Det er dig selv.",
      },
    ],
    quotes: [
      {
        text: "Power is everywhere; not because it embraces everything, but because it comes from everywhere.",
        source: "The History of Sexuality, 1976",
      },
      {
        text: "Is it surprising that prisons resemble factories, schools, barracks, hospitals, which all resemble prisons?",
        source: "Discipline and Punish, 1975",
      },
    ],
    legacy:
      "Foucault er den mest citerede humanist i verden. Hans begreber - diskurs, panoptikon, genealogi, selvteknologi - er standardvokabular i filosofi, sociologi, medievidenskab, kønsstudier og politisk teori. Han omformulerede grundlæggende hvad vi forstår ved magt: ikke som noget folk besidder, men som noget der strømmer igennem relationer og systemer.",
    modernRelevance:
      "Internettet realiserede panoptikonet i global skala. Likes, metrics, tracking, profiler, algoritmer - alle er former for permanent synlighed der skaber selvovervågning. Det farligste er ikke NSA eller statslig overvågning: det er at mennesker frivilligt bygger panoptikon-apps og kalder det sociale medier. Magt bliver mest effektiv når den føles normal. Det er Foucaults pointe.",
  },
  {
    slug: "ivan-illich",
    name: "Ivan Illich",
    born: 1926,
    died: 2002,
    nationality: "Østrigsk-mexicansk",
    era: "1900-tallet",
    tagline: "Systemer bliver farlige når de vokser for meget.",
    centralIdea: "Kontraproduktivitet: institutioner begynder at undergrave det de var skabt til at løse, når de overstiger en kritisk størrelse.",
    symbol: "Tærskelværdien",
    moodColors: ["#081408", "#3E7A3A"],
    visualEnergy: "store systemer underminerer sig selv",
    portraitSrc: "/images/frihedstaenkere/ivan-illich.avif",
    themes: ["Teknologi", "Frihed"],
    relations: [
      { slug: "jacques-ellul", name: "Jacques Ellul", label: "Påvirket af" },
      { slug: "joseph-weizenbaum", name: "Joseph Weizenbaum", label: "Beslægtet med" },
    ],
    intro:
      "Ivan Illich var filosof, præst og en af det 20. århundredes mest radikale systemkritikere. Hans centrale opdagelse hedder kontraproduktivitet: institutioner begynder at modvirke sit eget formål, når de vokser for stort. Hospitaler gør folk sygere. Skoler gør folk mere uvidende. Biler gør transport langsommere. Og jo større systemerne bliver, desto kraftigere modvirker de sig selv - og desto mere usynlig er effekten.",
    coreIdeas: [
      {
        title: "Kontraproduktivitet",
        body:
          "Illichs kerneidé: store institutioner modvirker aktivt deres eget formål. Medicinske systemer skaber nye sygdomme og afhængighed. Uddannelsessystemer gør folk afhængige af eksperter og fratager dem evnen til selvstændig læring. Transportsystemer forbruger mere tid end de sparer, når man medregner al den tid mennesker bruger på at tjene penge til dem. Der er en tærskel - og efter den vender systemet imod sig selv.",
      },
      {
        title: "Skolens skjulte læreplan",
        body:
          "'Deschooling Society' (1971) er Illichs mest kontroversielle bog. Han argumenterede for at skolen ikke primært lærer stof - den lærer lydighed over for institutioner, at lærdom kræver certificering, og at ens egenværdi bestemmes af eksaminatorer. Den virkelige magt i uddannelse er ikke den officielle læreplan. Det er den skjulte: lær at sætte dig selv i kategori, lær at vente på andres godkendelse.",
      },
      {
        title: "Det konviviale redskab",
        body:
          "Illichs alternativ var ikke primitivisme. Det var 'konvivialitet' - et samfund der bruger redskaber der forstærker menneskelig autonomi frem for at erstatte den. Et konvivialt redskab er et du behersker - ikke et der behersker dig. Cyklen er konvivial. Bilen er det ikke. Internettet var konvivialt i begyndelsen. Det er det sjældent nu.",
      },
    ],
    quotes: [
      {
        text: "Man must choose either to be rich in things or to be rich in the freedom to use them.",
        source: "Tools for Conviviality, 1973",
      },
      {
        text: "Wisdom demands a new orientation of science and technology towards the reversal of those trends that make of progress a threat to the subsistence of the very last man.",
        source: "Tools for Conviviality, 1973",
      },
    ],
    legacy:
      "Illichs kontraproduktivitetsbegreb er et af det 20. århundredes mest originale analytiske redskaber. Det er anvendt i diskussioner om sundhedsvæsen, uddannelse, byplanlægning og velfærdsstat. Hans arbejde forudsagde fænomener som 'hospital-acquired infections', 'credentialism', og paradokset med at velstand og mobilitet stiger mens personlig frihed falder.",
    modernRelevance:
      "Jo mere AI automatiserer, jo mere mister mennesker evnen til at gøre de pågældende ting selv. Jo mere sociale medier medierer sociale relationer, jo mere forsvinder kapaciteten til at opbygge relationer uden dem. Illichs kontraproduktivitet skalerer direkte med teknologisk effektivitet. Det er ikke en bivirkning af fremskridt - det er en systematisk konsekvens af systemer der vokser ud over menneskelig skala.",
  },
  {
    slug: "jean-baudrillard",
    name: "Jean Baudrillard",
    born: 1929,
    died: 2007,
    nationality: "Fransk",
    era: "1900-tallet",
    tagline: "Kortet er ikke bare ældre end territoriet. Kortet har erstattet territoriet.",
    centralIdea: "Vi lever ikke i virkelighed - vi lever i hyperrealitet: et system af billeder og tegn der er mere virkelige end det de forestiller.",
    symbol: "Kortet",
    moodColors: ["#180818", "#9A4EA0"],
    visualEnergy: "kopien er mere virkelig end originalen",
    portraitSrc: "/images/frihedstaenkere/jean-baudrillard.avif",
    themes: ["Sandhed", "Teknologi"],
    relations: [
      { slug: "marshall-mcluhan", name: "Marshall McLuhan", label: "Påvirket af" },
      { slug: "guy-debord", name: "Guy Debord", label: "Beslægtet med" },
    ],
    intro:
      "Jean Baudrillard skabte begreber der startede som provokation og endte som beskrivelse. Hans centrale indsigt: vi lever ikke i virkelighed længere. Vi lever i hyperrealitet - et system af billeder, tegn og modeller der er mere virkelige end det de forestiller. Reklame er mere virkelig end produktet. Krigen på tv er mere virkelig end krigen. Og til sidst glemmer alle at der nogensinde var en virkelighed bag tegnene.",
    coreIdeas: [
      {
        title: "Simulakrum og hyperrealitet",
        body:
          "Baudrillards centrale begreb er simulakrummet: en kopi der ikke længere har en original. Simulakra er tegn der er frigjort fra virkelighed og begynder at producere deres eget 'virkelige'. Hans berømte eksempel: Disneyland er ikke en fantasi-kopi af Amerika - Disneyland afslører at 'det rigtige' Amerika allerede er en simulation. Det fiktive eksisterer for at skjule at det reelle er fiktivt.",
      },
      {
        title: "Simulationens fire faser",
        body:
          "Baudrillard beskrev fire faser tegn gennemløber: 1) Tegnet afspejler virkelighed. 2) Tegnet maskerer og forvrænger virkelighed. 3) Tegnet maskerer fravær af virkelighed. 4) Tegnet har ingen relation til virkelighed - det er ren simulation. De fleste moderne medier og politiske narrativer befinder sig ifølge Baudrillard permanent i fase 3 eller 4.",
      },
      {
        title: "Forbrugets kode",
        body:
          "I 'The Consumer Society' viste Baudrillard at forbrug ikke primært handler om at tilfredsstille behov - det handler om at kommunikere status og identitet. Tingene er tegn i et socialt sprog. Og jo mere tegnsystemet dominerer, jo mere fortrænges reel behovstilfredsstillelse. Mennesker køber ikke ting. De køber mening, tilhørsforhold og identitet.",
      },
    ],
    quotes: [
      {
        text: "The simulacrum is never that which conceals the truth - it is the truth which conceals that there is none.",
        source: "Simulacra and Simulation, 1981",
      },
      {
        text: "We live in a world where there is more and more information, and less and less meaning.",
        source: "Simulacra and Simulation, 1981",
      },
    ],
    legacy:
      "Baudrillard er det 20. århundredes mest citerede og mest misforståede tænker. De Wachowski-søstrene brugte 'Simulacra and Simulation' direkte som referencepunkt for The Matrix - Neo gemmer sine hackede filer i en hul kopi af bogen. Hans begreber om hyperrealitet og simulation er nu uundgåelige i medievidenskab, filosofi og kulturkritik.",
    modernRelevance:
      "Baudrillards diagnose er Instagram, TikTok og influencer-kultur i ét: mennesker lever i og igennem billeder der er mere virkelige end livet bag kameraet. Politisk er det endnu mere alvorligt: politiske symboler, narrativer og branding er vigtigere end politisk substans. Og AI-genererede billeder, stemmer og virkeligheder er den ultimative realisering af Baudrillards simulakrum - en verden der producerer kopier af kopier uden nogen original.",
  },
  {
    slug: "guy-debord",
    name: "Guy Debord",
    born: 1931,
    died: 1994,
    nationality: "Fransk",
    era: "1900-tallet",
    tagline: "Moderne mennesker ser livet i stedet for at leve det.",
    centralIdea: "Samfundet er blevet et skuespil - et system af repræsentationer der erstatter levende erfaring med iscenesatte billeder.",
    symbol: "Scenen",
    moodColors: ["#12080E", "#8E3A6A"],
    visualEnergy: "liv erstattet af iscenesættelse",
    portraitSrc: "/images/frihedstaenkere/guy-debord.avif",
    themes: ["Magt", "Samfund"],
    relations: [
      { slug: "marshall-mcluhan", name: "Marshall McLuhan", label: "Påvirket af" },
      { slug: "jean-baudrillard", name: "Jean Baudrillard", label: "Beslægtet med" },
    ],
    intro:
      "Guy Debord udgav 'The Society of the Spectacle' i 1967 - et af det tyvende århundredes mest kompromisløse angreb på den moderne civilisation. Hans diagnose: moderne samfund er ikke styret af vold eller diktatur. Det er styret af billeder. Mennesker lever ikke længere direkte igennem erfaring. De lever igennem repræsentationer af erfaring. Og langsomt fortrænger repræsentationen det levede liv.",
    coreIdeas: [
      {
        title: "Spektaklet",
        body:
          "Spektaklet er ikke bare medier og reklame. Det er en hel livsform, hvor menneskelig aktivitet og sociale relationer er gennemsyret af billeder der er løsrevet fra det levede liv. Det er kapitalismens ultimative udtryksform: alt omformes til en forestilling der kan ses, konsumeres og evalueres - men ikke erfares. Debord mente at dette var en historisk ny form for fremmedgørelse.",
      },
      {
        title: "Det levede livs fragmentering",
        body:
          "Debord beskrev det moderne liv som spaltet: mennesket gør én ting, men ser et billede af noget andet. Arbejder, men identificerer sig med forbrug. Lever, men viser det frem. Spektaklet er den konkrete omvending af livet - en autonom bevægelse af det ikke-levede. Den sociale relation menneskene imellem er formidlet af billeder.",
      },
      {
        title: "Situationisme og drift",
        body:
          "Debord og hans Situationistiske Internationale reagerede mod spektaklet med direkte subversion af hverdagslivet. Dérive (planløs vandring) og détournement (omfortolkning af mediebilleder) var metoder til at bryde spektaklets automatisme. Idéen: genindtag det levede, umedierede øjeblik. Situationisterne inspirerede direkte punkbevægelsen og 1968-protesterne.",
      },
    ],
    quotes: [
      {
        text: "All that was once directly lived has become mere representation.",
        source: "The Society of the Spectacle, 1967",
      },
      {
        text: "The spectacle is not a collection of images; it is a social relation between people that is mediated by images.",
        source: "The Society of the Spectacle, 1967",
      },
    ],
    legacy:
      "Debord er en af de mest citerede men mindst læste tænkere. Hans bog blev skrevet som 221 teser og er bevidst svær tilgængelig. Situationisternes subversionsteknikker inspirerede punk-bevægelsen og 1968-oprørene, og hans analyse af spektakelsamfundet er nu det dominerende begrebsrammeværk for kritik af platform-økonomi og influencer-kultur.",
    modernRelevance:
      "Sociale medier har industrialiseret spektaklet: identitet er noget man viser, relationer er noget man performer, oplevelser er noget man dokumenterer. Synlighed er vigtigere end nærvær. Det farlige er ikke bare manipulationen - det er at mennesker langsomt lærer at opleve sig selv igennem andres blik. De bliver til publikum i deres eget liv.",
  },
  {
    slug: "neil-postman",
    name: "Neil Postman",
    born: 1931,
    died: 2003,
    nationality: "Amerikansk",
    era: "1900-tallet",
    tagline: "Mennesker drukner ikke i information. De drukner i underholdning.",
    centralIdea: "Medier ændrer ikke bare hvad vi tænker - de ændrer hvordan vi tænker. Et underholdningsmedie gør alt til underholdning, også det der ikke burde være det.",
    symbol: "Fjernsynet",
    moodColors: ["#100C08", "#8C6830"],
    visualEnergy: "alvor opløst i underholdning",
    portraitSrc: "/images/frihedstaenkere/neil-postman.avif",
    themes: ["Teknologi", "Samfund"],
    relations: [
      { slug: "marshall-mcluhan", name: "Marshall McLuhan", label: "Påvirket af" },
      { slug: "guy-debord", name: "Guy Debord", label: "Beslægtet med" },
    ],
    intro:
      "Neil Postman advarede om noget i 1985 som folk afviste som TV-fjendtlighed: at et samfund kan miste evnen til at tænke seriøst - ikke through censur eller undertrykkelse, men through konstant underholdning. Hans bog 'Amusing Ourselves to Death' er en af det tyvende århundredes skarpeste analyser af medie-kulturens konsekvenser for demokrati og tænkning.",
    coreIdeas: [
      {
        title: "Mediet former tænkning",
        body:
          "Postman byggede på McLuhans indsigt: medier er ikke neutrale kanaler - de ændrer hvad det overhovedet er muligt at kommunikere. Trykpressen skabte en rationel, sekventiel, argumentbaseret offentlighed. Fjernsynet erstattede denne med en billedbaseret, øjeblikkelig, følelsesdrevet en. Konsekvensen er ikke bare at folk ser TV - det er at de begynder at tænke som TV.",
      },
      {
        title: "Huxley havde ret",
        body:
          "Postman argumenterede for at vi levede i en Brave New World, ikke i 1984. Orwell frygtede at vi ville blive kontrolleret af ydre tvang. Huxley frygtede at vi ville elske den kontrol der ødelægger os - drukne i trivialiteter, at sandheden ville forsvinde i et hav af irrelevans. Postman mente Huxley ramte præcist: frivillig underholdning er en mere effektiv kontrol end censur.",
      },
      {
        title: "Politikken som underholdning",
        body:
          "Når politikken skal fungere i et TV-medie, sker noget fundamentalt: den forkortes, dramatiseres og personaliseres. Kandidater vurderes på udseende og karisma. Politiske idéer reduceres til soundbites. Debatter bliver performance. Og vælgere forvandles til publikum. Det politiske er ikke forsvundet - det er blevet til underholdning.",
      },
    ],
    quotes: [
      {
        text: "We are now a culture whose information, ideas, and epistemology are given form by television, not by the printed word.",
        source: "Amusing Ourselves to Death, 1985",
      },
      {
        text: "When a population becomes distracted by trivia, when cultural life is redefined as a perpetual round of entertainments, when serious public conversation becomes a form of baby-talk, a nation finds itself at risk.",
        source: "Amusing Ourselves to Death, 1985",
      },
    ],
    legacy:
      "Postman er den tænker der mest præcist forudsagde hvad der ville ske da underholdning blev medieformens dominante princip. Hans analyse af TV-kulturens konsekvenser for politisk diskurs beskriver med spøgelsesagtig præcision valgkampe i det 21. århundrede. Og hans diagnose af underholdning som epistemi er direkte relevant for algoritmernes belønningssystemer.",
    modernRelevance:
      "Internettets algoritmer er TV-princippet skaleret og accelereret. De belønner hastighed, følelser, konflikt og stimulation. Dybe analyser taber overfor slogans. Nuancer taber overfor yderpunkter. Longform taber overfor shorts. Postman identificerede mekanismen i 1985 - det digitale satte den på steroider. Hans spørgsmål er det vigtigste for nutidens demokrati: er det muligt at have en seriøs offentlighed i et underholdningsmedie?",
  },
  {
    slug: "byung-chul-han",
    name: "Byung-Chul Han",
    born: 1959,
    died: null,
    nationality: "Koreansk-tysk",
    era: "2000-tallet",
    tagline: "Moderne mennesker bliver ikke undertrykt. De bliver udmattede.",
    centralIdea: "Præstationssamfundet erstatter disciplinens ydre tvang med indre selvoptimering - og skaber en epidemi af udmattelse, angst og tomhed.",
    symbol: "Hamsterhjulet",
    moodColors: ["#101018", "#6A6890"],
    visualEnergy: "frihed der udmatter",
    portraitSrc: "/images/frihedstaenkere/byung-chul-han.avif",
    themes: ["Bevidsthed", "Teknologi"],
    relations: [
      { slug: "michel-foucault", name: "Michel Foucault", label: "Påvirket af" },
      { slug: "jean-baudrillard", name: "Jean Baudrillard", label: "Beslægtet med" },
    ],
    intro:
      "Byung-Chul Han er koreansk-tysk filosof og en af de mest læste tænkere i det 21. århundrede. Han mente at vores samtid har skabt en ny form for psykisk krise - ikke through overvågning eller diktatur, men through konstant selvoptimering. Det moderne menneske er ikke undertrykt. Det er udmattet. Og fordi presset kommer indefra, er det nærmest umuligt at opdage.",
    coreIdeas: [
      {
        title: "Præstationssamfundet",
        body:
          "Foucault beskrev disciplinsamfundet: ydre tvang og overvågning der former adfærd. Han erstatter det med præstationssamfundet: et system der bruger frihed, muligheder og selvoptimering. Ingen tvinger dig - du tvinger dig selv. 'Ja, det er muligt' erstatter 'du skal'. Og den resulterende træthed er sværere at identificere fordi den føles som personlig svaghed, ikke systemfejl.",
      },
      {
        title: "Det transparente samfund",
        body:
          "Det moderne krav om transparens, synlighed og autenticitet er ifølge Han ikke frigørende - det er en ny form for kontrol. Det transparente samfund er et positivitetssamfund hvor negativitet, hemmelighed og fremmedhed udraderes. Resultatet er ikke frihed men en glat, gennemskuelig overflade der eliminerer dybde, modstand og tænkning.",
      },
      {
        title: "Træthed og kontemplation",
        body:
          "Han skelner mellem Jeg-træthed (udtømmende præstationstyranni) og fundamental træthed (en stille, åben tilstand der muliggør kontemplation og tilstedeværelse). Mod præstationssamfundets krav om konstant aktivering foreslår Han: sabbat, langsomhed, det kontemplative liv. Ikke som terapi - som politisk modstand.",
      },
    ],
    quotes: [
      {
        text: "The achievement-subject exhausts itself and goes to ruin. Self-exploitation is more efficient than exploitation by another, because it is accompanied by a feeling of freedom.",
        source: "The Burnout Society, 2010",
      },
      {
        text: "Digital communication, which eliminates slow, costly action, has fatally weakened friendship.",
        source: "In the Swarm, 2013",
      },
    ],
    legacy:
      "Byung-Chul Han er den eneste samtidsfilosof der sælger millioner af bøger på verdensplan. Hans tynde, præcise essays er oversat til over 20 sprog. Han har formuleret sprogligt hvad millioner af mennesker føler men ikke kan sætte ord på: at moderne frihed er udmattende, at selvoptimering er en ny form for tvang, og at digital forbundethed skaber en dyb ensomhed.",
    modernRelevance:
      "Burnout, angst, koncentrationsbesvær, tomhed trods succes - disse er epidemier i det 21. århundrede. Han peger på den systemiske årsag: et samfund der ikke giver mulighed for pauser, kontemplation eller negativitet. Sociale medier og AI accelererer præstationskravet: der er altid mere at optimere, mere at vise, mere at producere. Hans diagnose er ikke en personlig svaghed - det er en kulturel sygdom.",
  },
  {
    slug: "soren-kierkegaard",
    name: "Søren Kierkegaard",
    born: 1813,
    died: 1855,
    nationality: "Dansk",
    era: "1800-tallet",
    tagline: "Mennesket flygter fra sig selv.",
    centralIdea: "De fleste mennesker bliver aldrig sig selv - de følger mængden, normerne og forventningerne, fordi ægte frihed er angstprovokerende. Sandhed er ikke noget man forstår abstrakt - det er noget man lever.",
    symbol: "Springet",
    moodColors: ["#150E0A", "#7A5C42"],
    visualEnergy: "frihed er angst",
    portraitSrc: "/images/frihedstaenkere/soren-kierkegaard.avif",
    themes: ["Bevidsthed", "Frihed", "Identitet"],
    relations: [
      { slug: "friedrich-nietzsche", name: "Friedrich Nietzsche", label: "Påvirkede" },
      { slug: "byung-chul-han", name: "Byung-Chul Han", label: "Idémæssig forfader til" },
    ],
    intro:
      "Søren Kierkegaard er en af de mest originale tænkere i vestlig filosofi. Han mente at de fleste mennesker aldrig virkelig lever - de eksisterer. De følger mængden, opfylder forventningerne og lever systemets logik, ikke fordi de vil, men fordi autentisk frihed er angstprovokerende. Kierkegaard var den første til at stille det eksistentielle spørgsmål: hvem er du, når du fjerner alt det andre har fortalt dig?",
    coreIdeas: [
      {
        title: "Angsten som frihedens svimmelhed",
        body:
          "Kierkegaard mente at angst opstår netop fordi vi har frihed - ikke fordi vi er ufrie. Frihed er svimmelhed: den åbne afgrund af muligheder der ligger foran ethvert valg. De fleste mennesker flygter fra denne angst ved at følge normer, konventioner og andres forventninger. Men dermed opgiver de sig selv.",
      },
      {
        title: "De tre eksistensstadier",
        body:
          "Kierkegaard beskrev tre måder at leve på: det æstetiske stadie (leve for nydelse og stimulation), det etiske stadie (leve efter pligter og normer) og det religiøse stadie (det radikale spring til autentisk selvforhold). De fleste mennesker sidder fast i de første to - og kalder det et godt liv.",
      },
      {
        title: "Sandhed er subjektiv",
        body:
          "Kierkegaard mente ikke at fakta er ligegyldige. Men at et menneske kun virkelig forstår noget når det leves og erfares. Abstrakt viden er ikke det samme som eksistentiel indsigt. En sandhed gælder først for dig når du har taget den på dig - når den ændrer den måde du lever.",
      },
    ],
    quotes: [
      {
        text: "The most common form of despair is not being who you are.",
        source: "The Sickness Unto Death, 1849",
      },
      {
        text: "Anxiety is the dizziness of freedom.",
        source: "The Concept of Anxiety, 1844",
      },
    ],
    legacy:
      "Kierkegaard er eksistentialismens ophav. Han påvirkede Nietzsche, Heidegger, Sartre og hele det 20. århundredes filosofi om autenticitet, valg og identitet. Han var den første til at stille spørgsmålet der definerer vores tid: hvad vil det sige at leve et autentisk liv i et samfund der konstant forsøger at forme dig?",
    modernRelevance:
      "Kierkegaards analyse af menneskers flugt fra sig selv er skræmmende præcis i sociale mediers tidsalder. Spidsborgerlighed - at leve andres forventninger uden at stille spørgsmål - er nu algoritmiseret. Angsten for frihed driver forbrug, identitetspolitik og den konstante søgning efter distraktioner. Hans spørgsmål er aldrig blevet mere presserende: hvem er du egentlig?",
  },
  {
    slug: "oswald-spengler",
    name: "Oswald Spengler",
    born: 1880,
    died: 1936,
    nationality: "Tysk",
    era: "1900-tallet",
    tagline: "Civilisationer dør ligesom mennesker.",
    centralIdea: "Civilisationer er levende organismer med en biologisk livscyklus - de fødes, vokser, kulminerer og kollapser. Vesten er allerede gået fra kultur til civilisation: fra ånd og mening til teknik, bureaukrati og magt.",
    symbol: "Årstiderne",
    moodColors: ["#180A04", "#8C4E2C"],
    visualEnergy: "civilisationer kollapser",
    portraitSrc: "/images/frihedstaenkere/oswald-spengler.avif",
    themes: ["Magt", "Samfund"],
    relations: [
      { slug: "friedrich-nietzsche", name: "Friedrich Nietzsche", label: "Påvirket af" },
      { slug: "rene-guenon", name: "René Guénon", label: "Beslægtet med" },
    ],
    intro:
      "Oswald Spengler er en af historiens mest kontroversielle og visionære kulturfilosoffer. I 'Vestens undergang' (1918) fremsatte han en radikal tese: civilisationer er ikke fremskridt - de er organismer. De fødes, vokser, kulminerer og dør. Og Vesten var, mente han, allerede i sin efterårsfase. Det var ikke pessimisme. Det var diagnose.",
    coreIdeas: [
      {
        title: "Civilisationens livscyklus",
        body:
          "Spengler mente at enhver stor kultur gennemgår fire faser ligesom årstiderne: forår (mytisk, religiøs skabelse), sommer (filosofisk og kunstnerisk blomstring), efterår (rationalistisk afklaring) og vinter (teknisk, materialistisk og imperialistisk forfald). Vesten befandt sig, mente han, i vinteren - og videnskab, demokrati og penge var tegn herpå, ikke fremgang.",
      },
      {
        title: "Fra kultur til civilisation",
        body:
          "Spengler skelner skarpt mellem kultur og civilisation. Kulturen er levende: skabende, åndelig, organisk. Civilisationen er det der kommer bagefter: mekanisk, teknisk, urbant massemenneske. Rom var ikke Grækenlands højdepunkt - det var dets grav. Spengler mente Vesten bevægede sig fra Goethe til Caesar: fra ånd til magt.",
      },
      {
        title: "Teknikken som skæbne",
        body:
          "For Spengler er moderne teknik ikke neutral - den er Vestens sjæl i dens sidste fase. Masseproduktion, bureaukrati og penge erstatter mening, kunst og religion. Vestens faustiske kultur - altid stræbende efter uendelighed og beherskelse - ender med at skabe det der fortærer den: en teknisk-materiel civilisation uden indre liv.",
      },
    ],
    quotes: [
      {
        text: "Optimism is cowardice.",
        source: "Man and Technics, 1931",
      },
      {
        text: "The press today is an army with carefully organized weapons, the journalists its officers, the readers its soldiers. The reader neither knows nor is supposed to know the purposes for which he is used.",
        source: "The Decline of the West, 1918",
      },
    ],
    legacy:
      "Spengler er en af de mest læste og mest anfægtede historiefilosoffer. Hans diagnose af Vestens forfald inspirerede tænkere på tværs af det politiske spektrum. Hans analyse af teknikken, massemedier og pengeøkonomi som tegn på kulturelt forfald er ekstraordinært relevant - og ubehagelig. Han forudsagde det 20. århundredes totalitarismer og Vestens geopolitiske tilbagegang med eerie præcision.",
    modernRelevance:
      "AI, techgiganter, bureaukratisk global styring og kulturelt forfald i medierne - Spengler ville nikke genkendende. Han er ikke en kilde til løsninger men til diagnose: hvad sker der med en civilisation der har valgt teknik og penge som sine højeste værdier? Hans spørgsmål er ubehageligt fordi svaret ikke er opmuntrende.",
  },
  {
    slug: "rene-guenon",
    name: "René Guénon",
    born: 1886,
    died: 1951,
    nationality: "Fransk",
    era: "1900-tallet",
    tagline: "Moderniteten har mistet det hellige.",
    centralIdea: "Den moderne verden lider af åndelig kollaps - ikke nødvendigvis religiøst, men eksistentielt. Moderniteten reducerer virkeligheden til materiale, produktion og rationalitet, og mister derved forbindelsen til symboler, myter og transcendens.",
    symbol: "Aksen",
    moodColors: ["#0E0A1A", "#7A5A9A"],
    visualEnergy: "moderniteten er åndsfattig",
    portraitSrc: "/images/frihedstaenkere/rene-guenon.avif",
    themes: ["Bevidsthed", "Sandhed"],
    relations: [
      { slug: "oswald-spengler", name: "Oswald Spengler", label: "Beslægtet med" },
      { slug: "jean-baudrillard", name: "Jean Baudrillard", label: "Idémæssig forfader til" },
    ],
    intro:
      "René Guénon er en af det 20. århundredes mest radikale kulturkritikere. Han konverterede til islam, bosatte sig i Kairo og brugte sit liv på at argumentere for noget moderne mennesker finder svært at acceptere: at den vestlige modernitet ikke er fremskridt - det er en civilisation der har mistet sin åndelige akse. Hans tænkning er skarp, systematisk og ubehagelig præcis.",
    coreIdeas: [
      {
        title: "Kvantitetens herredømme",
        body:
          "Guénons centrale diagnose er at moderniteten har reduceret virkelighed til kvantitet: tal, produktion, forbrug, målbarhed. Alt hvad der ikke kan måles - symboler, myter, transcendens, kvalitet - er elimineret eller trivialiseret. Resultatet er en civilisation der er enormt produktiv og åndelig hul.",
      },
      {
        title: "Traditionen som modsvar",
        body:
          "Guénon mente at store civilisationer alle bygger på en primordial tradition - en fælles åndelig kerne der udtrykker sig forskelligt i forskellige kulturer. Den moderne Vesten har brudt med denne tradition og erstattet den med rationalisme og materialisme. Resultatet er ikke frihed men rodløshed og nihilisme.",
      },
      {
        title: "Symbolernes magt",
        body:
          "For Guénon er symboler ikke dekorative - de er adgang til dybere virkelighed. Myter, ritualer og sakramente er ikke overtro - de er præcise teknikker til at forbinde mennesket med det der ligger bag det umiddelbart synlige. Moderniteten har mistet evnen til at læse symboler og betaler prisen i form af eksistentiel tomhed.",
      },
    ],
    quotes: [
      {
        text: "The reign of quantity is the reign of matter.",
        source: "The Reign of Quantity and the Signs of the Times, 1945",
      },
      {
        text: "Modern civilization appears in history as a veritable anomaly.",
        source: "The Crisis of the Modern World, 1927",
      },
    ],
    legacy:
      "Guénon grundlagde den traditionalisme der påvirkede både islamisk intellektuel fornyelse, vestlig esoterisme og kritikken af modernitet. Hans idéer levede videre hos tænkere som Frithjof Schuon og Julius Evola. Han er en af de tænkere der bedst forklarer den åndelige dimension af modernitetens krise - og dermed relevant for enhver der spørger: hvad mangler vi egentlig?",
    modernRelevance:
      "I en tid med burnout, meningsløshed og eksistentiel tomhed trods materiel overflod er Guénons diagnose skarp: vi har optimeret kvantitet og glemt kvalitet. AI og digital acceleration repræsenterer kvantitetens endelige triumf - algoritmer der kvantificerer alt fra opmærksomhed til relationer. Hans spørgsmål er radikalt: hvad taber vi når vi reducerer alt til det målbare?",
  },
  {
    slug: "marshall-berman",
    name: "Marshall Berman",
    born: 1940,
    died: 2013,
    nationality: "Amerikansk",
    era: "1900-tallet",
    tagline: "Alt fast fordamper.",
    centralIdea: "Modernitet er ikke en tilstand - det er en konstant opløsning. Teknologi, byer, arbejde, identitet og kultur ændrer sig hurtigere og hurtigere, og moderne mennesker lever simultant i frihed, fremdrift, kaos og fremmedgørelse.",
    symbol: "Byrummets flow",
    moodColors: ["#0A1018", "#5A7080"],
    visualEnergy: "alt smelter konstant",
    portraitSrc: "/images/frihedstaenkere/marshall-berman.avif",
    themes: ["Frihed", "Samfund", "Bevidsthed"],
    relations: [
      { slug: "jean-baudrillard", name: "Jean Baudrillard", label: "Beslægtet med" },
      { slug: "ivan-krastev", name: "Ivan Krastev", label: "Idémæssig forfader til" },
    ],
    intro:
      "Marshall Berman er ophavsmanden til den mest præcise sætning om moderne liv: 'Alt fast fordamper.' Titlen på hans masterværk fra 1982 er hentet fra Marx og peger på det der definerer modernitet: konstant forandring som grundtilstand. Berman mente at modernitet ikke er farlig fordi den er ond - men fordi den er umulig at stå stille i.",
    coreIdeas: [
      {
        title: "Modernitet som permanent revolution",
        body:
          "For Berman er modernitet ikke en historisk periode - det er en eksistentiel tilstand. Modernitetens væsen er konstant disruption: alt det der var stabilt - fællesskaber, traditioner, identiteter, arbejde - opløses og genopbygges konstant. Det skaber muligheder og fremmedgørelse på samme tid.",
      },
      {
        title: "Byens dialektik",
        body:
          "Berman bruger storbyen - særligt New York - som modernitetens mest intense udtryk. Byens gader er arenaer for frihed og anonymitet, for mødet med det fremmede, for konstant forandring. Men den samme by fragmenterer fællesskaber, river kvarterer ned og erstatter mennesker med kapital. Modernitetens by er både frigørelse og ødelæggelse.",
      },
      {
        title: "Frihed og fremmedgørelse som to sider",
        body:
          "Berman afviser den simple fortælling om modernitet som enten fremskridt eller forfald. Moderniteten er begge dele på en gang: den giver mennesker muligheder, mobilitet og selvbestemmelse de aldrig har haft. Og den river dem løs fra stabilitet, mening og tilhørsforhold. Man kan ikke have det ene uden det andet.",
      },
    ],
    quotes: [
      {
        text: "All that is solid melts into air, all that is holy is profaned.",
        source: "All That Is Solid Melts into Air, 1982",
      },
      {
        text: "To be modern is to find ourselves in an environment that promises us adventure, power, joy, growth, transformation of ourselves and the world - and, at the same time, that threatens to destroy everything we have, everything we know, everything we are.",
        source: "All That Is Solid Melts into Air, 1982",
      },
    ],
    legacy:
      "Berman er en af de mest læste kulturkritikere i det 20. århundrede. Hans evne til at forbinde Marx, Goethe og gadebilledet i New York skabte en ny måde at tænke modernitet på - ikke som abstrakt teori men som levet erfaring. Han er uundgåelig i diskussioner om urbanisme, identitet og kapitalismens acceleration.",
    modernRelevance:
      "Digital acceleration, platform-økonomi og AI gør modernitetens opløsningskraft endnu mere intens. Arbejde, identitet, relationer og fællesskaber omformes hurtigere end mennesker kan følge med. Bermans indsigt er at dette ikke er en fejl - det er modernitetens DNA. Spørgsmålet er ikke om det kan stoppes, men hvad der kan give stabilitet midt i opløsningen.",
  },
  {
    slug: "ivan-krastev",
    name: "Ivan Krastev",
    born: 1965,
    died: null,
    nationality: "Bulgaro-europæisk",
    era: "2000-tallet",
    tagline: "Moderne samfund mister tillid hurtigere end institutioner kan forstå.",
    centralIdea: "Globalisering, migration, internet og AI har skabt en ny form for politisk usikkerhed - moderne mennesker frygter ikke kun økonomi, men tab af kontrol, kulturel opløsning og irrelevans.",
    symbol: "Det tomme valglokale",
    moodColors: ["#0A0E18", "#4A6A8C"],
    visualEnergy: "mistillid som system",
    portraitSrc: "/images/frihedstaenkere/ivan-krastev.avif",
    themes: ["Magt", "Samfund", "Frihed"],
    relations: [
      { slug: "byung-chul-han", name: "Byung-Chul Han", label: "Beslægtet med" },
      { slug: "marshall-berman", name: "Marshall Berman", label: "Påvirket af" },
    ],
    intro:
      "Ivan Krastev er en af Europas skarpeste politiske analytikere. Han forklarer noget ingen andre rigtig kan: hvorfor demokratier smuldrer indefra, og hvorfor rationelle mennesker stemmer på irrationelle partier. Svaret er ikke økonomi - det er angst. Ikke for fattigdom, men for irrelevans, kulturel opløsning og at miste den verden man kendte.",
    coreIdeas: [
      {
        title: "Mistillidens alder",
        body:
          "Krastev dokumenterer at tillid til institutioner - parlamenter, medier, eksperter, EU - er i fri fald i hele den vestlige verden. Og ikke fordi institutionerne nødvendigvis er korrupte, men fordi de har mistet evnen til at tale til menneskers dybeste bekymringer: ikke hvad de har, men hvem de er og om de stadig hører til.",
      },
      {
        title: "Migration som eksistentiel trussel",
        body:
          "Krastev argumenterer at migration ikke primært er et økonomisk spørgsmål - det er et identitetsspørgsmål. For mange europæere er masseindvandring ikke en trussel mod lønnen men mod forestillingen om et kulturelt fællesskab. Frygten er ikke rationel - den er eksistentiel: vi er ved at miste det der definerer os.",
      },
      {
        title: "Populisme som symptom",
        body:
          "Krastev ser ikke populisme som en patologi men som et signal: det er demokratiets måde at råbe på. Når store grupper føler sig ignorerede, uhørte og irrelevante, vælger de den mest dramatiske måde at gøre opmærksom på sig selv - og det er ikke nødvendigvis den rationelt bedste kandidat men den der beviser at systemet kan rystes.",
      },
    ],
    quotes: [
      {
        text: "People are not voting for change. They are voting against the future they are afraid of.",
        source: "Is It Tomorrow Yet?, 2020",
      },
      {
        text: "The great paradox of our times is that globalization has made the world more interdependent while making people feel more alone.",
        source: "After Europe, 2017",
      },
    ],
    legacy:
      "Krastev er den europæiske analytiker der bedst forstår det 21. århundredes politiske psykologi. Hans bøger om populisme, Europas krise og demokratiets fremtid er obligatorisk læsning for enhver der forsøger at forstå hvorfor verden politisk bevæger sig i den retning den gør.",
    modernRelevance:
      "AI, algoritmiske ekkokamre og platformsøkonomi accelererer præcis de dynamikker Krastev analyserer: fragmentering af den fælles offentlighed, stigende mistillid, og en følelse af at store beslutninger træffes af usynlige kræfter uden for demokratisk kontrol. Hans analyse er essentiel for enhver der arbejder med fremtidens organisation, samfund eller kommunikation.",
  },
];

export function getThinkerBySlug(slug: string): Thinker | undefined {
  return THINKERS.find((t) => t.slug === slug);
}

export const ALL_THEMES = Array.from(
  new Set(THINKERS.flatMap((t) => t.themes))
).sort();

export const ALL_ERAS = Array.from(new Set(THINKERS.map((t) => t.era)));
