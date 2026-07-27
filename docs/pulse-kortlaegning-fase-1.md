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

## Datagrundlag

Alle tal er trukket 27. juli 2026 mod produktionsdatabasen på Neon
(`ep-rough-forest-alz77jsq-pooler.c-3.eu-central-1.aws.neon.tech/neondb`) og
mod GitHub Actions-kørselshistorikken for `sync-dst.yml`. Vercels
plangrænser er hentet fra `vercel.com/docs/cron-jobs/usage-and-pricing`,
opdateret 16. juni 2026.

Der er ikke ændret data, kørt migrationer eller skrevet kode som led i denne
kortlægning.
