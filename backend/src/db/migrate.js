/* ============================================================
   QuoteFlow API — schema migration
   Usage:
     node src/db/migrate.js           apply schema (idempotent)
     node src/db/migrate.js --force   drop the tables first

   schema.sql covers fresh installs. The upgrade path below brings a
   pre-Stage-5 database (customers/quotes/bookings, no users) forward
   in place: add users, add the user_id columns, then adopt every
   existing row for the seed owner so nothing is orphaned.
   ============================================================ */

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { checkConnection, closePool, one, query, withTransaction } from './pool.js'
import { ensureSeedUsers, SEED_USERS } from './seedUsers.js'

const here = dirname(fileURLToPath(import.meta.url))

const force = process.argv.includes('--force')

const dropStatements = `
  DROP TABLE IF EXISTS bookings CASCADE;
  DROP TABLE IF EXISTS quotes CASCADE;
  DROP TABLE IF EXISTS customers CASCADE;
  DROP TABLE IF EXISTS users CASCADE;
`

/* Matches the marker comment in schema.sql. Everything before it can be
   applied to a legacy database as-is; everything after references
   user_id and so has to wait for the ALTERs below. The marker is a
   whole comment line, so both halves stay valid SQL. */
const SPLIT_MARKER = '-- @@MIGRATION-SPLIT@@'

/* Columns a pre-Stage-5 database is missing. ADD COLUMN IF NOT EXISTS makes
   these safe to re-run on an already-current database, and each statement is
   only issued for a table that exists — after `--force` there is nothing to
   alter yet, because schema.sql creates the columns itself. Table names come
   from a fixed IN list, never from input. */
const addUserIdColumn = async (table) =>
  query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users (id) ON DELETE RESTRICT`)

const upgradeExistingTables = async () => {
  const { rows: existing } = await query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN ('customers', 'quotes', 'bookings')`,
  )
  for (const { table_name: table } of existing) await addUserIdColumn(table)
  return existing.map((row) => row.table_name)
}

const countRows = async (table) => {
  const row = await one(`SELECT COUNT(*)::int AS n FROM ${table}`)
  return row.n
}

/* Pre-Stage-5 rows have user_id = NULL. user_id is NOT NULL in the
   target schema, so every legacy row has to be adopted by a real user
   before the constraint is applied. This runs inside one transaction
   so a half-adopted database is never left behind. */
const adoptLegacyRows = async () => {
  const owner = await one(`SELECT id FROM users WHERE lower(email) = $1`, [SEED_USERS.a.email])
  if (!owner) throw new Error(`Seed owner ${SEED_USERS.a.email} is missing`)

  const adopted = {}
  await withTransaction(async (tx) => {
    for (const table of ['customers', 'quotes', 'bookings']) {
      const { rows } = await tx.query(
        `UPDATE ${table} SET user_id = $1 WHERE user_id IS NULL`,
        [owner.id],
      )
      adopted[table] = rows.length
    }
  })

  const total = Object.values(adopted).reduce((sum, n) => sum + n, 0)
  if (total > 0) {
    console.log(
      `Adopted ${total} pre-ownership row(s) for "${SEED_USERS.a.email}": ` +
        `customers ${adopted.customers}, quotes ${adopted.quotes}, bookings ${adopted.bookings}.`,
    )
  }
  return adopted
}

/* Enforce NOT NULL only after adoption, otherwise the ALTER fails on
   legacy rows. */
const enforceNotNull = async () => {
  for (const table of ['customers', 'quotes', 'bookings']) {
    const row = await one(
      `SELECT is_nullable FROM information_schema.columns
       WHERE table_name = $1 AND column_name = 'user_id'`,
      [table],
    )
    if (row?.is_nullable === 'YES') {
      await query(`ALTER TABLE ${table} ALTER COLUMN user_id SET NOT NULL`)
    }
  }
}

const run = async () => {
  const info = await checkConnection()
  console.log(`Connected to database "${info.database}".`)

  if (force) {
    console.log('Dropping existing tables (--force)...')
    await query(dropStatements)
  }

  const schema = await readFile(join(here, 'schema.sql'), 'utf8')
  const [prelude, ...rest] = schema.split(SPLIT_MARKER)
  if (rest.length === 0) {
    throw new Error('schema.sql is missing the migration split marker.')
  }

  /* Order matters. users first, then the user_id columns on any legacy
     table, then everything that depends on them. */
  await query(prelude)
  const upgraded = await upgradeExistingTables()
  if (upgraded.length > 0) console.log(`Checked existing tables for user_id: ${upgraded.join(', ')}.`)
  await query(rest.join(SPLIT_MARKER))
  console.log('Schema applied.')

  const preOwnership = await one(`
    SELECT
      (SELECT COUNT(*) FROM customers WHERE user_id IS NULL)::int AS customers,
      (SELECT COUNT(*) FROM quotes    WHERE user_id IS NULL)::int AS quotes,
      (SELECT COUNT(*) FROM bookings  WHERE user_id IS NULL)::int AS bookings
  `)
  const legacy =
    preOwnership.customers + preOwnership.quotes + preOwnership.bookings

  if (legacy > 0) {
    console.log('Found rows from a pre-ownership database.')
    // The seed owner has to exist before it can adopt them.
    await ensureSeedUsers()
    await adoptLegacyRows()
  }

  await enforceNotNull()

  const { rows: tables } = await query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' ORDER BY table_name`,
  )
  console.log(`Tables present: ${tables.map((row) => row.table_name).join(', ') || 'none'}`)

  const summary = []
  for (const table of ['users', 'customers', 'quotes', 'bookings']) {
    summary.push(`${table} ${await countRows(table)}`)
  }
  console.log(`Rows: ${summary.join(', ')}.`)
}

run()
  .then(() => closePool())
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error('Migration failed:', error.message)
    await closePool().catch(() => {})
    process.exit(1)
  })
