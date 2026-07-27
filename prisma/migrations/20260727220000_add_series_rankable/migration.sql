-- AlterTable
ALTER TABLE "series" ADD COLUMN     "rankable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "rankable_reason" TEXT;

-- CreateIndex
CREATE INDEX "series_rankable_layer_idx" ON "series"("rankable", "layer");

