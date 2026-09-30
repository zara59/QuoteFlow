/* ============================================================
   QuoteFlow API — PostgreSQL connection pool
   One pool for the whole process. Controllers never open their own
   connections: they call query(), which borrows a client, runs the
   statement and always returns the client to the pool.

   All values are passed as parameters ($1, $2, ...). No user input is
   ever concatenated into SQL text.
   ============================================================ */

import pg from 'pg'
import { config, assertDatabaseConfigured } from '../config/env.js'

const { Pool, types } = pg

/* NUMERIC arrives as a string by default, which would turn `amount`
   into "1500.00" in JSON and break the API contract. Parse it to a
   number so responses match the Stage 3 shape. */
types.setTypeParser(types.builtins.NUMERIC, (value) => Number.parseFloat(value))
types.setTypeParser(types.builtins.INT8, (value) => Number.parseInt(value, 10))

let pool = null

const createPool = () => {
  assertDatabaseConfigured()

  const created = new Pool({
    connectionString: config.databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  })

  // An idle client failing (server restart, network drop) emits 'error'.
  // Without a listener that would take the whole process down.
  created.on('error', (error) => {
    console.error('[quoteflow-api] idle database client error:', error.message)
  })

  return created
}

export const getPool = () => {
  if (!pool) pool = createPool()
  return pool
}

/** Runs a parameterised statement and returns the raw pg result. */
export const query = async (text, params = []) => getPool().query(text, params)

export const rows = async (text, params = []) => (await query(text, params)).rows

export const one = async (text, params = []) => (await query(text, params)).rows[0] ?? null

/** Verifies the connection at boot so failures are reported clearly. */
export const checkConnection = async () => {
  const { rows: result } = await query('select current_database() as database, version() as version')
  return result[0]
}

/** Runs a callback inside a transaction, rolling back on any throw. */
export const withTransaction = async (callback) => {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
  }
}

export const closePool = async () => {
  if (!pool) return
  const closing = pool
  pool = null
  await closing.end()
}
