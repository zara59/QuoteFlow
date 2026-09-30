/* ============================================================
   QuoteFlow API — development seed users
   Shared by migrate.js (to adopt legacy rows) and seed.js.

   These are local development accounts only. The password below is
   a well-known throwaway value and is documented in the README so
   anyone running the seed can sign in. It must never be used for a
   real deployment — a real database gets no seed users at all.
   ============================================================ */

import bcrypt from 'bcryptjs'
import { query } from './pool.js'

export const SEED_PASSWORD = 'Password123!'

export const SEED_USERS = {
  a: { name: 'Alice Nguyen', email: 'usera@example.com', password: SEED_PASSWORD },
  b: { name: 'Ben Okonkwo', email: 'userb@example.com', password: SEED_PASSWORD },
}

const SALT_ROUNDS = 12

/* Idempotent: returns { a: id, b: id }, creating either user if absent.
   Kept in this module rather than seed.js so migrate.js can adopt
   legacy rows without importing seed.js — importing that file would
   run its CLI and exit the process mid-migration. */
export const ensureSeedUsers = async () => {
  const ids = {}
  for (const key of ['a', 'b']) {
    const { name, email, password } = SEED_USERS[key]
    const existing = await query('SELECT id FROM users WHERE lower(email) = $1', [email])
    if (existing.rows.length > 0) {
      ids[key] = existing.rows[0].id
      continue
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id`,
      [name, email, passwordHash],
    )
    ids[key] = rows[0].id
  }
  return ids
}
