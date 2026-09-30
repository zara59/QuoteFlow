import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '../context/AppDataContext'
import { useAuth } from '../context/AuthContext'
import { formatCurrency, formatDate } from '../utils/format'
import { matchesBooking, matchesQuote } from '../services/filters'
import { IconBell, IconBookings, IconCustomers, IconMenu, IconQuotes, IconSearch } from './Icons'

const PER_GROUP = 3

const customerMatches = (customer, query) =>
  [customer.name, customer.email, customer.company, customer.phone, customer.location]
    .filter(Boolean)
    .some((field) => field.toLowerCase().includes(query))

/**
 * Global jump-to-record search. Typing searches quotes, customers and
 * bookings at once; picking a result navigates to the owning list page
 * with the term applied, so the page-level search stays the single place
 * filtering actually happens.
 */
export default function Header({ title, subtitle, onMenu }) {
  const navigate = useNavigate()
  const { quotes, bookings, customers } = useAppData()
  const { user, initials } = useAuth()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  const term = query.trim().toLowerCase()

  const results = useMemo(() => {
    if (term.length < 2) return null
    return {
      quotes: quotes.filter((quote) => matchesQuote(quote, term)).slice(0, PER_GROUP),
      customers: customers.filter((customer) => customerMatches(customer, term)).slice(0, PER_GROUP),
      bookings: bookings.filter((booking) => matchesBooking(booking, term)).slice(0, PER_GROUP),
    }
  }, [term, quotes, customers, bookings])

  const total = results ? results.quotes.length + results.customers.length + results.bookings.length : 0

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const go = (path) => {
    navigate(`${path}?q=${encodeURIComponent(query.trim())}`)
    setOpen(false)
    setQuery('')
  }

  /** Enter jumps to whichever list has the most matches. */
  const goToBest = () => {
    if (!results) return
    const best = [
      ['/quotes', results.quotes.length],
      ['/customers', results.customers.length],
      ['/bookings', results.bookings.length],
    ].sort((a, b) => b[1] - a[1])[0]
    if (best[1] > 0) go(best[0])
  }

  return (
    <header className="qf-header">
      <button
        type="button"
        className="qf-icon-btn qf-icon-btn--bordered qf-header__burger"
        onClick={onMenu}
        aria-label="Open navigation menu"
      >
        <IconMenu />
      </button>

      <div className="qf-header__titles">
        <h1 className="qf-truncate">{title}</h1>
        {subtitle && <p className="qf-header__sub qf-truncate">{subtitle}</p>}
      </div>

      <div className="qf-header__right">
        <div className="qf-input-wrap qf-header__search" ref={wrapRef}>
          <IconSearch size={16} />
          <input
            ref={inputRef}
            type="search"
            className="qf-input"
            placeholder="Search quotes, customers…"
            aria-label="Global search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                goToBest()
              }
            }}
          />

          {open && results && (
            <div className="qf-search-panel" role="listbox" aria-label="Search results">
              {total === 0 ? (
                <p className="qf-search-panel__empty">No quotes, bookings or customers match “{query.trim()}”.</p>
              ) : (
                <>
                  {results.quotes.length > 0 && (
                    <div className="qf-search-group">
                      <p className="qf-search-group__label">Quotes</p>
                      {results.quotes.map((quote) => (
                        <button
                          key={quote.id}
                          type="button"
                          role="option"
                          aria-selected="false"
                          className="qf-search-hit"
                          onClick={() => go('/quotes')}
                        >
                          <span className="qf-search-hit__icon">
                            <IconQuotes size={14} />
                          </span>
                          <span className="qf-search-hit__body">
                            <span className="qf-search-hit__title">{quote.service}</span>
                            <span className="qf-search-hit__meta">
                              {quote.number} · {quote.customerName}
                            </span>
                          </span>
                          <span className="qf-search-hit__value">{formatCurrency(quote.amount)}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {results.customers.length > 0 && (
                    <div className="qf-search-group">
                      <p className="qf-search-group__label">Customers</p>
                      {results.customers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          role="option"
                          aria-selected="false"
                          className="qf-search-hit"
                          onClick={() => go('/customers')}
                        >
                          <span className="qf-search-hit__icon">
                            <IconCustomers size={14} />
                          </span>
                          <span className="qf-search-hit__body">
                            <span className="qf-search-hit__title">{customer.name}</span>
                            <span className="qf-search-hit__meta">{customer.email}</span>
                          </span>
                          <span className="qf-search-hit__value">{formatCurrency(customer.lifetimeValue)}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {results.bookings.length > 0 && (
                    <div className="qf-search-group">
                      <p className="qf-search-group__label">Bookings</p>
                      {results.bookings.map((booking) => (
                        <button
                          key={booking.id}
                          type="button"
                          role="option"
                          aria-selected="false"
                          className="qf-search-hit"
                          onClick={() => go('/bookings')}
                        >
                          <span className="qf-search-hit__icon">
                            <IconBookings size={14} />
                          </span>
                          <span className="qf-search-hit__body">
                            <span className="qf-search-hit__title">{booking.service}</span>
                            <span className="qf-search-hit__meta">
                              {booking.customerName} · {formatDate(booking.date, 'short')}
                            </span>
                          </span>
                          <span className="qf-search-hit__value">{booking.status}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <p className="qf-search-panel__foot">
                    {total} result{total === 1 ? '' : 's'} · press Enter to see them all
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          className="qf-icon-btn qf-icon-btn--bordered qf-bell"
          aria-label="Notifications"
        >
          <IconBell size={18} />
          <span className="qf-bell__dot" />
        </button>

        <span className="qf-header__divider" aria-hidden="true" />

        <span className="qf-avatar qf-avatar--navy" title={user?.name ?? 'Signed in'}>
          {initials}
        </span>
      </div>
    </header>
  )
}
