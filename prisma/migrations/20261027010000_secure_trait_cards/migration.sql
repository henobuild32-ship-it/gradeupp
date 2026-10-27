-- Keep only a masked identifier for existing cards and discard fabricated PAN/CVV values.
-- IF NOT EXISTS makes this migration safe to retry after a failed non-transactional attempt.
BEGIN;

ALTER TABLE "CardRequest"
  ADD COLUMN IF NOT EXISTS "holderName" TEXT,
  ADD COLUMN IF NOT EXISTS "jobTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "birthDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "photoData" TEXT;

ALTER TABLE "TraitCard"
  ADD COLUMN IF NOT EXISTS "last4" TEXT,
  ADD COLUMN IF NOT EXISTS "jobTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "birthDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "holderPhoto" TEXT;

UPDATE "TraitCard"
SET "last4" = NULLIF(RIGHT(REGEXP_REPLACE(COALESCE("cardNumber", ''), '[^0-9]', '', 'g'), 4), '')
WHERE "cardNumber" IS NOT NULL AND "last4" IS NULL;

-- Make the columns nullable before removing their existing values.
ALTER TABLE "TraitCard"
  ALTER COLUMN "cardNumber" DROP NOT NULL,
  ALTER COLUMN "cvv" DROP NOT NULL,
  ALTER COLUMN "expiryDate" DROP NOT NULL;

UPDATE "TraitCard"
SET "cardNumber" = NULL,
    "cvv" = NULL,
    "expiryDate" = NULL;

DROP INDEX IF EXISTS "TraitCard_cardNumber_idx";
CREATE INDEX IF NOT EXISTS "TraitCard_last4_idx" ON "TraitCard"("last4");

-- Link approved QR requests to one completed payment for a stable receipt.
ALTER TABLE "PaymentRequest" ADD COLUMN IF NOT EXISTS "transactionId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentRequest_transactionId_key" ON "PaymentRequest"("transactionId");

COMMIT;
