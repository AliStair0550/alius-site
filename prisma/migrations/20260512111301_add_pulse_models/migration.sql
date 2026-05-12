-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('MONTH', 'QUARTER', 'YEAR', 'WEEK');

-- CreateEnum
CREATE TYPE "AreaType" AS ENUM ('NATIONAL', 'REGION', 'MUNICIPALITY', 'OTHER');

-- CreateEnum
CREATE TYPE "SignalSeverity" AS ENUM ('POSITIVE', 'NEGATIVE', 'NEUTRAL', 'NOTABLE');

-- CreateTable
CREATE TABLE "DataSource" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "unit" TEXT,
    "dstLastUpdated" TIMESTAMP(3),
    "lastFetchedAt" TIMESTAMP(3),
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataPoint" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodDate" TIMESTAMP(3) NOT NULL,
    "periodType" "PeriodType" NOT NULL,
    "areaCode" TEXT NOT NULL DEFAULT 'DK',
    "areaType" "AreaType" NOT NULL DEFAULT 'NATIONAL',
    "areaLabel" TEXT,
    "value" DOUBLE PRECISION,
    "status" TEXT,
    "dimensions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "severity" "SignalSeverity" NOT NULL DEFAULT 'NEUTRAL',
    "period" TEXT,
    "areaCode" TEXT,
    "value" DOUBLE PRECISION,
    "reference" DOUBLE PRECISION,
    "delta" DOUBLE PRECISION,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FetchLog" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "error" TEXT,
    "inserted" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "dstLastUpdated" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FetchLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DataSource_slug_key" ON "DataSource"("slug");

-- CreateIndex
CREATE INDEX "DataSource_slug_idx" ON "DataSource"("slug");

-- CreateIndex
CREATE INDEX "DataSource_provider_tableId_idx" ON "DataSource"("provider", "tableId");

-- CreateIndex
CREATE INDEX "DataPoint_sourceId_periodDate_idx" ON "DataPoint"("sourceId", "periodDate");

-- CreateIndex
CREATE INDEX "DataPoint_areaCode_periodDate_idx" ON "DataPoint"("areaCode", "periodDate");

-- CreateIndex
CREATE UNIQUE INDEX "DataPoint_sourceId_period_areaCode_key" ON "DataPoint"("sourceId", "period", "areaCode");

-- CreateIndex
CREATE INDEX "Signal_sourceId_type_active_idx" ON "Signal"("sourceId", "type", "active");

-- CreateIndex
CREATE INDEX "Signal_sourceId_period_idx" ON "Signal"("sourceId", "period");

-- CreateIndex
CREATE INDEX "FetchLog_sourceId_createdAt_idx" ON "FetchLog"("sourceId", "createdAt");

-- AddForeignKey
ALTER TABLE "DataPoint" ADD CONSTRAINT "DataPoint_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FetchLog" ADD CONSTRAINT "FetchLog_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
