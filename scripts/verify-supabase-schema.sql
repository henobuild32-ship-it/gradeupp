-- Read-only check for Supabase SQL Editor. Run after scripts/apply-supabase-migrations.ps1.

WITH expected(table_name, column_name, expected_nullable) AS (
  VALUES
    ('Transaction', 'receivingCurrency', 'YES'),
    ('Transaction', 'amountReceived', 'YES'),
    ('Transaction', 'exchangeRate', 'YES'),
    ('User', 'twoFactorRecoveryCodes', 'NO'),
    ('CardRequest', 'holderName', 'YES'),
    ('CardRequest', 'jobTitle', 'YES'),
    ('CardRequest', 'birthDate', 'YES'),
    ('CardRequest', 'photoData', 'YES'),
    ('TraitCard', 'last4', 'YES'),
    ('TraitCard', 'jobTitle', 'YES'),
    ('TraitCard', 'birthDate', 'YES'),
    ('TraitCard', 'holderPhoto', 'YES'),
    ('TraitCard', 'cardNumber', 'YES'),
    ('TraitCard', 'cvv', 'YES'),
    ('TraitCard', 'expiryDate', 'YES'),
    ('PaymentRequest', 'transactionId', 'YES')
)
SELECT
  expected.table_name,
  expected.column_name,
  expected.expected_nullable,
  actual.is_nullable,
  (actual.column_name IS NOT NULL AND actual.is_nullable = expected.expected_nullable) AS verified
FROM expected
LEFT JOIN information_schema.columns AS actual
  ON actual.table_schema = 'public'
 AND actual.table_name = expected.table_name
 AND actual.column_name = expected.column_name
ORDER BY expected.table_name, expected.column_name;

SELECT migration_name, finished_at, rolled_back_at
FROM public."_prisma_migrations"
WHERE migration_name IN (
  '20261026000000_existing_schema_baseline',
  '20261027010000_secure_trait_cards',
  '20261027150000_transaction_dual_currency',
  '20261028120000_two_factor_recovery_codes'
)
ORDER BY migration_name;

SELECT COUNT(*) AS remaining_unmasked_card_rows
FROM public."TraitCard"
WHERE "cardNumber" IS NOT NULL OR "cvv" IS NOT NULL OR "expiryDate" IS NOT NULL;
