/* ============================================================
   QuoteFlow — selectors
   Every derived number in the UI is computed here from the raw
   store records, so any create / edit / delete is reflected
   immediately on the dashboard, pipeline and tables.
   ============================================================ */

import { PENDING_QUOTE_STATUSES, QUOTE_STATUSES } from '../data/constants'
import { daysBetween, todayISO } from '../utils/format'

/* ---------- Joins ----------
   Records store customerId plus a denormalised customerName
   snapshot; the customer object itself is only ever joined in
   for display, never persisted twice.                        */

function customerById(customers) {
  return new Map(customers.map((customer) => [customer.id, customer]))
}

export function enrichQuotes(quotes, customers) {
  const index = customerById(customers)
  return quotes.map((quote) => ({ ...quote, customer: index.get(quote.customerId) ?? null }))
}

export function enrichBookings(bookings, customers) {
  const index = customerById(customers)
  return bookings.map((booking) => ({ ...booking, customer: index.get(booking.customerId) ?? null }))
}

/* ---------- Customer rollups ---------- */

export function enrichCustomers(customers, quotes, bookings) {
  return customers.map((customer) => {
    const ownQuotes = quotes.filter((quote) => quote.customerId === customer.id)
    const ownBookings = bookings.filter((booking) => booking.customerId === customer.id)
    const activityDates = [
      customer.createdAt,
      ...ownQuotes.map((quote) => quote.createdAt),
      ...ownBookings.map((booking) => booking.date),
    ].filter(Boolean)

    return {
      ...customer,
      totalQuotes: ownQuotes.length,
      totalBookings: ownBookings.length,
      upcomingBookings: ownBookings.filter((booking) => booking.status === 'Upcoming').length,
      lifetimeValue: ownQuotes
        .filter((quote) => quote.status === 'Approved')
        .reduce((sum, quote) => sum + Number(quote.amount || 0), 0),
      lastActivity: activityDates.sort().at(-1) ?? customer.createdAt,
    }
  })
}

/* ---------- Dashboard ---------- */

/**
 * Signed percentage change, or undefined when there is no baseline.
 * undefined is meaningful: StatCard hides the arrow entirely rather
 * than claiming a 0% change that never happened.
 */
function percentChange(current, previous) {
  if (!previous) return undefined
  return Math.round(((current - previous) / previous) * 100)
}

export function pipelineGroups(quotes) {
  return QUOTE_STATUSES.map((status) => {
    const rows = quotes.filter((quote) => quote.status === status)
    return {
      status,
      count: rows.length,
      value: rows.reduce((sum, quote) => sum + Number(quote.amount || 0), 0),
      quotes: rows,
    }
  })
}

/* ---------- Dashboard stat cards ----------
   The five headline figures come straight from
   GET /api/dashboard/stats, which aggregates them in SQL scoped to the
   signed-in user. Only the month-over-month arrows are worked out here,
   and those are derived from the same quote records the API just
   returned — so every number on the dashboard still traces back to
   PostgreSQL, and none of it is hard-coded. */

/** Splits records into the same two 30-day windows used by the arrows. */
function monthOverMonth(rows, dateKey) {
  const now = todayISO()
  const inWindow = (offset) => (row) => {
    const diff = daysBetween(row[dateKey], now) - offset
    return diff <= 0 && diff > -30
  }
  return percentChange(rows.filter(inWindow(0)).length, rows.filter(inWindow(30)).length)
}

const approvedValue = (rows) =>
  rows
    .filter((quote) => quote.status === 'Approved')
    .reduce((sum, quote) => sum + Number(quote.amount || 0), 0)

/** Month-over-month arrows, by value rather than by count. */
function valueMonthOverMonth(rows, dateKey) {
  const now = todayISO()
  const inWindow = (offset) => (row) => {
    const diff = daysBetween(row[dateKey], now) - offset
    return diff <= 0 && diff > -30
  }
  return percentChange(approvedValue(rows.filter(inWindow(0))), approvedValue(rows.filter(inWindow(30))))
}

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

export function dashboardStatCards(dashboard, quotes) {
  if (!dashboard) return []

  const byStatus = dashboard.quotesByStatus ?? {}
  const draft = byStatus.Draft ?? 0
  const sent = byStatus.Sent ?? 0
  const declined = byStatus.Declined ?? 0
  const approved = byStatus.Approved ?? 0
  const total = dashboard.totalQuotes ?? 0
  const bookings = dashboard.totals?.bookings ?? 0
  const customers = dashboard.totals?.customers ?? 0
  const pending = quotes.filter((quote) => PENDING_QUOTE_STATUSES.includes(quote.status))

  return [
    {
      id: 'total-quotes',
      label: 'Total Quotes',
      value: total,
      icon: 'inbox',
      tone: 'navy',
      delta: monthOverMonth(quotes, 'createdAt'),
      deltaLabel: `${approved} approved · ${declined} declined`,
    },
    {
      id: 'pending-quotes',
      label: 'Awaiting Decision',
      value: dashboard.pendingQuotes ?? 0,
      icon: 'clock',
      tone: 'warning',
      delta: monthOverMonth(pending, 'createdAt'),
      deltaLabel: `${draft} draft · ${sent} sent`,
    },
    {
      id: 'approved-quotes',
      label: 'Approved Quotes',
      value: dashboard.approvedQuotes ?? 0,
      icon: 'check',
      tone: 'success',
      deltaLabel: total ? `${Math.round((approved / total) * 100)}% of all quotes` : 'No quotes yet',
    },
    {
      id: 'upcoming-bookings',
      label: 'Upcoming Bookings',
      value: dashboard.upcomingBookings ?? 0,
      icon: 'calendar',
      tone: 'info',
      deltaLabel: `${plural(bookings, 'booking')} in total`,
    },
    {
      id: 'approved-value',
      label: 'Approved Value',
      value: dashboard.estimatedRevenue ?? 0,
      isCurrency: true,
      icon: 'wallet',
      tone: 'accent',
      delta: valueMonthOverMonth(quotes, 'createdAt'),
      deltaLabel: `${plural(customers, 'customer')} on file`,
    },
  ]
}
