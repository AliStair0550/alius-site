-- Konkursserien får det navn der passer til tallet.
--
-- dst.konkurs.total hed "Erklærede konkurser i alt, sæsonkorrigeret",
-- men indeholdt KONK3's rå nøgle C, konkurser i aktive virksomheder.
-- Fra 22. oktober 2026 henter sync-konk3.ts nøgle C1, konkurser i aktive
-- virksomheder, sæsonkorrigeret. Navnet er redaktionelt og overskrives
-- ikke af broen, derfor rettes det her.
UPDATE "series"
SET "name_da" = 'Konkurser i aktive virksomheder, sæsonkorrigeret'
WHERE "id" = 'dst.konkurs.total';
