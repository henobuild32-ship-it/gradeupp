-- Remember where the withdrawal fee came from so a rejected request can be
-- refunded to the same wallet balance without creating funds.
ALTER TABLE "Withdrawal"
  ADD COLUMN "feeFromBonus" BOOLEAN;
