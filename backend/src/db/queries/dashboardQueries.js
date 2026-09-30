/* ============================================================
   QuoteFlow API — dashboard queries
   Every figure is an SQL aggregate computed from the live tables.
   Nothing is hard-coded, so any write through the API is reflected
   on the next request.

   OWNERSHIP (Stage 5)
   Every aggregate carries `WHERE user_id = $1` against the caller's id.
   The six aggregates, the two sub-lists and the status breakdown all
   resolve from the same owner, so the whole dashboard is one user's
   slice — a user never sees another's totals, recent work, or bookings.
   ============================================================ */

import { one } from '../pool.js'
import { PENDING_QUOTE_STATUSES } from '../../data/constants.js'
import { listRecentQuotes, quoteCountsByStatus } from './quoteQueries.js'
import { listUpcomingBookings } from './bookingQueries.js'
import { countCustomers } from './customerQueries.js'

export const getDashboardStats = async (
  userId,
  { referenceDate, recentLimit = 5, upcomingLimit = 5 } = {},
) => {
  const [quoteTotals, bookingTotals, quotesByStatus, customers, recentQuotes, upcomingBookingsList] =
    await Promise.all([
      one(
        `SELECT
           COUNT(*)::int AS total_quotes,
           COUNT(*) FILTER (WHERE status = ANY($2::text[]))::int AS pending_quotes,
           COUNT(*) FILTER (WHERE status = 'Approved')::int      AS approved_quotes,
           COALESCE(SUM(amount) FILTER (WHERE status = 'Approved'), 0) AS estimated_revenue,
           COALESCE(SUM(amount), 0) AS total_quote_value
         FROM quotes
         WHERE user_id = $1`,
        [userId, PENDING_QUOTE_STATUSES],
      ),
      one(
        `SELECT
           COUNT(*)::int AS total_bookings,
           COUNT(*) FILTER (WHERE status = 'Upcoming')::int AS upcoming_bookings
         FROM bookings
         WHERE user_id = $1`,
        [userId],
      ),
      quoteCountsByStatus(userId),
      countCustomers(userId),
      listRecentQuotes(userId, recentLimit),
      listUpcomingBookings(userId, { limit: upcomingLimit, referenceDate }),
    ])

  return {
    totals: {
      quotes: quoteTotals.total_quotes,
      bookings: bookingTotals.total_bookings,
      customers,
    },
    totalQuotes: quoteTotals.total_quotes,
    pendingQuotes: quoteTotals.pending_quotes,
    approvedQuotes: quoteTotals.approved_quotes,
    upcomingBookings: bookingTotals.upcoming_bookings,
    estimatedRevenue: quoteTotals.estimated_revenue,
    totalQuoteValue: quoteTotals.total_quote_value,
    quotesByStatus,
    recentQuotes,
    upcomingBookingsList,
    generatedAt: new Date().toISOString(),
  }
}
