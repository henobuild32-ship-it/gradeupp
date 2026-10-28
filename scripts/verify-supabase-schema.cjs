const { PrismaClient } = require('@prisma/client')

const expectedColumns = [
  ['Transaction', 'receivingCurrency', 'YES'],
  ['Transaction', 'amountReceived', 'YES'],
  ['Transaction', 'exchangeRate', 'YES'],
  ['User', 'twoFactorRecoveryCodes', 'NO'],
  ['CardRequest', 'holderName', 'YES'],
  ['CardRequest', 'jobTitle', 'YES'],
  ['CardRequest', 'birthDate', 'YES'],
  ['CardRequest', 'photoData', 'YES'],
  ['TraitCard', 'last4', 'YES'],
  ['TraitCard', 'jobTitle', 'YES'],
  ['TraitCard', 'birthDate', 'YES'],
  ['TraitCard', 'holderPhoto', 'YES'],
  ['TraitCard', 'cardNumber', 'YES'],
  ['TraitCard', 'cvv', 'YES'],
  ['TraitCard', 'expiryDate', 'YES'],
  ['PaymentRequest', 'transactionId', 'YES'],
]

const expectedMigrations = [
  '20261026000000_existing_schema_baseline',
  '20261027010000_secure_trait_cards',
  '20261027150000_transaction_dual_currency',
  '20261028120000_two_factor_recovery_codes',
]

async function main() {
  const prisma = new PrismaClient()
  try {
    const columns = await prisma.$queryRaw`
      SELECT table_name, column_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
    `
    const columnMap = new Map(columns.map((column) => [
      `${column.table_name}.${column.column_name}`,
      column.is_nullable,
    ]))
    const missingColumns = expectedColumns.filter(([table, column, nullable]) =>
      columnMap.get(`${table}.${column}`) !== nullable
    )

    const indexes = await prisma.$queryRaw`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname IN ('TraitCard_last4_idx', 'PaymentRequest_transactionId_key')
    `
    const indexNames = new Set(indexes.map((index) => index.indexname))
    const missingIndexes = ['TraitCard_last4_idx', 'PaymentRequest_transactionId_key']
      .filter((name) => !indexNames.has(name))

    const migrations = await prisma.$queryRaw`
      SELECT migration_name, finished_at, rolled_back_at
      FROM public."_prisma_migrations"
      WHERE migration_name IN (
        '20261026000000_existing_schema_baseline',
        '20261027010000_secure_trait_cards',
        '20261027150000_transaction_dual_currency',
        '20261028120000_two_factor_recovery_codes'
      )
    `
    const migrationMap = new Map(migrations.map((migration) => [migration.migration_name, migration]))
    const missingMigrations = expectedMigrations.filter((name) => {
      const migration = migrationMap.get(name)
      return !migration || !migration.finished_at || migration.rolled_back_at
    })

    const [{ remainingCardSecrets }] = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS "remainingCardSecrets"
      FROM public."TraitCard"
      WHERE "cardNumber" IS NOT NULL OR "cvv" IS NOT NULL OR "expiryDate" IS NOT NULL
    `

    const report = {
      missingColumns: missingColumns.map(([table, column, nullable]) => ({ table, column, expectedNullable: nullable })),
      missingIndexes,
      missingMigrations,
      remainingUnmaskedCardRows: remainingCardSecrets,
    }
    console.log(JSON.stringify(report, null, 2))

    if (missingColumns.length || missingIndexes.length || missingMigrations.length || remainingCardSecrets !== 0) {
      process.exitCode = 1
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(`Supabase verification failed: ${error.message}`)
  process.exitCode = 1
})
