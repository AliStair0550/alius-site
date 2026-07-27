@AGENTS.md

# ALIUS - alius.dk

## Brand
- Navn: Alius (latin: "den anden/anderledes")
- Tagline: Den anden vej til vækst
- Logo: Custom SVG wabi-sabi håndtegnet logotype + 10px moss cirkel på baseline til højre
- Logo komponent: src/components/AliusLogo.tsx

## Design
- Æstetik: Japansk minimalisme, wabi-sabi (skønhed i det ufuldkomne)
- Font: Jost - Thin (100) nav, ExtraLight (200) body, Light (300) headings
- Farver:
  - Ink: #1A1A1A (overskrifter, logo)
  - Moss: #2D5F4A (accent, CTAs, cirkel - ENESTE accentfarve)
  - Stone: #4A4A4A (brødtekst)
  - Slate: #6B7B75 (sekundær tekst)
  - Clay: #D4D0C8 (borders, dividers)
  - Fog: #E8E5DF (hover, sekundær bg)
  - Sand: #F5F3EF (sektionsbaggrunde)
  - Parchment: #FAF8F4 (primær baggrund)
- Ingen gradients, ingen skygger, ingen farver uden for paletten
- Brug aldrig lang bindestreg (—) eller em dash på offentlige sider. Brug kun almindelig bindestreg (-)

## Principper
- Ma: Whitespace er aktivt designelement
- Wabi-sabi: Næsten-perfekt, menneskeligt
- Ichi: Ét budskab per sektion
- Katachi: Kvalitet i alt output

## Struktur
- Next.js 16 App Router, Tailwind v4, TypeScript
- Komponenter i src/components/
- Brand tokens defineret i src/app/globals.css

## Services
- Fundament: Brandidentitet, hjemmeside, positionering (fra 15.000 kr)
- Form: Prisstrategi, vækststrategi, forretningsudvikling (fra 45.000 kr)
- Forandring: Projektledelse, implementering, change management (fra 90.000 kr)

## Workflow
- Push til main, Vercel deployer automatisk
- git add . && git commit -m "beskrivelse" && git push

## Tilstande oversættes ikke

Gælder al kode i dette repo.

**Enhver tilstand der ikke er "jeg fik data" rapporteres som sin egen
tilstand. Den bliver aldrig til fravær.**

Fravær er et svar. "Jeg spurgte ikke", "jeg fik afslag", "jeg blev afbrudt"
og "jeg forstod ikke svaret" er fire andre svar. Skrives de om til fravær,
ser koden ud til at have undersøgt noget den ikke har undersøgt, og
oversættelsen kan ikke gøres om bagefter.

Disse par er ikke det samme, og må aldrig ende samme sted:

| Den faktiske tilstand | Må ikke blive til |
|---|---|
| Kilden afviste os (429, 403, timeout) | "ingen data" |
| Den konfigurerede kode findes ikke hos kilden | "koden gav nul rækker" |
| Kørslen blev afbrudt undervejs | "kørslen fandt intet" |
| Tabellen er i live | "serien i tabellen er i live" |
| Værdien er ikke publiceret endnu | "værdien er nul" |
| Vi har ikke tjekket | "der er ikke noget" |

I praksis:

- Fang aldrig en fejl for at returnere `[]`, `null` eller `0` uden at logge
  eller kaste. En tom liste betyder "jeg så efter, der var intet".
- Filtrér aldrig en konfigureret værdi bort uden at sige hvilken. Hvis den
  skulle være der og ikke er, så stop.
- Lad aldrig en default stå som resultat af noget der ikke kørte. Et felt
  der er `false` fordi det er default, ligner et felt der er `false` fordi
  noget fejlede.
- Et flag på ét niveau siger intet om niveauet under. Tjek det niveau du
  faktisk bruger.
- Skriv aldrig "ingen" hvor du mener "ved ikke".

**Prøven:** kan en der læser outputtet om tre måneder skelne "der var
intet" fra "vi nåede ikke at finde ud af det"? Kan de ikke, er tilstanden
oversat, og oversættelsen har tabt information der ikke kan genskabes.

Reglen er skrevet fordi mønsteret har kostet tid seks gange i dette
projekt, hver gang på en ny måde. Det er billigere at rapportere en
mærkelig tilstand end at opdage tre måneder senere at den blev skjult.

## Plausible forkerte værdier

Gælder al kode der omregner, skalerer, deflaterer eller på anden måde
ændrer et tal undervejs.

**En omregning der kan producere et forkert tal der ser rigtigt ud, skal
sikres på stedet. Ingen kontrol længere nede kan fange den.**

Det er en anden og alvorligere fejlklasse end den ovenfor. Reglen om
tilstande handler om **tabt information**: noget blev til stilhed, nul eller
fravær. Stilhed er opdagelig. Nogen undrer sig til sidst over at der aldrig
kommer noget.

Et plausibelt forkert tal er ikke opdageligt. Det udløser ingen alarm, det
fejler ingen test, og det ligner data. **For et produkt der sælger
fortolkning, er det den værste fejl der findes**, fordi produktet er
troværdigheden af tallet.

### Nærmisset der begrunder reglen

`DNVALD` leverer to slags serier fra samme tabel. `KURTYP=KBH` er
valutakurser i DKK pr. 100 enheder og skal ganges med 0,01.
`KURTYP=INX` er et indeks med basis 1980=100 og må ikke skaleres.

En test filtrerede på tabelnavn i stedet for på hvad serien måler, og
forlangte skalering af begge. Var reglen anvendt på indekset, var 104
blevet til 1,04.

**1,04 ligner en valutakurs.** Den er ikke urimelig, den er ikke negativ,
den er ikke nul. Ingen stale-alarm, ingen revisionslog og ingen z-score
ville have fanget den. Serien ville have stået på forsiden med et tal der
var hundrede gange forkert, og fortolkningen ovenpå ville have været
selvsikker og forkert.

### Værnet

1. **Bind omregningen til hvad tallet måler, aldrig til hvor det kom fra.**
   Tabel, datasæt og endpoint er ikke enheder. To serier fra samme tabel kan
   have forskellige enheder, og det er den normale situation, ikke
   undtagelsen.
2. **Enhed og omregningsfaktor hører sammen i samme erklæring.** Kan man
   ændre den ene uden at røre den anden, vil de før eller siden være uenige.
3. **Kontrollér størrelsesordenen efter omregning.** En rente ligger mellem
   -5 og 25. Et indeks med basis 100 ligger mellem 10 og 1000. En
   valutakurs mod DKK ligger mellem 0,01 og 100. Falder resultatet uden for
   det serien har erklæret, skal kørslen stoppe, ikke skrive.
4. **Test begge retninger.** At den skalerede serie er skaleret er halvdelen.
   Den anden halvdel er at den uskalerede serie IKKE er det, og det er den
   halvdel man glemmer.

### Prøven

Hvis denne omregning blev anvendt forkert, ville resultatet så se
urimeligt ud for en der kigger på tallet?

Er svaret nej, er der brug for et eksplicit værn. Er svaret ja, klarer
øjnene det.

## Databasen

**Kør aldrig `prisma migrate dev` eller `prisma migrate reset` mod produktion.**
Begge nulstiller databasen ved skemadrift. Der ligger 74.604 observationer
og 64 serier i den.

DATABASE_URL står i `.env.local`, ikke i `.env`. Prisma CLI indlæser `.env`
automatisk, men ikke `.env.local`. Det er med vilje: en bar Prisma-kommando
har derfor intet mål og fejler i stedet for at ramme produktion.
`npm run db:migrate` og `npm run db:reset` går gennem `scripts/db-guard.ts`,
som nægter mod produktionsværten.

Skemaændringer i produktion sker sådan:

1. Ret `prisma/schema.prisma`
2. `npm run db:diff` viser SQL'en uden at køre den
3. `npm run db:apply <fil>` kører den
4. `npx prisma migrate resolve --applied <navn>` registrerer den
5. `npm run db:status` skal sige "Database schema is up to date!"

Migrationshistorikken er baselined 27. juli 2026. `prisma/migrations`
indeholder én migration, `00000000000000_baseline`, som er genereret fra
produktion og verificeret ved afspilning i en tom database. Den gamle
historik ligger i `prisma/_archive/` og beskrev et skema der aldrig kom
i produktion. Arkivet må ikke flyttes tilbage i `prisma/migrations`.

## Pulse

Specifikationen ligger i `docs/`. Læs `pulse-datakatalog-fase-1.md` og
`pulse-fase-1-byggebrief.md` før du ændrer noget under `src/app/pulse/`
eller i ingestion-laget.

Tabel-ID'er må ikke hardcodes. `observations.value` må aldrig opdateres,
kun tilføjes med ny `retrieved_at`.
