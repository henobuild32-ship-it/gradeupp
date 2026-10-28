-- Manual rollback for 20261028150000_archive_legacy_mobile_menu/migration.sql.
-- Run only after application code that uses the archived tables has been restored.
ALTER TABLE "LegacyUserSettingsArchive" RENAME TO "UserSettings";
ALTER TABLE "UserSettings"
  RENAME CONSTRAINT "LegacyUserSettingsArchive_pkey" TO "UserSettings_pkey";
ALTER TABLE "UserSettings"
  RENAME CONSTRAINT "LegacyUserSettingsArchive_userId_fkey" TO "UserSettings_userId_fkey";
ALTER INDEX "LegacyUserSettingsArchive_userId_key" RENAME TO "UserSettings_userId_key";

ALTER TABLE "LegacyFavoriteArchive" RENAME TO "UssdFavorite";
ALTER TABLE "UssdFavorite"
  RENAME CONSTRAINT "LegacyFavoriteArchive_pkey" TO "UssdFavorite_pkey";
ALTER TABLE "UssdFavorite"
  RENAME CONSTRAINT "LegacyFavoriteArchive_userId_fkey" TO "UssdFavorite_userId_fkey";
ALTER INDEX "LegacyFavoriteArchive_userId_idx" RENAME TO "UssdFavorite_userId_idx";
