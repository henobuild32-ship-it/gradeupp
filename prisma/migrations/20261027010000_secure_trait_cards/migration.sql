-- Keep only a masked identifier for existing cards and discard fabricated PAN/CVV values.
ALTER TABLE "CardRequest"
  ADD COLUMN "holderName" TEXT,
  ADD COLUMN "jobTitle" TEXT,
  ADD COLUMN "birthDate" TIMESTAMP(3),
  ADD COLUMN "photoData" TEXT;

ALTER TABLE "TraitCard"
  ADD COLUMN "last4" TEXT,
  ADD COLUMN "jobTitle" TEXT,
  ADD COLUMN "birthDate" TIMESTAMP(3),
  ADD COLUMN "holderPhoto" TEXT;

UPDATE "TraitCard"
SET "last4" = NULLIF(RIGHT(REGEXP_REPLACE(COALESCE("cardNumber", ''), '[^0-9]', '', 'g'), 4), '')
WHERE "cardNumber" IS NOT NULL;

UPDATE "TraitCard"
SET "cardNumber" = NULL,
    "cvv" = NULL,
    "expiryDate" = NULL;

ALTER TABLE "TraitCard"
  ALTER COLUMN "cardNumber" DROP NOT NULL,
  ALTER COLUMN "cvv" DROP NOT NULL,
  ALTER COLUMN "expiryDate" DROP NOT NULL;

DROP INDEX IF EXISTS "TraitCard_cardNumber_idx";
CREATE INDEX "TraitCard_last4_idx" ON "TraitCard"("last4");

-- Link approved QR requests to one completed payment for a stable receipt.
ALTER TABLE "PaymentRequest" ADD COLUMN "transactionId" TEXT;
CREATE UNIQUE INDEX "PaymentRequest_transactionId_key" ON "PaymentRequest"("transactionId");
