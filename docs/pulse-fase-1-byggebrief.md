# ALIUS PULSE. Byggebrief fase 1

Integration af datakataloget i den eksisterende side på `alius.dk/pulse`.

Læs `pulse-datakatalog-fase-1.md` først. Dette dokument beskriver kun hvordan de tolv serier lander i den side der allerede står.

---

## 1. Udgangspunkt

Sådan ser Pulse ud i dag:

- `/pulse` med fire dashboards: ledighed, konkurser, kommuner, forbrug
- En sektion "Signaler" med seks kort beregnet automatisk
- Kadence: månedlig
- Licens: CC 4.0 BY, krediteret Danmarks Statistik

Tre ting skal ændres, og de skal ændres før der bygges ingestion.

---

## 2. Beslutning 1: kadence

Fire af de tolv serier er daglige. Den nuværende arkitektur antager månedlig opdatering.

**Anbefaling: skift til daglig kørsel, ugentlig publicering.**

- Ingestion kører hver hverdag kl. 07:00
- Signaler genberegnes hver hverdag
- Sitet viser altid seneste tal, uanset frekvens
- Fredagsmailen er den faste rytme udadtil

Teksten på forsiden skal rettes fra "opdaterer sig selv hver måned" til noget der holder. Forslag: "Opdaterer sig selv hver dag. Samler op hver fredag."

Alternativet er at aggregere de daglige serier til ugentlige gennemsnit og beholde en langsommere kadence. Det er billigere at bygge, men så mister elprisen og renterne deres pointe, og de er blandt de få serier der overhovedet kan bære en daglig visning.

---

## 3. Beslutning 2: informationsarkitektur

Tolv nye serier må ikke blive tolv nye dashboards. "Vælg en vinkel" holder til omkring seks til syv fliser. Derefter er det igen en scanningsopgave.

**Anbefaling: tre nye dashboards, syv i alt.**

| Dashboard | Status | Serier |
|---|---|---|
| Ledighed | Findes | Uændret |
| Konkurser | Findes | Tilføj tvangsauktioner som distress-indikator |
| Kommuner | Findes | Uændret |
| Forbrug | Findes | Tilføj forbrugerforventning og forbrugerprisindeks |
| **Konjunktur** | Ny | Konjunkturbarometer, tysk erhvervstillid, byggetilladelser |
| **Priser og renter** | Ny | CIBOR 3M, realkredit 30 år, valuta, producentpriser, lønindeks |
| **Energi** | Ny | Elpris DK1 og DK2, evt. CO2-intensitet senere |

Forbrugerprisindeks hører hjemme to steder. Læg serien i `forbrug` som visning, og referer til den fra `priser-og-renter`. Data må kun findes ét sted.

**Fravalgt i fase 1: DETA212A.** Tabellen har ni rene underbrancher i detailhandlen (G47001 til G47009), sæsonkorrigering via `INDEKSTYPE`, og publicerer en måned foran DETA211A som vi bruger i dag. Den er alligevel ikke med. Underbrancher i detailhandlen er et brancheværktøj, ikke direktørorientering, og ni ekstra serier under samme kilde presser kildekvoten i afsnit 4 uden at tilføje en beslutning nogen træffer anderledes.

Noteret som kandidat til en eventuel detailvertikal, ikke til fase 1.

---

## 3b. Beslutning: ingestion bliver i GitHub Actions, alarmen på Vercel

Truffet 27. juli 2026.

**Ingestion bliver i GitHub Actions.** Efter batchingen kører hele workflowet
på 1m43s, og der er tre grunde til ikke at flytte det:

1. **Vercel-planen er ikke bekræftet.** På Hobby kan cron kun køre én gang i
   døgnet med op til 59 minutters slør. Datakataloget kræver 07:00 dansk tid
   og har fire daglige serier, hvoraf elprisen opdateres flere gange i døgnet.
   Det kan ikke opfyldes.
2. **Backfill er en engangskørsel på ti års historik for tolv serier.**
   Vercel-funktioner har en udførelsesgrænse. Actions har ikke.
3. **Adskillelse af skriveadgang.** Det afgørende argument. Ligger ingestion i
   Actions, har det deployede site ikke skriveadgang til produktionsdatabasen
   ud over det cron-endpointet selv gør. Efter at have opdaget at en standard
   Prisma-kommando kunne nå produktion fra en hvilken som helst terminal i
   projektmappen, er den adskillelse mere værd end delte typer.

Argumentet for at flytte, nærhed til Prisma-klienten og fælles typer, er ægte
men lille. Scriptene importerer allerede fra `src/lib/`.

**Stale-alarmen bliver på Vercel. Med vilje.**

Alarmen må ikke dele fejlkilde med det den overvåger. Ligger begge i Actions,
og Actions er nede eller workflowet aldrig starter, så er der hverken
opdatering eller besked om at opdateringen udeblev. Det var præcis det der
skete 25. juni og 25. juli: workflowet blev afbrudt, og fordi alarmen ikke
fandtes endnu, gik der to måneder.

To platforme betyder to uafhængige måder at fejle på. Det er ikke
dobbeltarbejde, det er hele pointen med en alarm.

---

## 3c. Beslutning: BYGV88 ind, BYGV33 bliver

Truffet 27. juli 2026.

**BYGV88 kommer ind som katalogets serie 3.** Ikke primært på grund af
enheden, men fordi den er **korrigeret for forsinkelser**.

Datakataloget skriver om denne serie at revisionsprofilen er det største
problem: efterindberetninger til BBR gør de seneste to kvartaler systematisk
for lave, og "revisionsprofilen skal håndteres eksplicit, ellers viser Pulse
et fald der ikke findes". Katalogets kandidat var den ukorrigerede variant.

BYGV88 er DST's egen korrektion for netop det. Ved at vælge den rigtige tabel
forsvinder katalogets største bekymring på serien, uden at vi selv skal
modellere en revisionsprofil. Enheden, m² i stedet for antal boliger, er en
bonus der matcher kataloget, ikke hovedargumentet.

Bekræftet ved opslag: `BYGFASE=1` Tilladt byggeri og `BYGFASE=2` Påbegyndt
byggeri løber begge 1998M01 til 2026M03, månedligt, med sæsonkorrigering.

**Udvalg: `BYGFASE=1` Tilladt, for både beboelse og erhverv.**
`BYGHERRE=TOT`, `SÆSON=SÆSON`. To serier.

| | |
|---|---|
| `ANVENDELSE=10100` | Beboelsesbygninger, tilladt, m², sæsonkorrigeret |
| `ANVENDELSE=10200` | Erhvervsbygninger, tilladt, m², sæsonkorrigeret |

**Afvigelsen fra katalogets "Påbegyndt" er bevidst.** Katalogets serienavn
er "Byggetilladelser, påbegyndt etageareal", hvilket rummer to forskellige
byggefaser i samme sætning. Tilladelsen er myndighedens godkendelse.
Påbegyndelsen er spadestikket. Der går typisk et par kvartaler imellem.

Vi vælger tilladelsen af tre grunde:

1. **Den er mere ledende.** Hele pointen med serien er at ligge før
   ordrebøgerne. Påbegyndt byggeri er allerede besluttet og finansieret;
   tilladelsen er det tidligste offentlige spor af en investeringsbeslutning.
2. **Den matcher serienavnet.** Kataloget kalder serien "Byggetilladelser".
   Vælger vi `Påbegyndt`, hedder serien noget den ikke måler, og det er
   præcis den slags mismatch mellem navn og målestok der gjorde BYGV33
   forvekslelig med denne serie i første omgang.
3. **Påbegyndt er redundant.** Den følger tilladt med nogle kvartalers
   forsinkelse. To serier der måler samme beslutning på to tidspunkter giver
   ranglisten to chancer for at rapportere den samme kendsgerning.

`Fuldført` og `Under opførelse` fravælges også: de er realiseret byggeri og
hører til REALISED-laget, mens kataloget beder om en ledende serie.

**Erhvervsbyggeriet er den vigtigste af de to.** Det er den bedste
enkeltindikator for virksomheders investeringslyst, og det findes slet ikke
i BYGV33, som kun dækker boliger.

**BYGV33 bliver stående.** Den leverer boligbyggeri per kommune til
`/pulse/kommuner` og til boligbyggeri-signalerne. De to tabeller måler
forskellige ting og erstatter ikke hinanden.

**Kildelinjen skal sige at de ikke er sammenlignelige.** BYGV33 er antal
boliger, ukorrigeret, kvartalsvis, per kommune. BYGV88 er m² etageareal,
korrigeret, månedligt, nationalt, og med erhvervsbyggeri i. Står de to på
samme side uden en note, vil nogen sammenligne dem, og de tal går ikke i
samme retning.

## 3d. Beslutning: elprisen aggregeres til døgn ved indlæsning

Truffet 27. juli 2026.

`DayAheadPrices` går kun tilbage til 30. september 2025, hvor `Elspotprices`
udgik. Under ét års historik, hvor kataloget kræver ti. De to har heller ikke
samme opløsning: Elspotprices var timeværdier, DayAheadPrices leverer
kvarter (`TimeUTC: ...T21:45:00`).

**Beslutning:** begge datasæt hentes og sammenføjes, og der aggregeres til
**døgngennemsnit ved indlæsning**. Rådata gemmes ikke. Der sættes ikke
`break_at`, fordi aggregeringen fjerner forskellen i opløsning: et
døgngennemsnit af 24 timeværdier og et døgngennemsnit af 96 kvarterværdier
måler det samme.

**Beslutningen er irreversibel, og det er med vilje noteret her.**

Kasserer vi rådata, kan vi ikke få dem igen fra vores egen base. Vi har
allerede set to kilder forsvinde i dette projekt: KONK4 blev lukket af DST med
seks måneders forsinkelse før nogen opdagede det, og Elspotprices udgik uden
at kataloget vidste hvor kort historik afløseren havde. En kilde der findes i
dag er ikke et løfte om i morgen.

Skal en energivertikal nogensinde bygges, hvor timeprofil eller
kvarterprofil er selve produktet, skal denne beslutning **omgøres bevidst**,
og rådata skal indsamles fra det tidspunkt og frem. Historikken før
omgørelsen vil kun findes som døgntal. Det er prisen, og den er accepteret,
fordi Pulse leverer direktørorientering og ikke handelsdata.

---

## 3e. Beslutning: kapitallaget bliver renter nogen betaler, ikke referencerenter

Truffet 27. juli 2026.

Katalogets serie 9 og 10 var CIBOR 3M og effektiv rente på 30-årig
realkreditobligation. Begge er verificeret døde som offentlig kilde: CIBOR
sidst i `MPK3` med værdi i 2019M08, realkreditobligationsrenten i 2014M08.
CIBOR administreres af Finans Danmark og republiceres ikke længere.

**DESTR blev overvejet og fravalgt.** Den er live og daglig, men den er reelt
Nationalbankens policy-rente. En direktør ved allerede hvad Nationalbanken
har sat renten til; det står i avisen. En serie der gentager en oplysning
modtageren har i forvejen, optager en plads uden at flytte noget.

**Kataloget spurgte forkert.** CIBOR er en referencerente, ikke en pris nogen
betaler. Det relevante for en virksomhed er hvad banken faktisk tager.

**Erstatning, begge verificeret live med faktiske tal:**

| Katalogets serie | Erstattes af | Spænd |
|---|---|---|
| 9. CIBOR 3M | `DNRUGPI`, `INSTRNAT=AL00ALLERENTENF`, `INDSEK=1100` | 2003M01 .. 2026M06, 282 obs |
| 10. Realkredit 30 år | `DNRUURI`, `DATA=AL51EFFR`, `INDSEK` 1100 og 1400 | 2003M01 .. 2026M06, 282 obs |

Serie 9 bliver **"Pengeinstitutternes effektive udlånsrente til
ikke-finansielle selskaber, nye forretninger"**. Det er prisen på ny
driftskredit, målt på det der faktisk blev aftalt i måneden.

Serie 10 bliver **"Realkreditinstitutternes effektive udlånsrente inkl.
bidrag, udestående"**, i to varianter: erhverv (`1100`) og husholdninger
(`1400`). Inkl. bidrag er afgørende. Bidragssatsen er den del låntager
mærker og den del institutterne kan ændre uden at renten ændrer sig.
`DNRUURI` har desuden `AL51BIDS`, bidragssatsen alene, som kandidat senere.

**Den ønskede opdeling på fast og variabel findes ikke live.** `DNRNUM` har
`RENTFIX1` med rentefikseringsperioder, men serien døde 2024M12.
`DNRUDDKS` har opdelingen for **beløb**, ikke for renter. Opdelingen udgår
derfor af fase 1. Den kan ikke erstattes af noget der ligner.

**Kandidat til fase 2: `DNRUURI`, `DATA=AL51BIDS`, bidragssatsen alene.**

Serie 10 henter `AL51EFFR`, den effektive rente inklusive bidrag. Den samme
tabel har bidragssatsen som selvstændig størrelse.

Grunden til at den er interessant nok til fase 2, men ikke nødvendig i
fase 1: bidraget er den eneste del af en dansk erhvervsdrivendes
finansieringsomkostning som **institutterne selv fastsætter**.
Obligationsrenten kommer fra markedet og kan ingen påvirke. Bidraget er en
pris, ikke en kurs, og det ændrer sig i spring når institutterne beslutter
det, ikke løbende. En stigning i bidrag mens obligationsrenten er uændret er
et rent marginsignal fra realkreditsektoren, og det er en anden historie end
"renten steg".

Den udelades af fase 1 fordi den er en delkomponent af en serie vi allerede
henter. To serier hvor den ene er indeholdt i den anden giver ranglisten to
chancer for at rapportere samme bevægelse, og det er den fejl kildekvoten i
afsnit 4 findes for at undgå. Skal den ind, bør den ind sammen med en
fortolkningsskabelon der forklarer forskellen.

Kapitallaget bliver altså: to renteserier plus fire valutaer. Seks serier,
ikke tomt.

## 3f. Beslutning: fire valutaer, ikke fem

`DNVALD` med `KURTYP=KBH`, som er DKK pr. 100 enheder og skal normaliseres
til DKK pr. 1 enhed ved indlæsning.

USD, SEK, NOK, GBP. **PLN udgår.** Fem valutaer ville lægge hele
kildekvoten på én tabel, og zloty er den mindst relevante af de fem for
dansk konkurrenceevne. EUR udelades fortsat, som kataloget foreskriver:
fastkurspolitikken gør serien uinteressant som signal.

---

## 3g. Metode: sammenlignelige z-scores på tværs af historiklængde

Truffet 27. juli 2026. Implementeret i `src/lib/pulse-zscore.ts`.

Serierne har vidt forskellig historik. Elprisen har 27 år, tvangsauktioner
33, realkreditrenten 23, byggetilladelser 28. Beregnes z mod hver series egen
fulde historik, måler tallene ikke det samme, og ranglisten rangerer noget
andet end den påstår.

Det er samme fejl som at boligbyggeri vandt rangeringen fordi boliger tælles
i større enheder end procentpoint. Dengang var det enheden. Her er det
vinduet.

**Tre ting gør vinduet skævt, og de skal alle tre lukkes.**

1. **Regime.** Et langt vindue rummer flere kriser. Elprisens 27 år
   indeholder 2022, hvor prisen tidobledes. Det gør spredningen enorm, og
   enhver senere bevægelse ser lille ud. En serie med et roligt tiår får
   omvendt store z-scores af små udsving.
2. **Frekvens.** En daglig serie svinger mere per observation end en
   kvartalsvis. Sammenlignes z beregnet på dagsdata med z beregnet på
   kvartalsdata, vinder dagsdata altid.
3. **Trend.** En indeksserie stiger over tid. z på niveau måler så hvor langt
   fremme i tiden vi er, ikke om noget er usædvanligt. Det er et permanent
   falsk signal.

**Metoden:**

| Regel | Hvad den lukker |
|---|---|
| Samme kalendervindue for alle serier, 10 år | Regime |
| Alt resamples til månedlig frekvens før beregning | Frekvens |
| Serier med trend beregnes på årsændring, ikke niveau | Trend |
| Robust spredning: median og MAD frem for middel og standardafvigelse | Enkeltstående kriseår der døver alt bagefter |
| Dækningskrav: mindst 80 procent af vinduet skal have data | Serier der konkurrerer på for tyndt grundlag |

Vinduet er **ti kalenderår, ikke ti års observationer**. En kvartalsserie og
en daglig serie får begge 120 månedspunkter. Det er forskellen der gør dem
sammenlignelige.

`zTransform` står i config per serie: `level` for middelsøgende serier
(renter, nettotal, tillidsindikatorer), `yoy` for serier med trend (indeks,
priser, arealer, antal).

**Historikken afkortes ikke i basen.** Vinduet gælder kun beregningen. Vi
gemmer alt kilden har, fordi vi altid kan vælge et kortere vindue senere,
men ikke kan hente historik der aldrig blev gemt.

Konkret betyder det at elprisens 27 år og valutaernes 49 år ligger uden for
det ti-årige beregningsvindue og ikke bruges til noget i dag. Det er
accepteret af to grunde: vinduet kan ændre sig, og genhentning af elprisen
koster tre en halv time mod en rate-limiteret kilde.

**Det argument skal ikke genbruges.** "Vi gemmer det for en sikkerheds
skyld" er ikke en begrundelse for at hente alt hvad en kilde tilbyder.
Her holder det fordi genhentningen er dyr og engangs. Er en kilde billig at
hente igen, skal der hentes det der bruges.

**En serie der ikke kan rangeres siger hvorfor.** `for_lidt_daekning`,
`ingen_spredning` eller `ingen_observationer`. Aldrig bare z = 0, som ville
lade den se ud som en serie der er undersøgt og fundet normal.

Metoden er dækket af tests der beviser den centrale påstand: to serier med
identisk forløb men 11 og 30 års historik giver samme z, og en daglig og en
månedlig måling af samme forløb giver z inden for 0,3 af hinanden.

---

## 3h. Beslutning: hvornår uret til port 2 brydes

Truffet 27. juli 2026.

Stale-alarmen inddeler fund i tre handlinger. Kun én af dem er en fejl.

| Handling | Betydning | Bryder uret? |
|---|---|---|
| `UNDERSOEG` | Noget er faktisk gået galt i pipelinen | **Ja** |
| `JUSTER_TAERSKEL` | Pipelinen er rask. Vores forventning til kilden var for stram | Nej |
| `BESLUTNING` | Kilden findes ikke længere. Der er intet at reparere | Nej |

`JUSTER_TAERSKEL` og `BESLUTNING` er systemet der virker. Alarmen har
opdaget noget om **omverdenen**, ikke om vores kode. At behandle dem som
fejl ville betyde at et velfungerende overvågningssystem konstant stoppede
arbejdet, og så ender det med at blive slukket.

Kun `UNDERSOEG` betyder at noget hos os er i stykker.

## 3i. Beslutning: FORV1's F11 lukkes, historikken bevares

`dst.forbrug.forventning.f11`, "Anser det som fornuftigt at spare op i den
nuværende økonomiske situation", har sidste værdi april 2025. De øvrige tolv
FORV1-serier løber til juli 2026. DST har nedlagt delspørgsmålet.

Samme familie som KONK4: kilden er væk, ikke pipelinen. Sat til `CLOSED`
med årsag i `meta`. Den kan aldrig nå ranglisten, men den vises stadig.

**Anbefaling: bevar historikken. Udgå ikke.**

496 observationer tilbage til 1974. Tre gange i dette projekt har en kilde
vist sig at forsvinde uden varsel: KONK4, `Elspotprices`, og `PRIS111` og
`KBS1` i katalogets egne kandidater. Data vi allerede har er det eneste vi
ved vi kan beholde. At slette er den ene handling der ikke kan gøres om, og
den sparer kilobytes.

**Generaliseret i koden.** Stale-tjekket klassificerer nu enhver serie der
er mere end 180 dage over sit vindue som `BESLUTNING`, ikke som noget der
skal undersøges. Så langt over tiden er det ikke en forsinkelse. Grænsen er
sat over EJDFOE1's halvandet års publiceringslag, så en langsom serie ikke
dømmes død.

## 3j. Åben risiko: overvågningen dækker ikke fortolkningslaget

**Skal løses når fortolkningslinjerne aktiveres. Ikke bagefter.**

Overvågningen var blind for `series` og `observations` fra migrationen den
27. juli til alarmen blev udvidet samme dag. I det vindue kunne enhver af de
84 serier være holdt op med at blive opdateret uden at nogen fik besked.
Den gamle model var dækket, den nye var ikke, og der var intet der sagde
fra. Det blev opdaget fordi nogen spurgte, ikke fordi systemet meldte.

**Det samme vil ske med fortolkningslaget.** En skabelon fra afsnit 5 kan
holde op med at udløse uden at noget fejler:

- Betingelsen `z <= -2 and consecutive_declines >= 3` rammer aldrig fordi
  z-tærsklen blev kalibreret anderledes end skabelonen antog
- Serien den peger på bliver `CLOSED`, og skabelonen bliver forældreløs
- `break_at` sættes på serien, og vinduet bliver for kort til at betingelsen
  kan opfyldes
- Skabelonen refererer til en serie-id der er omdøbt

I alle fire tilfælde er resultatet det samme: forsiden viser tal uden
fortolkning, hvilket ser ud præcis som en rolig uge. **Stilhed fra
fortolkningslaget kan ikke skelnes fra "der skete ikke noget."**

Det er samme mønster som de seks tilfælde i `CLAUDE.md`: en tilstand
oversat til en anden, hvor oversættelsen taber information.

Kravet når linjerne bygges:

1. Hver skabelon logger ved hver kørsel om den blev evalueret, og om den
   udløste. Ikke kun når den udløser.
2. En skabelon der ikke har udløst i N kørsler rapporteres. Enten er
   betingelsen forkert, eller også er verden roligere end antaget, og de to
   skal kunne skelnes.
3. En skabelon der peger på en serie der er `CLOSED`, omdøbt eller har fået
   `break_at`, skal fejle højlydt ved indlæsning af config, ikke stille ved
   kørsel.
4. Antallet af serier uden nogen gældende fortolkning er et tal der skal
   kunne aflæses.

---

## 3k. Vurdering: hvor mangler lagene en nævner

Skrevet 27. juli 2026. **Intet er bygget.** Dette er en gennemgang til
beslutning.

EU27-argumentet gælder ikke kun Eurostat. Et enkelt tal kan aflæses, ikke
fortolkes. "Elprisen er 420 kroner" og "udlånsrenten er 3,47 procent" er
aflæsninger. De bliver først til fortolkninger når der er noget at holde dem
op mod.

En serie kan have tre slags nævner: **sin egen historik** (det er z-scoren,
og den har alle serier), **en søsterserie i samme lag**, eller **en ekstern
referencelinje**. Z-scoren svarer på "er det usædvanligt". Den svarer ikke på
"hvorfor", og det er det der afgør hvad en direktør gør.

### Sammenfatning

| Lag | Har nævner? | Mangler | Billigste kilde |
|---|---|---|---|
| LEADING | Delvist | Forbrugertillid mangler ekstern reference | Eurostat, men koster to serier |
| COST | Nej for elprisen | **Elprisen står helt alene** | EDS `PriceArea=DE` |
| CAPITAL | Nej | **Udlånsrenten og valutaerne står alene** | DST, to serier, begge verificeret |
| EXTERNAL | Ja | Løst med EU27 | - |
| REALISED | Delvist | Konkurser mangler virksomhedsbestand | Ny DST-tabel, ikke gratis |
| STRUCTURAL | Ikke rangeret | Mindre kritisk | - |

### CAPITAL: den største mangel, og den billigste at lukke

**Udlånsrenten til erhverv er 3,47 procent. Det tal betyder ingenting alene.**

Er kreditten stram eller løs? Svaret er ikke renten, men **marginen over
Nationalbankens udlånsrente**. Den er verificeret live:

```
DNRENTD  INSTRUMENT=OIRNAA  "Nationalbankens rente - Udlån"
         1992M04D01 .. 2026M07D24   8.594 observationer   seneste 2,0 %
```

Med den bliver forskellen tydelig: 3,47 mod 2,0 er en margin på 1,47 point.
Stiger udlånsrenten 0,3 point mens policy-renten stiger lige så meget, er
det centralbanken, og der er intet at gøre. Stiger marginen alene, strammer
bankerne, og så er det tid til at tale med sin egen bank. **To helt
forskellige beslutninger, som det rå rentetal ikke kan skelne.**

Pris: én serie, DST-adapteren, 34 års historik. Ingen ny protokol.

**Valutaerne har samme problem.** USD/DKK steg. Er dollaren stærk eller er
kronen svag? Et bilateralt kurspar kan ikke svare. Nævneren er den
**nominelle effektive kronekurs**, som ligger i den tabel vi allerede
henter:

```
DNVALD  VALUTA=DKK  KURTYP=INX  "Nominel effektiv kronekurs, indeks 1980=100"
```

Pris: én serie, samme tabel, samme adapter.

### COST: elprisen står helt alene

Elprisen er den serie i systemet med den svageste fortolkning. DK1 og DK2
hjælper ikke hinanden: de er begge danske og følges ad.

Nævneren der betyder noget er **den tyske pris**. DK1 og DK2 er koblet til
det tyske marked, så spændet svarer på: er strømmen dyr på grund af Europa,
eller på grund af en dansk flaskehals. Det første er en omkostning man må
leve med. Det andet er noget der kan flyttes ved at flytte forbrug i tid.

`DayAheadPrices` har `PriceArea=DE`. Verificeret.

**Men prisen er høj.** Historikdybden for DE er ikke afklaret, og EDS er
rate-limitet til cirka én side per fire minutter. Et backfill svarende til
DK1 tager halvanden time. Det er den eneste af forslagene her der ikke er
billigt.

Producentpris mod lønindeks har allerede en indbygget nævner i
`derived.margin.signal`. Forbrugerprisindekset har sine COICOP-grupper.
De to er dækket.

### REALISED: konkurstallet drifter med økonomiens størrelse

153 konkurser. Ud af hvor mange virksomheder? Et absolut tal stiger når
virksomhedsbestanden vokser, uden at noget er blevet værre. Nævneren er
antallet af aktive virksomheder.

Den findes hos DST i erhvervsdemografien, men den er **ikke gratis**: ny
tabel, ny konfiguration, og frekvensen passer ikke. Konkurser er månedlige,
virksomhedsbestanden årlig. Forholdstallet ville være en månedlig tæller
over en årlig nævner, hvilket kræver en beslutning om interpolation.

**Detailomsætningen har en gratis nævner vi allerede ejer.** DETA211A er et
værdiindeks, altså nominelt. Deflateret med forbrugerprisindekset, som
ligger i basen, bliver det et mængdeindeks. Forskellen er præcis spørgsmålet
"solgte de mere, eller kostede det bare mere". Ingen ny kilde.

Ledigheden er allerede en procent og normaliserer sig selv.

### LEADING: den svageste sag

Forbrugertilliden på −14,7 mangler en ekstern reference. Eurostats
`ei_bsco_m` har forbrugertillid for DK og EU27.

**Men det koster to serier, ikke én.** Vores danske forbrugertillid kommer
fra FORV1 hos DST, og en differens mod Eurostats EU27 ville lide af præcis
den metodeblanding vi netop rettede i `derived.tillid.diff`. En ren
sammenligning kræver både Eurostats DK og Eurostats EU27, og så har vi to
danske forbrugertillidsserier der er næsten men ikke helt ens.

Det er den vurdering jeg er mest i tvivl om, og den bør ikke bygges før de
billige er på plads.

### Anbefalet rækkefølge

1. **Nationalbankens udlånsrente.** Én serie, verificeret, 34 år, DST-adapter
2. **Nominel effektiv kronekurs.** Én serie, tabel vi allerede henter
3. **Detailomsætning deflateret med CPI.** Afledt, ingen ny kilde
4. **Tysk elpris.** Én serie, men halvanden times backfill og uafklaret historik
5. **Virksomhedsbestand.** Ny tabel, frekvensproblem, kræver en beslutning
6. **Forbrugertillid mod Eurostat.** To serier, metodisk rodet, svagest begrundet

De tre første er billige nok til at kunne bygges uden yderligere analyse.
Alle tre skal formentlig være `rankable = false`, som EU27, fordi de er
nævnere og ikke signaler. Men det er en beslutning per serie, ikke en regel.

---

## 3l. Beslutning: tre nævnere bygget, og hvem der rangeres

Truffet 27. juli 2026. Alle tre er i basen.

| Serie | Historik | Rangerbar |
|---|---|---|
| `dst.rente.nationalbank.udlaan` | 34,3 år, 10.844 obs | **Nej** |
| `dst.valuta.effektiv` | 49,2 år, 12.506 obs | **Ja** |
| `derived.detail.maengde` | 11,2 år, 136 obs | **Ja** |

Rangerbarhed er afgjort på **indholdet, ikke på rollen**. At en serie er
nævner for en anden gør den ikke automatisk uegnet til forsiden. Det
afhænger af om den selv besvarer et spørgsmål nogen handler på.

### Policyrenten: nævner, ikke signal

`dst.rente.nationalbank.udlaan` er sat til `rankable = false`.

Nationalbankens rentebeslutninger står i avisen samme dag. En direktør
kender dem. En plads på forsiden ville bruges på noget modtageren allerede
ved. Dens værdi ligger udelukkende i marginen mod `dst.rente.erhverv.nye`.

### Den effektive kronekurs: nævneren er det bedre signal

Her er nævneren og signalet byttet om i forhold til hvad man skulle tro.

`dst.valuta.effektiv` er **rangerbar**. De fire valutapar er sat til
`rankable = false` og bliver kontekst på `priser-og-renter`.

Begrundelsen har to dele.

**Den effektive kurs besvarer det bedre spørgsmål.** "USD/DKK steg fire
procent" er ikke fortolkeligt: det kan lige så godt være at dollaren er
stærk som at kronen er svag, og de to fører til forskellige beslutninger.
Den effektive kronekurs siger direkte om dansk konkurrenceevne har flyttet
sig, og det er den beslutning en eksportør faktisk træffer.

**Fire par giver fire chancer for et tilfælde.** USD, SEK, NOK og GBP er
korrelerede men ikke identiske. Trækkes fire gange fra næsten samme
fordeling, vil et af dem ofte have en høj z uden at noget er sket. Det er
den samme mekanik som gjorde at boligbyggeri fyldte tre af seks pladser,
bare mindre synlig. Én effektiv kurs er ét træk.

**Prisen ved beslutningen** er en virksomhed med koncentreret eksponering
mod ét marked, hvor det bilaterale par er det relevante tal. Den kan læse
det på dashboardet. Ranglisten svarer på "hvad bør jeg vide i denne uge",
og der er "kronens konkurrenceevne flyttede sig" den version af historien
der er sand for alle.

### Deflateret detailomsætning: mængden er signalet

`derived.detail.maengde` er **rangerbar**.
`dst.detail.omsaetning.g47` er sat til `rankable = false`.

Det nominelle værdiindeks er en mellemregning. "Omsætningen steg tre
procent" besvarer ikke om der blev solgt mere. I en inflationsperiode
stiger værdiindekset selv når mængden falder, og det er ikke bare uskarpt,
det er **systematisk misvisende i den ene retning**. Præcis samme fejltype
som at boligbyggeri vandt rangeringen fordi boliger tælles i større enheder
end procentpoint.

Serien er den første afledte i systemet. `config/derived.ts` og
`scripts/build-derived.ts` er strukturen datakatalogets afsnit 5 skal bruge
til de øvrige fire.

### Fravalgt: ekstern reference til forbrugertilliden

Argumentet fra erhvervstillid overføres ikke.

Erhvervstillid handler om **eksportmarkederne**, som er hvor handlingen
ligger for en dansk virksomhed: falder tysk industritillid, er det en
ordrebog der forsvinder. Forbrugertillid er **indenlandsk**. En dansk
direktør gør ikke noget anderledes fordi europæiske forbrugere er
mismodige; hans kunder er danske.

Der er ingen beslutning der ændrer sig, og prisen ville være to serier og
en metodeblanding. Fravalgt.

### Udskudt til efter port 2

| Kandidat | Prioritet | Hvorfor ikke nu |
|---|---|---|
| Tysk elpris (`DayAheadPrices`, `PriceArea=DE`) | **1** | Rigtig nævner, men halvanden times backfill mod en rate-limitet kilde, og DK1 kører stadig. Historikdybden for DE er uafklaret |
| Virksomhedsbestand som nævner for konkurser | 2 | Ny DST-tabel, og månedlige konkurser over en årlig bestand kræver en beslutning om interpolation |

Begge er rigtige. Ingen af dem er billige.

---

## 3m. Korrelationsgrupperne, og hvem der vinder når en afledt serie
## og dens komponent udløses af samme bevægelse

Truffet 27. juli 2026. Reglen står i datakatalogets afsnit 1.

Fem grupper er tildelt. 63 af 89 serier ligger i en gruppe, og der er fem
rangerbare blandt dem.

| Gruppe | Medlemmer | Vinder |
|---|---|---|
| `konkurser` | 38 | `dst.konkurs.total` |
| `forbrugertillid` | 13 | `dst.forbrug.forventning.f1` |
| `valuta` | 5 | `dst.valuta.effektiv` |
| `forbrugerpriser` | 5 | `dst.pris.forbruger.aarsaendring` |
| `detailomsaetning` | 2 | `derived.detail.maengde` |

Ranglisten gik fra 53 til **25 rangerbare serier**.

### To rettelser af tidligere beslutninger

**F10 er ikke længere rangerbar.** Jeg anbefalede tidligere F1 og F10 som de
to rangerbare i FORV1, og det blev godkendt. Reglen ophæver det: F10 er en
af de fem komponenter i F1, og de kan ikke begge konkurrere.

F1 vinder frem for F10, fordi Pulse skriver til direktører på tværs af
brancher. F1 bevæger sig når stemningen blandt danske forbrugere skifter, og
det rører de fleste forbrugsnære virksomheder. F10 bevæger sig når planer om
større indkøb skifter, hvilket er skarpere for detail og varige goder, men
smallere. Katalogets krav om at F10 "skal trækkes ud separat, ikke gemmes
inde i den sammensatte indikator" er stadig opfyldt: den findes som
selvstændig serie og vises på forbrug-dashboardet. Kravet handlede om at
have tallet, ikke om at det skulle på forsiden.

**Forbrugerprisindekset er ikke længere rangerbart, årsændringen er.**
Med `zTransform: "yoy"` beregnede indeksserien i praksis det samme tal som
årsændringsserien. To serier der bogstaveligt talt regner det samme.

### Når en afledt serie og dens komponent udløses samtidig

Din formodning var at den afledte vinder, fordi den er mest informativ.
**Det holder ikke som generel regel.** Det afhænger af om den afledte
størrelse selv er det tal nogen handler på, eller om den er en analytikers
konstruktion.

Reglen bliver derfor: **den serie der er tættest på beslutningen vinder.**
Afgjort per afledt serie:

| Afledt serie | Vinder | Begrundelse |
|---|---|---|
| `derived.detail.maengde` | **Den afledte** | "Blev der solgt mere" er spørgsmålet. Det nominelle indeks er aritmetikken, og det er systematisk misvisende under inflation |
| `derived.margin.signal` (producentpris minus løn) | **Den afledte** | Marginen er beslutningen: kan jeg hæve priserne hurtigere end lønnen stiger. De to indeks er mellemregninger en direktør ellers selv ville lave i hovedet |
| `derived.tillid.diff` (DE minus EU27) | **Den afledte** | Hele pointen med EU27. Er faldet tysk eller europæisk. Nævneren er allerede ikke rangerbar, så kun DE og differensen konkurrerer, og differensen er den fortolkede version |
| `derived.rente.spread` | **Komponenterne** | Se nedenfor |
| `derived.el.uge` | **Komponenten** | Se nedenfor |

**`derived.rente.spread` bør ikke være rangerbar.**

Katalogets definition var 30-årig realkredit minus CIBOR 3M, altså
rentekurvens hældning. Det er et markedsstruktursignal, ikke en beslutning.
En direktør handler på **niveauet**: "realkreditrenten er 3,8 procent" fører
til en omlægningsbeslutning eller et afkastkrav. "Spændet steg 0,3 point"
fører ikke til noget uden en analytiker imellem.

Serien bør bygges, fordi den er en god nævner og en god fortolkningslinje,
men med `rankable = false` og `rankGroup = "rente"` sammen med sine
komponenter, hvor `dst.rente.realkredit.erhverv` vinder.

Bemærk at problemet delvist løser sig selv: den ene komponent kataloget
foreslog, CIBOR, findes ikke. Bygges spændet mod
`dst.rente.nationalbank.udlaan`, som allerede er `rankable = false`, er der
kun én rangerbar komponent tilbage at være i konflikt med.

**`derived.el.uge` bør ikke bygges som selvstændig serie.**

Katalogets `derived.el.uge` er et ugegennemsnit af DK1 og DK2. Det er ikke
en ny størrelse, det er en udglatning af en serie vi allerede har. En
udglatning hører til i visningen eller i z-beregningens resampling, ikke i
en tabel. Vi resampler i forvejen alt til månedlig frekvens før z beregnes,
så ugegennemsnittet ville ikke ændre en eneste rangering.

Katalogets afsnit 5 bør rettes på dette punkt.

### Åben vurdering: byggeserierne

`dst.byg.paabegyndt` (BYGV33, antal boliger, kvartalsvis, kommune) og
`dst.byg.tilladt.bolig` (BYGV88, m², månedlig, national) er begge
rangerbare og er ikke grupperet.

Argumentet for at gruppere dem: begge falder når byggekonjunkturen vender,
og to kort om at byggeriet falder er redundans.

Argumentet imod: tilladelse og påbegyndelse er forskudt med et par
kvartaler, så de rammer på forskellige tidspunkter, og forskydningen er i
sig selv information. Og byggebriefens afsnit 3c fastslår eksplicit at de
to ikke er sammenlignelige.

Jeg har ikke grupperet dem, fordi jeg ikke er sikker, og en forkert gruppe
fjerner information permanent uden at nogen opdager det. Det er en
beslutning til dig.

---

## 4. Beslutning 3: Signaler bliver ranglisten

Det er den vigtigste ændring, og den er ikke et nyt komponent. Det er en omskrivning af den der findes.

**Sådan skal den virke:**

1. Beregn z-score for alle serier mod 10 års historik
2. Sorter faldende efter absolut z-score
3. Vis kun serier med `|z| >= 1,5`
4. Maks fire kort. Fylder færre kriteriet, vis færre
5. Resten foldes sammen i en rolig liste med navn og seneste værdi

**Kvoter mod støj.** Maks ét kommunesignal ad gangen. I dag optager boligbyggeri per kommune tre ud af seks pladser.

De to kort med minus 108 boliger for Holbæk og Horsens er undersøgt. Se `pulse-kortlaegning-fase-1.md` afsnit 7. Tallene er ægte: Holbæk faldt fra 116 til 8, Horsens fra 129 til 21. Samme differens, forskellige niveauer, tilfældigt sammenfald i et tæt felt hvor nummer tre og fire lå på minus 106 og minus 102.

Der skal derfor **ikke** laves en dedupliceringsregel på identisk delta. Den ville skjule et korrekt tal. Den virkelige fejl var at overskriften "faldt mest" var hardkodet i en løkke der udsender to kort, så begge påstod at være det største fald. Det samme gjaldt stigningsløkken. Det er rettet i `bygv33-detectors.ts`, og de øvrige kort formuleres nu uden henvisning til rangeringen, fordi visningsrækkefølgen ikke er garanteret.

Kvoten på ét kommunesignal løser pladsproblemet. Z-scoren løser rangeringen: minus 108 er et fald på 93 procent i Holbæk og 84 procent i Horsens, så de er ikke lige usædvanlige, selv om deltaet er identisk.

**Hvert kort indeholder:**

- Serienavn
- Afvigelse i sigma, som badge
- Én sætning med konsekvens, ikke gentagelse af tallet
- Sparkline, 24 seneste perioder
- Ændring med eksplicit sammenligningsgrundlag

Sammenlign med det nuværende kort: "Antallet af konkurser steg til 153. Fra maj 2026 til juni 2026 steg antallet af erklærede konkurser med 25 (+19,5%)." Det er to sætninger der siger det samme. Fortolkningslinjen skal tilføje noget: hvor usædvanligt er det, og hvad plejer at følge efter.

**Farve.** Rød og grøn må ikke betyde godt og skidt. En høj elpris er dårlig for et bageri og god for en vindmøllepark. Brug én neutral fremhævning der betyder "usædvanlig", og lad retningen fremgå af pilen og fortegnet.

---

## 5. Fortolkningslinjerne

Skriv de første 30 i hånden. Gem dem som skabeloner med pladsholdere, ikke som fri tekst genereret ved hver kørsel.

```yaml
- series: dst.byg.paabegyndt
  condition: "z <= -2 and consecutive_declines >= 3"
  template: >
    Tredje kvartal i træk med fald. Sidst det skete, steg konkurser
    i bygge og anlæg to kvartaler senere.
  requires_verification: true
```

`requires_verification: true` betyder at den historiske påstand skal efterprøves mod data før skabelonen aktiveres. En fortolkning der er faktuelt forkert er værre end ingen fortolkning, fordi den er det eneste Pulse sælger.

Automatisk generering kommer først når mønsteret er tydeligt. Ikke i fase 1.

---

## 6. Attribution

Den nuværende tekst krediterer Danmarks Statistik under CC 4.0 BY. Det dækker ikke længere.

Tilføj Energinet, Danmarks Nationalbank og Eurostat. Hver serie bærer sit eget `attribution`-felt fra `series`-tabellen, og kildelinjen på hvert dashboard genereres fra de serier der faktisk vises. Ikke en statisk tekst i bunden.

Gjort 28. juli 2026. Kildelinjen udledes nu af `kildeOrganisationer()` og
nævner Danmarks Nationalbank, Danmarks Statistik, Energinet og Eurostat.

### 6a. Licens er en forudsætning for fase 3, ikke en formalitet

**Pulse er gratis i dag. Den dag der sendes en faktura, skifter
spørgsmålet fra "må vi vise det" til "må vi sælge en fortolkning af
det", og de to har ikke samme svar hos alle fire kilder.**

Afklaret 28. juli 2026 ved at læse kildernes egne vilkår. Status:

| Kilde | Licens | Kommerciel brug | Krævet kreditering | Status |
|---|---|---|---|---|
| Energinet | CC BY 4.0 | Ja, udtrykkeligt | "Source: Energinet (www.energidataservice.dk)" | **Afklaret** |
| Eurostat | CC BY 4.0 | Ja, for EU- og EFTA-data | "Source: Eurostat, [titel], [link], [dato]" | **Afklaret med forbehold** |
| Danmarks Statistik | ikke fundet | ukendt | vi skriver "CC 4.0 BY" | **Uafklaret** |
| Danmarks Nationalbank | ikke fundet | ukendt | vi skriver "Kilde: Danmarks Nationalbank" | **Uafklaret** |

**Energinet.** Vilkårene siger det direkte: data må kopieres, ændres og
distribueres frit, også kommercielt, mod kreditering. Krediteringen må
ikke give indtryk af at Energinet støtter anvendelsen. Det sidste er
værd at holde øje med, når fortolkningslinjerne skrives.

**Eurostat.** CC BY 4.0, og kommerciel genbrug er tilladt for data fra
EU-lande, EFTA og officielle kandidatlande. Forbeholdet: der er
undtagelser for tredjeparts ophavsret, for data om lande uden for EU, og
for bestemte handelsdata fra Schweiz og Østrig. Vores eneste
Eurostat-serie er `ei_bsin_m_r2` for DE, SE og EU27, som alle ligger
inden for det tilladte. Kommer flere lande til, skal det tjekkes igen.

**Danmarks Statistik er ikke afklaret, og det er det vigtigste fund.**
Vi skriver "CC 4.0 BY" på hvert eneste kort og i bunden af hver side.
Den påstand står i vores egen kode; DST's `tableinfo`-API leverer intet
licensfelt, og jeg kunne ikke finde en offentlig side med vilkårene. Det
betyder ikke at påstanden er forkert. Det betyder at vi ikke kan
dokumentere den, og en licenspåstand vi ikke kan dokumentere er præcis
den slags der først bliver et problem når nogen spørger.

**Nationalbanken er uafklaret, men spørgsmålet er mindre end det ser
ud.** Vi henter ikke fra Nationalbanken. DNVALD, DNRUGPI, DNRUURI og
DNRENTD kommer fra DST's statistikbank, som republicerer dem;
Nationalbanken har ingen egen REST-API (se
`pulse-kildeverifikation-fase-1.md` afsnit 1). Den licens der styrer
vores brug er derfor DST's, og Nationalbanken er ophavsmand der skal
krediteres. Det bør bekræftes skriftligt af begge, ikke udledes af os.

**Krav før første kunde:**

1. Skriftlig bekræftelse fra DST på vilkårene for genbrug af
   statistikbankens data i et kommercielt produkt
2. Skriftlig bekræftelse på at DST's videreformidling af
   Nationalbankens tabeller dækker samme brug
3. Krediteringsteksten for Eurostat rettes til deres eget format med
   titel, link og hentedato
4. En gennemgang af om nogen fortolkningslinje kan læses som at en
   kilde støtter vores konklusion. Energinet forbyder det udtrykkeligt

Punkt 1 og 2 er de eneste der kan blokere. Punkt 3 og 4 er arbejde.

---

## 7. Prompt til Claude Code

> Vi udvider ALIUS PULSE. To dokumenter styrer arbejdet: `docs/pulse-datakatalog-fase-1.md` og `docs/pulse-fase-1-byggebrief.md`. Læs begge først.
>
> **Start med at kortlægge, ikke bygge.** Lav en rapport til mig der besvarer:
>
> 1. Hvordan hentes og lagres data i dag. Hvilke filer, hvilket skema, hvilken kørselsmekanisme.
> 2. Hvordan beregnes signalerne på `/pulse` i dag, og hvor ligger den kode.
> 3. Findes der allerede historik i basen, og hvor langt tilbage.
> 4. Hvor stort er springet fra den nuværende datamodel til `series` og `observations` i datakataloget. Kan de eksisterende fire datasæt migreres ind i den, eller skal de køre parallelt.
> 5. Hvad udløser en opdatering i dag, og hvad skal der til for at køre dagligt.
>
> Byg ingenting før jeg har læst rapporten. Ingen migrationer, ingen nye filer ud over rapporten.
>
> Undersøg desuden konkret: på `/pulse` vises to signalkort med identisk værdi, minus 108 boliger, for Holbæk og Horsens i samme periode. Find ud af om det er et sammentræf i data eller en fejl i beregningen. Svar med den kode og de tal du baserer konklusionen på.
>
> `git add . && git commit -m "Pulse: kortlægning før fase 1" && git push`

---

## 8. Rækkefølge efter kortlægningen

Kortlægningen viste at pipelinen var brudt: sync-workflowet blev afbrudt på timeout 25. juni og 25. juli, og signalerne for boligbyggeri, forbrugertillid og befolkning stod stille fra 13. maj til 27. juli uden at nogen fik besked. Derfor kommer driften før datamodellen. Der er ingen grund til at migrere data ind i et nyt skema, før man kan se om det holder op med at blive opdateret.

1. **Batch skrivningerne i sync-scriptene.** Gjort 27. juli 2026. Kørslen gik fra over 30 minutter til under 3.
2. **Stale-alarmen.** Gjort 27. juli 2026. Dagligt job kl. 07:00 UTC, én samlet mail, grupperet efter hvad fundet kræver.
3. **Ret de to fund alarmen allerede har givet.** KONK4 har ikke haft nye tal siden 2025M12, og DETA211A står på 2026M04 selv om DST har opdateret tabellen. Begge skal afklares, for de indgår i dashboards der vises i dag.
4. Migrer de eksisterende datasæt ind i `series` og `observations`, når spørgsmålet om områdedimensionen er afgjort. Se `pulse-kortlaegning-fase-1.md` afsnit 4.3.
5. Byg adapterne og hent 10 års historik for alle tolv nye serier
6. **Kalibrering.** Ét punkt, ikke to. `EXPECTED_LAG_DAYS` og z-tærsklen sættes i samme session, når pipelinen har kørt fire uger og der findes målt publiceringshistorik at sætte dem efter. At justere lag-tærsklen løbende på fornemmelse er det der gav den falske DETA211A-alarm i første omgang.
7. Skriv de 30 fortolkningsskabeloner i hånden
8. Skriv Signaler om til rangliste
9. Byg de tre nye dashboards
10. Fredagsmailen
11. Ret kadencetekst og attribution

Punkt 6 skal give et konkret tal: hvor mange signaler ville have udløst alarm per uge de sidste fem år. Rammer det over fire, er tærsklen for lav.
