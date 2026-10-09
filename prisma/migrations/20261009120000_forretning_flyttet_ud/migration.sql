-- Forretningens tabeller fjernes fra Pulse-basen.
--
-- De blev kopieret til deres egen database 9. oktober 2026 (commit
-- 2b27ab5), og produktion har læst derfra siden. Før sletningen blev det
-- efterprøvet at hver række i den gamle kopi også findes i den nye, og
-- at intet i koden læser tabellerne gennem Pulse-klienten.
--
-- Transaktion: enten forsvinder alt, eller intet.

BEGIN;

-- DropForeignKey
ALTER TABLE "TeamMember" DROP CONSTRAINT "TeamMember_profileId_fkey";

-- DropForeignKey
ALTER TABLE "TeamMember" DROP CONSTRAINT "TeamMember_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "TeamRequest" DROP CONSTRAINT "TeamRequest_sessionId_fkey";

-- DropTable
DROP TABLE "Profile";

-- DropTable
DROP TABLE "TeamMember";

-- DropTable
DROP TABLE "TeamRequest";

-- DropTable
DROP TABLE "TeamSession";

-- DropEnum
DROP TYPE "TeamRequestStatus";

-- DropEnum
DROP TYPE "TeamSessionStatus";


COMMIT;
