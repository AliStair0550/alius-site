-- CreateEnum
CREATE TYPE "SeriesFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "RevisionPolicy" AS ENUM ('NONE', 'MINOR', 'MAJOR');

-- CreateEnum
CREATE TYPE "SeriesLayer" AS ENUM ('LEADING', 'COST', 'CAPITAL', 'EXTERNAL', 'REALISED', 'STRUCTURAL');

-- CreateEnum
CREATE TYPE "SeriesStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "IngestStatus" AS ENUM ('OK', 'NO_NEW_DATA', 'ERROR', 'ABORTED');

-- CreateTable
CREATE TABLE "series" (
    "id" TEXT NOT NULL,
    "name_da" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "source_ref" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "frequency" "SeriesFrequency" NOT NULL,
    "expected_lag_days" INTEGER NOT NULL,
    "revision_policy" "RevisionPolicy" NOT NULL,
    "attribution" TEXT NOT NULL,
    "layer" "SeriesLayer" NOT NULL,
    "status" "SeriesStatus" NOT NULL DEFAULT 'ACTIVE',
    "break_at" DATE,
    "break_reason" TEXT,
    "legacy_source_slug" TEXT,
    "legacy_area_code" TEXT,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observations" (
    "series_id" TEXT NOT NULL,
    "area_code" TEXT NOT NULL DEFAULT 'DK',
    "period" DATE NOT NULL,
    "value" DECIMAL(20,6),
    "retrieved_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_current" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "observations_pkey" PRIMARY KEY ("series_id","area_code","period","retrieved_at")
);

-- CreateTable
CREATE TABLE "ingest_runs" (
    "id" BIGSERIAL NOT NULL,
    "series_id" TEXT,
    "source_slug" TEXT,
    "started_at" TIMESTAMPTZ(3) NOT NULL,
    "finished_at" TIMESTAMPTZ(3),
    "status" "IngestStatus" NOT NULL,
    "rows_written" INTEGER,
    "rows_revised" INTEGER,
    "error_message" TEXT,

    CONSTRAINT "ingest_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "series_source_idx" ON "series"("source");

-- CreateIndex
CREATE INDEX "series_layer_status_idx" ON "series"("layer", "status");

-- CreateIndex
CREATE INDEX "series_status_idx" ON "series"("status");

-- CreateIndex
CREATE INDEX "series_legacy_source_slug_idx" ON "series"("legacy_source_slug");

-- CreateIndex
CREATE INDEX "observations_series_id_area_code_period_is_current_idx" ON "observations"("series_id", "area_code", "period", "is_current");

-- CreateIndex
CREATE INDEX "observations_series_id_is_current_period_idx" ON "observations"("series_id", "is_current", "period");

-- CreateIndex
CREATE INDEX "ingest_runs_series_id_started_at_idx" ON "ingest_runs"("series_id", "started_at");

-- CreateIndex
CREATE INDEX "ingest_runs_source_slug_started_at_idx" ON "ingest_runs"("source_slug", "started_at");

-- CreateIndex
CREATE INDEX "ingest_runs_status_started_at_idx" ON "ingest_runs"("status", "started_at");

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingest_runs" ADD CONSTRAINT "ingest_runs_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

