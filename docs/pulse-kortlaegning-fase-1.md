# ALIUS PULSE. Kortlægning før fase 1

Juli 2026. Skrevet før der bygges noget. Alle tal er trukket direkte fra
produktionsdatabasen (Neon) og fra GitHub Actions-kørselshistorikken den
27. juli 2026.

---

## Kort svar først

1. **To parallelle opdateringsmekanismer**, ikke én. En Vercel-cron dækker 2 af
   15 datasæt. En GitHub Actions-workflow dækker alle 15, men den er
   **cancelled på timeout de sidste to gange den kørte** (25. juni og 25. juli).
2. **Signalerne på `/pulse` for boligbyggeri, forbrugertillid og befolkning er
   frosset siden 13. maj 2026.** Det er en direkte konsekvens af punkt 1.
3. **Historikken er der.** 71.034 rækker, 14 af 15 datasæt har over 10 års
   historik. Kun FOLK1AM (4,7 år) falder under datakatalogets krav.
4. **Springet til `series`/`observations` er stort, men det er ét bestemt
   problem, ikke mange:** `observations` har ingen områdedimension. De fire
   dashboards er geografiske. Det tvinger ~1.113 `series`-rækker frem, eller en
   ændring af datamodellen.
5. **Holbæk og Horsens: minus 108 er et ægte sammentræf i data.** 116 → 8 og
   129 → 21. Men de to kort er alligevel forkerte, af en anden grund:
   overskriften "faldt mest" er hardkodet og udskrives to gange.
6. **Cron-antal er ikke begrænsningen.** Vercel tillader 100 cron-jobs pr.
   projekt på alle planer. Begrænsningen er intervallet, og den afhænger af
   planen.

---

## 1. Hvordan hentes og lagres Pulse-data i dag

### 1.1 `prisma/schema.prisma`

Pulse-delen består af fire modeller. Resten af filen (Profile, TeamSession,
TeamMember, TeamRequest) hører til tankeprofil og er urørt af dette arbejde.

```prisma
model DataSource {
  id    String @id @default(cuid())

  slug            String  @unique  // e.g. "dst-aus08"
  name            String
  description     String?
  provider        String           // "dst"
  tableId         String           // DST table id, e.g. "AUS08"
  unit            String?          // "pct", "1000 persons", etc.
  sourceUrl       String?
  license         String?
  updateFrequency String?

  lastUpdatedAtSource DateTime?
  lastFetchedAt       DateTime?

  meta        Json?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  dataPoints  DataPoint[]
  signals     Signal[]
  fetchLogs   FetchLog[]

  @@index([slug])
  @@index([provider, tableId])
}

model DataPoint {
  id         String @id @default(cuid())
  sourceId   String

  period     String    // "2026M03", "2026K1", "2026"
  periodDate DateTime  // first day of the period (UTC)
  periodType PeriodType

  areaCode   String?
  areaType   AreaType @default(NATIONAL)
  areaName   String?

  value      Float?
  status     String?  // "provisional", "missing", DST status codes

  dimensions Json?    // extra dimensions beyond time + area

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  source     DataSource @relation(fields: [sourceId], references: [id], onDelete: Cascade)

  @@unique([sourceId, period, areaCode])
  @@index([sourceId, periodDate])
  @@index([sourceId, areaCode, periodDate])
}

enum PeriodType  { MONTH QUARTER YEAR WEEK }
enum AreaType    { NATIONAL REGION LANDSDEL KOMMUNE OTHER }

model Signal {
  id         String @id @default(cuid())
  sourceId   String

  type        String   // "TOP_MOVER", "RECORD", "STREAK", "COMPARISON", "TURNING_POINT", "OUTLIER"
  direction   String?  // "UP", "DOWN", "STABLE"
  severity    String   @default("info")  // "info", "note", "important"

  headline    String
  body        String?

  period      String?
  magnitude   Float?
  areaCode    String?
  areaName    String?
  evidence    Json?

  createdAt   DateTime @default(now())

  source      DataSource @relation(fields: [sourceId], references: [id], onDelete: Cascade)

  @@index([sourceId, type])
  @@index([sourceId, period])
}

model FetchLog {
  id         String @id @default(cuid())
  sourceId   String

  success      Boolean   @default(false)
  error        String?
  notes        String?

  inserted     Int @default(0)
  updated      Int @default(0)
  skipped      Int @default(0)
  rowsAffected Int @default(0)

  lastUpdatedAtSource DateTime?
  completedAt         DateTime?

  createdAt  DateTime @default(now())

  source     DataSource @relation(fields: [sourceId], references: [id], onDelete: Cascade)

  @@index([sourceId, createdAt])
}
```

To migrationer findes: `20260511111723_init` og `20260512111301_add_pulse_models`.

**Tre observationer om skemaet, som betyder noget for fase 1:**

- **Der er ingen vintage.** `DataPoint` har præcis én række per
  (kilde, periode, område). Når DST reviderer, overskrives værdien.
  Det er ikke teoretisk: **2.030 AUS08-rækker har `updatedAt > createdAt`**,
  altså 2.030 værdier hvor den oprindelige er slettet uigenkaldeligt.
  Det er præcis det, datakatalogets append-only-regel skal forhindre.

- **`@@unique([sourceId, period, areaCode])` binder ikke for nationale datasæt.**
  Postgres behandler NULL som forskellig fra NULL i et unique-index. KONK4
  gemmer 20 brancher per måned, alle med `areaCode = NULL`, adskilt kun af
  `dimensions`-JSON. Kontrollen er der på papiret og virker ikke:

  ```
  dst-konk4 2022M12: 20 rækker
  dst-konk4 2023M03: 20 rækker
  dst-konk4 2019M10: 20 rækker
  ```

  Sync-scriptet deduplikerer selv, så der er ingen skade i dag. Men databasen
  beskytter ikke mod en dobbeltkørsel.

- **`areaCode` bruges til noget der ikke er områder.** FORV1's 13 "områder" er
  spørgsmålsnumre fra forbrugerforventningsundersøgelsen:

  ```json
  {"period":"2026M07","areaCode":"F13","areaName":"Familiens økonomiske situation lige nu: ...","areaType":"NATIONAL","value":25.3}
  {"period":"2026M07","areaCode":"F10","areaName":"Anskaffelse af større forbrugsgoder, inden for de næste 12 mdr.","areaType":"NATIONAL","value":-8}
  ```

  Det er en genvej der virker, men den gør `areaType` misvisende, og den er
  grunden til at en flad `series`-model faktisk passer bedre til FORV1 end den
  nuværende.

### 1.2 Indholdet af `scripts/`

24 filer. Ingen af dem kaldes fra applikationen. De køres fra GitHub Actions
eller i hånden med `npx tsx`.

**11 sync-scripts (henter fra DST og skriver til `DataPoint`):**

| Fil | Tabel | Kilde-slug |
|---|---|---|
| `sync-aus08.ts` | AUS08 | `dst-aus08` |
| `sync-bygv33.ts` | BYGV33 | `dst-bygv33` |
| `sync-deta211a.ts` | DETA211A | `dst-deta211a` |
| `sync-ejdfoe1.ts` | EJDFOE1 | `dst-ejdfoe1-huse`, `dst-ejdfoe1-lejl` |
| `sync-folk1am.ts` | FOLK1AM | `dst-folk1am` |
| `sync-forv1.ts` | FORV1 | `dst-forv1` |
| `sync-indkp101.ts` | INDKP101 | `dst-indkp101` |
| `sync-konk3.ts` | KONK3 | `dst-konk3` |
| `sync-konk4.ts` | KONK4 | `dst-konk4` |
| `sync-laby01.ts` | LABY01 | `dst-laby01-b04/b07/b10/b11` |
| `sync-pris01.ts` | PRIS01 | `dst-pris01` |

**5 signal-generatorer (læser `DataPoint`, skriver `Signal`):**
`generate-signals.ts` (AUS08), `generate-konkurs-signals.ts` (KONK3),
`generate-forv1-signals.ts` (FORV1), `generate-bygv33-signals.ts` (BYGV33),
`generate-laby01-signals.ts` (LABY01-b11).

**7 debug-scripts:** `debug-ejdfoe1.ts`, `debug-ejen11.ts`, `debug-ejen77.ts`,
`debug-folk1am.ts`, `debug-housing.ts`, `debug-indkp.ts`, `debug-konk4.ts`.
Engangsværktøjer til at inspicere DST-metadata. De er døde og kan slettes.

**1 vedligeholdelsesscript:** `reclassify-areaCode.ts` (`reclassify-areas.ts`),
som efterklassificerer `areaType` på eksisterende rækker.

Alle sync-scripts går gennem `src/lib/dst.ts`, som er en tynd klient over
`https://api.statbank.dk/v1` med `getTableMetadata()` og `getTableData()`.
`DST_API_KEY` er valgfri.

**Det vigtigste ved denne mappe: kun 2 af de 11 sync-scripts findes også som
kørbar kode inde i applikationen.** `syncAus08` og `syncKonk3` er duplikeret ind
i `src/lib/pulse-pipeline.ts` så Vercel-cronen kan kalde dem. De ni øvrige
eksisterer kun som scripts og kan kun køres af GitHub Actions.

### 1.3 `vercel.json`

Hele filen:

```json
{
  "crons": [
    {
      "path": "/api/cron/pulse",
      "schedule": "0 6 * * *"
    }
  ]
}
```

Ét cron-job. `0 6 * * *` er 06:00 **UTC**. Vercel kører altid cron i UTC, så
det er 08:00 dansk sommertid og 07:00 dansk vintertid. Datakatalogets krav om
07:00 dansk tid året rundt kan ikke opfyldes med ét udtryk.

---

## 2. Hvor og hvordan beregnes signalerne på `/pulse`

### 2.1 Kæden

```
scripts/generate-*.ts  eller  src/lib/pulse-pipeline.ts
        ↓  kalder
src/lib/signals/*-detectors.ts     (ren beregning, ingen side-effekter)
        ↓  skriver
Signal-tabellen                    (delete-all + createMany i én transaktion)
        ↓  læses af
src/app/pulse/page.tsx:142-168     (sorterer og skærer til 6)
        ↓  render
src/components/pulse/SignalCard.tsx
```

Detektorerne ligger i `src/lib/signals/`:

| Fil | Datasæt | Signaler i basen nu |
|---|---|---|
| `detectors.ts` | AUS08 ledighed | 9 |
| `konkurs-detectors.ts` | KONK3 konkurser | 2 |
| `forv1-detectors.ts` | FORV1 forbrugertillid | 2 |
| `bygv33-detectors.ts` | BYGV33 boligbyggeri | 6 |
| `laby01-detectors.ts` | LABY01 befolkning | 5 |
| `types.ts` | fælles typer og hjælpere | - |

24 signaler i alt. Detektorerne er rene funktioner, hvilket er det rigtige valg
og gør dem lette at teste. Der findes ingen tests i repoet.

### 2.2 Udvælgelsen på forsiden

`src/app/pulse/page.tsx:142-168`:

```ts
prisma.signal.findMany({
  where: { source: { slug: { in: SIGNAL_SOURCE_SLUGS } } },
  include: { source: { select: { slug: true } } },
  orderBy: { magnitude: "desc" },
  take: 40,
}),

// ...

const severityRank: Record<string, number> = { important: 2, note: 1, info: 0 };
const hubSignals = rawSignals
  .sort(
    (a, b) =>
      (severityRank[b.severity] ?? 0) - (severityRank[a.severity] ?? 0) ||
      (b.magnitude ?? 0) - (a.magnitude ?? 0)
  )
  .slice(0, 6);
```

Ingen kvoter, ingen deduplikering, ingen z-score. Sortering på
(severity, magnitude), skær ved 6.

### 2.3 `magnitude` er ikke en sammenlignelig størrelse

Det er kernefejlen i den nuværende rangering, og den er værd at forstå før
Signaler skrives om. `magnitude` betyder noget forskelligt i hver detektor:

| Detektor | `magnitude` er | Eksempelværdi |
|---|---|---|
| `bygv33-detectors.ts:123` | antal boliger | 108 |
| `bygv33-detectors.ts:57` | procent | 30,55 |
| `bygv33-detectors.ts:207` | minus antal boliger | -1464 |
| `detectors.ts:169` | procentpoint | 0,4 |
| `forv1-detectors.ts:53` | konstanten 100 | 100 |
| `konkurs-detectors.ts:74` | `100 + Math.abs(change)` | 125 |
| `laby01-detectors.ts:49` | per 1.000 indbyggere | 40,7 |

`100 + Math.abs(change)` optræder fire steder (`detectors.ts:66`,
`konkurs-detectors.ts:74`, `forv1-detectors.ts:74`, `laby01-detectors.ts:173`).
Det er et hack til at tvinge hovedtallet øverst, fordi der ikke findes en
normaliseret skala.

Konsekvensen kan aflæses direkte i den nuværende rangliste. Signal nummer 17,
under "Ledigheden steg mest i Egedal (+0,2 pp)", er dette:

```
17. [dst-bygv33] sev=important mag=-1464 :: Laveste boligbyggeri på 5+ år i 1. kvartal 2026
```

Et femårs-lavpunkt på landsplan ligger sidst, fordi detektoren sætter
`magnitude: -latest.value` og listen sorteres faldende. Det er ikke en
prioritering, det er et fortegn.

Det er det bedste argument for datakatalogets `derived.zscore.<serie>`: den
gør `magnitude` til én enhed, sigma, for alle serier.

### 2.4 En latent fejl der ikke bider endnu

`take: 40` anvendes **før** severity-sorteringen. Med 24 signaler i basen
afkortes intet. Med de tolv nye serier fra datakataloget vil et
`important`-signal med lav `magnitude` kunne falde ud af de 40 og aldrig nå
frem til sorteringen. Det skal rettes samtidig med omskrivningen.

---

## 3. Hvor lang historik ligger der per datasæt

71.034 `DataPoint`-rækker fordelt på 15 befolkede kilder (plus `dst-aus09`,
som er tom, fordi DST afviser udtrækket med `EXTRACT-NOTALLOWED`).

| Kilde | Tabel | Periode | Længde | Rækker | Områder | 10 år? |
|---|---|---|---|---|---|---|
| `dst-forv1` | FORV1 | 1974M10 - 2026M07 | 51,8 år | 6.628 | 13 | ja |
| `dst-indkp101` | INDKP101 | 1987 - 2024 | 38 år | 4.180 | 110 | ja |
| `dst-pris01` | PRIS01 | 2000M12 - 2026M06 | 25,5 år | 602 | 2 | ja |
| `dst-ejdfoe1-huse` | EJDFOE1 | 2004 - 2025 | 22 år | 2.288 | 104 | ja |
| `dst-ejdfoe1-lejl` | EJDFOE1 | 2004 - 2025 | 22 år | 2.288 | 104 | ja |
| `dst-bygv33` | BYGV33 | 2006K1 - 2026K1 | 20,3 år | 9.396 | 116 | ja |
| `dst-aus08` | AUS08 | 2007M01 - 2026M05 | 19,4 år | 27.261 | 117 | ja |
| `dst-laby01-b04` | LABY01 | 2007 - 2025 | 19 år | 1.995 | 105 | ja |
| `dst-laby01-b07` | LABY01 | 2007 - 2025 | 19 år | 1.995 | 105 | ja |
| `dst-laby01-b10` | LABY01 | 2007 - 2025 | 19 år | 1.995 | 105 | ja |
| `dst-laby01-b11` | LABY01 | 2007 - 2025 | 19 år | 1.995 | 105 | ja |
| `dst-konk3` | KONK3 | 2009M01 - 2026M06 | 17,5 år | 210 | 1 | ja |
| `dst-konk4` | KONK4 | 2009M01 - 2025M12 | 17 år | 4.080 | 1 (20 brancher) | ja |
| `dst-deta211a` | DETA211A | 2015M01 - 2026M04 | 11,3 år | 136 | 1 | ja |
| `dst-folk1am` | FOLK1AM | 2021M10 - 2026M06 | **4,7 år** | 5.985 | 105 | **nej** |

**Konklusion:** historikken er ikke et problem. 14 af 15 datasæt opfylder
datakatalogets minimum på 10 år, og de fleste med god margin. Kun FOLK1AM skal
genindlæses længere tilbage, hvis befolkningstal skal have z-score.

**Men historikken er kun én vintage.** Alle 71.034 rækker repræsenterer "sådan
så tallet ud sidst vi kiggede". De 2.030 overskrevne AUS08-værdier er tabt.
Ved migration til `observations` kan `retrieved_at` sættes til `updatedAt`, men
revisionshistorikken kan ikke rekonstrueres. Fra migrationsdagen og frem er
den der.

---

## 4. Springet fra den nuværende datamodel til `series` og `observations`

### 4.1 Feltmapping

| Datakatalog | I dag | Vurdering |
|---|---|---|
| `series.id` | `DataSource.slug` | Direkte. `dst-aus08` → `dst.ledighed.*` |
| `series.source` | `DataSource.provider` | Direkte |
| `series.source_ref` | `DataSource.tableId` | Direkte, men hardkodet i scripts i dag |
| `series.unit` | `DataSource.unit` | Findes, men er `null` på alle 15 kilder |
| `series.frequency` | `DataSource.updateFrequency` | Direkte |
| `series.attribution` | `DataSource.license` | Kun "CC 4.0 BY", ingen fuld kildeangivelse |
| `series.expected_lag_days` | findes ikke | Ny |
| `series.revision_policy` | findes ikke | Ny |
| `series.layer` | findes ikke | Ny |
| `observations.period` | `DataPoint.periodDate` | Direkte, allerede første dag i perioden |
| `observations.value` | `DataPoint.value` | Direkte (`Float` → `numeric`) |
| `observations.retrieved_at` | findes ikke | Ny. Kan seedes fra `updatedAt` |
| `observations.is_current` | findes ikke | Ny. Alt eksisterende sættes `true` |
| `ingest_runs` | `FetchLog` | Næsten 1:1. Mangler `status`-feltet med `no_new_data` |

Feltmæssigt er springet lille. `FetchLog` er allerede `ingest_runs` under et
andet navn.

### 4.2 Det ene rigtige problem: `observations` har ingen områdedimension

Datakatalogets primærnøgle er `(series_id, period, retrieved_at)`. Der er ingen
plads til kommune, region eller landsdel.

De fire eksisterende dashboards er geografiske. Det er hele deres pointe:
Ledighed viser 98 kommuner på et kort, Kommuner er 98 profiler.

Konsekvensen i tal:

```
DataPoint rækker i alt: 71.034
Distinkte (sourceId, areaCode): 1.094
```

Plus KONK4's 20 brancher, som deler `areaCode = NULL` og derfor tælles som én:
**cirka 1.113 rækker i `series`** for at rumme det der i dag er 15 rækker i
`DataSource`.

1.113 serier er ikke i sig selv umuligt. Men hver eneste af dem skal så bære
`expected_lag_days`, `revision_policy`, `attribution` og `layer`, og
stale-alarmen i datakatalogets afsnit 4 skal overvåge 1.113 serier i stedet for
15. Det er ikke det datakataloget beskriver, når det taler om tolv serier.

### 4.3 Tre veje. Anbefaling

**A. Tilføj `area_code` til `observations`.** Primærnøglen bliver
`(series_id, area_code, period, retrieved_at)`. `series` forbliver 15 + 12 = 27
rækker. Alle fire dashboards migrerer uændret. Ulempen er at datakatalogets
skema afviges fra på dag ét, og at de tolv nye serier får en kolonne de aldrig
bruger.

**B. Én serie per (kilde, område).** Datakatalogets skema holdes rent.
1.113 serier. Stale-alarmen og `series.yaml` bliver uhåndterbare.

**C. Kør parallelt.** `DataSource`/`DataPoint` beholdes til de fire geografiske
dashboards. `series`/`observations` bygges kun til de tolv nye. To
datamodeller, to ingestion-lag, to sæt signal-logik.

**Anbefaling: A.** Den er den eneste der giver ét z-score-grundlag på tværs af
gammelt og nyt. Uden det kan Signaler ikke blive den rangliste byggebriefen
beder om i afsnit 4, fordi halvdelen af signalerne så ville komme fra en model
uden z-score. C ser billigst ud nu og er dyrest om tre måneder: den betyder to
stale-alarmer, to revisionslogikker og to steder at rette fejl.

Prisen ved A er én kolonne i et skema der endnu ikke er bygget. Det er en
billig afvigelse, og den bør skrives ind i datakataloget frem for at blive et
udokumenteret afvig.

### 4.4 Kan de eksisterende datasæt migreres ind

Ja, med A. Migrationen er mekanisk:

- `DataSource` → `series`, 15 rækker. `unit`, `expected_lag_days`,
  `revision_policy`, `layer` og `attribution` udfyldes i hånden, de findes ikke
  i basen i dag.
- `DataPoint` → `observations`, 71.034 rækker. `period` fra `periodDate`,
  `retrieved_at` fra `updatedAt`, `is_current = true`.
- `FetchLog` → `ingest_runs`, direkte.
- `dimensions`-JSON: KONK4's 20 brancher og FORV1's 13 spørgsmål skal blive til
  rigtige serier. Det er de to eneste steder hvor JSON-feltet bærer betydning
  der ikke kan udtrykkes af (serie, område, periode).

Det der **ikke** kan migreres er vintage. Alle 71.034 rækker lander som én
`retrieved_at`, og de 2.030 overskrevne AUS08-værdier kommer ikke igen.

---

## 5. Hvad udløser opdatering i dag, og hvad kræver daglig kørsel

### 5.1 Der er to mekanismer, og de dækker ikke det samme

**Mekanisme 1: Vercel-cron, dagligt 06:00 UTC.**
`vercel.json` → `src/app/api/cron/pulse/route.ts`. Den kalder `syncAus08` og
`syncKonk3` fra `src/lib/pulse-pipeline.ts`, regenererer signaler for de to
kilder hvis der var nye data, kalder `revalidatePath` og sender mail via Resend.

Ændringsdetektionen er ordentlig: den sammenligner DST's `lastUpdated` med
`DataSource.lastUpdatedAtSource` og afslutter tidligt de ~29 af 30 dage hvor
der ikke er nyt (`pulse-pipeline.ts:110-118`).

**Den dækker 2 af 15 datasæt.**

**Mekanisme 2: GitHub Actions, den 25. i måneden 06:00 UTC.**
`.github/workflows/sync-dst.yml`. 11 sync-steps plus 5 signal-generatorer,
alle med `continue-on-error: true`, og `timeout-minutes: 30` på jobbet.

### 5.2 Mekanisme 2 er brudt

```
completed  cancelled  Sync DST data  main  schedule  30150036588  30m19s  2026-07-25T07:50:38Z
completed  cancelled  Sync DST data  main  schedule  28158280489  30m19s  2026-06-25T08:47:42Z
completed  success    Sync DST data  main  schedule  26394344985   1m17s  2026-05-25T09:49:36Z
completed  success    Sync DST data  main  workflow_dispatch 25817914479 43s  2026-05-13T18:23:05Z
```

De sidste to planlagte kørsler er annulleret på 30-minutters-timeouten.
Steptiderne fra 25. juli:

```
success    AUS08 — Ledighed                    07:51:14 → 07:51:20     6s
success    FOLK1AM — Befolkning                07:51:20 → 08:00:51  9m31s
success    KONK3 — Konkurser                   08:00:51 → 08:01:13    22s
success    KONK4 — Konkurser (branche)         08:01:13 → 08:07:35  6m22s
success    FORV1 — Forbrugerforventninger      08:07:35 → 08:17:44 10m09s
success    DETA211A — Detailomsætning          08:17:44 → 08:18:01    17s
success    PRIS01 — Forbrugerprisindeks        08:18:01 → 08:19:02  1m01s
cancelled  BYGV33 — Nyopstartede boliger       08:19:02 → 08:20:55
skipped    INDKP101 — Disponibel indkomst
skipped    EJDFOE1 — Ejendomsværdier
skipped    LABY01 — Befolkningstilvækst
skipped    Generer signaler — ledighed
skipped    Generer signaler — konkurser
skipped    Generer signaler — forbrugertillid
skipped    Generer signaler — boligbyggeri
skipped    Generer signaler — befolkningstilvækst
```

**Alle fem signal-generatorer er skipped.** Det er derfor Signaler på `/pulse`
er frosset. Signalernes `createdAt` bekræfter det:

```
dst-aus08        n=9  senest genereret=2026-06-30T06:07:35.890Z   (Vercel-cron)
dst-konk3        n=2  senest genereret=2026-07-06T06:07:04.108Z   (Vercel-cron)
dst-bygv33       n=6  senest genereret=2026-05-13T18:42:39.030Z   (sidste manuelle kørsel)
dst-forv1        n=2  senest genereret=2026-05-13T18:42:35.289Z   (sidste manuelle kørsel)
dst-laby01-b11   n=5  senest genereret=2026-05-13T18:43:10.905Z   (sidste manuelle kørsel)
```

De tre datasæt der kun kan opdateres af GitHub Actions har ikke fået nye
signaler i 2,5 måneder. **Holbæk/Horsens-kortene er fra 13. maj.**

BYGV33 efterlod desuden en `FetchLog`-række der aldrig blev lukket:

```
2026-07-25T08:19:04.749Z dst-bygv33  success=false ins=0 upd=0 err=-
```

`success = false` uden fejlbesked, fordi `false` er default og processen blev
dræbt før catch-blokken kunne skrive. Ingen mail blev sendt. Med
`continue-on-error: true` og ingen alarm på workflow-niveau fejler den stille.
Det er præcis det datakatalogets afsnit 4 forbyder: "Ingen serie må fejle
stille."

### 5.3 Hvorfor det tager 30 minutter

Sync-scriptene skriver én række ad gangen:

```
scripts/sync-forv1.ts:75      const existing = await prisma.dataPoint.findFirst({
scripts/sync-forv1.ts:81            await prisma.dataPoint.update({
scripts/sync-forv1.ts:88          await prisma.dataPoint.create({
scripts/sync-folk1am.ts:149   const existing = await prisma.dataPoint.findFirst({
scripts/sync-konk4.ts:200     const existing = await prisma.dataPoint.findFirst({
```

FORV1 har 6.628 rækker. Ét `findFirst` per række over en pooled
Neon-forbindelse fra en GitHub-runner er cirka 90 ms. 6.628 × 90 ms ≈ 10
minutter, hvilket er nøjagtigt det steppet tog - **med nul indsatte og nul
opdaterede rækker.** Al tiden går med at spørge om noget der ikke har ændret
sig.

Til sammenligning bruger `pulse-pipeline.ts:257` `createMany` og læser alle
eksisterende rækker i ét kald op front. Det er derfor AUS08 tager 6 sekunder
for 27.261 rækker, mens FORV1 tager 10 minutter for 6.628.

### 5.4 Hvad daglig kørsel kræver

I prioriteret rækkefølge:

1. **Batch skrivningerne.** De ni scripts der bruger `findFirst`-per-række skal
   følge mønsteret fra `pulse-pipeline.ts`: læs eksisterende rækker i ét kald,
   sammenlign i hukommelsen, skriv med `createMany`. Alene det bringer kørslen
   fra 30+ minutter under 2. Uden dette punkt er intet af det følgende muligt.

2. **Ændringsdetektion i alle scripts.** `lastUpdatedAtSource`-sammenligningen
   findes kun i `syncAus08` og `syncKonk3`. De øvrige ni henter alt hver gang.
   Med den på plads er en daglig kørsel gratis de dage hvor DST ikke har
   publiceret, hvilket er datakatalogets forudsætning for at hente månedlige
   serier dagligt.

3. **Ét job per serie, ikke ét job for alt.** Datakatalogets afsnit 4 kræver
   det, og kørslen 25. juli viser hvorfor: BYGV33's timeout tog fire syncs og
   fem signal-generatorer med sig.

4. **Alarm når kørslen ikke gennemføres.** `continue-on-error: true` uden en
   opsamlende status betyder at en annulleret workflow er usynlig. Der er sendt
   nul mails om to måneders manglende opdateringer.

5. **Flyt scriptene ind i applikationen.** Ni af elleve sync-scripts kan i dag
   kun køres af GitHub Actions, fordi kun `syncAus08` og `syncKonk3` er
   duplikeret ind i `src/lib/pulse-pipeline.ts`. Duplikeringen er i sig selv et
   problem: to kopier af samme logik, der allerede er drevet fra hinanden.
   Datakatalogets adapter-per-kilde-interface løser det.

6. **UTC mod dansk tid.** `0 6 * * *` er 08:00 dansk sommertid. Krav om 07:00
   året rundt kræver to cron-udtryk, eller at man accepterer en times drift.

7. **Kadenceteksten.** `src/app/pulse/page.tsx:206` siger stadig "Opdaterer sig
   selv hver måned". Byggebriefen afsnit 2 vil have den rettet.

En sidebemærkning: throttlen i `src/app/api/cron/pulse/route.ts:27-42` er en
variabel i modul-scope. I serverless nulstilles den ved hver kold start og
deles ikke mellem instanser. Den beskytter mod hurtige gentagne kald til samme
varme instans, ikke mod samtidige kørsler.

---

## 6. Hvor mange cron-jobs tillader Vercel-planen

**Antallet er ikke begrænsningen. Intervallet er.**

Fra Vercels dokumentation (`/docs/cron-jobs/usage-and-pricing`, opdateret
16. juni 2026):

| Plan | Cron-jobs per projekt | Minimumsinterval | Præcision |
|---|---|---|---|
| Hobby | 100 | Én gang i døgnet | Per time (±59 min) |
| Pro | 100 | Én gang i minuttet | Per minut |
| Enterprise | 100 | Én gang i minuttet | Per minut |

Projektet er `alius-site-hlg9` under teamet "Ali's projects"
(`team_iEJbJMZ3tlQ7otOeoygaYl3D`), med `alius.dk` som produktionsdomæne.
**Jeg kunne ikke læse plantypen ud af Vercels API** - `get_project` returnerer
ikke feltet. Den skal bekræftes i dashboardet.

Det nuværende udtryk `0 6 * * *` er dagligt og virker derfor på begge planer.
Det siger intet om hvilken plan der er tale om.

**Hvad det betyder for fase 1:**

- **100 jobs er rigeligt** til datakatalogets tolv serier plus stale-detektion,
  uanset plan. Ét job per serie er ikke et problem.
- **På Hobby kan kravene i datakatalogets afsnit 4 ikke opfyldes.**
  Elpriserne er timebaserede, og en Hobby-cron kan kun køre én gang i døgnet
  med op til 59 minutters slør. Stale-alarmen kl. 09:00 og ingestion kl. 07:00
  ville blive to jobs á én daglig kørsel med usikkert tidspunkt. Et
  cron-udtryk der ville køre oftere end dagligt **fejler ved deployment**, ikke
  ved kørsel.
- **På Pro er der ingen praktisk begrænsning.**

Det skal afklares før arbejdet begynder, fordi svaret afgør om ingestion kan
ligge på Vercel eller skal blive i GitHub Actions. GitHub Actions har ingen
tilsvarende begrænsning på frekvens og kører allerede alle elleve syncs, så det
er et reelt alternativ hvis planen er Hobby. Men så skal punkt 5.4.1 til 5.4.4
løses der.

---

## 7. Undersøgelse: minus 108 for Holbæk og Horsens

### 7.1 Konklusion

**Tallene er ægte. Sammenfaldet er tilfældigt. Kortene er alligevel forkerte,
men af en anden grund end den formodede.**

### 7.2 De tal konklusionen bygger på

Rådata fra `DataPoint` for `dst-bygv33`, otte seneste kvartaler:

```
--- 316 Holbæk ---            --- 615 Horsens ---
  2024K2: 158                   2024K2:  93
  2024K3: 172                   2024K3:  54
  2024K4:   9                   2024K4: 104
  2025K1:  35                   2025K1:  32
  2025K2:  87                   2025K2:  52
  2025K3:  30                   2025K3:  34
  2025K4: 116                   2025K4: 129
  2026K1:   8                   2026K1:  21
```

Holbæk: 116 − 8 = **−108**. Horsens: 129 − 21 = **−108**.

Forskellige niveauer, forskellige udgangspunkter, samme differens. Havde det
været en beregningsfejl der kopierede en værdi fra én kommune til en anden,
ville `latestValue` også være ens. Den er den ikke, hvilket kan ses i de gemte
`evidence`-felter:

```
[TOP_MOVER] 316/Holbæk  mag=108 sev=important
   E: {"change":-108,"toPeriod":"2026K1","fromPeriod":"2025K4","latestValue":8}
[TOP_MOVER] 615/Horsens mag=108 sev=important
   E: {"change":-108,"toPeriod":"2026K1","fromPeriod":"2025K4","latestValue":21}
```

Hele rangeringen af fald fra 2025K4 til 2026K1, alle 75 kommuner med aktivitet
over bagatelgrænsen:

```
 1. Holbæk (316):    116 →  8 = -108
 2. Horsens (615):   129 → 21 = -108
 3. Roskilde (265):  116 → 10 = -106
 4. Hvidovre (167):  104 →  2 = -102
 5. Silkeborg (740): 119 → 44 =  -75
 6. Viborg (791):     94 → 22 =  -72
 7. København (101): 178 →111 =  -67
 8. Odsherred (306):  79 → 16 =  -63
 9. Tønder (550):     61 →  7 =  -54
10. Aarhus (751):     66 → 16 =  -50
```

Feltet er tæt i toppen: −108, −108, −106, −102. Med fire kommuner inden for
seks boliger af hinanden er et sammenfald ikke overraskende.

Det bekræftes af hvor almindeligt fænomenet er i samme kvartal:

```
=== Delta-værdier delt af flere kommuner, 2025K4 → 2026K1 (75 kommuner) ===
  -6: 4 kommuner (Ballerup, Gribskov, Aabenraa, Vesthimmerlands)
  -3: 4 kommuner (Billund, Kolding, Herning, Brønderslev)
  -2: 4 kommuner (Lyngby-Taarbæk, Allerød, Egedal, Aalborg)
   1: 4 kommuner (Herlev, Lejre, Guldborgsund, Odense)
 -16: 3 kommuner (Faxe, Bornholm, Ringkøbing-Skjern)
  -5: 3 kommuner (Gentofte, Helsingør, Jammerbugt)
-108: 2 kommuner (Holbæk, Horsens)
```

75 kommuner fordelt over et interval på cirka 200 heltal giver kollisioner.
Det er duehulsprincippet, ikke en fejl.

Værdierne er desuden aggregerede: `scripts/sync-bygv33.ts:73-81` summerer over
fem ANVEND-kategorier og fem BYGHERRE-typer per kommune og kvartal, så tallene
er ikke enkeltobservationer fra DST der kunne være dubletter.

### 7.3 Kortene er alligevel forkerte

Det er den fejl der faktisk skal rettes.
`src/lib/signals/bygv33-detectors.ts:114-133`:

```ts
for (const c of decreases.slice(0, Math.ceil(maxSignals / 2))) {
  if (Math.abs(c.change) < 10) break;
  signals.push({
    type: "top_mover",
    direction: "down",
    severity: Math.abs(c.change) >= 50 ? "important" : "note",
    headline: `Boligbyggeriet faldt mest i ${c.areaName} (${formatCount(c.change)} boliger)`,
    ...
```

`maxSignals` er 4, så `Math.ceil(4 / 2)` er 2. Løkken udsender de to største
fald, og **begge får ordet "mest" i overskriften.** Superlativet er hardkodet
i en løkke der per definition kører flere gange.

Det er ikke betinget af sammenfaldet. Havde Horsens været −106 i stedet for
−108, ville de to kort stadig lyde:

> Boligbyggeriet faldt mest i Holbæk (-108 boliger)
> Boligbyggeriet faldt mest i Horsens (-106 boliger)

Samme fejl findes i stigningsløkken på linje 135-154, og den er aktiv lige nu:

```
[TOP_MOVER] 766/Hedensted mag=89 :: Boligbyggeriet steg mest i Hedensted (+89 boliger)
[TOP_MOVER] 630/Vejle     mag=70 :: Boligbyggeriet steg mest i Vejle (+70 boliger)
```

To kommuner steg "mest". Det er fire kort på `/pulse` med et forkert
superlativ.

### 7.4 Hvorfor begge når frem til forsiden

Byggebriefens afsnit 4 bemærker at boligbyggeri optager tre af seks pladser.
Det er korrekt. De seks kort er:

```
1. [dst-konk3]   sev=important mag=125   :: Antallet af konkurser steg til 153
2. [dst-bygv33]  sev=important mag=108   :: Boligbyggeriet faldt mest i Holbæk (-108 boliger)
3. [dst-bygv33]  sev=important mag=108   :: Boligbyggeriet faldt mest i Horsens (-108 boliger)
4. [dst-forv1]   sev=important mag=104.8 :: Forbrugertilliden faldt til −18,6 i april 2026
5. [dst-aus08]   sev=important mag=100   :: Ledigheden er stabil på 3,1% på landsplan
6. [dst-bygv33]  sev=important mag=89    :: Boligbyggeriet steg mest i Hedensted (+89 boliger)
```

Alle seks har `severity: "important"`, så severity adskiller ingenting.
Rangeringen falder tilbage på `magnitude`, og BYGV33's kommunetal er absolutte
boligantal (108, 89, 70), mens de øvrige er procentpoint, indeksværdier eller
konstanten 100. Boligbyggeri vinder fordi det tælles i større tal, ikke fordi
det er vigtigere.

Bemærk også kort nummer 5: "Ledigheden er stabil på 3,1%" med `magnitude: 100`
og `severity: "important"`. Et signal om at intet har ændret sig optager en
plads foran femårs-lavpunktet i boligbyggeriet.

### 7.5 Hvad der skal gøres

1. **Ret superlativet.** Kun det første kort i hver retning kan hedde "mest".
   Resten skal formuleres neutralt. Det er en tekstændring i fire linjer i
   `bygv33-detectors.ts` og gælder uanset hvad der ellers besluttes.
2. **Ingen dedupliceringsregel er nødvendig.** Byggebriefen åbner for at der
   skal dedupliceres når to kommuner leverer identisk delta. Det ville skjule
   et korrekt tal. Holbæk og Horsens faldt begge 108 boliger, og begge fald er
   virkelige.
3. **Kvoten er den rigtige løsning.** Byggebriefens "maks ét kommunesignal ad
   gangen" fjerner problemet ved roden. Med den regel havde kun Holbæk stået
   på forsiden, og spørgsmålet var aldrig opstået.
4. **Z-score gør rangeringen meningsfuld.** −108 boliger i Holbæk er et fald
   fra 116 til 8, altså 93 procent. −108 i Horsens er 129 til 21, altså 84
   procent. Målt i sigma mod egen historik er de to ikke lige usædvanlige, selv
   om deltaet er identisk. Det er argumentet for datakatalogets
   `derived.zscore.<serie>`.

---

## 8. Hvad jeg vil foreslå bliver gjort først

Byggebriefens afsnit 8 lægger op til at migrere de fire datasæt først. Jeg vil
foreslå to ting før det, fordi de blokerer for alt andet:

**0a. Reparér GitHub Actions-kørslen.** Batch skrivningerne i de ni langsomme
scripts. Uden det er der ingen opdatering af 13 af 15 datasæt, og enhver
kalibrering af z-scores sker på data der er to måneder gamle. Det er nogle
timers arbejde og giver umiddelbar effekt.

**0b. Afklar Vercel-planen.** Den afgør om ingestion kan ligge på Vercel eller
skal blive i GitHub Actions, og det er en arkitekturbeslutning der ikke bør
træffes efter adapterne er skrevet.

**0c. Beslut spørgsmålet om områdedimensionen** (afsnit 4.3). Det er den eneste
beslutning i denne rapport der ikke kan omgøres billigt bagefter.

Derefter giver byggebriefens rækkefølge mening.

Superlativfejlen i afsnit 7.3 er uafhængig af alt det ovenstående og kan rettes
når som helst.

---

## 9. Efterskrift: DST's omlægning fra DB07 til DB25

Tilføjet 27. juli 2026, efter at stale-alarmen fandt to kilder.

Begge fund viste sig at have samme rod: **Danmarks Statistik er gået fra
brancheklassifikationen DB07 til DB25.** Det er ikke en omdøbning, og det er
ikke noget der kan kodes udenom. Her er hvad der konkret er sket.

### 9.1 KONK4 er lukket

KONK4 står i DST's tabelregister med `active: false`:

```json
{
  "id": "KONK4",
  "text": "Erklærede konkurser",
  "updated": "2026-01-07T08:00:00",
  "firstPeriod": "2009M01",
  "latestPeriod": "2025M12",
  "active": false,
  "variables": ["branche", "virksomhedstype", "tid"]
}
```

Vores data stod på 2025M12, fordi DST's data står på 2025M12. Pipelinen
fejlede ikke. Tabellen holdt op med at eksistere som levende serie den
7. januar 2026.

Afløseren er **KONK25**, med samme dimensioner, samme historik tilbage til
2009M01, og data til 2026M06. Forskellen er `BRANCHE25` i stedet for
`BRANCHE`, altså DB25 i stedet for DB07.

### 9.2 Brancheomlægningen er ikke 1:1

17 af KONK4's 20 grupper har en entydig efterfølger. Tre har ikke:

| KONK4 (DB07) | KONK25 (DB25) | Bemærkning |
|---|---|---|
| `000` Konkurser i alt | **findes ikke** | KONK25 har ingen totalkode. Totalen tages fra KONK3, som allerede leverer hovedtallet |
| `1` Landbrug, skovbrug og fiskeri | `A` | |
| `2` Industri, råstofindvinding og forsyning | `BCDE` | |
| `3` Bygge og anlæg | `F` Byggeri og anlæg | |
| `4` Handel og transport mv. | `GHI` | |
| `G` Handel | `G` Engroshandel og detailhandel | Indhold ændret, se nedenfor |
| `G01` Handel med biler og motorcykler | **findes ikke** | Ingen G45 i DB25 |
| `G02` Engroshandel | `G46` | |
| `G03` Detailhandel | `G47` | |
| `H` Transport | `H` | |
| `I` Hoteller og restauranter | `I` Overnatning og restauranter | |
| `101` Hoteller mv. | `I55` Overnatningsfaciliteter | |
| `102` Restauranter | `I56` Servering | |
| `5` Information og kommunikation | `JK` IT og medier | |
| `6` Finansiering og forsikring | `L` | |
| `7` Ejendomshandel og udlejning | `M` | |
| `8` Erhvervsservice | `NO` Rådgivning og forretningsservice | |
| `9` Offentlig adm., undervisning, sundhed | `PQR` | |
| `10` Kultur, fritid og anden service | `STUV` Kultur, fritid, autoreparation og anden service | Indhold ændret, se nedenfor |
| `11` Uoplyst aktivitet | **findes ikke** | Ingen restkategori i DB25 |

**Indholdet flytter sig.** Sammenligning for december 2025, hvor begge
tabeller har tal:

| Gruppe | KONK4 (DB07) | KONK25 (DB25) | Forskel |
|---|---|---|---|
| Handel og transport mv. / `GHI` | 64 | 60 | −4 |
| Handel / `G` | 28 | 24 | −4 |
| Kultur, fritid mv. / `STUV` | 8 | 12 | **+4** |
| Detailhandel / `G47` | 16 | 18 | +2 |
| Ejendomme / `M` | 3 | 5 | +2 |
| Bygge og anlæg / `F` | 29 | 27 | −2 |
| Erhvervsservice / `NO` | 30 | 30 | 0 |
| Transport / `H` | 14 | 14 | 0 |
| Industri / `BCDE` | 14 | 14 | 0 |

De fire konkurser der forsvinder fra `G` dukker op i `STUV`. Det er
bilhandelen: DB25's `STUV` hedder "Kultur, fritid, **autoreparation** og anden
service". Motorkøretøjer er flyttet fra handel til service. Det er også
forklaringen på at `G01` ikke har nogen efterfølger.

**Konsekvens for Pulse:** brancherækkerne på `/pulse/konkurser` er ikke
sammenlignelige hen over årsskiftet 2025/2026 for `G`, `STUV` og de grupper
der indeholder dem. Det er ikke en fejl der kan rettes, det er en
klassifikationsændring. Den er noteret i kildelinjen på siden.

### 9.3 DETA211A var en falsk alarm

DETA211A er aktiv og opdateret 24. juni 2026. Dens nyeste periode hos DST er
2026M04, altså præcis det vi har. Der manglede ingenting.

Alarmen kom fra en for stram konstant i `pulse-stale.ts`: jeg havde sat
forventet lag til 35 dage. Det faktiske lag er 55 dage, for 2026M04 blev
publiceret 24. juni. Rettet til 62.

Det er et argument for at kalibrere `EXPECTED_LAG_DAYS` mod målt
publiceringshistorik frem for skøn, når stale-alarmen har kørt et par måneder.

### 9.4 DETA211A's underbrancher havde aldrig virket

Ved siden af den falske alarm lå en ægte fejl. `SYNC_BRANCHES` indeholdt syv
koder:

```ts
const SYNC_BRANCHES = ["G47", "471", "472", "474", "475", "477", "479"];
```

Kun `G47` findes. Dimensionen hedder `BRANCHEDB25UDVALG` og bruger
DB25-koder på seks cifre: `471110`, `471120`, `472100_472700`. De seks
DB07-koder blev filtreret bort af `availableCodes.has(b)` uden en linje i
loggen.

Det havde ingen synlig effekt, fordi `/pulse/forbrug` kun læser `G47`. Config
er reduceret til `G47`, og de seks er dokumenteret som fjernet.

Skal underbrancher tilbage, er **DETA212A** den rigtige tabel: ni rene
aggregater `G47001` til `G47009`, sæsonkorrigering via `INDEKSTYPE`, og den
publicerer en måned foran DETA211A (2026M05 mod 2026M04).

### 9.5 Hvad det betyder for datakataloget

Datakatalogets afsnit 1 siger: "Tabel-ID'er må ikke hardcodes. Danmarks
Statistik lukker tabeller med status afsluttet og opretter afløsere med nyt
ID." KONK4 er det første konkrete tilfælde, og det ramte en side der er live.

To ting bør følge med i fase 1:

1. **Verifikationsscriptet fra datakatalogets afsnit 8, punkt 3, skal tjekke
   `active`-flaget**, ikke kun at tabellen svarer. KONK4 svarede fint på API'et
   hele tiden. Den var bare frosset.
2. **`series.active` skal kunne sættes fra kilden.** Den nye model har feltet.
   Indtil migrationen er kørt, bæres det i `DataSource.meta` som
   `{ "retired": true, "successor": "..." }`, og stale-alarmen springer dem over.

---

## 10. Hvorfor DATABASE_URL ikke må ligge i .env

Tilføjet 27. juli 2026.

### 10.1 Anledningen og problemet var ikke det samme

`prisma migrate dev` ville have nulstillet produktionsdatabasen med 74.604
observationer i. Den blev stoppet af en advarsel, ikke af en spærring.

**Anledningen** var skemadrift. Migrationshistorikken i repoet beskrev en
`Signal`-tabel med `label`, `description`, `value`, `reference`, `delta`,
`validFrom` og `validUntil`. Produktion har `headline`, `body`, `direction`,
`magnitude`, `evidence` og `areaName`. Nogen havde ændret tabellen i hånden
uden migration. Prisma så et skema den ikke kunne forklare ud fra historikken,
og dens svar på det er at tilbyde en nulstilling.

**Problemet** var noget andet: at kommandoen overhovedet kunne nå produktion.

Det er den skelnen der er svær at genskabe bagefter, og den er vigtigere end
selve driften. Driften var et engangstilfælde. Rækkevidden var en permanent
tilstand.

### 10.2 Mekanismen

Prisma CLI indlæser `.env` automatisk. `DATABASE_URL` lå i `.env` og pegede på
produktion. Enhver Prisma-kommando kørt i denne mappe ramte derfor produktion,
uden flag, uden bekræftelse, uden at nogen havde valgt det.

Det gælder ikke kun `migrate dev`. Det gælder `migrate reset`, `db push` og
enhver anden destruktiv kommando. Og det gælder uanset hvem der skriver dem:
en udvikler der følger Prisma-dokumentationen, et npm-script, eller en agent
der har læst at `prisma migrate dev` er den normale måde at lave en migration.

Kommandoen er standard. Det er hele pointen. En farlig kommando man skal huske
at undgå, er en fælde der venter på en distraheret dag.

### 10.3 Hvorfor rettelsen af driften ikke var nok

Efter baselining vil `migrate dev` ikke længere *ville* nulstille, fordi
historikken nu forklarer produktion. Det fjerner anledningen.

Men næste gang nogen ændrer et skema i hånden, eller en migration bliver
redigeret efter at være kørt, opstår driften igen. Og så står vi samme sted,
bortset fra at ingen husker hvorfor det gik galt sidst.

Derfor er rækkevidden fjernet uafhængigt af driften:

- `DATABASE_URL` er flyttet til `.env.local`, som Next.js indlæser og Prisma
  CLI ikke. En bar Prisma-kommando har nu intet mål og fejler med
  `Environment variable not found` i stedet for at ramme produktion.
- `scripts/db-guard.ts` nægter destruktive npm-scripts mod produktionsværten.
- `.env.example` og afsnittet i `CLAUDE.md` er committet, så konventionen
  overlever en frisk klon. `.env`-filerne selv er gitignorerede og følger
  ikke med.

### 10.4 Den generelle form

Det er tredje gang samme mønster optræder i dette projekt:

| Hvad | Hvordan det fejlede |
|---|---|
| `continue-on-error: true` | Fejlende sync-steps blev slugt. To måneders manglende opdateringer, nul mails |
| DETA211A's seks DB07-koder | Ikke-eksisterende koder filtreret bort af `availableCodes.has()` uden en linje i loggen |
| `DATABASE_URL` i `.env` | Produktion valgt som standardmål uden at nogen traf valget |

Fællestrækket er ikke fejl. Det er **stiltiende standardvalg**: systemet
traf en beslutning på vores vegne og sagde ikke noget. De to første kastede
data væk. Den tredje kunne have kastet databasen væk.

Reglen der følger: når noget bliver valgt fra, droppet eller antaget, skal
det stå i loggen eller stoppe kørslen. Et lydløst standardvalg er en fejl der
venter på at blive stor nok til at blive opdaget.

---

## Datagrundlag

Alle tal er trukket 27. juli 2026 mod produktionsdatabasen på Neon
(`ep-rough-forest-alz77jsq-pooler.c-3.eu-central-1.aws.neon.tech/neondb`) og
mod GitHub Actions-kørselshistorikken for `sync-dst.yml`. Vercels
plangrænser er hentet fra `vercel.com/docs/cron-jobs/usage-and-pricing`,
opdateret 16. juni 2026.

Der er ikke ændret data, kørt migrationer eller skrevet kode som led i denne
kortlægning.
