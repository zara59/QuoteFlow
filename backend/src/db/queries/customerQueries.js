/* ============================================================
   QuoteFlow API — customer queries
   The only module that writes SQL for customers. Controllers call
   these functions and receive plain camelCase objects, matching the
   Stage 3 response shape.

   OWNERSHIP (Stage 5)
   Every function takes `userId` as its first argument and is not
   optional. It is a required positional parameter on purpose: it
   makes "forgot to scope this query" a type/signature error at the
   call site rather than a silent data leak. If userId is undefined
   the WHERE clause matches nothing, so the failure mode is
   fail-closed — an empty result, never another user's records.
   ============================================================ */

import { one, rows, query } from '../pool.js'

const CUSTOMER_COLUMNS = `
  c.id,
  c.name,
  COALESCE(c.email, '')    AS email,
  COALESCE(c.phone, '')    AS phone,
  COALESCE(c.company, '')  AS company,
  COALESCE(c.location, '') AS location,
  to_char(c.created_at, 'YYYY-MM-DD') AS "createdAt",
  to_char(c.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "updatedAt"
`

/* Usage is counted within the same owner, so the numbers a customer
   card shows can never include another user's rows. */
const USAGE_COLUMNS = `
  (SELECT COUNT(*) FROM quotes q   WHERE q.customer_id = c.id AND q.user_id = c.user_id)::int AS quote_count,
  (SELECT COUNT(*) FROM bookings b WHERE b.customer_id = c.id AND b.user_id = c.user_id)::int AS booking_count
`

/** Escapes LIKE metacharacters so a search term is matched literally. */
const likePattern = (term) => `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`

const withUsage = ({ quote_count, booking_count, ...rest }) => ({
  ...rest,
  usage: { quotes: quote_count, bookings: booking_count },
})

export const listCustomers = async (userId, { term } = {}) => {
  const result = await rows(
    `SELECT ${CUSTOMER_COLUMNS}, ${USAGE_COLUMNS}
     FROM customers c
     WHERE c.user_id = $1
       AND (
         $2::text IS NULL
         OR c.name ILIKE $2 ESCAPE '\\'
         OR COALESCE(c.email, '')    ILIKE $2 ESCAPE '\\'
         OR COALESCE(c.phone, '')    ILIKE $2 ESCAPE '\\'
         OR COALESCE(c.company, '')  ILIKE $2 ESCAPE '\\'
         OR COALESCE(c.location, '') ILIKE $2 ESCAPE '\\'
       )
     ORDER BY c.name ASC`,
    [userId, term ? likePattern(term) : null],
  )
  return result.map(withUsage)
}

export const findCustomerById = async (userId, id) => {
  const row = await one(
    `SELECT ${CUSTOMER_COLUMNS}, ${USAGE_COLUMNS}
     FROM customers c
     WHERE c.user_id = $1 AND c.id = $2`,
    [userId, id],
  )
  return row ? withUsage(row) : null
}

/* `values.userId` is deliberately not read from the payload: the
   controller always passes the id resolved from the verified JWT. */
export const insertCustomer = async (userId, values) => {
  const { rows: created } = await query(
    `INSERT INTO customers (user_id, name, email, phone, company, location)
     VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''), NULLIF($6, ''))
     RETURNING id`,
    [
      userId,
      values.name,
      values.email ?? '',
      values.phone ?? '',
      values.company ?? '',
      values.location ?? '',
    ],
  )
  return findCustomerById(userId, created[0].id)
}

const CUSTOMER_SETTABLE = {
  name: 'name',
  email: 'email',
  phone: 'phone',
  company: 'company',
  location: 'location',
}

export const updateCustomerRecord = async (userId, id, values) => {
  const columns = Object.keys(CUSTOMER_SETTABLE).filter((key) => values[key] !== undefined)
  if (columns.length === 0) return findCustomerById(userId, id)

  const assignments = columns.map(
    (key, index) => `${CUSTOMER_SETTABLE[key]} = NULLIF($${index + 2}, '')::text`,
  )
  const params = [userId, ...columns.map((key) => values[key])]

  assignments.push(`updated_at = NOW()`)
  params.push(id)

  await query(
    `UPDATE customers SET ${assignments.join(', ')} WHERE user_id = $1 AND id = $${params.length}`,
    params,
  )
  return findCustomerById(userId, id)
}

export const customerUsage = async (userId, id) => {
  const row = await one(
    `SELECT
       (SELECT COUNT(*) FROM quotes   WHERE customer_id = $1 AND user_id = $2)::int AS quotes,
       (SELECT COUNT(*) FROM bookings WHERE customer_id = $1 AND user_id = $2)::int AS bookings`,
    [id, userId],
  )
  return { quotes: row.quotes, bookings: row.bookings }
}

export const removeCustomer = async (userId, id) => {
  const { rowCount } = await query('DELETE FROM customers WHERE user_id = $1 AND id = $2', [
    userId,
    id,
  ])
  return rowCount > 0
}

export const countCustomers = async (userId) => {
  const row = await one('SELECT COUNT(*)::int AS count FROM customers WHERE user_id = $1', [
    userId,
  ])
  return row.count
}
