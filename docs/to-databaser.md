# To databaser

Fra 9. oktober 2026 ligger forretningens data og Pulses data i hver sin
Neon-database.

## Hvorfor

De lå sammen indtil da. Pulse brændte den fælles månedskvote på 5 GB
netværkstrafik op to gange på to uger.

Det afgørende er ikke kvoten. Det er hvad der sker når den er opbrugt:
**basen holder op med at svare for alt der rører den.** Ikke kun for
Pulse. Også for et menneske der er midt i sin tankeprofil, for en
holdsession der skal oprettes, og for enhver anden side der spørger.

Fordelingen gjorde det urimeligt:

```
Hele databasen        98 MB
  Pulse            90,2 MB
  forretningen      0,5 MB
```

Forretningen fyldte en halv procent og bar hele værdien. Den kunne
væltes af en nabo der fylder hundrede og firs gange mere, og som ikke
tjener noget ind.

Ingen relation krydsede grænsen mellem de to modeller, så adskillelsen
kostede ingen datamodel.

## Hvad ligger hvor

| Database | Variabel | Skema | Indhold |
|---|---|---|---|
| Forretning | `FORRETNING_DATABASE_URL` | `prisma/forretning.prisma` | Profile, TeamSession, TeamMember, TeamRequest |
| Pulse | `DATABASE_URL` | `prisma/schema.prisma` | Series, Observation, IngestRun, DataSource, DataPoint, Signal, FetchLog |

To skemaer betyder to genererede klienter:

| Klient | Importeres fra | Peger på |
|---|---|---|
| `forretningPrisma` | `@/lib/forretning-db` | forretningen |
| `prisma` | `@/lib/db` | Pulse |

`npm run generate` laver dem begge. Det kaldes af både `postinstall` og
`build`, så en frisk installation og et deploy får begge klienter uden
at nogen skal huske det.

## Vælger man forkert klient

Så fejler det med det samme og højlydt: tabellen findes ikke i den anden
base. Det er med vilje bedre end en tom liste, som ville se ud som om
der ikke var nogen profiler.

I forretningsfilerne står importen med alias:

```ts
import { forretningPrisma as prisma } from "@/lib/forretning-db";
```

Aliaset holder resten af filen uændret. Importlinjen siger hvilken base
man er på, og den står øverst i filen.

## Hvor tingene skrives

Uændret fra før, se CLAUDE.md.

- **Forretningen** skrives af Vercel-funktioner når nogen udfylder en
  profil eller opretter et hold. Det er almindelig drift.
- **Pulse** skrives kun fra GitHub Actions. `scripts/write-guard.ts`
  håndhæver det.

Begge produktionsværter står i `PRODUKTIONSVAERTER` i write-guard, så
intet script kan skrive i nogen af dem fra en udviklermaskine. Det
gælder også `prisma db seed`, som ellers ville kunne lægge opdigtede
profiler i produktion.

## Sådan blev flytningen gjort

1. Nyt Neon-projekt, samme region (`eu-central-1`)
2. Skemaet lagt op i den tomme base:
   `npx prisma db push --schema prisma/forretning.prisma`
3. `npx tsx scripts/flyt-forretning.ts --toerloeb` viste tallene
4. `npx tsx scripts/flyt-forretning.ts` kopierede: 27 profiler,
   7 holdsessioner, 18 medlemmer, 3 henvendelser
5. Indholdet sammenlignet, ikke kun antallet: md5 over `to_jsonb` af
   hver række, per tabel, i begge baser. Ens i alle fire. Gentaget
   lige før deploy, så intet skrevet i mellemtiden blev efterladt
6. `FORRETNING_DATABASE_URL` sat på Vercel, deploy
7. Efterprøvet at tankeprofilen svarer fra den nye base

`db push` er kun rigtigt mod en **tom** base. Mod en base med data kan
den droppe kolonner. Skemaændringer bagefter går gennem samme procedure
som Pulses, se CLAUDE.md.

Bemærk navnet: Neon-projektet hedder **ALIUS PULSE**, men rummer
forretningen, ikke Pulse. Værten er `ep-fragrant-haze-b2c8m125`. Pulse
blev i den gamle base, `ep-rough-forest-alz77jsq`, fordi det er den der
fylder 90 MB og har migrationshistorikken. Begge værter står i
`PRODUKTIONSVAERTER` i write-guard og i db-guard.

Flytningen rørte aldrig kilden. Den gamle base står med sin kopi af
forretningsdataene, indtil nogen bevidst rydder dem.
