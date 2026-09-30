/* ============================================================
   QuoteFlow API — quote queries
   Customer name comes from a JOIN rather than a stored snapshot, so a
   customer rename is reflected everywhere with no cascade step.

   OWNERSHIP (Stage 5)
   `userId` is a required first argument — see customerQueries.js for
   the reasoning. Two independent guards are applied:

     1. q.user_id = <caller>          direct ownership
     2. c.user_id = q.user_id         the joined customer belongs to
                                     the same owner, so a quote can
                                     never expose another user's
                                     customer name through the JOIN

   Creation uses INSERT ... SELECT with the customer lookup inside it,
   so a quote for somebody else's customer_id is not merely rejected
   later — the row is never written.
   ============================================================ */

import { one, rows, query } from '../pool.js'
import { QUOTE_STATUSES } from '../../data/constants.js'

const QUOTE_COLUMNS = `
  q.id,
  ('QF-' || (1000 + q.id))::text AS number,
  q.customer_id AS "customerId",
  c.name        AS "customerName",
  q.service,
  COALESCE(q.description, '') AS description,
  q.amount,
  q.status,
  to_char(q.created_at, 'YYYY-MM-DD') AS "createdAt",
  to_char(q.valid_until, 'YYYY-MM-DD') AS "validUntil",
  to_char(q.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "updatedAt"
`

/* $1 = userId, $2 = search pattern. */
const QUOTE_SEARCH = `
  (c.name ILIKE $2 ESCAPE '\\'
   OR q.service ILIKE $2 ESCAPE '\\'
   OR COALESCE(q.description, '') ILIKE $2 ESCAPE '\\'
   OR ('QF-' || (1000 + q.id))::text ILIKE $2 ESCAPE '\\'
   OR q.status ILIKE $2 ESCAPE '\\')
`

/* The join is deliberately owner-constrained on both sides. */
const QUOTE_JOIN = `
  FROM quotes q
  JOIN customers c ON c.id = q.customer_id AND c.user_id = q.user_id
`

const likePattern = (term) => `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`

export const listQuotes = async (userId, { term, status } = {}) =>
  rows(
    `SELECT ${QUOTE_COLUMNS}
     ${QUOTE_JOIN}
     WHERE q.user_id = $1
       AND ($3::text IS NULL OR q.status = $3)
       AND ($2::text IS NULL OR ${QUOTE_SEARCH})
     ORDER BY q.created_at DESC, q.id DESC`,
    [userId, term ? likePattern(term) : null, status ?? null],
  )

export const findQuoteById = async (userId, id) =>
  one(
    `SELECT ${QUOTE_COLUMNS}
     ${QUOTE_JOIN}
     WHERE q.user_id = $1 AND q.id = $2`,
    [userId, id],
  )

/* Resolves to null when customer_id is not one of the caller's
   customers — the row simply is not inserted. */
export const insertQuote = async (userId, values) => {
  const { rows: created } = await query(
    `INSERT INTO quotes (user_id, customer_id, service, description, amount, valid_until, status)
     SELECT $1, c.id, $3, NULLIF($4, ''), $5, $6, $7
     FROM customers c
     WHERE c.id = $2 AND c.user_id = $1
     RETURNING id`,
    [
      userId,
      values.customerId,
      values.service,
      values.description ?? '',
      values.amount,
      values.validUntil,
      values.status,
    ],
  )
  if (created.length === 0) return null
  return findQuoteById(userId, created[0].id)
}

/** Column names come from this fixed map, never from the request body. */
const QUOTE_SETTABLE = {
  customerId: 'customer_id',
  service: 'service',
  description: 'description',
  amount: 'amount',
  validUntil: 'valid_until',
  status: 'status',
}

export const updateQuoteRecord = async (userId, id, values) => {
  const columns = Object.keys(QUOTE_SETTABLE).filter((key) => values[key] !== undefined)
  if (columns.length === 0) return findQuoteById(userId, id)

  const assignments = columns.map((key, index) => {
    const column = QUOTE_SETTABLE[key]
    // $1 is userId, so value placeholders start at $2.
    const slot = index + 2
    if (key === 'description') return `${column} = NULLIF($${slot}, '')::text`
    if (key === 'customerId') return `${column} = $${slot}::int`
    if (key === 'amount') return `${column} = $${slot}::numeric`
    if (key === 'validUntil') return `${column} = $${slot}::date`
    return `${column} = $${slot}::text`
  })

  const params = [userId, ...columns.map((key) => values[key])]
  assignments.push('updated_at = NOW()')
  params.push(id)

  /* user_id = $1 restricts the update to the caller's own quote, so
     reassigning customer_id can only ever point at a customer the
     controller has already confirmed belongs to that same user. */
  const { rowCount } = await query(
    `UPDATE quotes SET ${assignments.join(', ')} WHERE user_id = $1 AND id = $${params.length}`,
    params,
  )
  if (rowCount === 0) return null
  return findQuoteById(userId, id)
}

export const removeQuote = async (userId, id) => {
  const { rowCount } = await query('DELETE FROM quotes WHERE user_id = $1 AND id = $2', [
    userId,
    id,
  ])
  return rowCount > 0
}

export const listRecentQuotes = async (userId, limit = 5) =>
  rows(
    `SELECT ${QUOTE_COLUMNS}
     ${QUOTE_JOIN}
     WHERE q.user_id = $1
     ORDER BY q.created_at DESC, q.id DESC
     LIMIT $2`,
    [userId, limit],
  )

export const quoteCountsByStatus = async (userId) => {
  const result = await rows(
    'SELECT status, COUNT(*)::int AS count FROM quotes WHERE user_id = $1 GROUP BY status',
    [userId],
  )
  const counts = Object.fromEntries(result.map((row) => [row.status, row.count]))
  // Always return every status, in the canonical order, with 0 for absent ones.
  return Object.fromEntries(QUOTE_STATUSES.map((status) => [status, counts[status] ?? 0]))
}
