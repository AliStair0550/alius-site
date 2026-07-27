-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."AreaType" AS ENUM ('NATIONAL', 'REGION', 'LANDSDEL', 'KOMMUNE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."IngestStatus" AS ENUM ('OK', 'NO_NEW_DATA', 'ERROR', 'ABORTED');

-- CreateEnum
CREATE TYPE "public"."PeriodType" AS ENUM ('MONTH', 'QUARTER', 'YEAR', 'WEEK');

-- CreateEnum
CREATE TYPE "public"."RevisionPolicy" AS ENUM ('NONE', 'MINOR', 'MAJOR');

-- CreateEnum
CREATE TYPE "public"."SeriesFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "public"."SeriesLayer" AS ENUM ('LEADING', 'COST', 'CAPITAL', 'EXTERNAL', 'REALISED', 'STRUCTURAL');

-- CreateEnum
CREATE TYPE "public"."SeriesStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."TeamRequestStatus" AS ENUM ('NEW', 'APPROVED', 'DECLINED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."TeamSessionStatus" AS ENUM ('OPEN', 'CLOSED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "public"."DataPoint" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodDate" TIMESTAMP(3) NOT NULL,
    "periodType" "public"."PeriodType" NOT NULL,
    "areaCode" TEXT,
    "areaType" "public"."AreaType" NOT NULL DEFAULT 'NATIONAL',
    "value" DOUBLE PRECISION,
    "status" TEXT,
    "dimensions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "areaName" TEXT,

    CONSTRAINT "DataPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DataSource" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "unit" TEXT,
    "lastFetchedAt" TIMESTAMP(3),
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "lastUpdatedAtSource" TIMESTAMP(3),
    "license" TEXT,
    "sourceUrl" TEXT,
    "updateFrequency" TEXT,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FetchLog" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "inserted" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "lastUpdatedAtSource" TIMESTAMP(3),
    "notes" TEXT,
    "rowsAffected" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FetchLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Profile" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT,
    "totals" JSONB NOT NULL,
    "primary" TEXT NOT NULL,
    "secondary" TEXT NOT NULL,
    "weakest" TEXT NOT NULL,
    "selections" JSONB NOT NULL,
    "accessToken" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Signal" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "period" TEXT,
    "areaCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "areaName" TEXT,
    "body" TEXT,
    "direction" TEXT,
    "evidence" JSONB,
    "headline" TEXT NOT NULL,
    "magnitude" DOUBLE PRECISION,
    "severity" TEXT NOT NULL DEFAULT 'info',

    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeamMember" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeamRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "teamSize" TEXT NOT NULL,
    "context" TEXT,
    "status" "public"."TeamRequestStatus" NOT NULL DEFAULT 'NEW',
    "sessionId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "TeamRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeamSession" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyName" TEXT,
    "ownerEmail" TEXT NOT NULL,
    "ownerName" TEXT,
    "status" "public"."TeamSessionStatus" NOT NULL DEFAULT 'OPEN',
    "joinToken" TEXT NOT NULL,
    "reportToken" TEXT NOT NULL,
    "adminToken" TEXT NOT NULL,
    "expectedSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "TeamSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ingest_runs" (
    "id" BIGSERIAL NOT NULL,
    "series_id" TEXT,
    "source_slug" TEXT,
    "started_at" TIMESTAMPTZ(3) NOT NULL,
    "finished_at" TIMESTAMPTZ(3),
    "status" "public"."IngestStatus" NOT NULL,
    "rows_written" INTEGER,
    "rows_revised" INTEGER,
    "error_message" TEXT,

    CONSTRAINT "ingest_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."observations" (
    "series_id" TEXT NOT NULL,
    "area_code" TEXT NOT NULL DEFAULT 'DK',
    "period" DATE NOT NULL,
    "value" DECIMAL(20,6),
    "retrieved_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_current" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "observations_pkey" PRIMARY KEY ("series_id","area_code","period","retrieved_at")
);

-- CreateTable
CREATE TABLE "public"."series" (
    "id" TEXT NOT NULL,
    "name_da" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "source_ref" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "frequency" "public"."SeriesFrequency" NOT NULL,
    "expected_lag_days" INTEGER NOT NULL,
    "revision_policy" "public"."RevisionPolicy" NOT NULL,
    "attribution" TEXT NOT NULL,
    "layer" "public"."SeriesLayer" NOT NULL,
    "status" "public"."SeriesStatus" NOT NULL DEFAULT 'ACTIVE',
    "break_at" DATE,
    "break_reason" TEXT,
    "legacy_source_slug" TEXT,
    "legacy_area_code" TEXT,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "series_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DataPoint_sourceId_areaCode_periodDate_idx" ON "public"."DataPoint"("sourceId" ASC, "areaCode" ASC, "periodDate" ASC);

-- CreateIndex
CREATE INDEX "DataPoint_sourceId_periodDate_idx" ON "public"."DataPoint"("sourceId" ASC, "periodDate" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "DataPoint_sourceId_period_areaCode_key" ON "public"."DataPoint"("sourceId" ASC, "period" ASC, "areaCode" ASC);

-- CreateIndex
CREATE INDEX "DataSource_provider_tableId_idx" ON "public"."DataSource"("provider" ASC, "tableId" ASC);

-- CreateIndex
CREATE INDEX "DataSource_slug_idx" ON "public"."DataSource"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "DataSource_slug_key" ON "public"."DataSource"("slug" ASC);

-- CreateIndex
CREATE INDEX "FetchLog_sourceId_createdAt_idx" ON "public"."FetchLog"("sourceId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "Profile_accessToken_idx" ON "public"."Profile"("accessToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_accessToken_key" ON "public"."Profile"("accessToken" ASC);

-- CreateIndex
CREATE INDEX "Profile_email_idx" ON "public"."Profile"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_email_key" ON "public"."Profile"("email" ASC);

-- CreateIndex
CREATE INDEX "Signal_sourceId_period_idx" ON "public"."Signal"("sourceId" ASC, "period" ASC);

-- CreateIndex
CREATE INDEX "Signal_sourceId_type_idx" ON "public"."Signal"("sourceId" ASC, "type" ASC);

-- CreateIndex
CREATE INDEX "TeamMember_profileId_idx" ON "public"."TeamMember"("profileId" ASC);

-- CreateIndex
CREATE INDEX "TeamMember_sessionId_idx" ON "public"."TeamMember"("sessionId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_sessionId_profileId_key" ON "public"."TeamMember"("sessionId" ASC, "profileId" ASC);

-- CreateIndex
CREATE INDEX "TeamRequest_email_idx" ON "public"."TeamRequest"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "TeamRequest_sessionId_key" ON "public"."TeamRequest"("sessionId" ASC);

-- CreateIndex
CREATE INDEX "TeamRequest_status_idx" ON "public"."TeamRequest"("status" ASC);

-- CreateIndex
CREATE INDEX "TeamSession_adminToken_idx" ON "public"."TeamSession"("adminToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "TeamSession_adminToken_key" ON "public"."TeamSession"("adminToken" ASC);

-- CreateIndex
CREATE INDEX "TeamSession_joinToken_idx" ON "public"."TeamSession"("joinToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "TeamSession_joinToken_key" ON "public"."TeamSession"("joinToken" ASC);

-- CreateIndex
CREATE INDEX "TeamSession_ownerEmail_idx" ON "public"."TeamSession"("ownerEmail" ASC);

-- CreateIndex
CREATE INDEX "TeamSession_reportToken_idx" ON "public"."TeamSession"("reportToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "TeamSession_reportToken_key" ON "public"."TeamSession"("reportToken" ASC);

-- CreateIndex
CREATE INDEX "ingest_runs_series_id_started_at_idx" ON "public"."ingest_runs"("series_id" ASC, "started_at" ASC);

-- CreateIndex
CREATE INDEX "ingest_runs_source_slug_started_at_idx" ON "public"."ingest_runs"("source_slug" ASC, "started_at" ASC);

-- CreateIndex
CREATE INDEX "ingest_runs_status_started_at_idx" ON "public"."ingest_runs"("status" ASC, "started_at" ASC);

-- CreateIndex
CREATE INDEX "observations_series_id_area_code_period_is_current_idx" ON "public"."observations"("series_id" ASC, "area_code" ASC, "period" ASC, "is_current" ASC);

-- CreateIndex
CREATE INDEX "observations_series_id_is_current_period_idx" ON "public"."observations"("series_id" ASC, "is_current" ASC, "period" ASC);

-- CreateIndex
CREATE INDEX "series_layer_status_idx" ON "public"."series"("layer" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "series_legacy_source_slug_idx" ON "public"."series"("legacy_source_slug" ASC);

-- CreateIndex
CREATE INDEX "series_source_idx" ON "public"."series"("source" ASC);

-- CreateIndex
CREATE INDEX "series_status_idx" ON "public"."series"("status" ASC);

-- AddForeignKey
ALTER TABLE "public"."DataPoint" ADD CONSTRAINT "DataPoint_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "public"."DataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FetchLog" ADD CONSTRAINT "FetchLog_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "public"."DataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Signal" ADD CONSTRAINT "Signal_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "public"."DataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamMember" ADD CONSTRAINT "TeamMember_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamMember" ADD CONSTRAINT "TeamMember_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."TeamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamRequest" ADD CONSTRAINT "TeamRequest_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."TeamSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ingest_runs" ADD CONSTRAINT "ingest_runs_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."observations" ADD CONSTRAINT "observations_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

