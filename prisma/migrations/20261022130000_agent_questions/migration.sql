-- Spørgsmål til agenterne: kun hvad grænser og regnskab kræver.
-- Selve spørgsmålet og svaret gemmes ikke. Rent additivt.

BEGIN;

-- CreateTable
CREATE TABLE "agent_questions" (
    "id" BIGSERIAL NOT NULL,
    "ts" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agent_id" TEXT NOT NULL,
    "ip_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "cost_usd" DECIMAL(12,6) NOT NULL DEFAULT 0,

    CONSTRAINT "agent_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_questions_agent_id_ts_idx" ON "agent_questions"("agent_id", "ts");

-- CreateIndex
CREATE INDEX "agent_questions_ip_hash_ts_idx" ON "agent_questions"("ip_hash", "ts");


COMMIT;
