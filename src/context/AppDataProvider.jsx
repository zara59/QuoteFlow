/* ============================================================
   QuoteFlow — AppDataProvider
   The single source of truth for the whole app.

   Records come from the Express API and are stored exactly as the
   server returns them; PostgreSQL is the only source of truth. The
   selectors below turn those API records into the view models the
   tables and forms already expect, so the components kept their
   Stage 2 contracts and no mock data remains.

   Every mutation goes to the API first and the response is folded
   into local state, so what the UI shows is what the database
   actually stored. The dashboard aggregate is refetched alongside
   any change that could move a number.
   ============================================================ */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppDataContext } from './AppDataContext'
import * as customersApi from '../api/customers'
import * as quotesApi from '../api/quotes'
import * as bookingsApi from '../api/bookings'
import { getStats as fetchDashboard } from '../api/dashboard'
import { useAuth } from './AuthContext'
import { enrichBookings, enrichCustomers, enrichQuotes, pipelineGroups } from '../services/selectors'

const IDLE = { loading: false, error: null }

export default function AppDataProvider({ children }) {
  const { isAuthenticated } = useAuth()

  const [customers, setCustomers] = useState([])
  const [quotes, setQuotes] = useState([])
  const [bookings, setBookings] = useState([])
  const [dashboard, setDashboard] = useState(null)

  // Per-resource state, so one failed request does not blank the rest.
  const [customerState, setCustomerState] = useState(IDLE)
  const [quoteState, setQuoteState] = useState(IDLE)
  const [bookingState, setBookingState] = useState(IDLE)
  const [dashboardState, setDashboardState] = useState(IDLE)
  const [ready, setReady] = useState(false)

  /* ---------- Loaders ---------- */

  const loadCustomers = useCallback(async ({ signal } = {}) => {
    setCustomerState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const rows = await customersApi.listCustomers({ signal })
      setCustomers(rows ?? [])
      setCustomerState({ loading: false, error: null })
      return rows
    } catch (error) {
      if (error?.name === 'AbortError') return undefined
      setCustomerState({ loading: false, error })
      throw error
    }
  }, [])

  const loadQuotes = useCallback(async ({ signal } = {}) => {
    setQuoteState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const rows = await quotesApi.listQuotes({ signal })
      setQuotes(rows ?? [])
      setQuoteState({ loading: false, error: null })
      return rows
    } catch (error) {
      if (error?.name === 'AbortError') return undefined
      setQuoteState({ loading: false, error })
      throw error
    }
  }, [])

  const loadBookings = useCallback(async ({ signal } = {}) => {
    setBookingState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const rows = await bookingsApi.listBookings({ signal })
      setBookings(rows ?? [])
      setBookingState({ loading: false, error: null })
      return rows
    } catch (error) {
      if (error?.name === 'AbortError') return undefined
      setBookingState({ loading: false, error })
      throw error
    }
  }, [])

  const loadDashboard = useCallback(async ({ signal } = {}) => {
    setDashboardState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const stats = await fetchDashboard({ signal })
      setDashboard(stats)
      setDashboardState({ loading: false, error: null })
      return stats
    } catch (error) {
      if (error?.name === 'AbortError') return undefined
      setDashboardState({ loading: false, error })
      throw error
    }
  }, [])

  /* ---------- Sign out: drop the previous user's records ----------
     Tracked with a ref so the clear only runs on a real
     authenticated -> unauthenticated transition, not on first mount.

     The `setState`-in-effect lint warning here is deliberate. Clearing
     cached records when a session ends is memory hygiene, not a value
     that can be derived during render — and correctness does not rely
     on it: the context below already hands out empty lists whenever
     `isAuthenticated` is false, so stale data cannot reach a
     component even for a single frame. */

  const wasAuthenticated = useRef(false)

  useEffect(() => {
    if (isAuthenticated) {
      wasAuthenticated.current = true
      return undefined
    }

    if (!wasAuthenticated.current) return undefined
    wasAuthenticated.current = false

    setCustomers([])
    setQuotes([])
    setBookings([])
    setDashboard(null)
    setCustomerState(IDLE)
    setQuoteState(IDLE)
    setBookingState(IDLE)
    setDashboardState(IDLE)
    setReady(false)

    return undefined
  }, [isAuthenticated])

  /* ---------- Initial load ----------
     Fired once the session is known, and torn down on sign-out so a
     previous user's records are never left on screen. */

  useEffect(() => {
    if (!isAuthenticated) return undefined

    const controller = new AbortController()
    const { signal } = controller

    Promise.allSettled([
      loadCustomers({ signal }),
      loadQuotes({ signal }),
      loadBookings({ signal }),
      loadDashboard({ signal }),
    ]).finally(() => {
      if (!signal.aborted) setReady(true)
    })

    return () => controller.abort()
  }, [isAuthenticated, loadCustomers, loadQuotes, loadBookings, loadDashboard])

  /* A quote or booking change moves a dashboard figure, so the
     aggregate is refreshed after any of them. */
  const refreshDashboard = useCallback(() => loadDashboard().catch(() => {}), [loadDashboard])

  /* ---------- Customers ---------- */

  const addCustomer = useCallback(
    async (values) => {
      const created = await customersApi.createCustomer(values)
      setCustomers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      return created
    },
    [],
  )

  const editCustomer = useCallback(async (id, values) => {
    const updated = await customersApi.updateCustomer(id, values)
    setCustomers((prev) => prev.map((row) => (row.id === id ? updated : row)))
    // The API joins customer names live, so quotes and bookings that
    // reference this customer need refreshing to show the new name.
    const [quoteRows, bookingRows] = await Promise.allSettled([loadQuotes(), loadBookings()])
    if (quoteRows.status === 'fulfilled' || bookingRows.status === 'fulfilled') refreshDashboard()
    return updated
  }, [loadQuotes, loadBookings, refreshDashboard])

  /* Throws ApiError(409, { usage }) when linked records exist; the page
     turns that into the explanatory dialog. */
  const removeCustomer = useCallback(
    async (id) => {
      await customersApi.deleteCustomer(id)
      setCustomers((prev) => prev.filter((row) => row.id !== id))
      await Promise.allSettled([loadQuotes(), loadBookings()])
      refreshDashboard()
      return { ok: true }
    },
    [loadQuotes, loadBookings, refreshDashboard],
  )

  /* ---------- Quotes ---------- */

  const addQuote = useCallback(
    async (values) => {
      const created = await quotesApi.createQuote(values)
      setQuotes((prev) => [created, ...prev])
      refreshDashboard()
      return created
    },
    [refreshDashboard],
  )

  const editQuote = useCallback(
    async (id, values) => {
      const updated = await quotesApi.updateQuote(id, values)
      setQuotes((prev) => prev.map((row) => (row.id === id ? updated : row)))
      refreshDashboard()
      return updated
    },
    [refreshDashboard],
  )

  const removeQuote = useCallback(
    async (id) => {
      await quotesApi.deleteQuote(id)
      setQuotes((prev) => prev.filter((row) => row.id !== id))
      refreshDashboard()
    },
    [refreshDashboard],
  )

  const changeQuoteStatus = useCallback(
    async (id, status) => {
      const updated = await quotesApi.updateQuote(id, { status })
      setQuotes((prev) => prev.map((row) => (row.id === id ? updated : row)))
      refreshDashboard()
      return updated
    },
    [refreshDashboard],
  )

  /* ---------- Bookings ---------- */

  const addBooking = useCallback(
    async (values) => {
      const created = await bookingsApi.createBooking(values)
      setBookings((prev) => [...prev, created])
      refreshDashboard()
      return created
    },
    [refreshDashboard],
  )

  const editBooking = useCallback(
    async (id, values) => {
      const updated = await bookingsApi.updateBooking(id, values)
      setBookings((prev) => prev.map((row) => (row.id === id ? updated : row)))
      refreshDashboard()
      return updated
    },
    [refreshDashboard],
  )

  const removeBooking = useCallback(
    async (id) => {
      await bookingsApi.deleteBooking(id)
      setBookings((prev) => prev.filter((row) => row.id !== id))
      refreshDashboard()
    },
    [refreshDashboard],
  )

  const changeBookingStatus = useCallback(
    async (id, status) => {
      const updated = await bookingsApi.updateBooking(id, { status })
      setBookings((prev) => prev.map((row) => (row.id === id ? updated : row)))
      refreshDashboard()
      return updated
    },
    [refreshDashboard],
  )

  /* ---------- Derived view models ---------- */

  const value = useMemo(() => {
    /* Belt-and-braces with the sign-out effect above: even for a frame,
       an unauthenticated session can never read the previous user's
       records out of context. */
    const source = isAuthenticated
      ? { customers, quotes, bookings }
      : { customers: [], quotes: [], bookings: [] }

    const customerRows = enrichCustomers(source.customers, source.quotes, source.bookings)
    const quoteRows = enrichQuotes(source.quotes, source.customers)
    const bookingRows = enrichBookings(source.bookings, source.customers)

    return {
      customers: customerRows,
      quotes: quoteRows,
      bookings: bookingRows,
      dashboard: isAuthenticated ? dashboard : null,
      pipeline: pipelineGroups(quoteRows),
      counts: {
        customers: customerRows.length,
        quotes: quoteRows.length,
        bookings: bookingRows.length,
      },
      /* ready gates the first paint so pages do not flash an empty
         table before the first response lands. */
      ready: isAuthenticated && ready,
      load: {
        customers: customerState,
        quotes: quoteState,
        bookings: bookingState,
        dashboard: dashboardState,
      },
      actions: {
        addQuote,
        editQuote,
        removeQuote,
        changeQuoteStatus,
        addBooking,
        editBooking,
        removeBooking,
        changeBookingStatus,
        addCustomer,
        editCustomer,
        removeCustomer,
      },
      refresh: {
        customers: loadCustomers,
        quotes: loadQuotes,
        bookings: loadBookings,
        dashboard: loadDashboard,
      },
    }
  }, [
    isAuthenticated,
    customers,
    quotes,
    bookings,
    dashboard,
    ready,
    customerState,
    quoteState,
    bookingState,
    dashboardState,
    addQuote,
    editQuote,
    removeQuote,
    changeQuoteStatus,
    addBooking,
    editBooking,
    removeBooking,
    changeBookingStatus,
    addCustomer,
    editCustomer,
    removeCustomer,
    loadCustomers,
    loadQuotes,
    loadBookings,
    loadDashboard,
  ])

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}
