-- Ugentligt kvalitetstjek af Finns analyser. Ny tabel, rent additivt.
-- CreateTable
CREATE TABLE "quality_reports" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periode_fra" DATE NOT NULL,
    "periode_til" DATE NOT NULL,
    "maalinger" JSONB NOT NULL,
    "vurderinger" JSONB NOT NULL,
    "cost_usd" DECIMAL(10,6) NOT NULL DEFAULT 0,

    CONSTRAINT "quality_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quality_reports_agent_id_created_at_idx" ON "quality_reports"("agent_id", "created_at");

