/* ============================================================
   QuoteFlow API — booking queries
   "time" is returned as HH:MM to match the Stage 3 contract, and the
   date filter is applied in SQL against a reference date so results
   are reproducible.

   OWNERSHIP (Stage 5) — same two-guard pattern as quoteQueries.js:
   b.user_id = <caller> for direct ownership, plus an owner-constrained
   join to customers so a booking can never surface another user's
   customer name. Creation is INSERT ... SELECT keyed on the caller's
   own customer, so a foreign customer_id writes nothing.
   ============================================================ */

import { one, rows, query } from '../pool.js'

const BOOKING_COLUMNS = `
  b.id,
  b.customer_id AS "customerId",
  c.name        AS "customerName",
  b.service,
  to_char(b.date, 'YYYY-MM-DD') AS date,
  to_char(b.time, 'HH24:MI') AS "time",
  COALESCE(b.duration, '') AS duration,
  b.status,
  COALESCE(b.location, '') AS location,
  COALESCE(b.notes, '')    AS notes,
  to_char(b.created_at, 'YYYY-MM-DD') AS "createdAt",
  to_char(b.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "updatedAt"
`

/* $2 = search pattern. */
const BOOKING_SEARCH = `
  (c.name ILIKE $2 ESCAPE '\\'
   OR b.service ILIKE $2 ESCAPE '\\'
   OR COALESCE(b.notes, '') ILIKE $2 ESCAPE '\\'
   OR COALESCE(b.location, '') ILIKE $2 ESCAPE '\\'
   OR b.status ILIKE $2 ESCAPE '\\')
`

const BOOKING_JOIN = `
  FROM bookings b
  JOIN customers c ON c.id = b.customer_id AND c.user_id = b.user_id
`

const likePattern = (term) => `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`

/**
 * dateFilter is one of: undefined, 'upcoming', 'past', or 'YYYY-MM-DD'.
 * Each branch compares against $4, the filter, using $5 as the reference date.
 */
const DATE_CONDITION = `
  CASE
    WHEN $4::text IS NULL      THEN TRUE
    WHEN $4::text = 'upcoming' THEN b.date >= $5::date
    WHEN $4::text = 'past'     THEN b.date <  $5::date
    ELSE b.date = $4::date
  END
`

export const listBookings = async (userId, { term, status, dateFilter, referenceDate } = {}) =>
  rows(
    `SELECT ${BOOKING_COLUMNS}
     ${BOOKING_JOIN}
     WHERE b.user_id = $1
       AND ($3::text IS NULL OR b.status = $3)
       AND (${DATE_CONDITION})
       AND ($2::text IS NULL OR ${BOOKING_SEARCH})
     ORDER BY b.date ASC, b.time ASC, b.id ASC`,
    [userId, term ? likePattern(term) : null, status ?? null, dateFilter ?? null, referenceDate],
  )

export const findBookingById = async (userId, id) =>
  one(
    `SELECT ${BOOKING_COLUMNS}
     ${BOOKING_JOIN}
     WHERE b.user_id = $1 AND b.id = $2`,
    [userId, id],
  )

/* Resolves to null when customer_id is not one of the caller's
   customers — the row simply is not inserted. */
export const insertBooking = async (userId, values) => {
  const { rows: created } = await query(
    `INSERT INTO bookings (user_id, customer_id, service, date, "time", duration, status, location, notes)
     SELECT $1, c.id, $3, $4::date, $5::time, NULLIF($6, ''), $7, NULLIF($8, ''), NULLIF($9, '')
     FROM customers c
     WHERE c.id = $2 AND c.user_id = $1
     RETURNING id`,
    [
      userId,
      values.customerId,
      values.service,
      values.date,
      values.time,
      values.duration ?? '',
      values.status,
      values.location ?? '',
      values.notes ?? '',
    ],
  )
  if (created.length === 0) return null
  return findBookingById(userId, created[0].id)
}

const BOOKING_SETTABLE = {
  customerId: 'customer_id',
  service: 'service',
  date: 'date',
  time: 'time',
  duration: 'duration',
  status: 'status',
  location: 'location',
  notes: 'notes',
}

export const updateBookingRecord = async (userId, id, values) => {
  const columns = Object.keys(BOOKING_SETTABLE).filter((key) => values[key] !== undefined)
  if (columns.length === 0) return findBookingById(userId, id)

  const assignments = columns.map((key, index) => {
    const column = BOOKING_SETTABLE[key]
    // $1 is userId, so value placeholders start at $2.
    const slot = index + 2
    if (key === 'date') return `${column} = $${slot}::date`
    if (key === 'time') return `"time" = $${slot}::time`
    if (key === 'customerId') return `${column} = $${slot}::int`
    if (key === 'duration' || key === 'location' || key === 'notes') {
      return `${column} = NULLIF($${slot}, '')::text`
    }
    return `${column} = $${slot}::text`
  })

  const params = [userId, ...columns.map((key) => values[key])]
  assignments.push('updated_at = NOW()')
  params.push(id)

  const { rowCount } = await query(
    `UPDATE bookings SET ${assignments.join(', ')} WHERE user_id = $1 AND id = $${params.length}`,
    params,
  )
  if (rowCount === 0) return null
  return findBookingById(userId, id)
}

export const removeBooking = async (userId, id) => {
  const { rowCount } = await query('DELETE FROM bookings WHERE user_id = $1 AND id = $2', [
    userId,
    id,
  ])
  return rowCount > 0
}

export const listUpcomingBookings = async (userId, { limit = 5, referenceDate } = {}) =>
  rows(
    `SELECT ${BOOKING_COLUMNS}
     ${BOOKING_JOIN}
     WHERE b.user_id = $1
       AND b.status = 'Upcoming'
       AND b.date >= $3::date
     ORDER BY b.date ASC, b.time ASC, b.id ASC
     LIMIT $2`,
    [userId, limit, referenceDate],
  )
