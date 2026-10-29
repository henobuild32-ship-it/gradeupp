-- Optional manual rollback for deployments that must return to the prior app
-- build. New admin lockout/auth-version state and unlock preferences are removed.
ALTER TABLE "User" DROP COLUMN IF EXISTS "unlockMethod";
ALTER TABLE "Admin"
  DROP COLUMN IF EXISTS "failedLoginAttempts",
  DROP COLUMN IF EXISTS "lockedUntil",
  DROP COLUMN IF EXISTS "authVersion";
