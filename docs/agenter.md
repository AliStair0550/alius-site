# Alius Agenter

Agenter der læser åbne kilder hver morgen og skriver det vigtigste kort.
Den første er **Finn Finans**, som skriver en brief om dansk økonomi
kl. 06 dansk tid på [alius.dk/agenter/finn](https://alius.dk/agenter/finn).

## Før du gør noget andet: spend limit i Console

Sæt et **spend limit i Anthropic Console** for den organisation API-nøglen
tilhører. Det er andet lag under budgetloftet i koden, og det kan ikke
sættes fra koden.

API-nøglen skal komme fra den Console-organisation der er knyttet til
Claude Max-abonnementet. Ellers trækker forbruget ikke på den månedlige
kredit på $100. Kreditten fornyes på abonnementets faktureringsdato,
overføres ikke, og deles af alle nøgler i organisationen. Når den er
brugt, stopper API'et; abonnementet bliver ikke trukket.

## Sådan hænger det sammen

```
Vercel cron 04 og 05 UTC ──> /api/cron/agenter
                                │  kun kaldet der rammer 06 i København
                                ▼
GitHub Actions: agent-finn.yml ──> scripts/agent-finn.ts
                                │  skriveværn, UTC, budgetloft
                                ▼
            src/lib/agenter/finn/pipeline.ts
   hent ─ dedupliker ─ 48 timer ─ relevans ─ rangering ─ skriv ─ selvtjek
                                │
                                ▼
         Pulse-basen: briefs, traces, api_ledger, source_cache
                                │
                                ▼
       /agenter, /agenter/finn, /agenter/finn/[dato], replay
```

- **Al skrivning sker i GitHub Actions**, som resten af Pulse. Vercel
  udløser kun. Se CLAUDE.md, "Hvor skrivning sker".
- **Pulse kører kl. 02 UTC**, så tallene er friske, når Finn skriver.
- **GitHubs scheduler (05:15 UTC) er reserve.** Scriptet springer over,
  hvis dagens brief allerede er færdig.
- **Siderne kalder aldrig Anthropic.** Replay afspiller den gemte trace.

## Budgetloftet

Ufravigeligt og i koden, før hvert eneste kald.

1. Hvert kald går gennem `kaldMedLoft` i `src/lib/agenter/claude.ts`.
   Intet andet sted opretter en Anthropic-klient.
2. Før kaldet: forbruget for døgnet (UTC) og budgetmåneden læses fra
   `api_ledger`, og det værst tænkelige kald regnes ud: alt input som
   cache-skrivning, alle `max_tokens` som output, to tegn per token.
   Ville det sprænge et loft, sendes kaldet ikke.
3. Efter kaldet: den faktiske pris skrives i `api_ledger` **før** svaret
   vurderes. Et svar der ikke kan bruges, er betalt alligevel.
4. Prisen regnes ud fra den model der faktisk svarede. En ukendt model
   skrives til loftet og stopper kørslen.
5. Stoppes kørslen af loftet, gemmes briefen som `BUDGET_STOPPED` med
   grunden, og siden viser seneste færdige brief med en linje om det.

| Variabel | Standard | Hvor |
|---|---|---|
| `AGENTS_BUDGET_DAILY_USD` | 4 | repository-variabel i GitHub |
| `AGENTS_BUDGET_MONTHLY_USD` | 80 (højst 100) | repository-variabel i GitHub |
| `AGENTS_BUDGET_RESET_DAY` | 1 (1-28) | repository-variabel i GitHub |

En værdi der er sat, men ikke kan læses, stopper kørslen i stedet for at
falde tilbage til standarden. Sæt `AGENTS_BUDGET_RESET_DAY` til datoen
abonnementet fornyes, så budgetmåneden følger kreditten.

Priserne står ét sted: `src/lib/agenter/priser.ts`.

**Målt pris 21. oktober 2026:** cirka $0,04 til $0,07 per brief, altså
$1 til $2 om måneden.

## Hemmeligheder

| Hemmelighed | Hvor | Til hvad |
|---|---|---|
| `ANTHROPIC_API_KEY` | GitHub (og Vercel, ubrugt indtil fase 2) | kørslen |
| `DATABASE_URL` | GitHub | briefs, traces og ledger i Pulse-basen |
| `ADMIN_SECRET` | GitHub og Vercel | genskabelse af siderne, statusside |
| `GITHUB_DISPATCH_TOKEN` | Vercel | Vercel beder Actions om at køre |

## Kør manuelt

```
gh workflow run agent-finn.yml                 # kun hvis dagens brief mangler
gh workflow run agent-finn.yml -f tving=true   # også selvom den findes
```

Lokalt nægter skriveværnet at køre mod produktion. Det er med vilje.

## Status og forbrug

```
https://alius.dk/api/admin/agenter?key=<ADMIN_SECRET>
```

Viser forbrug i dag og i budgetmåneden, hvad der er tilbage, og de 15
seneste kørsler med status og pris. Lofterne der vises, er dem Vercel
kender; kørslen i Actions læser repository-variablerne.

## Kilderne

Hver kilde er et modul i `src/lib/agenter/kilder/` og svarer altid med en
status: `ok`, `tom`, `fejl` eller `blokeret`. Et vellykket svar caches
per kilde per dag i `source_cache`; fejl caches ikke.

| Kilde | Modul | Hvad |
|---|---|---|
| Pulse | `pulse.ts` + `finn/serier.ts` | 20 serier fra basen |
| DST EJ56 | `dst-boligpriser.ts` | boligpriser kvartalsvis |
| RSS | `rss.ts` | Berlingske, Ritzau Via, Nationalbanken (2 feeds) |

**Tilføj en Pulse-serie:** læg den i `FINN_SERIER` i `finn/serier.ts` med
områdekode og **efterprøvet** sæsonkorrektion. Slå tabellen op i DST's
API og se efter en sæsondimension; står det ikke der, er den `ukendt`.

**Tilføj et feed:** læg det i `FEEDS` i `rss.ts`. robots.txt tjekkes ved
hver hentning, og agenten behandles som den Claude-agent den er:
udelukker et medie Anthropics agenter, gælder det også os. DR, Børsen,
Politiken, Information og Altinget er fravalgt af den grund.

**Finans Danmark** er ikke med. Deres statistikbank
(`rkr.statistikbank.dk`, boligmarkedsstatistik) kører på den gamle
ASP-baserede statbank5a uden REST-API (tjekket 21. oktober 2026:
`/api/v1/tables` svarer 404), og vi fandt ingen anden åben datakilde for
boliglånsrenter. Realkreditrenterne kommer i stedet fra Nationalbankens
tal via DST (DNRUURI), som Pulse allerede henter.

## Finns regler og selvtjek

Reglerne står i `src/lib/agenter/finn/prompt.ts`. To håndhæves bagefter:

- **I kode** (`finn/selvtjek.ts`), sidste ord: hvert tal i et punkt skal
  findes i de poster punktet selv henviser til. Afrunding er tilladt, et
  opdigtet tal er ikke. Tankestreger og udråbstegn renses.
- **Af Sonnet**: investeringsråd og produkter, råd til læseren, gengivet
  artikeltekst. Kun tydelige brud.

Et punkt der fejler, fjernes og nævnes under "Det tog jeg forbehold for".
Holder færre end fem, skrives briefen om én gang med grundene.

Sammenligninger vælges i kode ud fra sæsonkorrektionen: korrigerede
serier og satser mod forrige periode, rå og ukendte mod samme periode
året før. "I træk" tælles i kode (`tendens`), aldrig af modellen.

## Næste faser

Datamodellen er bygget til dem: `agents.status`, briefpunkter som JSON
med kilder, og alle kald gennem samme loft.

1. Følg: mail hver morgen eller mandag, opt-in med bekræftelse.
2. Min situation: chips for branche, region, ansatte, lån og marked;
   briefen skrives om live med streaming, med daglig cap på kørsler.
3. Grav i den her: live uddybning af ét punkt, samme cap.
4. Agent nummer to og tre på de ledige pladser.

Fase 2 og 3 kalder Anthropic fra Vercel. Skriv dem gennem `kaldMedLoft`,
så loftet også gælder dér.
