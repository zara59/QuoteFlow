/* ============================================================
   QuoteFlow API — persistence test
   Proves records live in PostgreSQL rather than process memory.

   Phase 1 (server running):  node scripts/persistence-test.mjs create
   --- restart the server here ---
   Phase 2 (after restart):   node scripts/persistence-test.mjs verify
   ============================================================ */

import { readFile, writeFile } from 'node:fs/promises'

const BASE = process.env.BASE_URL ?? 'http://localhost:5000'
const STATE_FILE = '/tmp/qf-persistence-state.json'

/* Stage 5: the records created in phase 1 belong to this user, and the
   same user has to sign in again in phase 2 to read them back. */
const TEST_EMAIL = process.env.TEST_EMAIL ?? 'usera@example.com'
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'Password123!'

let authToken = null

let passed = 0
let failed = 0

const check = (name, condition, detail = '') => {
  if (condition) {
    passed += 1
    console.log(`  PASS  ${name}`)
  } else {
    failed += 1
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

const authenticate = async () => {
  const response = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  })
  const json = await response.json().catch(() => null)
  if (!json?.data?.token) {
    console.error(`\n  Could not sign in as ${TEST_EMAIL}. Run "npm run seed:reset" first.\n`)
    process.exit(1)
  }
  authToken = json.data.token
}

const call = async (path, { method = 'GET', body } = {}) => {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const text = await response.text()
  return { status: response.status, json: text ? JSON.parse(text) : null }
}

const stamp = Date.now()

const create = async () => {
  console.log('\n── Phase 1: write through the API ──')
  await authenticate()

  const customer = await call('/api/customers', {
    method: 'POST',
    body: { name: `Persist Probe ${stamp}`, email: `probe${stamp}@example.com`, phone: '+1 (415) 555-0000', company: 'Persistence Test Co' },
  })
  check('created customer', customer.status === 201, `got ${customer.status}`)
  const customerId = customer.json.data.id

  const quote = await call('/api/quotes', {
    method: 'POST',
    body: { customerId, service: 'Persistence Quote', description: 'Written before restart.', amount: 750, validUntil: '2026-12-31', status: 'Draft' },
  })
  check('created quote for that customer', quote.status === 201, `got ${quote.status}`)
  check('quote carries the generated customer id', quote.json.data.customerId === customerId)
  const quoteId = quote.json.data.id

  const booking = await call('/api/bookings', {
    method: 'POST',
    body: { customerId, service: 'Persistence Booking', date: '2026-11-20', time: '14:00', status: 'Upcoming', notes: 'Written before restart.' },
  })
  check('created booking for that customer', booking.status === 201, `got ${booking.status}`)
  const bookingId = booking.json.data.id

  const deletedQuote = await call('/api/quotes', {
    method: 'POST',
    body: { customerId, service: 'Doomed Quote', amount: 99, validUntil: '2026-12-31', status: 'Draft' },
  })
  const doomedQuoteId = deletedQuote.json.data.id
  const doomed = await call(`/api/quotes/${doomedQuoteId}`, { method: 'DELETE' })
  check('deleted one quote', doomed.status === 200, `got ${doomed.status}`)

  const patched = await call(`/api/quotes/${quoteId}`, { method: 'PATCH', body: { status: 'Sent', amount: 900 } })
  check('updated the quote before restart', patched.json.data.status === 'Sent' && patched.json.data.amount === 900)

  const state = { customerId, quoteId, bookingId, doomedQuoteId, name: `Persist Probe ${stamp}` }
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2))
  console.log(`  saved state -> ${STATE_FILE}`)
  return { state, failed }
}

const verify = async () => {
  console.log('\n── Phase 2: after the backend restarted ──')
  await authenticate()
  const state = JSON.parse(await readFile(STATE_FILE, 'utf8'))

  const customer = await call(`/api/customers/${state.customerId}`)
  check('customer survived the restart', customer.status === 200, `got ${customer.status}`)
  check('customer data intact', customer.json?.data?.name === state.name, customer.json?.data?.name)
  check('usage counts survived', customer.json?.data?.usage?.quotes === 1, JSON.stringify(customer.json?.data?.usage))

  const quote = await call(`/api/quotes/${state.quoteId}`)
  check('quote survived the restart', quote.status === 200, `got ${quote.status}`)
  check('quote update persisted', quote.json?.data?.status === 'Sent', quote.json?.data?.status)
  check('quote amount update persisted', quote.json?.data?.amount === 900, String(quote.json?.data?.amount))
  check('quote still joined to its customer', quote.json?.data?.customerName === state.name, quote.json?.data?.customerName)

  const booking = await call(`/api/bookings/${state.bookingId}`)
  check('booking survived the restart', booking.status === 200, `got ${booking.status}`)
  check('booking date persisted', booking.json?.data?.date === '2026-11-20', booking.json?.data?.date)
  check('booking time persisted', booking.json?.data?.time === '14:00', booking.json?.data?.time)

  const gone = await call(`/api/quotes/${state.doomedQuoteId}`)
  check('deleted quote is still deleted', gone.status === 404, `got ${gone.status}`)

  const search = await call('/api/customers?search=Persistence')
  check('search finds the restored customer', search.json?.data?.some((row) => row.id === state.customerId))

  const stats = await call('/api/dashboard/stats')
  check('dashboard recomputed from restored data', stats.status === 200 && stats.json.data.totalQuotes > 0)

  /* Stage 5: ownership must outlive the process too. The restored rows
     are still bound to the user who created them. */
  const otherToken = await (async () => {
    const response = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'userb@example.com', password: TEST_PASSWORD }),
    })
    return (await response.json().catch(() => null))?.data?.token
  })()
  if (otherToken) {
    authToken = otherToken
    const foreign = await call(`/api/customers/${state.customerId}`)
    check('another user still cannot see the restored customer', foreign.status === 404, `got ${foreign.status}`)
    const foreignQuote = await call(`/api/quotes/${state.quoteId}`)
    check('another user still cannot see the restored quote', foreignQuote.status === 404, `got ${foreignQuote.status}`)
    const foreignBooking = await call(`/api/bookings/${state.bookingId}`)
    check('another user still cannot see the restored booking', foreignBooking.status === 404, `got ${foreignBooking.status}`)
    const foreignSearch = await call('/api/customers?search=Persistence')
    check(
      'another user\'s search cannot find the restored customer',
      !(foreignSearch.json?.data ?? []).some((row) => row.id === state.customerId),
    )
    await authenticate() // back to the owner for cleanup
  } else {
    check('second seed user could sign in for the ownership check', false, 'login failed')
  }

  // Clean up so repeated runs stay tidy.
  await call(`/api/quotes/${state.quoteId}`, { method: 'DELETE' })
  await call(`/api/bookings/${state.bookingId}`, { method: 'DELETE' })
  const removed = await call(`/api/customers/${state.customerId}`, { method: 'DELETE' })
  check('cleanup: customer deletable once records are gone', removed.status === 200, `got ${removed.status}`)

  return { failed }
}

const phase = process.argv[2] ?? 'create'
const result = phase === 'verify' ? await verify() : await create()

console.log(`\n  PASSED ${passed}   FAILED ${result.failed}\n`)
process.exit(result.failed === 0 ? 0 : 1)
