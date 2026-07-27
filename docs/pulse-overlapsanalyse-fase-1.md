# ALIUS PULSE. Overlapsanalyse før adapterbygning

27. juli 2026. Datakatalogets tolv serier holdt op mod de 64 serier der
allerede ligger i basen, og op mod hvad kilderne faktisk leverer i dag.

Alle opslag er gjort mod de levende API'er, ikke mod datakatalogets tekst.

---

## Kort svar

**Én af de tolv findes allerede og skal ikke bygges.** Forbrugerforventninger
ligger i basen som 13 serier og indeholder både den sammensatte indikator og
delspørgsmålet om større indkøb.

**Én er specificeret som noget vi allerede har, men måler noget andet.**
Byggetilladelser i m² er ikke BYGV33. BYGV33 tæller boliger.

**Fire af datakatalogets kandidat-tabeller kan ikke bruges:** to er lukket af
DST, to findes ikke.

| Katalogets kandidat | Status | Skal være |
|---|---|---|
| `KBS1` konjunkturbarometer | **active: false**, sidste periode 2025M12 | `ETILLID` |
| `PRIS111` forbrugerprisindeks | **active: false**, sidste periode 2025M12 | `PRIS01` (som vi allerede bruger) |
| `PRIS4715` producentpriser | **findes ikke** | `PRIS4221` |
| `BYGV` byggetilladelser | **findes ikke** | `BYGV88` |

Det er samme mønster som KONK4. Datakataloget blev skrevet ud fra tabel-ID'er
der var rigtige på skrivetidspunktet, og DST har lukket fire af dem siden.
Katalogets egen regel, at ID'er skal verificeres ved første kørsel, holder.

**To eksterne kilder har problemer der ikke er nævnt i kataloget:** elprisens
nye datasæt har under et års historik, og Nationalbankens API-sti svarer ikke
på det mønster kataloget beskriver.

---

## 1. De fire konkrete spørgsmål

### 1.1 Er BYGV33 katalogets byggetilladelser?

**Nej. Anden tabel, anden enhed, andet fænomen.**

| | Datakataloget beder om | BYGV33 leverer |
|---|---|---|
| Enhed | m² etageareal | **Antal boliger** |
| Byggefase | "Byggetilladelser, påbegyndt" | Påbegyndt (`BYGFASE=2`) |
| Anvendelse | bolig **og erhverv** | Kun bolig |
| Geografi | region | 116 områder, kommuneniveau |
| Frekvens | Kvartalsvis | Kvartalsvis |
| Revision | "Major, efterindberetninger til BBR" | Ikke korrigeret |

BYGV33 hedder "Boliger i det samlede boligbyggeri **(ikke korrigeret for
forsinkelser)**" og har `unit: Antal`. Den kan ikke levere m², og den har
ingen erhvervsbygninger.

**Den rigtige tabel er `BYGV88`**, "Det samlede etageareal (korrigeret for
forsinkelser)":

- `unit: M2` som kataloget beder om
- `BYGFASE` har både `1=Tilladt byggeri` og `2=Påbegyndt byggeri`
- `ANVENDELSE` har `10100=Beboelsesbygninger` og `10200=Erhvervsbygninger`
- `SÆSON` giver sæsonkorrigering
- **Månedlig**, ikke kvartalsvis. Nyeste periode 2026M03

Bemærk formuleringen i katalogets række: "Byggetilladelser, påbegyndt
etageareal". Det er to forskellige byggefaser i samme sætning. `Tilladt` er
tilladelsen, `Påbegyndt` er spadestikket. De er begge i BYGV88 og skal vælges
bevidst. Tilladt er den mest ledende af de to.

**Og det vigtigste:** kataloget skriver om denne serie at revisionsprofilen er
det største problem, "efterindberetninger til BBR gør de seneste to kvartaler
systematisk for lave", og at den skal håndteres eksplicit. BYGV88 er DST's
egen korrektion for netop det. Katalogets kandidat var den ukorrigerede
variant. Ved at vælge BYGV88 forsvinder katalogets egen største bekymring på
denne serie, uden at vi selv skal modellere revisionsprofilen.

**BYGV33 bliver stående.** Den er ikke overflødig: den leverer boligbyggeri
per kommune, som `/pulse/kommuner` og boligbyggeri-signalerne bruger. De to
serier måler forskellige ting og skal begge findes.

### 1.2 Er BYGV33's nationale tal tilgængelige direkte?

**Ja. Ingen summering nødvendig.**

`OMRÅDE` indeholder `000 = Hele landet` ved siden af de 115 øvrige. Vi henter
den allerede: der ligger 116 distinkte områdekoder i basen, og
`detectBygNationalChange` filtrerer på `areaCode === "000"`.

For BYGV88 er spørgsmålet uaktuelt: den har slet ingen områdedimension og er
national i sig selv.

### 1.3 Indeholder FORV1 begge de ønskede serier?

**Ja, begge. Bekræftet.**

| Kataloget beder om | FORV1-kode | Label |
|---|---|---|
| Sammensat indikator | `F1` | Forbrugertillidsindikatoren |
| Delspørgsmål, større indkøb kommende 12 mdr. | `F10` | Anskaffelse af større forbrugsgoder, inden for de næste 12 mdr. |

Begge ligger allerede i basen som selvstændige serier
(`dst.forbrug.forventning.f1` og `.f10`), med historik fra 1974M10. Kataloget
insisterer på at delspørgsmålet "skal trækkes ud separat, ikke gemmes inde i
den sammensatte indikator". Det er præcis sådan de ligger.

Bonus: `F9` er samme spørgsmål for nuet ("fordelagtigt for øjeblikket"), som
kan bruges som krydstjek.

**Serie 2 skal ikke bygges. Den er der.**

### 1.4 Dækker PRIS01 katalogets forbrugerprisindeks?

**Delvist, og kataloget peger på en tabel der er lukket.**

`PRIS111` står i registret med `active: false` og sidste periode 2025M12.
`PRIS01` er den levende, med nyeste periode 2026M06.

De to har samme struktur: `VAREGR` (varegruppe), `ENHED`, `Tid`. PRIS01 har
434 varegrupper mod PRIS111's 385, og historik fra 2000M12 mod 2001M01. PRIS01
er altså både aktuel og bredere.

**Hvad vi mangler er ikke tabellen, men bredden.** Vores sync henter kun
`VAREGR=000000` (totalen) i to enheder, indeks og årsændring. Kataloget beder
om "Total plus COICOP-hovedgrupper (fødevarer, bolig, transport)". De grupper
findes i PRIS01 (`01` Fødevarer, osv.) og kræver kun en udvidelse af
filteret, ikke en ny adapter eller en ny kilde.

Kataloget skriver også "Referenceperiode 2025. Skal læses fra metadata, ikke
antages". Det står ved magt.

---

## 2. De tolv serier, én for én

Kolonnen "status" er: **FINDES** (byg ikke), **UDVID** (kilden er der, hent
mere), **MANGLER** (ny adapter), **RETTELSE** (kataloget peger forkert).

| # | Katalogets serie | Status | Faktisk kilde | Bemærkning |
|---|---|---|---|---|
| 1 | Konjunkturbarometer, sammensat | MANGLER + RETTELSE | `ETILLID` | `KBS1` er lukket og var i øvrigt kun serviceerhverv |
| 2 | Forbrugerforventninger | **FINDES** | `FORV1` F1 + F10 | 13 serier i basen siden 1974M10 |
| 3 | Byggetilladelser, etageareal m² | MANGLER + RETTELSE | `BYGV88` | Ikke BYGV33. Se afsnit 1.1 |
| 4 | Tvangsauktioner | MANGLER | `TVANG1` | Aktiv, 2026M06, antal |
| 5 | Elpris DK1 og DK2 | MANGLER, med forbehold | EDS `DayAheadPrices` | Historikproblem, se afsnit 3 |
| 6 | Forbrugerprisindeks | **UDVID** | `PRIS01` | Har totalen. Mangler COICOP-grupper |
| 7 | Producentprisindeks for varer | MANGLER + RETTELSE | `PRIS4221` | `PRIS4715` findes ikke |
| 8 | Lønindeks privat sektor | MANGLER | `SBLON1` | Aktiv, 2026K1 |
| 9 | CIBOR 3M | MANGLER, uafklaret | Nationalbanken | API-sti svarer ikke, se afsnit 3 |
| 10 | Realkredit 30 år | MANGLER, uafklaret | Nationalbanken | Samme |
| 11 | Valuta USD/SEK/NOK/GBP/PLN | MANGLER, uafklaret | Nationalbanken | Samme |
| 12 | Tysk erhvervstillid | MANGLER | Eurostat `ei_bsin_m_r2` | Verificeret, HTTP 200 |

**Opsummering: 1 findes, 1 udvides, 10 skal bygges.** Af de ti har tre en
uafklaret kilde og én et historikproblem.

### Serie 1: ETILLID i stedet for KBS1

`ETILLID`, "Tillidsindikatorer for erhvervene", `unit: Indeks`, månedlig,
**1998M01 til 2026M07**. 28 års historik, langt over katalogets krav om ti.

Indikatorer:

```
TE    Erhvervstillidsindikator          <- den sammensatte
KBI   Tillidsindikator for industri
KBB   Tillidsindikator for bygge og anlæg
KBD   Tillidsindikator for detailhandel
KBS   Tillidsindikator for serviceerhverv
```

Det er nøjagtigt de fire brancher kataloget beder om, plus den sammensatte.
Én tabel, fem serier, ét kald.

Katalogets `KBS1` er lukket og hed "Udviklingsforløb i serviceerhverv". Den
ville have givet én branche, ikke den sammensatte indikator. Efterfølgeren
`KBS01` er stadig kun serviceerhverv. Kataloget pegede på den forkerte tabel,
ikke bare på et forældet ID.

---

## 3. To eksterne kilder med problemer kataloget ikke nævner

### 3.1 Elprisen har under et års historik

Kataloget noterer korrekt at `Elspotprices` udgik 30. september 2025 og at
`DayAheadPrices` er afløseren. Bekræftet: Elspotprices' seneste observation er
`2025-09-30T21:00`.

Men **DayAheadPrices' ældste observation for DK1 er `2025-09-30T22:00`.** Det
nye datasæt starter hvor det gamle slutter. Der er altså under ét års
historik, hvor kataloget kræver minimum ti og bygger z-scores på det.

Konsekvenser:

- Ti års historik kræver at `Elspotprices` hentes for perioden før 1. oktober
  2025 og sammenføjes med `DayAheadPrices` efter.
- **De to har ikke samme opløsning.** DayAheadPrices leverer 15-minutters
  intervaller (`TimeUTC: 2026-07-28T21:45:00`), ikke timeværdier. Kataloget
  skriver "Frekvens: Timevis". Det er ikke længere rigtigt.
- Sammenføjningen er derfor en definitionsændring, ikke bare to filer.
  Aggregeres begge til døgn- og ugegennemsnit, som kataloget lægger op til,
  er de sammenlignelige. Gemmes rå, er de ikke.

**Dette er det første reelle `break_at`-kandidat i projektet.** Ikke fordi
tallene er forkerte, men fordi granulariteten skifter 1. oktober 2025. Skal
elprisen ligge som én serie, bør `break_at` sættes til den dato, medmindre
begge dele aggregeres til døgn ved indlæsning, hvilket fjerner forskellen.

Feltnavnene er verificeret: `TimeUTC`, `TimeDK`, `PriceArea`,
`DayAheadPriceEUR`, `DayAheadPriceDKK`. Kataloget har ret i at prisen findes i
begge valutaer. `PriceArea` indeholder `DK1`, `DK2` og `DE`.

Bemærk: EDS har rate limiting. Et backfill-script skal håndtere HTTP 429 med
ventetid, ikke kun eksponentiel backoff på fejl.

### 3.2 Nationalbankens API er ikke afklaret

Kataloget skriver: "PX-Web-API på `nationalbanken.statistikbank.dk`. Samme
forespørgselsmønster som DST."

Det holder ikke på de stier jeg har prøvet:

```
https://nationalbanken.statistikbank.dk/api/v1/tables?lang=da&format=JSON  -> 404
https://nationalbanken.statistikbank.dk/api/v1/da                          -> 404
https://nationalbanken.statistikbank.dk/api/v1/da/nationalbanken           -> 404
https://nationalbanken.statistikbank.dk/sq/                                -> 200 (HTML)
```

Værten svarer, men API-stien er en anden end DST's. PX-Web bruger typisk
`/api/v1/{sprog}/{database}/{emne}/{tabel}`, hvor databasenavnet skal være
rigtigt. Det skal afklares før serie 9, 10 og 11 kan bygges.

**Det er præcis det verifikationsscriptet i datakatalogets afsnit 8, punkt 3,
er til for.** Jeg foreslår at det bygges først og får lov at afklare
Nationalbanken, frem for at jeg gætter en sti her.

Alternativ hvis PX-Web-stien ikke lader sig finde: Nationalbanken publicerer
de samme rentesatser og valutakurser via ECB's SDMX-API og via egne
CSV-udtræk. Det er en ringere løsning, fordi kildeangivelsen bliver
indirekte, men det er en vej.

### 3.3 Eurostat virker

Verificeret, HTTP 200:

- `ei_bsin_m_r2`, "Industry confidence indicator and survey results, monthly"
- `ei_bsco_m`, "Consumers confidence indicator and survey results, monthly"

Dimensioner: `freq, indic, s_adj, unit, geo, time`. `geo=DE` svarer. Katalogets
ønske om at hente `DK`, `SE` og `EA20` som referencelinje er en
parameterændring, ikke ekstra arbejde.

---

## 4. Hvor kataloget bør rettes

Kataloget er et arbejdsdokument. Fem ting bør rettes før der bygges:

1. **Serie 2 udgår.** Forbrugerforventninger findes allerede som 13 serier.
   Ingen adapter, ingen backfill.
2. **Serie 3 omskrives.** Tabel `BYGV88`, ikke `BYGV`. Enhed m² bekræftet.
   Frekvens er månedlig, ikke kvartalsvis. Vælg mellem `Tilladt` og
   `Påbegyndt` byggefase, eller hent begge. Revisionsafsnittet kan slettes:
   BYGV88 er allerede korrigeret.
3. **Serie 1 omskrives.** Tabel `ETILLID`, ikke `KBS1`. Fem indikatorer i én
   tabel, historik fra 1998.
4. **Serie 6 nedgraderes til en udvidelse.** Tabel `PRIS01`, ikke `PRIS111`.
   Kilden kører allerede; kun varegruppefilteret skal udvides.
5. **Serie 7 får nyt ID.** `PRIS4221`, ikke `PRIS4715`.

Desuden: katalogets afsnit 4 siger "Backfill: ved første kørsel hentes minimum
10 år". Det kan ikke opfyldes for elprisen uden at sammenføje to datasæt med
forskellig opløsning. Det bør stå eksplicit frem for at blive opdaget under
backfill.

---

## 5. Hvad jeg foreslår som næste skridt

Rækkefølgen i datakatalogets afsnit 8 holder, med én ændring: **lad
verifikationsscriptet afklare Nationalbanken før adapterne planlægges.** Tre
af tolv serier hænger på et API vi ikke har fundet endnu, og det ændrer
adapterarbejdets omfang om det bliver PX-Web, SDMX eller CSV.

Rækkefølge:

1. Verifikationsscript. Slår op mod DST, EDS, Nationalbanken og Eurostat,
   printer forslag, skriver ikke i config. Får eksplicit til opgave at finde
   Nationalbankens sti.
2. Ret kataloget efter afsnit 4 ovenfor, så `config/series.yaml` skrives én
   gang mod rigtige ID'er.
3. Adaptere. Fire kilder, fælles interface.
4. Backfill.

Ti serier skal bygges, ikke tolv. Én udvides.
