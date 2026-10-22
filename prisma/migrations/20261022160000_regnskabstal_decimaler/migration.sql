-- Præcision på hvert regnskabstal, så en ændret afrunding mellem to
-- rapporter ikke skrives som en revision.
--
-- Tabellen tømmes. Den blev oprettet og fyldt samme dag, 22. oktober 2026,
-- af én kørsel uden denne kolonne. Den kørsel skrev afrundingsforskelle
-- som revisioner og lod i flere tilfælde et groft tal erstatte et præcist
-- (Zealand Pharma 2. kvartal 2025: 9.088.284.000 blev til 9.088.000.000).
-- Kørslen døde desuden før de sidste to selskaber. Alt kan hentes igen fra
-- Erhvervsstyrelsen med regnskaber.yml, og det gøres straks efter.
--
-- Det er ikke en undtagelse fra reglen om at værdier aldrig opdateres:
-- reglen beskytter historik, og der var ingen historik endnu, kun én
-- fejlbehæftet første indlæsning.

-- AlterTable
ALTER TABLE "regnskabstal" ADD COLUMN     "decimaler" INTEGER;

DELETE FROM "regnskabstal";
