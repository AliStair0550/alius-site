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
