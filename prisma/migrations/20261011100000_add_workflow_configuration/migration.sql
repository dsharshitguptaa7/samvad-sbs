-- CreateEnum
CREATE TYPE "WorkflowMode" AS ENUM ('HOD_DIRECTOR', 'COORDINATOR_HOD_DIRECTOR');

-- AlterTable Grievance
ALTER TABLE "Grievance" ADD COLUMN "workflowMode" "WorkflowMode" NOT NULL DEFAULT 'HOD_DIRECTOR';
ALTER TABLE "Grievance" ADD COLUMN "workflowVersion" INTEGER NOT NULL DEFAULT 1;

-- Backfill existing grievances:
-- If existing grievances were at TIER_1_COORDINATOR, mark as COORDINATOR_HOD_DIRECTOR
UPDATE "Grievance" SET "workflowMode" = 'COORDINATOR_HOD_DIRECTOR' WHERE "currentTier" = 'TIER_1_COORDINATOR';

-- CreateTable WorkflowConfiguration
CREATE TABLE "WorkflowConfiguration" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'DEFAULT',
    "mode" "WorkflowMode" NOT NULL DEFAULT 'HOD_DIRECTOR',
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedByUserId" TEXT,
    "changeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable WorkflowAuditLog
CREATE TABLE "WorkflowAuditLog" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "previousMode" "WorkflowMode" NOT NULL,
    "newMode" "WorkflowMode" NOT NULL,
    "reason" TEXT NOT NULL,
    "versionBefore" INTEGER NOT NULL,
    "versionAfter" INTEGER NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowConfiguration_key_key" ON "WorkflowConfiguration"("key");
CREATE INDEX "WorkflowConfiguration_key_idx" ON "WorkflowConfiguration"("key");
CREATE INDEX "WorkflowAuditLog_configId_createdAt_idx" ON "WorkflowAuditLog"("configId", "createdAt");
CREATE INDEX "WorkflowAuditLog_adminUserId_idx" ON "WorkflowAuditLog"("adminUserId");

-- AddForeignKey
ALTER TABLE "WorkflowConfiguration" ADD CONSTRAINT "WorkflowConfiguration_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkflowAuditLog" ADD CONSTRAINT "WorkflowAuditLog_configId_fkey" FOREIGN KEY ("configId") REFERENCES "WorkflowConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkflowAuditLog" ADD CONSTRAINT "WorkflowAuditLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed initial default configuration (HOD_DIRECTOR mode)
INSERT INTO "WorkflowConfiguration" ("id", "key", "mode", "version", "changeReason", "createdAt", "updatedAt")
VALUES ('default-workflow-config', 'DEFAULT', 'HOD_DIRECTOR', 1, 'Initial migration default: HOD -> Director', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
