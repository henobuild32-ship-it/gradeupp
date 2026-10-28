-- Retain the user row so financial records and foreign-key history stay intact,
-- while allowing the application to mark and anonymize accounts safely.
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");
