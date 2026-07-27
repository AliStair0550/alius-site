-- CreateEnum
CREATE TYPE "TeamSessionStatus" AS ENUM ('OPEN', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TeamRequestStatus" AS ENUM ('NEW', 'APPROVED', 'DECLINED', 'COMPLETED');

-- CreateTable
CREATE TABLE "Profile" (
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
CREATE TABLE "TeamSession" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyName" TEXT,
    "ownerEmail" TEXT NOT NULL,
    "ownerName" TEXT,
    "status" "TeamSessionStatus" NOT NULL DEFAULT 'OPEN',
    "joinToken" TEXT NOT NULL,
    "reportToken" TEXT NOT NULL,
    "adminToken" TEXT NOT NULL,
    "expectedSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "TeamSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "teamSize" TEXT NOT NULL,
    "context" TEXT,
    "status" "TeamRequestStatus" NOT NULL DEFAULT 'NEW',
    "sessionId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "TeamRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_email_key" ON "Profile"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_accessToken_key" ON "Profile"("accessToken");

-- CreateIndex
CREATE INDEX "Profile_email_idx" ON "Profile"("email");

-- CreateIndex
CREATE INDEX "Profile_accessToken_idx" ON "Profile"("accessToken");

-- CreateIndex
CREATE UNIQUE INDEX "TeamSession_joinToken_key" ON "TeamSession"("joinToken");

-- CreateIndex
CREATE UNIQUE INDEX "TeamSession_reportToken_key" ON "TeamSession"("reportToken");

-- CreateIndex
CREATE UNIQUE INDEX "TeamSession_adminToken_key" ON "TeamSession"("adminToken");

-- CreateIndex
CREATE INDEX "TeamSession_joinToken_idx" ON "TeamSession"("joinToken");

-- CreateIndex
CREATE INDEX "TeamSession_reportToken_idx" ON "TeamSession"("reportToken");

-- CreateIndex
CREATE INDEX "TeamSession_adminToken_idx" ON "TeamSession"("adminToken");

-- CreateIndex
CREATE INDEX "TeamSession_ownerEmail_idx" ON "TeamSession"("ownerEmail");

-- CreateIndex
CREATE INDEX "TeamMember_sessionId_idx" ON "TeamMember"("sessionId");

-- CreateIndex
CREATE INDEX "TeamMember_profileId_idx" ON "TeamMember"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_sessionId_profileId_key" ON "TeamMember"("sessionId", "profileId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamRequest_sessionId_key" ON "TeamRequest"("sessionId");

-- CreateIndex
CREATE INDEX "TeamRequest_status_idx" ON "TeamRequest"("status");

-- CreateIndex
CREATE INDEX "TeamRequest_email_idx" ON "TeamRequest"("email");

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TeamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamRequest" ADD CONSTRAINT "TeamRequest_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TeamSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
