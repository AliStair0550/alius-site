# ALIUS PULSE. Datakatalog fase 1

Version 1.0. Juli 2026.

Tolv datapunkter. Alle fra niveau 1-kilder med offentligt API. Ingen scraping i fase 1.

Formålet med dette dokument er at være entydigt nok til at en udvikler kan bygge ingestion uden at træffe designbeslutninger undervejs.

---

## 1. Regler der gælder for alle serier

**Tabel-ID'er må ikke hardcodes.** Danmarks Statistik lukker tabeller med status "afsluttet" og opretter afløsere med nyt ID. Alle tabel-ID'er i dette dokument er kandidater og skal verificeres mod `GET https://api.statbank.dk/v1/tables` ved første kørsel. Mappingen gemmes i `config/series.yaml`, ikke i kode.

**Alle observationer gemmes med vintage.** DST og Nationalbanken reviderer bagud. Uden hentetidspunkt kan Pulse ikke forklare hvorfor et tal har ændret sig, og alarmlogikken vil fyre falske signaler ved revision.

**Ingen serie må fejle stille.** Hvis en serie ikke er opdateret inden for sit forventede vindue plus to dage, skal der gå en alarm til superadmin. En død serie er værre end ingen serie.

**Kildeangivelse er et krav.** Åben offentlig datalicens kræver attribution. Hver serie bærer sit `attribution`-felt hele vejen ud til frontend.

**Enheder normaliseres ved indlæsning.** Priser i DKK. Indeks som decimaltal. Renter i procent, ikke basispunkter. Konvertering sker i ingestion-laget, aldrig i visningslaget.

**Ingen serie optages uden en nævner.** Et enkelt tal kan aflæses, ikke fortolkes.

En serie skal ved optagelse kunne besvare: *hvad holdes dette tal op mod, og hvem leverer det.* Der er tre gyldige svar:

| Nævner | Hvornår den er nok |
|---|---|
| Seriens egen historik | Kun når enheden i sig selv er fortolkelig: procent af arbejdsstyrken, nettotal med nulpunkt, indeks med fast basisår |
| En søsterserie i samme lag | Når parret udgør en meningsfuld forskel: producentpris mod løn giver margin |
| En ekstern referencelinje | Når niveauet kun betyder noget relativt: elpris, rente, valutakurs, tillidsindikator |

Z-scoren er ikke en nævner. Den svarer på **om** noget er usædvanligt. Den svarer ikke på **hvorfor**, og det er hvorfor'et der afgør hvad nogen gør.

Kan spørgsmålet ikke besvares, optages serien ikke. Nævneren hentes samtidig med serien, ikke bagefter.

**Reglen er skrevet efter tre uafhængige tilfælde, ikke som en generalisering af ét:**

- Tysk erhvervstillid faldt. Uden EU27 kan det ikke skelnes fra at europæisk erhvervstillid faldt. Det første er et tysk markedsproblem, det andet et porteføljeproblem.
- Udlånsrenten til erhverv er 3,47 procent. Uden Nationalbankens udlånsrente kan "centralbanken flyttede sig" ikke skelnes fra "din bank strammede".
- USD/DKK steg. Uden den effektive kronekurs kan "dollaren er stærk" ikke skelnes fra "kronen er svag".

**Havde reglen stået her fra begyndelsen, var CIBOR aldrig kommet på listen.** Serie 9 og 10 blev specificeret som referencerenter, altså tal ingen betaler, og uden noget at holde dem op mod. Spørgsmålet "hvad er nævneren" ville have afsløret det før tabel-ID'et blev slået op, i stedet for efter at det viste sig at serien havde været død siden 2013.

En nævner er ofte ikke selv et signal. Se `series.rankable`.

**Korrelerede serier konkurrerer ikke hver for sig.** Enten den bedste enkeltserie, eller den sammensatte. Ikke begge.

Ved optagelse skal en serie erklære hvilke eksisterende serier den bevæger sig sammen med, enten af konstruktion eller af natur. Findes en sådan gruppe, sættes `series.rankGroup`, og **højst ét medlem må have `rankable = true`.** Reglen håndhæves af `scripts/set-rank-groups.ts`, som fejler hvis en gruppe har to.

To grunde, og den anden er den vigtigste:

1. **Redaktionelt.** N kort om samme kendsgerning fortrænger N-1 andre kendsgerninger.
2. **Statistisk.** N korrelerede serier er N træk fra næsten samme fordeling. Ét af dem vil ofte have en høj z-score uden at noget er sket. Jo flere varianter af samme tal der optages, jo oftere lyver ranglisten.

Vinderen vælges på **hvilken serie der er tættest på beslutningen**, ikke på hvilken der er mest aggregeret eller mest detaljeret. Nogle gange er det den sammensatte (forbrugertillid), nogle gange den afledte (detailmængde), nogle gange nævneren (effektiv kronekurs).

Kildekvoten i byggebriefens afsnit 4 løser korrelation **inden for** én kilde. `rankGroup` løser den **på tværs** af kilder, hvor kvoten ikke kan se den: nominelt detailindeks fra DETA211A og deflateret mængdeindeks fra den afledte tabel er samme kendsgerning fra to kilder.

Reglen er skrevet efter fem tilfælde: boligbyggeri per kommune, KONK4's tyve brancher, FORV1's tretten spørgsmål, fire valutapar, og nominelt mod deflateret detailindeks.

---

## 2. Datamodel

```sql
-- Metadata om serien. Fra config, ikke fra brugerinput.
create table series (
  id                text primary key,          -- fx "dst.konjunktur.sammensat"
  name_da           text not null,
  source            text not null,             -- "DST" | "EDS" | "NBDK" | "EUROSTAT"
  source_ref        text not null,             -- tabel-ID eller dataset-navn
  unit              text not null,             -- "indeks_2015" | "dkk_mwh" | "pct" | "nettotal"
  frequency         text not null,             -- "daily" | "monthly" | "quarterly"
  expected_lag_days int  not null,             -- forventet forsinkelse fra periodeslut
  revision_policy   text not null,             -- "none" | "minor" | "major"
  attribution       text not null,
  layer             text not null,             -- "leading" | "cost" | "capital" | "external"
  active            boolean not null default true
);

-- Append-only. Én række per (serie, periode, hentetidspunkt).
create table observations (
  series_id    text not null references series(id),
  period       date not null,                  -- normaliseret til første dag i perioden
  value        numeric,                        -- null tilladt, betyder "ikke publiceret endnu"
  retrieved_at timestamptz not null default now(),
  is_current   boolean not null default true,
  primary key (series_id, period, retrieved_at)
);

create index on observations (series_id, period) where is_current;

-- Log over hver kørsel. Grundlag for stale-alarmen.
create table ingest_runs (
  id            bigserial primary key,
  series_id     text not null references series(id),
  started_at    timestamptz not null,
  finished_at   timestamptz,
  status        text not null,                 -- "ok" | "no_new_data" | "error"
  rows_written  int,
  rows_revised  int,
  error_message text
);
```

Ved ny hentning: hvis værdien for en periode afviger fra seneste `is_current`-række, sættes den gamle til `is_current = false`, og den nye indsættes. Afvigelsen logges som revision. Ingen `UPDATE` på værdier, nogensinde.

---

## 3. De tolv serier

### Lag: ledende indikatorer

#### 1. Konjunkturbarometer, sammensat konjunkturindikator

| Felt | Værdi |
|---|---|
| `id` | `dst.konjunktur.sammensat` |
| Kilde | Danmarks Statistik |
| Endpoint | `POST https://api.statbank.dk/v1/data` |
| Tabel (kandidat) | `KBS1` eller efterfølger. Verificér |
| Variable | branche (industri, bygge og anlæg, service, detailhandel), sæsonkorrigeret |
| Enhed | Nettotal, sæsonkorrigeret |
| Frekvens | Månedlig |
| Forventet lag | 0 til 3 dage efter månedsslut |
| Revision | Minor. Sæsonkorrektion genberegnes |
| Hvorfor | Det er den eneste danske månedlige serie der måler forventning frem for realisering. Vender typisk 2 til 3 kvartaler før ordrebøgerne |

#### 2. Forbrugerforventninger

| Felt | Værdi |
|---|---|
| `id` | `dst.forbrug.forventning` |
| Kilde | Danmarks Statistik |
| Tabel (kandidat) | `FORV1` |
| Variable | Sammensat indikator plus delspørgsmålet om større indkøb de kommende 12 måneder |
| Enhed | Nettotal |
| Frekvens | Månedlig |
| Forventet lag | Publiceres omkring den 20. i måneden for samme måned |
| Revision | None |
| Hvorfor | Delspørgsmålet om større indkøb er den bedste enkeltvariabel for detail og forbrugsnære brancher. Den skal trækkes ud separat, ikke gemmes inde i den sammensatte indikator |

#### 3. Byggetilladelser, påbegyndt etageareal

| Felt | Værdi |
|---|---|
| `id` | `dst.byg.paabegyndt` |
| Kilde | Danmarks Statistik |
| Tabel (kandidat) | `BYGV` eller efterfølger. Verificér |
| Variable | Anvendelse (bolig, erhverv), region |
| Enhed | m² etageareal |
| Frekvens | Kvartalsvis |
| Forventet lag | 6 til 8 uger |
| Revision | **Major.** Efterindberetninger til BBR gør de seneste to kvartaler systematisk for lave |
| Hvorfor | Ledende for byggeri, håndværk, materialer og finansiering. Revisionsprofilen skal håndteres eksplicit, ellers viser Pulse et fald der ikke findes |

#### 4. Tvangsauktioner over fast ejendom

| Felt | Værdi |
|---|---|
| `id` | `dst.distress.tvangsauktion` |
| Kilde | Danmarks Statistik |
| Tabel (kandidat) | `TVANG1` eller efterfølger. Verificér |
| Variable | Ejendomskategori, region |
| Enhed | Antal, sæsonkorrigeret hvis tilgængeligt |
| Frekvens | Månedlig |
| Forventet lag | 3 til 4 uger |
| Revision | Minor |
| Hvorfor | Leder konkurser og ledighed. Bevæger sig før husholdningernes forbrug knækker. Komplementerer konkursserien Pulse allerede har |

### Lag: omkostninger

#### 5. Elpris, day-ahead, DK1 og DK2

| Felt | Værdi |
|---|---|
| `id` | `eds.el.dayahead.dk1` og `eds.el.dayahead.dk2` |
| Kilde | Energinet, Energi Data Service |
| Endpoint | `GET https://api.energidataservice.dk/dataset/DayAheadPrices` |
| Parametre | `start`, `end`, `filter={"PriceArea":"DK1"}`, `limit` |
| Felt i svar | Verificér feltnavn mod dataset-metadata. Prisfeltet findes i både DKK og EUR |
| Enhed | DKK/MWh. Konverteres til øre/kWh i visningslaget |
| Frekvens | Timevis. Aggregeres til døgn- og ugegennemsnit ved indlæsning |
| Forventet lag | Publiceres omkring kl. 13 dagen før leveringsdøgnet |
| Revision | None |
| Note | **`Elspotprices` er udgået pr. 30. september 2025.** Brug `DayAheadPrices`. Ingen API-nøgle påkrævet |
| Hvorfor | Den mest volatile omkostningspost for produktion, køl, bagerier og landbrug. Daglig frekvens gør Pulse levende frem for månedlig |

#### 6. Forbrugerprisindeks

| Felt | Værdi |
|---|---|
| `id` | `dst.pris.forbruger` |
| Kilde | Danmarks Statistik |
| Tabel | `PRIS111` |
| Variable | Total plus COICOP-hovedgrupper (fødevarer, bolig, transport) |
| Enhed | Indeks. Referenceperiode 2025. **Skal læses fra metadata, ikke antages** |
| Frekvens | Månedlig |
| Forventet lag | Publiceres den 10. eller førstkommende hverdag for foregående måned |
| Revision | None |
| Hvorfor | Grundlag for prisregulering i kontrakter. En topleder bruger det ikke til at forstå økonomien, men til at afgøre om han kan hæve priserne |

#### 7. Producentprisindeks for varer

| Felt | Værdi |
|---|---|
| `id` | `dst.pris.producent` |
| Kilde | Danmarks Statistik |
| Tabel (kandidat) | `PRIS4715` eller efterfølger. Verificér |
| Variable | Hjemmemarked og eksportmarked, hovedbrancher |
| Enhed | Indeks |
| Frekvens | Månedlig |
| Forventet lag | 3 til 4 uger |
| Revision | Minor |
| Hvorfor | Måler prisgennemslaget før det når forbrugerprisindekset. Afstanden mellem producent- og forbrugerpris er marginsignalet |

#### 8. Lønindeks for den private sektor

| Felt | Værdi |
|---|---|
| `id` | `dst.loen.privat` |
| Kilde | Danmarks Statistik |
| Tabel (kandidat) | `SBLON1` eller efterfølger. Verificér |
| Variable | Branche efter DB07-hovedgrupper |
| Enhed | Indeks samt årlig ændring i procent |
| Frekvens | Kvartalsvis |
| Forventet lag | 8 til 10 uger |
| Revision | Minor |
| Hvorfor | Største omkostningspost i næsten alle serviceerhverv. Lav frekvens, men høj vægt i beslutninger om prissætning og bemanding |

### Lag: kapital

#### 9. Pengemarkedsrente, CIBOR 3 måneder

| Felt | Værdi |
|---|---|
| `id` | `nbdk.rente.cibor3m` |
| Kilde | Danmarks Nationalbank, statistikbank |
| Endpoint | PX-Web-API på `nationalbanken.statistikbank.dk`. Samme forespørgselsmønster som DST. Verificér tabel-ID |
| Enhed | Procent p.a. |
| Frekvens | Daglig |
| Forventet lag | 1 hverdag |
| Revision | None |
| Hvorfor | Prisen på virksomhedens driftskredit. Ændrer sig hurtigere end noget andet i Pulse |

#### 10. Effektiv rente, 30-årig realkreditobligation

| Felt | Værdi |
|---|---|
| `id` | `nbdk.rente.realkredit30` |
| Kilde | Danmarks Nationalbank |
| Enhed | Procent p.a. |
| Frekvens | Daglig |
| Forventet lag | 1 hverdag |
| Revision | None |
| Hvorfor | Styrer boligmarked, ejendomsinvestering og generationsskifter. Den ene rente en dansk erhvervsdrivende faktisk kender |

#### 11. Valutakurser mod DKK

| Felt | Værdi |
|---|---|
| `id` | `nbdk.valuta.<ccy>` for USD, SEK, NOK, GBP, PLN |
| Kilde | Danmarks Nationalbank |
| Enhed | DKK per 100 enheder. **Normaliseres til DKK per 1 enhed ved indlæsning** |
| Frekvens | Daglig, hverdage |
| Forventet lag | Samme dag |
| Revision | None |
| Note | EUR udelades. Fastkurspolitikken gør serien uinteressant som signal |
| Hvorfor | SEK og NOK afgør konkurrenceevnen mod de nærmeste konkurrenter. USD afgør råvare- og fragtomkostninger |

### Lag: eksternt

#### 12. Tysk erhvervstillid

| Felt | Værdi |
|---|---|
| `id` | `eurostat.de.esi.industri` |
| Kilde | Eurostat eller DG ECFIN Business and Consumer Surveys |
| Endpoint | Eurostat SDMX/JSON. Dataflow for business survey-indikatorer. Verificér kode |
| Geo | `DE`. Hent samtidig `DK`, `SE` og `EA20` som referencelinje |
| Enhed | Nettotal, sæsonkorrigeret |
| Frekvens | Månedlig |
| Forventet lag | Sidste hverdag i måneden for samme måned |
| Revision | Minor |
| Hvorfor | Tyskland er det største danske eksportmarked. Serien vender typisk før de danske. Det er Pulses eneste rigtige forspringsindikator over for dansk data |

---

## 4. Ingestion

Ét job per serie. Ikke ét job der henter alt. En fejl i Eurostat må ikke standse elpriserne.

**Cadence**

| Frekvens | Kørsel |
|---|---|
| Daglig | Hverdage kl. 07:00 dansk tid |
| Månedlig | Dagligt kl. 07:15. Jobbet tjekker om der er ny periode og afslutter med `no_new_data` hvis ikke |
| Kvartalsvis | Samme mønster |

Månedlige og kvartalsvise serier hentes dagligt, fordi publiceringstidspunkter flytter sig. Det er billigere at spørge forgæves end at vedligeholde en publiceringskalender.

**Backfill.** Ved første kørsel hentes minimum 10 år. Uden historik kan Pulse ikke sige om en bevægelse er usædvanlig, og så er der ingen fortolkning at sælge.

**Retry.** Tre forsøg med eksponentiel backoff, 2, 8 og 30 sekunder. Derefter `status = "error"` og alarm.

**Stale-detektion.** Dagligt job kl. 09:00 der finder serier hvor seneste `is_current`-observation er ældre end `expected_lag_days + 2` fra forventet periodeslut. Sender én samlet mail til superadmin. Ikke én mail per serie.

**Revisionslog.** Når en værdi ændrer sig, skrives serie, periode, gammel værdi, ny værdi og afvigelse i procent. Afvigelser over 5 procent på en allerede publiceret periode udløser alarm, fordi det som regel betyder at parsingen er gået galt, ikke at DST har revideret.

---

## 5. Afledte indikatorer

Rådata sælger ikke. Beregn disse ved indlæsning og gem dem som selvstændige serier.

| Serie | Beregning |
|---|---|
| `derived.margin.signal` | Producentprisindeks minus lønindeks, årlig ændring. Positivt betyder marginudvidelse |
| `derived.el.uge` | Ugegennemsnit af DK1 og DK2, plus afvigelse fra samme uge sidste år |
| `derived.rente.spread` | 30-årig realkredit minus CIBOR 3M. Hældningen på rentekurven |
| `derived.tillid.diff` | Tysk erhvervstillid minus EU27. Fortæller om et fald er tysk eller europæisk |
| `derived.zscore.<serie>` | Standardafvigelser fra 10-års gennemsnit. Grundlaget for at afgøre om en bevægelse er værd at alarmere om |

`derived.zscore` er den vigtigste. Uden den er alarmlogikken vilkårlig.

**Rettelse 27. juli 2026: `derived.tillid.diff` var oprindeligt specificeret
som tysk minus dansk erhvervstillid.** Det er ændret til tysk minus EU27.

Grunden er metodisk. Vores danske erhvervstillid kommer fra DST's `ETILLID`,
den tyske fra Eurostats `ei_bsin_m_r2`. De to opgørelser bruger forskellige
spørgeskemaer, forskellige brancheafgrænsninger og forskellig
sæsonkorrektion. En differens mellem dem måler delvis forskellen i metode,
ikke kun forskellen i virkelighed, og ingen kan bagefter sige hvor meget der
er hvad.

DE minus EU27 kommer fra samme undersøgelse, samme metode, samme måned. Og
den svarer på et bedre spørgsmål: **er faldet tysk eller europæisk.** Det
første betyder at en dansk eksportør skal se på sit tyske marked. Det andet
at han skal se på hele porteføljen. "Er Danmark foran eller bagud" er
interessant, men det ændrer sjældnere en beslutning.

EU27-serien er markeret `rankable = false`. Den er en nævner og skal ikke
konkurrere med det den forklarer.

---

## 6. Afgrænsning for fase 1

Ikke i denne fase, og det er bevidst:

- Ingen scraping. Danish Crown, Arla og DLG venter til fase 2
- Ingen CVR og ingen Statstidende. Kræver ansøgning og hører til fase 3
- Ingen frontend ud over det der skal til for at verificere data
- Ingen alarmmails til kunder. Først når 10 års historik ligger i basen og z-scores er validerede

**Energisiden er tynd, og det er en afgrænsning, ikke en forglemmelse.**
Vi har elprisen for DK1 og DK2 tilbage til 1999. Tre kandidater er noteret
til fase 2, i den rækkefølge de er værd:

| Kandidat | Hvorfor | Hvor |
|---|---|---|
| Gaspris | Anden halvdel af energiregningen for produktion og fjernvarme. Elprisen alene besvarer ikke "hvad koster energi" | Energi Data Service |
| Elforbrug | Prisen uden mængden siger ikke om nogen skruede ned. Sammen bliver de et signal om aktivitet, ikke kun om marked | Energi Data Service |
| Tysk elpris | Danmark handler mod Tyskland. Er en dansk prisspids dansk eller nordeuropæisk, ændrer det hvad en indkøber skal gøre | ENTSO-E eller Eurostat |

Godkendt 28. juli 2026 sammen med de tre nøgletalssider.

---

## 7. Definition of done

- [ ] Alle 12 serier har verificeret tabel-ID eller dataset-navn gemt i `config/series.yaml`
- [ ] Alle 12 serier har mindst 10 års historik indlæst
- [ ] Enhederne er normaliseret og dokumenteret i `series.unit`
- [ ] Revisionslogik virker. Testet ved at genindlæse en periode med ændret værdi
- [ ] Stale-alarmen virker. Testet ved at sætte `expected_lag_days` kunstigt lavt
- [ ] Alle fem afledte serier beregnes korrekt
- [ ] Attribution følger med hver serie ud i API-svaret
- [ ] Tests dækker parsing, enhedskonvertering og revisionshåndtering per kilde

---

## 8. Prompt til Claude Code

> Vi udvider ALIUS PULSE med et generisk ingestion-lag til tidsserier. Specifikationen ligger i `docs/pulse-datakatalog-fase-1.md`. Læs den først.
>
> Byg i denne rækkefølge:
>
> 1. Databaseskemaet fra afsnit 2. Migration, ikke manuelle SQL-kald.
> 2. `config/series.yaml` med de 12 serier fra afsnit 3. Lad `source_ref` stå tom for de serier hvor tabel-ID er markeret "verificér".
> 3. Et verifikationsscript der kalder `https://api.statbank.dk/v1/tables` og `https://api.energidataservice.dk/dataset` og foreslår det korrekte ID for hver tom `source_ref`. Scriptet skriver ikke selv i config. Det printer forslagene, så jeg godkender dem.
> 4. En adapter per kilde: DST, Energi Data Service, Nationalbanken, Eurostat. Fælles interface, forskellig parsing.
> 5. Ingestion-jobbet med retry, revisionshåndtering og `ingest_runs`-logning fra afsnit 4.
> 6. De fem afledte serier fra afsnit 5.
> 7. Stale-detektionsjobbet.
>
> Krav: ingen hardcodede tabel-ID'er. Ingen `UPDATE` på `observations.value`. Tests for parsing, enhedskonvertering og revisionshåndtering per adapter.
>
> Start med punkt 1 til 3 og stop der. Jeg vil godkende tabel-ID'erne før du bygger adaptere.
>
> Til sidst: `git add . && git commit -m "Pulse: ingestion-lag og datakatalog fase 1" && git push`

---

## Kilder og licens

Danmarks Statistik, Statistikbankens API. Energinet, Energi Data Service. Danmarks Nationalbank, statistikbank. Eurostat. Alle under åben offentlig datalicens eller tilsvarende med krav om kildeangivelse.
