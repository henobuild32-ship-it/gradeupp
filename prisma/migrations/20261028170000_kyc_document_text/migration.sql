-- Encrypted KYC image data is larger than PostgreSQL's default VARCHAR(255).
ALTER TABLE "User"
  ALTER COLUMN "kycDocumentUrl" TYPE TEXT,
  ALTER COLUMN "kycSelfieUrl" TYPE TEXT;
