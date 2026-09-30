/* ============================================================
   QuoteFlow API — user queries
   The only module that reads or writes the users table.
   ============================================================ */

import { one, query } from '../pool.js'
import { normalizeEmail } from '../../validators/authValidators.js'

/* password_hash is never selected by any function here, so it cannot
   reach a response by accident. Auth needs the hash to verify a
   password, and that is the only reason to touch it. */
const PUBLIC_COLUMNS = `
  id,
  name,
  email,
  to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS created_at
`

export const toPublicUser = (row) =>
  row && { id: row.id, name: row.name, email: row.email, createdAt: row.created_at }

export const findUserByEmail = async (email) =>
  one(`SELECT ${PUBLIC_COLUMNS}, password_hash FROM users WHERE lower(email) = $1`, [
    normalizeEmail(email),
  ])

export const findUserById = async (id) =>
  toPublicUser(await one(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`, [id]))

export const insertUser = async ({ name, email, passwordHash }) => {
  const { rows: created } = await query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING ${PUBLIC_COLUMNS}`,
    [name, normalizeEmail(email), passwordHash],
  )
  return toPublicUser(created[0])
}
