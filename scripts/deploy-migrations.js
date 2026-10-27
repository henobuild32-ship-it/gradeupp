const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');

const baselineMigration = '20261026000000_existing_schema_baseline';
const secureCardsMigration = '20261027010000_secure_trait_cards';
const baselineSchema = path.join(process.cwd(), 'prisma', 'schema.baseline.prisma');
const isWindows = process.platform === 'win32';

function runPrisma(args, options = {}) {
  const result = spawnSync(isWindows ? 'prisma.cmd' : 'prisma', args, {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
    shell: isWindows,
    stdio: options.capture ? 'pipe' : 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (options.capture) {
    return result;
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

async function inspectDatabase() {
  const prisma = new PrismaClient();

  try {
    const [state] = await prisma.$queryRaw`
      SELECT
        to_regclass('public."_prisma_migrations"')::text AS "migrationTable",
        (
          SELECT COUNT(*)::int
          FROM pg_catalog.pg_tables
          WHERE schemaname = 'public'
            AND tablename <> '_prisma_migrations'
        ) AS "applicationTableCount"
    `;

    let migrations = [];
    if (state.migrationTable) {
      migrations = await prisma.$queryRaw`
        SELECT
          migration_name AS "migrationName",
          finished_at AS "finishedAt",
          rolled_back_at AS "rolledBackAt"
        FROM public."_prisma_migrations"
        WHERE rolled_back_at IS NULL
      `;
    }

    return { ...state, migrations };
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const state = await inspectDatabase();
  const completedMigrations = state.migrations.filter(migration => migration.finishedAt);
  const failedMigrations = state.migrations.filter(migration => !migration.finishedAt);
  const baselineApplied = completedMigrations.some(migration => migration.migrationName === baselineMigration);

  if (baselineApplied) {
    console.log(`Prisma baseline already recorded: ${baselineMigration}`);
  } else if (completedMigrations.length > 0) {
    throw new Error('Existing Prisma migration history has no recognized baseline; refusing to modify the database.');
  } else if (state.applicationTableCount > 0) {
    console.log('Checking that the existing database matches the previous TRAIT schema before baselining it.');
    const diff = runPrisma([
      'migrate', 'diff',
      '--from-schema-datasource', baselineSchema,
      '--to-schema-datamodel', baselineSchema,
      '--script',
      '--exit-code',
    ], { capture: true });

    if (diff.status === 2) {
      throw new Error('Production schema differs from the baseline. No migration was applied; reconcile the schema before retrying.');
    }
    if (diff.status !== 0) {
      process.stderr.write(diff.stderr || 'Could not verify the baseline schema.\n');
      throw new Error('Baseline verification failed. No migration was applied.');
    }

    console.log('Existing schema matches. Recording the baseline without changing application tables.');
    runPrisma(['migrate', 'resolve', '--applied', baselineMigration]);
  } else if (state.applicationTableCount === 0) {
    console.log('Database is empty. Prisma will create the schema from the full migration history.');
  }

  for (const migration of failedMigrations) {
    if (migration.migrationName !== secureCardsMigration) {
      throw new Error(`Migration ${migration.migrationName} is incomplete; refusing automatic recovery.`);
    }

    console.log(`Preparing a safe retry of incomplete migration ${secureCardsMigration}.`);
    runPrisma(['migrate', 'resolve', '--rolled-back', secureCardsMigration]);
  }

  runPrisma(['migrate', 'deploy']);
}

main().catch(error => {
  console.error(`Database migration stopped safely: ${error.message}`);
  process.exitCode = 1;
});
