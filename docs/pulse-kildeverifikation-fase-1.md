# ALIUS PULSE. Verifikation af kilder

27. juli 2026. Alle opslag mod levende API'er, ikke mod datakatalogets tekst.

Scriptet er `scripts/verify-sources.ts`. Det skriver intet, hverken i config,
database eller filer. Det printer forslag.

```
npx tsx scripts/verify-sources.ts            # alle
npx tsx scripts/verify-sources.ts nbdk.valuta  # udvalgte
```

---

## 1. Nationalbanken: der er ingen API

Kataloget skriver: "PX-Web-API på `nationalbanken.statistikbank.dk`. Samme
forespørgselsmønster som DST."

**Det er forkert.** Begge værter kører `statbank5a`, en ASP-baseret PX-Web fra
før REST-API'et fandtes. Alle dokumenterede PX-Web-mønstre svarer 404:

| Sti | nationalbanken.statistikbank.dk | nationalbanken.statbank.dk |
|---|---|---|
| `/api/v1/da/nationalbanken` | 404 | 404 |
| `/api/v1/da` | 404 | 404 |
| `/pxweb/api/v1/da/nationalbanken` | 404 | 404 |
| `/pxweb/api/v1/da` | 404 | 404 |
| `/api/v1/tables?lang=da&format=JSON` | 404 | 404 |
| `/statbank5a/default.asp` | 200 (HTML frameset) | 200 (HTML frameset) |

Der findes heller ingen dokumenteret API på `nationalbanken.dk`.
`api.nationalbanken.dk` eksisterer ikke.

### Løsningen: DST republicerer Nationalbankens tabeller

Nationalbankens statistik ligger i DST's statistikbank med intakte
`DN`-tabel-ID'er og er tilgængelig gennem det API vi allerede har en adapter
til.

**Ingen ny protokol. Ingen ny adapter. Serie 9, 10 og 11 kan hentes med
DST-adapteren.**

---

## 2. De tre renteserier hos kilden

### Serie 11: Valutakurser. Findes, fuldt ud

**`DNVALD`, "Valutakurser", dagsobservationer.**

| Katalogets ønske | Kode i DNVALD | Verificeret spænd |
|---|---|---|
| USD | `USD` Amerikanske dollar | 1977M01D03 .. 2026M07D24 |
| SEK | `SEK` Svenske kroner | do. |
| NOK | `NOK` Norske kroner | do. |
| GBP | `GBP` Britiske pund | do. |
| PLN | `PLN` Polske zloty | fra maj 1998 |

Kurstype: `KURTYP=KBH`, som hedder **"Valutakurser (DKK pr. 100 enheder
valuta)"**. Det bekræfter katalogets note om at der skal normaliseres til DKK
pr. 1 enhed ved indlæsning.

12.506 observationer. Katalogets ønske om at udelade EUR er stadig fornuftigt:
`EUR` findes, men fastkurspolitikken gør serien uinteressant som signal.

### Serie 9: CIBOR 3 måneder. Findes ikke i live form

Serien findes i to tabeller, og **begge er døde**:

| Tabel | Kode | Label | Sidste faktiske værdi |
|---|---|---|---|
| `MPK3` | `6059` | CIBOR, løbetid 3 måneder | **2019M08** |
| `DNRENTM` | `MCI03M` | Pengemarkedsrente - CIBOR, løbetid 3 måneder | **dec. 2013** (står i labelen) |

`MPK3` har `latestPeriod: 2026M06` og står som aktiv i registret. Tabellen
lever. Serien i den gør ikke. Det opdages kun ved at hente de faktiske tal.

**Grunden:** CIBOR administreres af Finans Danmark, ikke af Nationalbanken.
Nationalbanken holdt op med at republicere den. Der er ingen offentlig,
gratis API hos Finans Danmark.

### Serie 10: Effektiv rente, 30-årig realkredit. Findes ikke i live form

Samme billede:

| Tabel | Kode | Label | Sidste faktiske værdi |
|---|---|---|---|
| `MPK3` | `6050` | Obligationsrentegennemsnit: realkreditobligationer | **2014M08** |
| `DNRENTM` | `CRO30Y` | Obligationsrente - Realkreditobligationer, løbetid 30 år | **nov. 2012** (står i labelen) |

`DNRENTM` har 47 instrumenter. Kun fire af dem er live, og alle fire er
Nationalbankens egne policy-renter. Hele markedsrentedelen, CIBOR, CITA,
swaps, stats- og realkreditobligationer, sluttede mellem 2011 og 2013.

### Hvad der findes i stedet

**`DNRENTD`, `INSTRUMENT=DESNAA`, "DESTR Referencerente".**
Verificeret: 1983M05D10 .. 2026M07D23, 10.838 observationer, daglig, live.

DESTR er Nationalbankens officielle referencerente og efterfølgeren til
T/N og CITA. Den måler ikke det samme som CIBOR 3M: DESTR er dag-til-dag og
usikret, CIBOR er tre måneder og indeholder en kreditpræmie. Men den er den
eneste live danske pengemarkedsrente i en offentlig API, og den bevæger sig
med det samme underliggende.

**Anbefaling:** erstat katalogets serie 9 med DESTR, og noter i seriens navn
at det ikke er CIBOR. Serie 10 har ingen offentlig erstatning og bør
udskydes til fase 2, hvor et abonnement hos Finans Danmark eller Nasdaq
Copenhagen kan vurderes. Kataloget begrunder serie 10 med at det er "den ene
rente en dansk erhvervsdrivende faktisk kender". Det argument holder, men
det gør kilden ikke tilgængelig.

---

## 3. De øvrige kilder

| Serie | Tabel | Status | Verificeret |
|---|---|---|---|
| 1. Konjunkturbarometer | `ETILLID` | OK | 5 indikatorer, 1998M01 .. 2026M07 |
| 3. Byggetilladelser m² | `BYGV88` | OK | `BYGFASE` 1 og 2, 1998M01 .. 2026M03, unit M2 |
| 4. Tvangsauktioner | `TVANG1` | OK | aktiv, 2026M06, unit Antal |
| 7. Producentpriser | `PRIS4221` | OK | aktiv, 2026M06, unit Indeks |
| 8. Lønindeks | `SBLON1` | OK | aktiv, 2026K1 |
| 12. Tysk erhvervstillid | Eurostat `ei_bsin_m_r2` | OK | HTTP 200, seneste 2026-06 |
| 5. Elpris, aktuel | EDS `DayAheadPrices` | **0,8 år historik** | 2025-09-30 .. 2026-07-28 |
| 5. Elpris, historik | EDS `Elspotprices` | **ikke afgjort** | rate-limitet, HTTP 429 |

### ETILLID, verificeret pr. indikator

```
TE    Erhvervstillidsindikator            1998M01 .. 2026M07  (343 obs)
KBI   Tillidsindikator for industri       1998M01 .. 2026M07  (343 obs)
KBB   Tillidsindikator for bygge og anlæg 1998M01 .. 2026M07  (343 obs)
KBD   Tillidsindikator for detailhandel   1998M01 .. 2026M07  (343 obs)
KBS   Tillidsindikator for serviceerhverv 2000M04 .. 2026M07  (316 obs)
```

28 års historik. Bemærk at `KBS` starter to år senere end de øvrige.

### BYGV88, verificeret pr. byggefase

```
BYGFASE=1  Tilladt byggeri     1998M01 .. 2026M03  (678 obs)
BYGFASE=2  Påbegyndt byggeri   1998M01 .. 2026M03  (678 obs)
```

Bundet på `ANVENDELSE` i {10100 beboelse, 10200 erhverv}, `BYGHERRE=TOT`,
`SÆSON=SÆSON`. Uden binding afviser DST udtrækket med `EXTRACT-NOTALLOWED`.

### Elprisen: rate limiting, ikke fravær

`Elspotprices` svarede HTTP 429 ved verifikationen. Et tidligere opslag samme
dag bekræftede at datasættet findes og har data til `2025-09-30T21:00`, men
historikdybden er **ikke afgjort**.

Det skal afgøres før backfill planlægges, og et backfill-script skal
håndtere 429 med ventetid, ikke kun eksponentiel backoff på fejl.

---

## 4. Tre lærdomme er bygget ind i scriptet

Hver stammer fra en fejl der allerede er sket i dette projekt:

1. **Tjek `active`-flaget.** KONK4 svarede korrekt på API'et i et halvt år
   efter DST havde lukket den.
2. **Tjek at koden findes i dimensionen.** Seks DB07-koder i DETA211A blev
   filtreret bort af `availableCodes.has()` uden en linje i loggen.
3. **Tjek den faktiske serie, ikke tabellen.** `MPK3` er aktiv med
   `latestPeriod: 2026M06`, men CIBOR-serien i den døde i 2019. Uden at hente
   tallene ville vi have bygget en adapter til en tom serie.

Den tredje er ny og er den vigtigste. Tabelniveau siger intet om
serieniveau. Verifikationen henter derfor faktiske observationer for hver
enkelt kode og rapporterer første og sidste værdi, ikke tabellens metadata.

Scriptet rapporterer desuden HTTP 429 som "ikke afgjort" frem for som "ingen
data". Det er samme fejlfamilie som `continue-on-error`: en tilstand skrevet
om til en anden, uden at nogen fik besked.

---

## 5. Forslag til udvælgelse: ETILLID og BYGV88

To tabeller kan let blive tyve serier. Principperne er: **ledende slår
detaljeret**, og **ingen enkelt kilde bør fylde mere end omkring fem serier.**

### ETILLID: 5 mulige, jeg foreslår 3

| Kode | Serie | Med? | Begrundelse |
|---|---|---|---|
| `TE` | Erhvervstillidsindikator | **Ja** | Den sammensatte. Katalogets faktiske ønske |
| `KBB` | Bygge og anlæg | **Ja** | Mest ledende af brancherne. Vender først, og Pulse har allerede byggeri i to andre serier den kan læses op mod |
| `KBI` | Industri | **Ja** | Eksportkonjunkturen. Parrer med tysk erhvervstillid i serie 12 og giver `derived.tillid.diff` mening |
| `KBD` | Detailhandel | Nej | Overlapper forbrugertillid (FORV1 F1) og detailomsætning (DETA211A). Tre serier om samme forbrugerbillede |
| `KBS` | Serviceerhverv | Nej | Bredest og mindst ledende. Starter desuden to år senere |

**Tre serier.** `KBD` og `KBS` kan tilføjes senere hvis ranglisten viser at
de bidrager med noget de øvrige ikke fanger.

### BYGV88: 16 kombinationer mulige, jeg foreslår 2

Dimensionerne er `BYGFASE` (4) × `ANVENDELSE` (4) × `BYGHERRE` (4) ×
`SÆSON` (2). Alt krydset er 128 serier. Realistisk udvalg:

| Serie | `BYGFASE` | `ANVENDELSE` | Med? | Begrundelse |
|---|---|---|---|---|
| Tilladt, beboelse | 1 | 10100 | **Ja** | Mest ledende. Tilladelsen kommer før spadestikket |
| Tilladt, erhverv | 1 | 10200 | **Ja** | Erhvervsbyggeri er den bedste enkeltindikator for virksomheders investeringslyst, og den findes ikke i BYGV33 |
| Påbegyndt, beboelse | 2 | 10100 | Nej | Følger tilladt med et par kvartaler. Redundant som signal |
| Påbegyndt, erhverv | 2 | 10200 | Nej | Do. |
| Fuldført / under opførelse | 3, 4 | - | Nej | Realiseret, ikke ledende. Hører til REALISED og kataloget beder om en ledende serie |

Fast: `BYGHERRE=TOT`, `SÆSON=SÆSON`. Sæsonkorrigeret, fordi byggeri har en
kraftig sæsonprofil og ranglisten sammenligner på tværs af måneder.

**To serier.** Begge `BYGFASE=1`, altså tilladelser. Det matcher også
katalogets serienavn, "Byggetilladelser", bedre end `Påbegyndt` gør.

### Samlet effekt på kildekvoten

| Kilde | Serier efter fase 1 |
|---|---|
| ETILLID | 3 |
| BYGV88 | 2 |
| DNVALD | 5 (USD, SEK, NOK, GBP, PLN) |
| PRIS01 | 2 i dag + 3 COICOP-grupper = 5 |
| FORV1 | 13 i dag, ingen nye |
| KONK25 | 17 i dag, ingen nye |

`DNVALD` med fem valutaer rammer præcis loftet. FORV1 og KONK25 ligger langt
over, men det er eksisterende serier, og kildekvoten i afsnit 4 løser
visningsproblemet uden at kræve at de fjernes.

---

## 6. Hvad jeg foreslår rettet i datakataloget

Ud over de fem rettelser i overlapsanalysen:

6. **Serie 9 omskrives til DESTR** eller markeres som udskudt. CIBOR 3M er
   ikke tilgængelig i en offentlig API.
7. **Serie 10 udskydes til fase 2.** Ingen offentlig kilde. Kræver
   kommerciel aftale.
8. **Afsnittet om Nationalbankens PX-Web-API slettes.** Der er ingen API.
   Erstat med DST-tabellerne `DNVALD` og `DNRENTD`.
9. **Serie 11's enhed præciseres:** DST leverer DKK pr. 100 enheder
   (`KURTYP=KBH`). Normaliseringen til DKK pr. 1 enhed er bekræftet
   nødvendig.

Efter det: ni serier at bygge, ikke tolv. Én udvides. To udskudt eller
erstattet.
