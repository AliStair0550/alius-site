-- Alius Agenter: agenter, briefs, traces, api_ledger og source_cache.
-- Rent additivt. Ingen eksisterende tabel ændres.

BEGIN;

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('ACTIVE', 'COMING_SOON');

-- CreateEnum
CREATE TYPE "BriefStatus" AS ENUM ('RUNNING', 'DONE', 'BUDGET_STOPPED', 'FAILED');

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "not_doing" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "status" "AgentStatus" NOT NULL DEFAULT 'COMING_SOON',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "briefs" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "BriefStatus" NOT NULL DEFAULT 'RUNNING',
    "status_message" TEXT,
    "items" JSONB,
    "caveats" JSONB,
    "sources_read" INTEGER,
    "kept" INTEGER,
    "cost_usd" DECIMAL(12,6),
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(3),

    CONSTRAINT "briefs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traces" (
    "id" TEXT NOT NULL,
    "brief_id" TEXT NOT NULL,
    "steps" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "traces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_ledger" (
    "id" BIGSERIAL NOT NULL,
    "ts" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agent_id" TEXT NOT NULL,
    "brief_id" TEXT,
    "step" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "cache_read_tokens" INTEGER NOT NULL,
    "cache_write_tokens" INTEGER NOT NULL,
    "cost_usd" DECIMAL(12,6) NOT NULL,

    CONSTRAINT "api_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_cache" (
    "key" TEXT NOT NULL,
    "fetched_at" TIMESTAMPTZ(3) NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "source_cache_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "briefs_agent_id_date_status_idx" ON "briefs"("agent_id", "date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "traces_brief_id_key" ON "traces"("brief_id");

-- CreateIndex
CREATE INDEX "api_ledger_ts_idx" ON "api_ledger"("ts");

-- CreateIndex
CREATE INDEX "api_ledger_agent_id_ts_idx" ON "api_ledger"("agent_id", "ts");

-- AddForeignKey
ALTER TABLE "briefs" ADD CONSTRAINT "briefs_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traces" ADD CONSTRAINT "traces_brief_id_fkey" FOREIGN KEY ("brief_id") REFERENCES "briefs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_ledger" ADD CONSTRAINT "api_ledger_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_ledger" ADD CONSTRAINT "api_ledger_brief_id_fkey" FOREIGN KEY ("brief_id") REFERENCES "briefs"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Den første agent. Pladserne til nummer to og tre tegnes af siden
-- som silhuetter, indtil de får en række her.
INSERT INTO "agents" ("id", "name", "tagline", "not_doing", "avatar", "status", "sort_order")
VALUES (
  'finn',
  'Finn Finans',
  'Læser danske økonomital hver morgen og siger, hvad de peger på.',
  'Giver ikke investeringsråd og anbefaler ingen produkter.',
  'finn',
  'ACTIVE',
  1
);

COMMIT;
