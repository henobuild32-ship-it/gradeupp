-- ============================================================
-- SCRIPT DE MIGRATION COMPLET — Gradeup → Supabase (PostgreSQL)
-- Généré automatiquement à partir du schéma Prisma
-- Ce script est IDEMPOTENT : exécutable plusieurs fois sans risque
-- ============================================================

-- ============================================================
-- 1. EXTENSION(S) NÉCESSAIRE(S)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- 2. CRÉATION DES TABLES, COLONNES, INDEX & CLÉS ÉTRANGÈRES
-- ============================================================


-- -----------------------------------------------------------
-- TABLE : "User" — Utilisateurs de la plateforme
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY,
  "phone" TEXT NOT NULL,
  "name" TEXT,
  "pseudo" TEXT,
  "email" TEXT,
  "gender" TEXT,
  "city" TEXT,
  "country" TEXT DEFAULT 'US',
  "role" TEXT DEFAULT 'client',
  "agentCode" TEXT,
  "agentNumber" TEXT,
  "address" TEXT,
  "photoId" TEXT,
  "businessName" TEXT,
  "businessType" TEXT,
  "location" TEXT,
  "systemPassword" TEXT,
  "systemPasswordSent" BOOLEAN DEFAULT FALSE,
  "validationStatus" TEXT DEFAULT 'validated',
  "validationRejectReason" TEXT,
  "password" TEXT,
  "pin" TEXT,
  "twoFactorEnabled" BOOLEAN DEFAULT FALSE,
  "twoFactorSecret" TEXT,
  "realBalance" DOUBLE PRECISION DEFAULT 0,
  "realBalanceFC" DOUBLE PRECISION DEFAULT 0,
  "bonusBalance" DOUBLE PRECISION DEFAULT 10,
  "bonusBalanceFC" DOUBLE PRECISION DEFAULT 0,
  "bonusBlocked" BOOLEAN DEFAULT FALSE,
  "bonusBlockedReason" TEXT,
  "isVerified" BOOLEAN DEFAULT FALSE,
  "suspended" BOOLEAN DEFAULT FALSE,
  "suspensionReason" TEXT,
  "tempBlocked" BOOLEAN DEFAULT FALSE,
  "pinAttempts" INTEGER DEFAULT 0,
  "hasCompletedOnboarding" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "kycStatus" TEXT DEFAULT 'none',
  "kycSubmittedAt" TIMESTAMPTZ,
  "kycVerifiedAt" TIMESTAMPTZ,
  "kycRejectReason" TEXT,
  "kycDocumentType" TEXT,
  "kycDocumentUrl" TEXT,
  "kycSelfieUrl" TEXT,
  "kycData" TEXT,
  "biometricEnabled" BOOLEAN DEFAULT FALSE,
  "biometricPublicKey" TEXT,
  "multiCurrencyBalances" TEXT,
  "referralCode" TEXT,
  "referralCodeUsed" TEXT,
  "referredBy" TEXT,
  "parentId" TEXT
);

-- Ajout des colonnes manquantes (sécurisé)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pseudo" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "country" TEXT DEFAULT 'US';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT DEFAULT 'client';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "agentCode" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "agentNumber" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "photoId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "businessName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "businessType" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "systemPassword" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "systemPasswordSent" BOOLEAN DEFAULT FALSE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "validationStatus" TEXT DEFAULT 'validated';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "validationRejectReason" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pin" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN DEFAULT FALSE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorSecret" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "realBalance" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "realBalanceFC" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bonusBalance" DOUBLE PRECISION DEFAULT 10;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bonusBalanceFC" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bonusBlocked" BOOLEAN DEFAULT FALSE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bonusBlockedReason" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN DEFAULT FALSE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "suspended" BOOLEAN DEFAULT FALSE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "suspensionReason" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tempBlocked" BOOLEAN DEFAULT FALSE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pinAttempts" INTEGER DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hasCompletedOnboarding" BOOLEAN DEFAULT FALSE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "kycStatus" TEXT DEFAULT 'none';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "kycSubmittedAt" TIMESTAMPTZ;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "kycVerifiedAt" TIMESTAMPTZ;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "kycRejectReason" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "kycDocumentType" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "kycDocumentUrl" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "kycSelfieUrl" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "kycData" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "biometricEnabled" BOOLEAN DEFAULT FALSE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "biometricPublicKey" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "multiCurrencyBalances" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referralCodeUsed" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referredBy" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "parentId" TEXT;

-- Index uniques
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX IF NOT EXISTS "User_agentCode_key" ON "User"("agentCode");
CREATE UNIQUE INDEX IF NOT EXISTS "User_agentNumber_key" ON "User"("agentNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "User_referralCode_key" ON "User"("referralCode");

-- Clé étrangère : auto-référence parentId → id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_User_parentId'
  ) THEN
    ALTER TABLE "User" ADD CONSTRAINT "fk_User_parentId"
      FOREIGN KEY ("parentId") REFERENCES "User"("id");
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "Admin" — Administrateurs du système
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Admin" (
  "id" TEXT PRIMARY KEY,
  "username" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT DEFAULT 'admin',
  "lastLogin" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "username" TEXT;
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "password" TEXT;
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "role" TEXT DEFAULT 'admin';
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "lastLogin" TIMESTAMPTZ;
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "Admin_username_key" ON "Admin"("username");


-- -----------------------------------------------------------
-- TABLE : "AdminActivityLog" — Journal d'activité des admins
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "AdminActivityLog" (
  "id" TEXT PRIMARY KEY,
  "adminId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "target" TEXT,
  "details" TEXT,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "AdminActivityLog" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "AdminActivityLog" ADD COLUMN IF NOT EXISTS "adminId" TEXT;
ALTER TABLE "AdminActivityLog" ADD COLUMN IF NOT EXISTS "action" TEXT;
ALTER TABLE "AdminActivityLog" ADD COLUMN IF NOT EXISTS "target" TEXT;
ALTER TABLE "AdminActivityLog" ADD COLUMN IF NOT EXISTS "details" TEXT;
ALTER TABLE "AdminActivityLog" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;
ALTER TABLE "AdminActivityLog" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "AdminActivityLog_adminId_idx" ON "AdminActivityLog"("adminId");
CREATE INDEX IF NOT EXISTS "AdminActivityLog_action_idx" ON "AdminActivityLog"("action");
CREATE INDEX IF NOT EXISTS "AdminActivityLog_createdAt_idx" ON "AdminActivityLog"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_AdminActivityLog_adminId') THEN
    ALTER TABLE "AdminActivityLog" ADD CONSTRAINT "fk_AdminActivityLog_adminId"
      FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE;
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "GlobalNotification" — Notifications globales
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "GlobalNotification" (
  "id" TEXT PRIMARY KEY,
  "adminId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "type" TEXT DEFAULT 'general',
  "sentToAll" BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "GlobalNotification" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "GlobalNotification" ADD COLUMN IF NOT EXISTS "adminId" TEXT;
ALTER TABLE "GlobalNotification" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "GlobalNotification" ADD COLUMN IF NOT EXISTS "message" TEXT;
ALTER TABLE "GlobalNotification" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'general';
ALTER TABLE "GlobalNotification" ADD COLUMN IF NOT EXISTS "sentToAll" BOOLEAN DEFAULT TRUE;
ALTER TABLE "GlobalNotification" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "GlobalNotification_adminId_idx" ON "GlobalNotification"("adminId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_GlobalNotification_adminId') THEN
    ALTER TABLE "GlobalNotification" ADD CONSTRAINT "fk_GlobalNotification_adminId"
      FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE;
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "Transaction" — Transactions financières
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Transaction" (
  "id" TEXT PRIMARY KEY,
  "type" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "fee" DOUBLE PRECISION DEFAULT 0,
  "feeFromBonus" BOOLEAN,
  "currency" TEXT DEFAULT 'USD',
  "status" TEXT DEFAULT 'pending',
  "senderId" TEXT NOT NULL,
  "receiverId" TEXT NOT NULL,
  "description" TEXT,
  "agentId" TEXT,
  "blockReason" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "type" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "amount" DOUBLE PRECISION;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "fee" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "feeFromBonus" BOOLEAN;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "senderId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "receiverId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "agentId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "blockReason" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "Transaction_senderId_idx" ON "Transaction"("senderId");
CREATE INDEX IF NOT EXISTS "Transaction_receiverId_idx" ON "Transaction"("receiverId");
CREATE INDEX IF NOT EXISTS "Transaction_agentId_idx" ON "Transaction"("agentId");
CREATE INDEX IF NOT EXISTS "Transaction_status_idx" ON "Transaction"("status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_Transaction_senderId') THEN
    ALTER TABLE "Transaction" ADD CONSTRAINT "fk_Transaction_senderId"
      FOREIGN KEY ("senderId") REFERENCES "User"("id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_Transaction_receiverId') THEN
    ALTER TABLE "Transaction" ADD CONSTRAINT "fk_Transaction_receiverId"
      FOREIGN KEY ("receiverId") REFERENCES "User"("id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_Transaction_agentId') THEN
    ALTER TABLE "Transaction" ADD CONSTRAINT "fk_Transaction_agentId"
      FOREIGN KEY ("agentId") REFERENCES "User"("id");
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "Deposit" — Dépôts utilisateur
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Deposit" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT DEFAULT 'USD',
  "method" TEXT DEFAULT 'mobile_money',
  "status" TEXT DEFAULT 'pending',
  "agentId" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "Deposit" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "Deposit" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Deposit" ADD COLUMN IF NOT EXISTS "amount" DOUBLE PRECISION;
ALTER TABLE "Deposit" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "Deposit" ADD COLUMN IF NOT EXISTS "method" TEXT DEFAULT 'mobile_money';
ALTER TABLE "Deposit" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "Deposit" ADD COLUMN IF NOT EXISTS "agentId" TEXT;
ALTER TABLE "Deposit" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_Deposit_userId') THEN
    ALTER TABLE "Deposit" ADD CONSTRAINT "fk_Deposit_userId"
      FOREIGN KEY ("userId") REFERENCES "User"("id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_Deposit_agentId') THEN
    ALTER TABLE "Deposit" ADD CONSTRAINT "fk_Deposit_agentId"
      FOREIGN KEY ("agentId") REFERENCES "User"("id");
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "Withdrawal" — Retraits utilisateur
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Withdrawal" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "fee" DOUBLE PRECISION DEFAULT 0,
  "feeFromBonus" BOOLEAN,
  "currency" TEXT DEFAULT 'USD',
  "method" TEXT DEFAULT 'mobile_money',
  "status" TEXT DEFAULT 'pending',
  "agentId" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "Withdrawal" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "Withdrawal" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Withdrawal" ADD COLUMN IF NOT EXISTS "amount" DOUBLE PRECISION;
ALTER TABLE "Withdrawal" ADD COLUMN IF NOT EXISTS "fee" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Withdrawal" ADD COLUMN IF NOT EXISTS "feeFromBonus" BOOLEAN;
ALTER TABLE "Withdrawal" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "Withdrawal" ADD COLUMN IF NOT EXISTS "method" TEXT DEFAULT 'mobile_money';
ALTER TABLE "Withdrawal" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "Withdrawal" ADD COLUMN IF NOT EXISTS "agentId" TEXT;
ALTER TABLE "Withdrawal" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_Withdrawal_userId') THEN
    ALTER TABLE "Withdrawal" ADD CONSTRAINT "fk_Withdrawal_userId"
      FOREIGN KEY ("userId") REFERENCES "User"("id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_Withdrawal_agentId') THEN
    ALTER TABLE "Withdrawal" ADD CONSTRAINT "fk_Withdrawal_agentId"
      FOREIGN KEY ("agentId") REFERENCES "User"("id");
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "MarketplaceProduct" — Produits de la marketplace
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "MarketplaceProduct" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "price" DOUBLE PRECISION NOT NULL,
  "currency" TEXT DEFAULT 'USD',
  "category" TEXT NOT NULL,
  "imageUrl" TEXT,
  "sellerId" TEXT,
  "active" BOOLEAN DEFAULT TRUE,
  "bonusEnabled" BOOLEAN DEFAULT FALSE,
  "bonusOnly" BOOLEAN DEFAULT FALSE,
  "bonusPrice" DOUBLE PRECISION,
  "bonusMaxQty" INTEGER,
  "bonusExpiryAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "MarketplaceProduct" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "MarketplaceProduct" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "MarketplaceProduct" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "MarketplaceProduct" ADD COLUMN IF NOT EXISTS "price" DOUBLE PRECISION;
ALTER TABLE "MarketplaceProduct" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "MarketplaceProduct" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "MarketplaceProduct" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "MarketplaceProduct" ADD COLUMN IF NOT EXISTS "sellerId" TEXT;
ALTER TABLE "MarketplaceProduct" ADD COLUMN IF NOT EXISTS "active" BOOLEAN DEFAULT TRUE;
ALTER TABLE "MarketplaceProduct" ADD COLUMN IF NOT EXISTS "bonusEnabled" BOOLEAN DEFAULT FALSE;
ALTER TABLE "MarketplaceProduct" ADD COLUMN IF NOT EXISTS "bonusOnly" BOOLEAN DEFAULT FALSE;
ALTER TABLE "MarketplaceProduct" ADD COLUMN IF NOT EXISTS "bonusPrice" DOUBLE PRECISION;
ALTER TABLE "MarketplaceProduct" ADD COLUMN IF NOT EXISTS "bonusMaxQty" INTEGER;
ALTER TABLE "MarketplaceProduct" ADD COLUMN IF NOT EXISTS "bonusExpiryAt" TIMESTAMPTZ;
ALTER TABLE "MarketplaceProduct" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "MarketplaceProduct" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_MarketplaceProduct_sellerId') THEN
    ALTER TABLE "MarketplaceProduct" ADD CONSTRAINT "fk_MarketplaceProduct_sellerId"
      FOREIGN KEY ("sellerId") REFERENCES "User"("id");
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "Purchase" — Achats marketplace
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Purchase" (
  "id" TEXT PRIMARY KEY,
  "productId" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "usedBonus" DOUBLE PRECISION DEFAULT 0,
  "usedReal" DOUBLE PRECISION DEFAULT 0,
  "status" TEXT DEFAULT 'completed',
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "productId" TEXT;
ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "buyerId" TEXT;
ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "amount" DOUBLE PRECISION;
ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "usedBonus" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "usedReal" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'completed';
ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_Purchase_productId') THEN
    ALTER TABLE "Purchase" ADD CONSTRAINT "fk_Purchase_productId"
      FOREIGN KEY ("productId") REFERENCES "MarketplaceProduct"("id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_Purchase_buyerId') THEN
    ALTER TABLE "Purchase" ADD CONSTRAINT "fk_Purchase_buyerId"
      FOREIGN KEY ("buyerId") REFERENCES "User"("id");
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "BarterOffer" — Offres de troc
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "BarterOffer" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "offeredBy" TEXT NOT NULL,
  "wantedItem" TEXT,
  "images" TEXT,
  "status" TEXT DEFAULT 'active',
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "BarterOffer" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "BarterOffer" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "BarterOffer" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "BarterOffer" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "BarterOffer" ADD COLUMN IF NOT EXISTS "offeredBy" TEXT;
ALTER TABLE "BarterOffer" ADD COLUMN IF NOT EXISTS "wantedItem" TEXT;
ALTER TABLE "BarterOffer" ADD COLUMN IF NOT EXISTS "images" TEXT;
ALTER TABLE "BarterOffer" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "BarterOffer" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "BarterOffer" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_BarterOffer_offeredBy') THEN
    ALTER TABLE "BarterOffer" ADD CONSTRAINT "fk_BarterOffer_offeredBy"
      FOREIGN KEY ("offeredBy") REFERENCES "User"("id");
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "BarterChat" — Salons de discussion troc
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "BarterChat" (
  "id" TEXT PRIMARY KEY,
  "offerId" TEXT NOT NULL,
  "initiatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "BarterChat" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "BarterChat" ADD COLUMN IF NOT EXISTS "offerId" TEXT;
ALTER TABLE "BarterChat" ADD COLUMN IF NOT EXISTS "initiatedBy" TEXT;
ALTER TABLE "BarterChat" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_BarterChat_offerId') THEN
    ALTER TABLE "BarterChat" ADD CONSTRAINT "fk_BarterChat_offerId"
      FOREIGN KEY ("offerId") REFERENCES "BarterOffer"("id");
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "BarterChatParticipant" — Participants aux salons de troc
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "BarterChatParticipant" (
  "id" TEXT PRIMARY KEY,
  "chatId" TEXT NOT NULL,
  "userId" TEXT NOT NULL
);

ALTER TABLE "BarterChatParticipant" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "BarterChatParticipant" ADD COLUMN IF NOT EXISTS "chatId" TEXT;
ALTER TABLE "BarterChatParticipant" ADD COLUMN IF NOT EXISTS "userId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "BarterChatParticipant_chatId_userId_key" ON "BarterChatParticipant"("chatId", "userId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_BarterChatParticipant_chatId') THEN
    ALTER TABLE "BarterChatParticipant" ADD CONSTRAINT "fk_BarterChatParticipant_chatId"
      FOREIGN KEY ("chatId") REFERENCES "BarterChat"("id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_BarterChatParticipant_userId') THEN
    ALTER TABLE "BarterChatParticipant" ADD CONSTRAINT "fk_BarterChatParticipant_userId"
      FOREIGN KEY ("userId") REFERENCES "User"("id");
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "BarterMessage" — Messages de troc
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "BarterMessage" (
  "id" TEXT PRIMARY KEY,
  "chatId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "BarterMessage" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "BarterMessage" ADD COLUMN IF NOT EXISTS "chatId" TEXT;
ALTER TABLE "BarterMessage" ADD COLUMN IF NOT EXISTS "senderId" TEXT;
ALTER TABLE "BarterMessage" ADD COLUMN IF NOT EXISTS "content" TEXT;
ALTER TABLE "BarterMessage" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_BarterMessage_chatId') THEN
    ALTER TABLE "BarterMessage" ADD CONSTRAINT "fk_BarterMessage_chatId"
      FOREIGN KEY ("chatId") REFERENCES "BarterChat"("id");
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "Notification" — Notifications utilisateur
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "read" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "message" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "type" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "read" BOOLEAN DEFAULT FALSE;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_Notification_userId') THEN
    ALTER TABLE "Notification" ADD CONSTRAINT "fk_Notification_userId"
      FOREIGN KEY ("userId") REFERENCES "User"("id");
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "CreditPurchase" — Achat de crédit téléphonique
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "CreditPurchase" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "network" TEXT NOT NULL,
  "phoneNumber" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT DEFAULT 'USD',
  "status" TEXT DEFAULT 'completed',
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "CreditPurchase" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "CreditPurchase" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "CreditPurchase" ADD COLUMN IF NOT EXISTS "network" TEXT;
ALTER TABLE "CreditPurchase" ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;
ALTER TABLE "CreditPurchase" ADD COLUMN IF NOT EXISTS "amount" DOUBLE PRECISION;
ALTER TABLE "CreditPurchase" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "CreditPurchase" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'completed';
ALTER TABLE "CreditPurchase" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "CreditPurchase_userId_idx" ON "CreditPurchase"("userId");
CREATE INDEX IF NOT EXISTS "CreditPurchase_network_idx" ON "CreditPurchase"("network");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_CreditPurchase_userId') THEN
    ALTER TABLE "CreditPurchase" ADD CONSTRAINT "fk_CreditPurchase_userId"
      FOREIGN KEY ("userId") REFERENCES "User"("id");
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "BillPayment" — Paiement de factures
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "BillPayment" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "billType" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT DEFAULT 'USD',
  "status" TEXT DEFAULT 'completed',
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "BillPayment" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "BillPayment" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "BillPayment" ADD COLUMN IF NOT EXISTS "billType" TEXT;
ALTER TABLE "BillPayment" ADD COLUMN IF NOT EXISTS "reference" TEXT;
ALTER TABLE "BillPayment" ADD COLUMN IF NOT EXISTS "amount" DOUBLE PRECISION;
ALTER TABLE "BillPayment" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "BillPayment" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'completed';
ALTER TABLE "BillPayment" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "BillPayment_userId_idx" ON "BillPayment"("userId");
CREATE INDEX IF NOT EXISTS "BillPayment_billType_idx" ON "BillPayment"("billType");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_BillPayment_userId') THEN
    ALTER TABLE "BillPayment" ADD CONSTRAINT "fk_BillPayment_userId"
      FOREIGN KEY ("userId") REFERENCES "User"("id");
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "BonusHistory" — Historique des bonus
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "BonusHistory" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT DEFAULT 'USD',
  "description" TEXT,
  "adminId" TEXT,
  "campaignId" TEXT,
  "metadata" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "BonusHistory" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "BonusHistory" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "BonusHistory" ADD COLUMN IF NOT EXISTS "type" TEXT;
ALTER TABLE "BonusHistory" ADD COLUMN IF NOT EXISTS "amount" DOUBLE PRECISION;
ALTER TABLE "BonusHistory" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "BonusHistory" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "BonusHistory" ADD COLUMN IF NOT EXISTS "adminId" TEXT;
ALTER TABLE "BonusHistory" ADD COLUMN IF NOT EXISTS "campaignId" TEXT;
ALTER TABLE "BonusHistory" ADD COLUMN IF NOT EXISTS "metadata" TEXT;
ALTER TABLE "BonusHistory" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "BonusHistory_userId_idx" ON "BonusHistory"("userId");
CREATE INDEX IF NOT EXISTS "BonusHistory_type_idx" ON "BonusHistory"("type");
CREATE INDEX IF NOT EXISTS "BonusHistory_createdAt_idx" ON "BonusHistory"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_BonusHistory_userId') THEN
    ALTER TABLE "BonusHistory" ADD CONSTRAINT "fk_BonusHistory_userId"
      FOREIGN KEY ("userId") REFERENCES "User"("id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_BonusHistory_campaignId') THEN
    ALTER TABLE "BonusHistory" ADD CONSTRAINT "fk_BonusHistory_campaignId"
      FOREIGN KEY ("campaignId") REFERENCES "BonusCampaign"("id");
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "BonusCampaign" — Campagnes de bonus
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "BonusCampaign" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "bonusAmount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT DEFAULT 'USD',
  "targetUsers" TEXT DEFAULT 'all',
  "targetUserIds" TEXT,
  "status" TEXT DEFAULT 'active',
  "maxDistributions" INTEGER,
  "currentCount" INTEGER DEFAULT 0,
  "startDate" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "endDate" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "adminId" TEXT NOT NULL
);

ALTER TABLE "BonusCampaign" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "BonusCampaign" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "BonusCampaign" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "BonusCampaign" ADD COLUMN IF NOT EXISTS "bonusAmount" DOUBLE PRECISION;
ALTER TABLE "BonusCampaign" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "BonusCampaign" ADD COLUMN IF NOT EXISTS "targetUsers" TEXT DEFAULT 'all';
ALTER TABLE "BonusCampaign" ADD COLUMN IF NOT EXISTS "targetUserIds" TEXT;
ALTER TABLE "BonusCampaign" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "BonusCampaign" ADD COLUMN IF NOT EXISTS "maxDistributions" INTEGER;
ALTER TABLE "BonusCampaign" ADD COLUMN IF NOT EXISTS "currentCount" INTEGER DEFAULT 0;
ALTER TABLE "BonusCampaign" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "BonusCampaign" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMPTZ;
ALTER TABLE "BonusCampaign" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "BonusCampaign" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "BonusCampaign" ADD COLUMN IF NOT EXISTS "adminId" TEXT;

CREATE INDEX IF NOT EXISTS "BonusCampaign_status_idx" ON "BonusCampaign"("status");
CREATE INDEX IF NOT EXISTS "BonusCampaign_startDate_idx" ON "BonusCampaign"("startDate");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_BonusCampaign_adminId') THEN
    ALTER TABLE "BonusCampaign" ADD CONSTRAINT "fk_BonusCampaign_adminId"
      FOREIGN KEY ("adminId") REFERENCES "Admin"("id");
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "AgentMessage" — Messages admin → agent
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "AgentMessage" (
  "id" TEXT PRIMARY KEY,
  "adminId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "type" TEXT DEFAULT 'individual',
  "isRead" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "AgentMessage" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "AgentMessage" ADD COLUMN IF NOT EXISTS "adminId" TEXT;
ALTER TABLE "AgentMessage" ADD COLUMN IF NOT EXISTS "recipientId" TEXT;
ALTER TABLE "AgentMessage" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "AgentMessage" ADD COLUMN IF NOT EXISTS "message" TEXT;
ALTER TABLE "AgentMessage" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'individual';
ALTER TABLE "AgentMessage" ADD COLUMN IF NOT EXISTS "isRead" BOOLEAN DEFAULT FALSE;
ALTER TABLE "AgentMessage" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "AgentMessage_recipientId_idx" ON "AgentMessage"("recipientId");
CREATE INDEX IF NOT EXISTS "AgentMessage_adminId_idx" ON "AgentMessage"("adminId");
CREATE INDEX IF NOT EXISTS "AgentMessage_isRead_idx" ON "AgentMessage"("isRead");
CREATE INDEX IF NOT EXISTS "AgentMessage_createdAt_idx" ON "AgentMessage"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_AgentMessage_adminId') THEN
    ALTER TABLE "AgentMessage" ADD CONSTRAINT "fk_AgentMessage_adminId"
      FOREIGN KEY ("adminId") REFERENCES "Admin"("id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_AgentMessage_recipientId') THEN
    ALTER TABLE "AgentMessage" ADD CONSTRAINT "fk_AgentMessage_recipientId"
      FOREIGN KEY ("recipientId") REFERENCES "User"("id");
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "CardRequest" — Demandes de carte
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "CardRequest" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "cardType" TEXT DEFAULT 'USD',
  "status" TEXT DEFAULT 'pending',
  "rejectReason" TEXT,
  "adminId" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "CardRequest" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "CardRequest" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "CardRequest" ADD COLUMN IF NOT EXISTS "cardType" TEXT DEFAULT 'USD';
ALTER TABLE "CardRequest" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "CardRequest" ADD COLUMN IF NOT EXISTS "rejectReason" TEXT;
ALTER TABLE "CardRequest" ADD COLUMN IF NOT EXISTS "adminId" TEXT;
ALTER TABLE "CardRequest" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "CardRequest" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "CardRequest_userId_idx" ON "CardRequest"("userId");
CREATE INDEX IF NOT EXISTS "CardRequest_status_idx" ON "CardRequest"("status");
CREATE INDEX IF NOT EXISTS "CardRequest_createdAt_idx" ON "CardRequest"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_CardRequest_userId') THEN
    ALTER TABLE "CardRequest" ADD CONSTRAINT "fk_CardRequest_userId"
      FOREIGN KEY ("userId") REFERENCES "User"("id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_CardRequest_adminId') THEN
    ALTER TABLE "CardRequest" ADD CONSTRAINT "fk_CardRequest_adminId"
      FOREIGN KEY ("adminId") REFERENCES "Admin"("id");
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "TraitCard" — Cartes physiques/virtuelles
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "TraitCard" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "cardRequestId" TEXT NOT NULL,
  "cardType" TEXT DEFAULT 'USD',
  "cardNumber" TEXT NOT NULL,
  "cvv" TEXT NOT NULL,
  "qrCode" TEXT NOT NULL,
  "expiryDate" TEXT NOT NULL,
  "status" TEXT DEFAULT 'active',
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "TraitCard" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "TraitCard" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "TraitCard" ADD COLUMN IF NOT EXISTS "cardRequestId" TEXT;
ALTER TABLE "TraitCard" ADD COLUMN IF NOT EXISTS "cardType" TEXT DEFAULT 'USD';
ALTER TABLE "TraitCard" ADD COLUMN IF NOT EXISTS "cardNumber" TEXT;
ALTER TABLE "TraitCard" ADD COLUMN IF NOT EXISTS "cvv" TEXT;
ALTER TABLE "TraitCard" ADD COLUMN IF NOT EXISTS "qrCode" TEXT;
ALTER TABLE "TraitCard" ADD COLUMN IF NOT EXISTS "expiryDate" TEXT;
ALTER TABLE "TraitCard" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "TraitCard" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "TraitCard" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "TraitCard_cardRequestId_key" ON "TraitCard"("cardRequestId");
CREATE UNIQUE INDEX IF NOT EXISTS "TraitCard_cardNumber_key" ON "TraitCard"("cardNumber");
CREATE INDEX IF NOT EXISTS "TraitCard_userId_idx" ON "TraitCard"("userId");
CREATE INDEX IF NOT EXISTS "TraitCard_cardNumber_idx" ON "TraitCard"("cardNumber");
CREATE INDEX IF NOT EXISTS "TraitCard_status_idx" ON "TraitCard"("status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_TraitCard_userId') THEN
    ALTER TABLE "TraitCard" ADD CONSTRAINT "fk_TraitCard_userId"
      FOREIGN KEY ("userId") REFERENCES "User"("id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_TraitCard_cardRequestId') THEN
    ALTER TABLE "TraitCard" ADD CONSTRAINT "fk_TraitCard_cardRequestId"
      FOREIGN KEY ("cardRequestId") REFERENCES "CardRequest"("id");
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "CardPayment" — Paiements par carte
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "CardPayment" (
  "id" TEXT PRIMARY KEY,
  "cardId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT DEFAULT 'USD',
  "description" TEXT,
  "status" TEXT DEFAULT 'pending',
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "CardPayment" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "CardPayment" ADD COLUMN IF NOT EXISTS "cardId" TEXT;
ALTER TABLE "CardPayment" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "CardPayment" ADD COLUMN IF NOT EXISTS "amount" DOUBLE PRECISION;
ALTER TABLE "CardPayment" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "CardPayment" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "CardPayment" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "CardPayment" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "CardPayment_cardId_idx" ON "CardPayment"("cardId");
CREATE INDEX IF NOT EXISTS "CardPayment_userId_idx" ON "CardPayment"("userId");
CREATE INDEX IF NOT EXISTS "CardPayment_status_idx" ON "CardPayment"("status");
CREATE INDEX IF NOT EXISTS "CardPayment_createdAt_idx" ON "CardPayment"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_CardPayment_cardId') THEN
    ALTER TABLE "CardPayment" ADD CONSTRAINT "fk_CardPayment_cardId"
      FOREIGN KEY ("cardId") REFERENCES "TraitCard"("id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_CardPayment_userId') THEN
    ALTER TABLE "CardPayment" ADD CONSTRAINT "fk_CardPayment_userId"
      FOREIGN KEY ("userId") REFERENCES "User"("id");
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "AdminClientMessage" — Messages admin → client
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "AdminClientMessage" (
  "id" TEXT PRIMARY KEY,
  "adminId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "type" TEXT DEFAULT 'individual',
  "allowCopy" BOOLEAN DEFAULT FALSE,
  "isRead" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "AdminClientMessage" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "AdminClientMessage" ADD COLUMN IF NOT EXISTS "adminId" TEXT;
ALTER TABLE "AdminClientMessage" ADD COLUMN IF NOT EXISTS "recipientId" TEXT;
ALTER TABLE "AdminClientMessage" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "AdminClientMessage" ADD COLUMN IF NOT EXISTS "message" TEXT;
ALTER TABLE "AdminClientMessage" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'individual';
ALTER TABLE "AdminClientMessage" ADD COLUMN IF NOT EXISTS "allowCopy" BOOLEAN DEFAULT FALSE;
ALTER TABLE "AdminClientMessage" ADD COLUMN IF NOT EXISTS "isRead" BOOLEAN DEFAULT FALSE;
ALTER TABLE "AdminClientMessage" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "AdminClientMessage_recipientId_idx" ON "AdminClientMessage"("recipientId");
CREATE INDEX IF NOT EXISTS "AdminClientMessage_adminId_idx" ON "AdminClientMessage"("adminId");
CREATE INDEX IF NOT EXISTS "AdminClientMessage_isRead_idx" ON "AdminClientMessage"("isRead");
CREATE INDEX IF NOT EXISTS "AdminClientMessage_createdAt_idx" ON "AdminClientMessage"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_AdminClientMessage_adminId') THEN
    ALTER TABLE "AdminClientMessage" ADD CONSTRAINT "fk_AdminClientMessage_adminId"
      FOREIGN KEY ("adminId") REFERENCES "Admin"("id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_AdminClientMessage_recipientId') THEN
    ALTER TABLE "AdminClientMessage" ADD CONSTRAINT "fk_AdminClientMessage_recipientId"
      FOREIGN KEY ("recipientId") REFERENCES "User"("id");
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "AppVersion" — Versions de l'application
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "AppVersion" (
  "id" TEXT PRIMARY KEY,
  "version" TEXT NOT NULL,
  "description" TEXT,
  "downloadUrl" TEXT,
  "isCurrent" BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "AppVersion" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "AppVersion" ADD COLUMN IF NOT EXISTS "version" TEXT;
ALTER TABLE "AppVersion" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "AppVersion" ADD COLUMN IF NOT EXISTS "downloadUrl" TEXT;
ALTER TABLE "AppVersion" ADD COLUMN IF NOT EXISTS "isCurrent" BOOLEAN DEFAULT TRUE;
ALTER TABLE "AppVersion" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "AppVersion_version_key" ON "AppVersion"("version");


-- -----------------------------------------------------------
-- TABLE : "Developer" — Développeurs API
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Developer" (
  "id" TEXT PRIMARY KEY,
  "fullName" TEXT NOT NULL,
  "company" TEXT,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "appName" TEXT NOT NULL,
  "projectType" TEXT NOT NULL,
  "description" TEXT,
  "siteUrl" TEXT,
  "estimatedUsers" INTEGER,
  "status" TEXT DEFAULT 'pending',
  "rejectReason" TEXT,
  "commissionRate" DOUBLE PRECISION DEFAULT 0.015,
  "totalTransactions" INTEGER DEFAULT 0,
  "totalVolume" DOUBLE PRECISION DEFAULT 0,
  "totalCommission" DOUBLE PRECISION DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "Developer" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "Developer" ADD COLUMN IF NOT EXISTS "fullName" TEXT;
ALTER TABLE "Developer" ADD COLUMN IF NOT EXISTS "company" TEXT;
ALTER TABLE "Developer" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Developer" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Developer" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "Developer" ADD COLUMN IF NOT EXISTS "appName" TEXT;
ALTER TABLE "Developer" ADD COLUMN IF NOT EXISTS "projectType" TEXT;
ALTER TABLE "Developer" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Developer" ADD COLUMN IF NOT EXISTS "siteUrl" TEXT;
ALTER TABLE "Developer" ADD COLUMN IF NOT EXISTS "estimatedUsers" INTEGER;
ALTER TABLE "Developer" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "Developer" ADD COLUMN IF NOT EXISTS "rejectReason" TEXT;
ALTER TABLE "Developer" ADD COLUMN IF NOT EXISTS "commissionRate" DOUBLE PRECISION DEFAULT 0.015;
ALTER TABLE "Developer" ADD COLUMN IF NOT EXISTS "totalTransactions" INTEGER DEFAULT 0;
ALTER TABLE "Developer" ADD COLUMN IF NOT EXISTS "totalVolume" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Developer" ADD COLUMN IF NOT EXISTS "totalCommission" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Developer" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Developer" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "Developer_email_key" ON "Developer"("email");
CREATE INDEX IF NOT EXISTS "Developer_status_idx" ON "Developer"("status");
CREATE INDEX IF NOT EXISTS "Developer_email_idx" ON "Developer"("email");
CREATE INDEX IF NOT EXISTS "Developer_createdAt_idx" ON "Developer"("createdAt");


-- -----------------------------------------------------------
-- TABLE : "DeveloperApiKey" — Clés API des développeurs
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "DeveloperApiKey" (
  "id" TEXT PRIMARY KEY,
  "developerId" TEXT NOT NULL,
  "publicKey" TEXT NOT NULL,
  "secretKey" TEXT NOT NULL,
  "webhookUrl" TEXT,
  "mode" TEXT DEFAULT 'test',
  "isActive" BOOLEAN DEFAULT TRUE,
  "expiresAt" TIMESTAMPTZ,
  "lastUsedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "DeveloperApiKey" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "DeveloperApiKey" ADD COLUMN IF NOT EXISTS "developerId" TEXT;
ALTER TABLE "DeveloperApiKey" ADD COLUMN IF NOT EXISTS "publicKey" TEXT;
ALTER TABLE "DeveloperApiKey" ADD COLUMN IF NOT EXISTS "secretKey" TEXT;
ALTER TABLE "DeveloperApiKey" ADD COLUMN IF NOT EXISTS "webhookUrl" TEXT;
ALTER TABLE "DeveloperApiKey" ADD COLUMN IF NOT EXISTS "mode" TEXT DEFAULT 'test';
ALTER TABLE "DeveloperApiKey" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT TRUE;
ALTER TABLE "DeveloperApiKey" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMPTZ;
ALTER TABLE "DeveloperApiKey" ADD COLUMN IF NOT EXISTS "lastUsedAt" TIMESTAMPTZ;
ALTER TABLE "DeveloperApiKey" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "DeveloperApiKey_publicKey_key" ON "DeveloperApiKey"("publicKey");
CREATE INDEX IF NOT EXISTS "DeveloperApiKey_developerId_idx" ON "DeveloperApiKey"("developerId");
CREATE INDEX IF NOT EXISTS "DeveloperApiKey_publicKey_idx" ON "DeveloperApiKey"("publicKey");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_DeveloperApiKey_developerId') THEN
    ALTER TABLE "DeveloperApiKey" ADD CONSTRAINT "fk_DeveloperApiKey_developerId"
      FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE CASCADE;
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "ApiCommission" — Commissions API
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ApiCommission" (
  "id" TEXT PRIMARY KEY,
  "developerId" TEXT NOT NULL,
  "transactionId" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "commission" DOUBLE PRECISION NOT NULL,
  "currency" TEXT DEFAULT 'USD',
  "status" TEXT DEFAULT 'collected',
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "ApiCommission" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "ApiCommission" ADD COLUMN IF NOT EXISTS "developerId" TEXT;
ALTER TABLE "ApiCommission" ADD COLUMN IF NOT EXISTS "transactionId" TEXT;
ALTER TABLE "ApiCommission" ADD COLUMN IF NOT EXISTS "amount" DOUBLE PRECISION;
ALTER TABLE "ApiCommission" ADD COLUMN IF NOT EXISTS "commission" DOUBLE PRECISION;
ALTER TABLE "ApiCommission" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "ApiCommission" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'collected';
ALTER TABLE "ApiCommission" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "ApiCommission_developerId_idx" ON "ApiCommission"("developerId");
CREATE INDEX IF NOT EXISTS "ApiCommission_createdAt_idx" ON "ApiCommission"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ApiCommission_developerId') THEN
    ALTER TABLE "ApiCommission" ADD CONSTRAINT "fk_ApiCommission_developerId"
      FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE CASCADE;
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "SecurityLog" — Journal de sécurité
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "SecurityLog" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "adminId" TEXT,
  "action" TEXT NOT NULL,
  "details" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "riskLevel" TEXT DEFAULT 'low',
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "SecurityLog" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "SecurityLog" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "SecurityLog" ADD COLUMN IF NOT EXISTS "adminId" TEXT;
ALTER TABLE "SecurityLog" ADD COLUMN IF NOT EXISTS "action" TEXT;
ALTER TABLE "SecurityLog" ADD COLUMN IF NOT EXISTS "details" TEXT;
ALTER TABLE "SecurityLog" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;
ALTER TABLE "SecurityLog" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
ALTER TABLE "SecurityLog" ADD COLUMN IF NOT EXISTS "riskLevel" TEXT DEFAULT 'low';
ALTER TABLE "SecurityLog" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "SecurityLog_userId_idx" ON "SecurityLog"("userId");
CREATE INDEX IF NOT EXISTS "SecurityLog_adminId_idx" ON "SecurityLog"("adminId");
CREATE INDEX IF NOT EXISTS "SecurityLog_action_idx" ON "SecurityLog"("action");
CREATE INDEX IF NOT EXISTS "SecurityLog_riskLevel_idx" ON "SecurityLog"("riskLevel");
CREATE INDEX IF NOT EXISTS "SecurityLog_createdAt_idx" ON "SecurityLog"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_SecurityLog_userId') THEN
    ALTER TABLE "SecurityLog" ADD CONSTRAINT "fk_SecurityLog_userId"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "InternationalTransfer" — Transferts internationaux
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "InternationalTransfer" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "recipientName" TEXT NOT NULL,
  "recipientPhone" TEXT,
  "recipientAccount" TEXT,
  "recipientBank" TEXT,
  "swiftBic" TEXT,
  "iban" TEXT,
  "country" TEXT NOT NULL,
  "currency" TEXT DEFAULT 'USD',
  "amount" DOUBLE PRECISION NOT NULL,
  "fee" DOUBLE PRECISION DEFAULT 0,
  "commission" DOUBLE PRECISION DEFAULT 0,
  "exchangeRate" DOUBLE PRECISION,
  "amountReceived" DOUBLE PRECISION,
  "status" TEXT DEFAULT 'pending',
  "otpVerified" BOOLEAN DEFAULT FALSE,
  "description" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "InternationalTransfer" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "InternationalTransfer" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "InternationalTransfer" ADD COLUMN IF NOT EXISTS "type" TEXT;
ALTER TABLE "InternationalTransfer" ADD COLUMN IF NOT EXISTS "recipientName" TEXT;
ALTER TABLE "InternationalTransfer" ADD COLUMN IF NOT EXISTS "recipientPhone" TEXT;
ALTER TABLE "InternationalTransfer" ADD COLUMN IF NOT EXISTS "recipientAccount" TEXT;
ALTER TABLE "InternationalTransfer" ADD COLUMN IF NOT EXISTS "recipientBank" TEXT;
ALTER TABLE "InternationalTransfer" ADD COLUMN IF NOT EXISTS "swiftBic" TEXT;
ALTER TABLE "InternationalTransfer" ADD COLUMN IF NOT EXISTS "iban" TEXT;
ALTER TABLE "InternationalTransfer" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "InternationalTransfer" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';
ALTER TABLE "InternationalTransfer" ADD COLUMN IF NOT EXISTS "amount" DOUBLE PRECISION;
ALTER TABLE "InternationalTransfer" ADD COLUMN IF NOT EXISTS "fee" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "InternationalTransfer" ADD COLUMN IF NOT EXISTS "commission" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "InternationalTransfer" ADD COLUMN IF NOT EXISTS "exchangeRate" DOUBLE PRECISION;
ALTER TABLE "InternationalTransfer" ADD COLUMN IF NOT EXISTS "amountReceived" DOUBLE PRECISION;
ALTER TABLE "InternationalTransfer" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "InternationalTransfer" ADD COLUMN IF NOT EXISTS "otpVerified" BOOLEAN DEFAULT FALSE;
ALTER TABLE "InternationalTransfer" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "InternationalTransfer" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "InternationalTransfer_userId_idx" ON "InternationalTransfer"("userId");
CREATE INDEX IF NOT EXISTS "InternationalTransfer_status_idx" ON "InternationalTransfer"("status");
CREATE INDEX IF NOT EXISTS "InternationalTransfer_type_idx" ON "InternationalTransfer"("type");
CREATE INDEX IF NOT EXISTS "InternationalTransfer_createdAt_idx" ON "InternationalTransfer"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_InternationalTransfer_userId') THEN
    ALTER TABLE "InternationalTransfer" ADD CONSTRAINT "fk_InternationalTransfer_userId"
      FOREIGN KEY ("userId") REFERENCES "User"("id");
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "SupportTicket" — Tickets de support
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "SupportTicket" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "priority" TEXT DEFAULT 'medium',
  "status" TEXT DEFAULT 'open',
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "subject" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "message" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "priority" TEXT DEFAULT 'medium';
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'open';
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "SupportTicket_userId_idx" ON "SupportTicket"("userId");
CREATE INDEX IF NOT EXISTS "SupportTicket_status_idx" ON "SupportTicket"("status");
CREATE INDEX IF NOT EXISTS "SupportTicket_createdAt_idx" ON "SupportTicket"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_SupportTicket_userId') THEN
    ALTER TABLE "SupportTicket" ADD CONSTRAINT "fk_SupportTicket_userId"
      FOREIGN KEY ("userId") REFERENCES "User"("id");
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "SupportMessage" — Messages des tickets support
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "SupportMessage" (
  "id" TEXT PRIMARY KEY,
  "ticketId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "SupportMessage" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "SupportMessage" ADD COLUMN IF NOT EXISTS "ticketId" TEXT;
ALTER TABLE "SupportMessage" ADD COLUMN IF NOT EXISTS "senderId" TEXT;
ALTER TABLE "SupportMessage" ADD COLUMN IF NOT EXISTS "message" TEXT;
ALTER TABLE "SupportMessage" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "SupportMessage_ticketId_idx" ON "SupportMessage"("ticketId");
CREATE INDEX IF NOT EXISTS "SupportMessage_createdAt_idx" ON "SupportMessage"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_SupportMessage_ticketId') THEN
    ALTER TABLE "SupportMessage" ADD CONSTRAINT "fk_SupportMessage_ticketId"
      FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE;
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "SystemConfig" — Configuration système
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "SystemConfig" (
  "id" TEXT PRIMARY KEY,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "key" TEXT;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "value" TEXT;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "SystemConfig_key_key" ON "SystemConfig"("key");
CREATE INDEX IF NOT EXISTS "SystemConfig_key_idx" ON "SystemConfig"("key");


-- -----------------------------------------------------------
-- TABLE : "PaymentLink" — Liens de paiement
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "PaymentLink" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT DEFAULT 'FC',
  "description" TEXT,
  "code" TEXT NOT NULL,
  "status" TEXT DEFAULT 'active',
  "maxUses" INTEGER DEFAULT 0,
  "useCount" INTEGER DEFAULT 0,
  "expiresAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "PaymentLink" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "PaymentLink" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "PaymentLink" ADD COLUMN IF NOT EXISTS "amount" DOUBLE PRECISION;
ALTER TABLE "PaymentLink" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'FC';
ALTER TABLE "PaymentLink" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "PaymentLink" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE "PaymentLink" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "PaymentLink" ADD COLUMN IF NOT EXISTS "maxUses" INTEGER DEFAULT 0;
ALTER TABLE "PaymentLink" ADD COLUMN IF NOT EXISTS "useCount" INTEGER DEFAULT 0;
ALTER TABLE "PaymentLink" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMPTZ;
ALTER TABLE "PaymentLink" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "PaymentLink" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentLink_code_key" ON "PaymentLink"("code");
CREATE INDEX IF NOT EXISTS "PaymentLink_userId_idx" ON "PaymentLink"("userId");
CREATE INDEX IF NOT EXISTS "PaymentLink_code_idx" ON "PaymentLink"("code");
CREATE INDEX IF NOT EXISTS "PaymentLink_status_idx" ON "PaymentLink"("status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_PaymentLink_userId') THEN
    ALTER TABLE "PaymentLink" ADD CONSTRAINT "fk_PaymentLink_userId"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "PaymentRequest" — Demandes de paiement
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "PaymentRequest" (
  "id" TEXT PRIMARY KEY,
  "requesterId" TEXT NOT NULL,
  "targetId" TEXT,
  "targetPhone" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT DEFAULT 'FC',
  "description" TEXT,
  "status" TEXT DEFAULT 'pending',
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "PaymentRequest" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "PaymentRequest" ADD COLUMN IF NOT EXISTS "requesterId" TEXT;
ALTER TABLE "PaymentRequest" ADD COLUMN IF NOT EXISTS "targetId" TEXT;
ALTER TABLE "PaymentRequest" ADD COLUMN IF NOT EXISTS "targetPhone" TEXT;
ALTER TABLE "PaymentRequest" ADD COLUMN IF NOT EXISTS "amount" DOUBLE PRECISION;
ALTER TABLE "PaymentRequest" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'FC';
ALTER TABLE "PaymentRequest" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "PaymentRequest" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "PaymentRequest" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "PaymentRequest" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "PaymentRequest_requesterId_idx" ON "PaymentRequest"("requesterId");
CREATE INDEX IF NOT EXISTS "PaymentRequest_targetId_idx" ON "PaymentRequest"("targetId");
CREATE INDEX IF NOT EXISTS "PaymentRequest_status_idx" ON "PaymentRequest"("status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_PaymentRequest_requesterId') THEN
    ALTER TABLE "PaymentRequest" ADD CONSTRAINT "fk_PaymentRequest_requesterId"
      FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE;
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "RecurringPayment" — Paiements récurrents
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "RecurringPayment" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT DEFAULT 'FC',
  "frequency" TEXT DEFAULT 'monthly',
  "description" TEXT,
  "status" TEXT DEFAULT 'active',
  "nextRun" TIMESTAMPTZ NOT NULL,
  "lastRun" TIMESTAMPTZ,
  "maxRuns" INTEGER DEFAULT 0,
  "runCount" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "RecurringPayment" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "RecurringPayment" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "RecurringPayment" ADD COLUMN IF NOT EXISTS "recipientId" TEXT;
ALTER TABLE "RecurringPayment" ADD COLUMN IF NOT EXISTS "amount" DOUBLE PRECISION;
ALTER TABLE "RecurringPayment" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'FC';
ALTER TABLE "RecurringPayment" ADD COLUMN IF NOT EXISTS "frequency" TEXT DEFAULT 'monthly';
ALTER TABLE "RecurringPayment" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "RecurringPayment" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "RecurringPayment" ADD COLUMN IF NOT EXISTS "nextRun" TIMESTAMPTZ;
ALTER TABLE "RecurringPayment" ADD COLUMN IF NOT EXISTS "lastRun" TIMESTAMPTZ;
ALTER TABLE "RecurringPayment" ADD COLUMN IF NOT EXISTS "maxRuns" INTEGER DEFAULT 0;
ALTER TABLE "RecurringPayment" ADD COLUMN IF NOT EXISTS "runCount" INTEGER DEFAULT 0;
ALTER TABLE "RecurringPayment" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "RecurringPayment" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "RecurringPayment_userId_idx" ON "RecurringPayment"("userId");
CREATE INDEX IF NOT EXISTS "RecurringPayment_status_idx" ON "RecurringPayment"("status");
CREATE INDEX IF NOT EXISTS "RecurringPayment_nextRun_idx" ON "RecurringPayment"("nextRun");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_RecurringPayment_userId') THEN
    ALTER TABLE "RecurringPayment" ADD CONSTRAINT "fk_RecurringPayment_userId"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "BundleCategory" — Catégories de forfaits
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "BundleCategory" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "icon" TEXT
);

ALTER TABLE "BundleCategory" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "BundleCategory" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "BundleCategory" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "BundleCategory" ADD COLUMN IF NOT EXISTS "icon" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "BundleCategory_slug_key" ON "BundleCategory"("slug");
CREATE INDEX IF NOT EXISTS "BundleCategory_slug_idx" ON "BundleCategory"("slug");


-- -----------------------------------------------------------
-- TABLE : "BundleProduct" — Produits de forfaits
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "BundleProduct" (
  "id" TEXT PRIMARY KEY,
  "categoryId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "operator" TEXT,
  "type" TEXT DEFAULT 'airtime',
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT DEFAULT 'FC',
  "price" DOUBLE PRECISION NOT NULL,
  "description" TEXT,
  "active" BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "BundleProduct" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "BundleProduct" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;
ALTER TABLE "BundleProduct" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "BundleProduct" ADD COLUMN IF NOT EXISTS "operator" TEXT;
ALTER TABLE "BundleProduct" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'airtime';
ALTER TABLE "BundleProduct" ADD COLUMN IF NOT EXISTS "amount" DOUBLE PRECISION;
ALTER TABLE "BundleProduct" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'FC';
ALTER TABLE "BundleProduct" ADD COLUMN IF NOT EXISTS "price" DOUBLE PRECISION;
ALTER TABLE "BundleProduct" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "BundleProduct" ADD COLUMN IF NOT EXISTS "active" BOOLEAN DEFAULT TRUE;
ALTER TABLE "BundleProduct" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "BundleProduct_categoryId_idx" ON "BundleProduct"("categoryId");
CREATE INDEX IF NOT EXISTS "BundleProduct_operator_idx" ON "BundleProduct"("operator");
CREATE INDEX IF NOT EXISTS "BundleProduct_type_idx" ON "BundleProduct"("type");
CREATE INDEX IF NOT EXISTS "BundleProduct_active_idx" ON "BundleProduct"("active");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_BundleProduct_categoryId') THEN
    ALTER TABLE "BundleProduct" ADD CONSTRAINT "fk_BundleProduct_categoryId"
      FOREIGN KEY ("categoryId") REFERENCES "BundleCategory"("id");
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "BundlePurchase" — Achats de forfaits
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "BundlePurchase" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "phoneNumber" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT DEFAULT 'FC',
  "status" TEXT DEFAULT 'completed',
  "reference" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "BundlePurchase" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "BundlePurchase" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "BundlePurchase" ADD COLUMN IF NOT EXISTS "productId" TEXT;
ALTER TABLE "BundlePurchase" ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;
ALTER TABLE "BundlePurchase" ADD COLUMN IF NOT EXISTS "amount" DOUBLE PRECISION;
ALTER TABLE "BundlePurchase" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'FC';
ALTER TABLE "BundlePurchase" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'completed';
ALTER TABLE "BundlePurchase" ADD COLUMN IF NOT EXISTS "reference" TEXT;
ALTER TABLE "BundlePurchase" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "BundlePurchase_userId_idx" ON "BundlePurchase"("userId");
CREATE INDEX IF NOT EXISTS "BundlePurchase_createdAt_idx" ON "BundlePurchase"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_BundlePurchase_productId') THEN
    ALTER TABLE "BundlePurchase" ADD CONSTRAINT "fk_BundlePurchase_productId"
      FOREIGN KEY ("productId") REFERENCES "BundleProduct"("id");
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "MicroCredit" — Micro-crédits
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "MicroCredit" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT DEFAULT 'FC',
  "interestRate" DOUBLE PRECISION DEFAULT 0.05,
  "totalDue" DOUBLE PRECISION NOT NULL,
  "paidSoFar" DOUBLE PRECISION DEFAULT 0,
  "status" TEXT DEFAULT 'pending',
  "duration" TEXT DEFAULT '30',
  "dueDate" TIMESTAMPTZ,
  "approvedAt" TIMESTAMPTZ,
  "approvedBy" TEXT,
  "completedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "MicroCredit" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "MicroCredit" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "MicroCredit" ADD COLUMN IF NOT EXISTS "amount" DOUBLE PRECISION;
ALTER TABLE "MicroCredit" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'FC';
ALTER TABLE "MicroCredit" ADD COLUMN IF NOT EXISTS "interestRate" DOUBLE PRECISION DEFAULT 0.05;
ALTER TABLE "MicroCredit" ADD COLUMN IF NOT EXISTS "totalDue" DOUBLE PRECISION;
ALTER TABLE "MicroCredit" ADD COLUMN IF NOT EXISTS "paidSoFar" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "MicroCredit" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "MicroCredit" ADD COLUMN IF NOT EXISTS "duration" TEXT DEFAULT '30';
ALTER TABLE "MicroCredit" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMPTZ;
ALTER TABLE "MicroCredit" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMPTZ;
ALTER TABLE "MicroCredit" ADD COLUMN IF NOT EXISTS "approvedBy" TEXT;
ALTER TABLE "MicroCredit" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMPTZ;
ALTER TABLE "MicroCredit" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "MicroCredit" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "MicroCredit_userId_idx" ON "MicroCredit"("userId");
CREATE INDEX IF NOT EXISTS "MicroCredit_status_idx" ON "MicroCredit"("status");


-- -----------------------------------------------------------
-- TABLE : "SavingsGoal" — Objectifs d'épargne
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "SavingsGoal" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "targetAmount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT DEFAULT 'FC',
  "currentAmount" DOUBLE PRECISION DEFAULT 0,
  "autoTransfer" BOOLEAN DEFAULT FALSE,
  "autoAmount" DOUBLE PRECISION,
  "autoFrequency" TEXT,
  "autoNextRun" TIMESTAMPTZ,
  "status" TEXT DEFAULT 'active',
  "deadline" TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "SavingsGoal" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "SavingsGoal" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "SavingsGoal" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "SavingsGoal" ADD COLUMN IF NOT EXISTS "targetAmount" DOUBLE PRECISION;
ALTER TABLE "SavingsGoal" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'FC';
ALTER TABLE "SavingsGoal" ADD COLUMN IF NOT EXISTS "currentAmount" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "SavingsGoal" ADD COLUMN IF NOT EXISTS "autoTransfer" BOOLEAN DEFAULT FALSE;
ALTER TABLE "SavingsGoal" ADD COLUMN IF NOT EXISTS "autoAmount" DOUBLE PRECISION;
ALTER TABLE "SavingsGoal" ADD COLUMN IF NOT EXISTS "autoFrequency" TEXT;
ALTER TABLE "SavingsGoal" ADD COLUMN IF NOT EXISTS "autoNextRun" TIMESTAMPTZ;
ALTER TABLE "SavingsGoal" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "SavingsGoal" ADD COLUMN IF NOT EXISTS "deadline" TIMESTAMPTZ;
ALTER TABLE "SavingsGoal" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMPTZ;
ALTER TABLE "SavingsGoal" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "SavingsGoal" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "SavingsGoal_userId_idx" ON "SavingsGoal"("userId");
CREATE INDEX IF NOT EXISTS "SavingsGoal_status_idx" ON "SavingsGoal"("status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_SavingsGoal_userId') THEN
    ALTER TABLE "SavingsGoal" ADD CONSTRAINT "fk_SavingsGoal_userId"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "SavingsContribution" — Contributions aux objectifs d'épargne
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "SavingsContribution" (
  "id" TEXT PRIMARY KEY,
  "goalId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT DEFAULT 'FC',
  "type" TEXT DEFAULT 'manual',
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "SavingsContribution" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "SavingsContribution" ADD COLUMN IF NOT EXISTS "goalId" TEXT;
ALTER TABLE "SavingsContribution" ADD COLUMN IF NOT EXISTS "amount" DOUBLE PRECISION;
ALTER TABLE "SavingsContribution" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'FC';
ALTER TABLE "SavingsContribution" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'manual';
ALTER TABLE "SavingsContribution" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "SavingsContribution_goalId_idx" ON "SavingsContribution"("goalId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_SavingsContribution_goalId') THEN
    ALTER TABLE "SavingsContribution" ADD CONSTRAINT "fk_SavingsContribution_goalId"
      FOREIGN KEY ("goalId") REFERENCES "SavingsGoal"("id") ON DELETE CASCADE;
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "ReferralReward" — Récompenses de parrainage
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ReferralReward" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "referredId" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT DEFAULT 'FC',
  "type" TEXT DEFAULT 'signup',
  "status" TEXT DEFAULT 'pending',
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "ReferralReward" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "ReferralReward" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "ReferralReward" ADD COLUMN IF NOT EXISTS "referredId" TEXT;
ALTER TABLE "ReferralReward" ADD COLUMN IF NOT EXISTS "amount" DOUBLE PRECISION;
ALTER TABLE "ReferralReward" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'FC';
ALTER TABLE "ReferralReward" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'signup';
ALTER TABLE "ReferralReward" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';
ALTER TABLE "ReferralReward" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "ReferralReward_userId_idx" ON "ReferralReward"("userId");
CREATE INDEX IF NOT EXISTS "ReferralReward_type_idx" ON "ReferralReward"("type");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ReferralReward_userId') THEN
    ALTER TABLE "ReferralReward" ADD CONSTRAINT "fk_ReferralReward_userId"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
  END IF;
END $$;


-- -----------------------------------------------------------
-- TABLE : "TransactionTag" — Étiquettes de transactions
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "TransactionTag" (
  "id" TEXT PRIMARY KEY,
  "transactionId" TEXT NOT NULL,
  "category" TEXT DEFAULT 'general',
  "subcategory" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "TransactionTag" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "TransactionTag" ADD COLUMN IF NOT EXISTS "transactionId" TEXT;
ALTER TABLE "TransactionTag" ADD COLUMN IF NOT EXISTS "category" TEXT DEFAULT 'general';
ALTER TABLE "TransactionTag" ADD COLUMN IF NOT EXISTS "subcategory" TEXT;
ALTER TABLE "TransactionTag" ADD COLUMN IF NOT EXISTS "note" TEXT;
ALTER TABLE "TransactionTag" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "TransactionTag_transactionId_key" ON "TransactionTag"("transactionId");


-- -----------------------------------------------------------
-- TABLE : "VerificationCode" — Codes de vérification
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "VerificationCode" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "used" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "VerificationCode" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "VerificationCode" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "VerificationCode" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE "VerificationCode" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMPTZ;
ALTER TABLE "VerificationCode" ADD COLUMN IF NOT EXISTS "used" BOOLEAN DEFAULT FALSE;
ALTER TABLE "VerificationCode" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "VerificationCode_email_idx" ON "VerificationCode"("email");
CREATE INDEX IF NOT EXISTS "VerificationCode_code_idx" ON "VerificationCode"("code");
CREATE INDEX IF NOT EXISTS "VerificationCode_expiresAt_idx" ON "VerificationCode"("expiresAt");


-- -----------------------------------------------------------
-- TABLE : "PushSubscription" — Abonnements push (Web Push API)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "PushSubscription" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS "endpoint" TEXT;
ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS "p256dh" TEXT;
ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS "auth" TEXT;
ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription"("userId");
CREATE INDEX IF NOT EXISTS "PushSubscription_endpoint_idx" ON "PushSubscription"("endpoint");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_PushSubscription_userId') THEN
    ALTER TABLE "PushSubscription" ADD CONSTRAINT "fk_PushSubscription_userId"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
  END IF;
END $$;


-- ============================================================
-- 3. FIN DU SCRIPT
-- ============================================================
