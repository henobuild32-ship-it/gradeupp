-- The old menu tables may contain users' saved contacts and preferences.
-- Preserve them under archive names instead of deleting customer data.
ALTER TABLE "UssdFavorite" RENAME TO "LegacyFavoriteArchive";
ALTER TABLE "LegacyFavoriteArchive"
  RENAME CONSTRAINT "UssdFavorite_pkey" TO "LegacyFavoriteArchive_pkey";
ALTER TABLE "LegacyFavoriteArchive"
  RENAME CONSTRAINT "UssdFavorite_userId_fkey" TO "LegacyFavoriteArchive_userId_fkey";
ALTER INDEX "UssdFavorite_userId_idx" RENAME TO "LegacyFavoriteArchive_userId_idx";

ALTER TABLE "UserSettings" RENAME TO "LegacyUserSettingsArchive";
ALTER TABLE "LegacyUserSettingsArchive"
  RENAME CONSTRAINT "UserSettings_pkey" TO "LegacyUserSettingsArchive_pkey";
ALTER TABLE "LegacyUserSettingsArchive"
  RENAME CONSTRAINT "UserSettings_userId_fkey" TO "LegacyUserSettingsArchive_userId_fkey";
ALTER INDEX "UserSettings_userId_key" RENAME TO "LegacyUserSettingsArchive_userId_key";

-- Rollback: reverse the table, index, and constraint renames above. No rows
-- or columns are dropped by this migration, so saved data remains recoverable.
