# Byg "Alius Agenter" og den første agent, Finn Finans

Du arbejder i repoet for alius.dk (Next.js, TypeScript). Du træffer alle tekniske valg selv. Start med at læse repoet, især hvordan de eksisterende værktøjer (/pulse, /prioritizer, /tankeprofil) henter data, gemmer data og er bygget visuelt. Genbrug det, der findes. Spørg kun, hvis noget blokerer dig.

## Hvad vi bygger i denne omgang

En ny side under Værktøjer: **alius.dk/agenter** med navnet **Alius Agenter**.

Scope for denne omgang er kun **dagens brief**. Ikke personalisering, ikke mail-abonnement, ikke "grav videre". De kommer senere (se "Næste faser"), så byg datamodel og struktur, så de kan tilføjes uden at rive op.

### Siden /agenter
- Overskrift: Alius Agenter. Underlinje i Alius' tone: kort, konkret, ingen udråbstegn.
- En scene med tre pladser. Én er besat af Finn Finans. De to andre er silhuetter med teksten "Kommer snart".
- Finns kort: original avatar (SVG, tegnet i Alius' palette, ikke stock-foto, ikke en mand i jakkesæt), navn, én linje om hvad han kan, én linje om hvad han ikke gør, og en live-tæller: "Har læst N kilder i dag. Beholdt M."
- Tryk på Finn fører til dagens brief.

### Dagens brief (/agenter/finn)
- Fem til syv punkter om dansk økonomi, skrevet af Finn hver morgen.
- Hvert punkt: overskrift, to til fire korte sætninger, og en linje "Hvad det betyder" rettet mod en dansk virksomhed med 5 til 50 ansatte eller en almindelig husholdning. Kilde med link under hvert punkt.
- Nederst: "Det tog jeg forbehold for" med de usikkerheder og huller, Finn fandt. Finn siger ærligt, hvad han ikke kunne finde.
- Knap: "Se hvordan det blev lavet" åbner replay.
- Arkiv: tidligere briefs kan åbnes på dato.

### Replay
- Afspiller Finns arbejdslog som animation: kilder lander én ad gangen, de fleste afvises med synlig grund ("Afvist: dublet", "Afvist: ingen dansk relevans", "Afvist: ældre end 48 timer", "Afvist: tal ikke sæsonkorrigeret, fandt bedre"), de overlevende rangeres, og briefen bygges op afsnit for afsnit.
- Replay læser kun gemt JSON. Ingen API-kald ved visning. Koster nul.
- Kan sættes på pause og spoles. Skal se godt ud på mobil.

## Finn Finans: hvem han er

Finn er specialist i dansk økonomi. Han læser tal og siger, hvad tallene peger på. Han må gerne tale om både virksomheders økonomi og privatøkonomi.

Faste regler, som skal ligge i hans systemprompt og håndhæves:
- Finn lader altid tallene tale. Han siger, hvad data peger på, og hvor sikkert det er.
- Finn giver aldrig investeringsråd og anbefaler aldrig at købe, sælge eller vælge konkrete produkter. Han beskriver, han anbefaler ikke.
- Finn finder aldrig på tal. Hvert tal skal kunne spores til en kilde i loggen. Kan han ikke finde et tal, siger han det.
- Finn tjekker altid dato på tallet, og om det er sæsonkorrigeret, før han bruger det.
- Finn husker sine egne briefs og må gerne pege på udvikling over tid ("tredje måned i træk").
- Finns sprog: korte deklarative sætninger på dansk, aktiv form, ingen fyldord, ingen tankestreger (brug komma eller almindelig bindestreg), ingen udråbstegn, ingen konsulentsprog. Konkrete tal frem for abstrakte udsagn.
- Finn skriver alt i egne ord. Han kopierer aldrig tekst fra artikler. Fra medier bruger han kun overskrift, dato og link, aldrig brødtekst.

## Kilder (Finn må kun bruge disse)

Byg hver kilde som et separat værktøj (tool), som agenten kalder. Undersøg API'erne og vælg de konkrete tabeller/serier selv:
- Danmarks Statistik, StatBank API: forbrugerpriser, ledighed, konkurser, detailomsætning, byggeri, lønindeks, boligpriser.
- Danmarks Nationalbank, statistikbank/API: renter, valutakurser, udlån.
- Finans Danmark: boliglånsrenter, hvis der findes en tilgængelig datakilde.
- Pulse: de datakilder, der allerede ligger i repoet. Genbrug dem direkte.
- Erhvervsmedier via RSS (overskrift, dato, link): vælg fire til seks danske erhvervs- og nyhedskilder med offentlige feeds. Respekter robots.txt. Hent ikke artikeltekst.

Alle kald cachet, så samme data aldrig hentes to gange samme dag.

## Pipeline: den daglige kørsel

Kør hver dag kl. 06:00 Europe/Copenhagen. Vælg selv mekanisme (fx Vercel Cron mod en route med tilstrækkelig maxDuration, eller en Managed Agent med schedule). Hvis kørslen fejler, vis gårsdagens brief med en linje om, at dagens ikke blev færdig.

Trin, alle logget til tracen:
1. Hent fra alle kilder. Log hver kilde: navn, url, tidspunkt, antal poster.
2. Dedupliker.
3. Relevansfilter: behold kun poster med dansk relevans og max 48 timer gamle, eller seneste udgivelse af en statistik. Log hver afvisning med grund.
4. Rangér de overlevende efter betydning for virksomheder og husholdninger. Log begrundelse.
5. Skriv briefen efter Finns regler.
6. Selvtjek: alle tal i briefen skal findes i tracen. Fjern eller marker alt, der ikke kan spores.
7. Gem: brief (struktureret JSON), trace (JSON), tællere (kilder læst, beholdt), tokenforbrug og estimeret pris.

Modelvalg: brug Haiku til trin 1 til 4 (hentning, filtrering, rangering) og en større model (Sonnet som udgangspunkt) kun til trin 5 og 6. Brug prompt caching på Finns systemprompt og kildebeskrivelser. Begræns max_tokens på hvert kald.

## Budgetloft: ufravigeligt

Driften må aldrig kunne koste mere end den månedlige kredit. Byg et hårdt loft i koden, ikke kun en advarsel:

- Env-variabler: `AGENTS_BUDGET_MONTHLY_USD` (standard 80, så der er buffer under 100), `AGENTS_BUDGET_DAILY_USD` (standard 4).
- En ledger i databasen: hvert API-kald gemmes med model, input tokens, output tokens, cache tokens og beregnet pris ud fra en priskonfiguration i koden (hold priserne i én fil, så de er nemme at opdatere).
- Før hvert eneste API-kald: læs forbrug for indeværende dag og måned fra ledgeren. Er loftet nået, eller vil det estimerede kald overskride det, afbrydes kørslen pænt, status gemmes som "stoppet af budget", og siden viser seneste brief med en linje om det.
- Budgetperioden skal følge min faktureringsdato. Gør den konfigurerbar via env (`AGENTS_BUDGET_RESET_DAY`).
- Lav en lille intern statusside eller endpoint (beskyttet) der viser forbrug i dag, denne måned, resterende budget og seneste kørsler.
- Skriv i README, at jeg derudover skal sætte et spend limit i Anthropic Console som andet lag. Det kan du ikke gøre fra koden.
- Brug API-nøgle fra den Console-organisation, der er knyttet til mit Claude-abonnement, ellers trækker forbruget ikke på kreditten. Nøglen hentes fra env, aldrig i koden.

## Datamodel (foreslået, tilpas til repoet)

- `agents`: id, slug, name, tagline, not_doing, avatar, status (active/coming_soon).
- `briefs`: id, agent_id, date, items (JSON: title, body, meaning, sources[]), caveats, counters (sources_read, kept), status, created_at.
- `traces`: id, brief_id, steps (JSON: ts, type, source, decision, reason, payload_ref).
- `api_ledger`: id, ts, agent_id, brief_id, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_usd.
- `source_cache`: key, fetched_at, payload.

Vælg lagring ud fra det, repoet allerede bruger. Ellers Vercel Postgres eller tilsvarende.

## Design

- Alius' palette: off-white #FAF8F4, near-black #1A1A1A, Alius-grøn #3A5E4B. Samme typografi og komponenter som resten af sitet.
- Scenen og replay skal føles levende, men roligt. Ingen dashboard-look, ingen neon, ingen chat-bobler.
- Mobil først. Replay skal virke på en telefon.
- Alle UI-tekster på dansk, i samme tone som Finn.

## Acceptkriterier

- /agenter viser scenen med Finn og to silhuetter. Tælleren viser dagens tal.
- En manuel kørsel af pipelinen producerer en komplet brief og en trace, og begge kan ses på /agenter/finn.
- Replay afspiller tracen uden API-kald.
- Budgetloftet er testet: sæt dagsloftet til 0.01 USD, kør pipelinen, og bekræft at den stopper pænt og at siden stadig viser seneste brief.
- Ingen tal i en brief uden kilde i tracen (automatisk test).
- Lighthouse på mobil er ikke værre end resten af sitet.
- README beskriver: env-variabler, hvordan man kører pipelinen manuelt, hvordan man ændrer kilder, hvordan budgettet virker, og at spend limit skal sættes i Console.

## Næste faser (byg ikke nu, men gør plads)

1. Følg: mail hver morgen eller hver mandag, opt-in med bekræftelse, ingen konto.
2. Min situation: tre til fem chips (branche, region, ansatte, lån, marked), Finn skriver briefen om live med streaming. Daglig cap på antal kørsler.
3. Grav i den her: live uddybning af ét punkt, med samme cap.
4. Agent nummer to og tre på de ledige pladser.

## Arbejdsform

1. Læs repoet og lav en kort plan med dine tekniske valg. Vis den, før du bygger.
2. Byg i rækkefølgen: datamodel og budgetloft, kilder, pipeline, side og brief, replay, tests, README.
3. Kør en rigtig brief til sidst og vis resultatet.
4. Commit i små, beskrivende commits.
