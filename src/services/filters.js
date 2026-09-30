/* ============================================================
   QuoteFlow — search & filter predicates
   Each list applies the search term and every active filter, so
   combining "Sent" + "last 30 days" + a customer name narrows
   progressively rather than overriding.
   ============================================================ */

import { daysBetween, todayISO } from '../utils/format'

const term = (value) => (value ?? '').toString().trim().toLowerCase()

function matches(value, query) {
  return term(value).includes(query)
}

/** quote search: customer name, service, description, status, number */
export function matchesQuote(quote, query) {
  if (!query) return true
  return (
    matches(quote.customerName, query) ||
    matches(quote.service, query) ||
    matches(quote.description, query) ||
    matches(quote.status, query) ||
    matches(quote.number, query)
  )
}

export function filterQuotes(quotes, { search = '', status = 'all', date = 'all' } = {}) {
  const query = term(search)
  const window = date === 'all' ? null : Number(date)
  const today = todayISO()

  return quotes.filter((quote) => {
    if (!matchesQuote(quote, query)) return false
    if (status !== 'all' && quote.status !== status) return false
    if (window !== null && !Number.isNaN(window)) {
      const age = daysBetween(quote.createdAt, today)
      if (age > window || age < 0) return false
    }
    return true
  })
}

/** booking search: customer name, service, location, status */
export function matchesBooking(booking, query) {
  if (!query) return true
  return (
    matches(booking.customerName, query) ||
    matches(booking.service, query) ||
    matches(booking.location, query) ||
    matches(booking.status, query) ||
    matches(booking.notes, query)
  )
}

export function filterBookings(bookings, { search = '', status = 'all', date = 'all' } = {}) {
  const query = term(search)
  const today = todayISO()

  return bookings.filter((booking) => {
    if (!matchesBooking(booking, query)) return false
    if (status !== 'all' && booking.status !== status) return false

    const diff = daysBetween(booking.date, today)
    switch (date) {
      case 'upcoming':
        return diff >= 0
      case 'week':
        return diff >= 0 && diff <= 7
      case 'month':
        return diff >= 0 && diff <= 30
      case 'past':
        return diff < 0
      default:
        return true
    }
  })
}

/** customer search: name, email, company, phone, location */
export function filterCustomers(customers, { search = '' } = {}) {
  const query = term(search)
  if (!query) return customers

  return customers.filter(
    (customer) =>
      matches(customer.name, query) ||
      matches(customer.email, query) ||
      matches(customer.company, query) ||
      matches(customer.phone, query) ||
      matches(customer.location, query),
  )
}
