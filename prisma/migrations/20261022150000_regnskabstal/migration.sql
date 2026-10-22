-- Regnskabstal fra børsnoterede selskabers ESEF-regnskaber. Ny tabel, rent additivt.
-- CreateTable
CREATE TABLE "regnskabstal" (
    "id" BIGSERIAL NOT NULL,
    "cvr" TEXT NOT NULL,
    "begreb" TEXT NOT NULL,
    "element" TEXT NOT NULL,
    "periode_start" DATE NOT NULL,
    "periode_slut" DATE NOT NULL,
    "vaerdi" DECIMAL(20,2) NOT NULL,
    "valuta" CHAR(3) NOT NULL,
    "sags_nummer" TEXT NOT NULL,
    "indlevering_slags" TEXT NOT NULL,
    "offentliggjort" TIMESTAMPTZ(3) NOT NULL,
    "kilde_url" TEXT NOT NULL,
    "retrieved_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_current" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "regnskabstal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "regnskabstal_cvr_begreb_periode_start_periode_slut_is_curre_idx" ON "regnskabstal"("cvr", "begreb", "periode_start", "periode_slut", "is_current");

-- CreateIndex
CREATE INDEX "regnskabstal_offentliggjort_idx" ON "regnskabstal"("offentliggjort");

