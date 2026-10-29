ALTER TABLE "Admin"
  ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "authVersion" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "unlockMethod" TEXT NOT NULL DEFAULT 'none';

-- Preserve the existing app-lock behavior for established accounts while
-- ensuring biometrics and app PIN are represented as one exclusive choice.
UPDATE "User"
SET "unlockMethod" = CASE
  WHEN "biometricEnabled" = TRUE THEN 'biometric'
  WHEN "pin" IS NOT NULL THEN 'pin'
  ELSE 'none'
END;
