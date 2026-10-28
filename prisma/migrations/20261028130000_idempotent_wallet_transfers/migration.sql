ALTER TABLE "Transaction"
  ADD COLUMN "clientRequestId" TEXT,
  ADD COLUMN "requestFingerprint" TEXT;

CREATE UNIQUE INDEX "Transaction_senderId_clientRequestId_key"
  ON "Transaction"("senderId", "clientRequestId");

ALTER TABLE "Purchase"
  ADD COLUMN "requestFingerprint" TEXT;

ALTER TABLE "Withdrawal"
  ADD COLUMN "clientRequestId" TEXT,
  ADD COLUMN "requestFingerprint" TEXT;

CREATE UNIQUE INDEX "Withdrawal_userId_clientRequestId_key"
  ON "Withdrawal"("userId", "clientRequestId");

ALTER TABLE "UserReport"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'new',
  ADD COLUMN "adminNote" TEXT,
  ADD COLUMN "reviewedById" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "UserReport_status_idx" ON "UserReport"("status");
CREATE INDEX "UserReport_targetType_targetId_idx" ON "UserReport"("targetType", "targetId");
CREATE INDEX "UserReport_createdAt_idx" ON "UserReport"("createdAt");

ALTER TABLE "UserReport"
  ADD CONSTRAINT "UserReport_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "Admin"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
