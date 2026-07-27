-- AlterTable
ALTER TABLE "series" ADD COLUMN     "rank_group" TEXT;

-- CreateIndex
CREATE INDEX "series_rank_group_idx" ON "series"("rank_group");

