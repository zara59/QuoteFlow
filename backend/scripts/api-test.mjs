/* ============================================================
   QuoteFlow API — endpoint test suite
   Exercises every route plus the validation, error and CORS
   behaviour. Run with the API already listening:
      node scripts/api-test.mjs
   BASE_URL and CLIENT_ORIGIN can be overridden by env.

   Stage 5: every business route is behind JWT auth. The suite signs
   in as a seeded user up front and attaches that token to each call.
   Ownership and token-handling specifics live in auth-test.mjs.
   ============================================================ */

const BASE = process.env.BASE_URL ?? 'http://localhost:5000'
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173'
const BLOCKED_ORIGIN = 'http://evil.example.com'

const TEST_EMAIL = process.env.TEST_EMAIL ?? 'usera@example.com'
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'Password123!'

let authToken = null

let passed = 0
let failed = 0
const failures = []

const check = (name, condition, detail = '') => {
  if (condition) {
    passed += 1
    console.log(`  PASS  ${name}`)
  } else {
    failed += 1
    failures.push(name)
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

const section = (title) => console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 58 - title.length))}`)

/* `anonymous: true` omits the token, for the public-endpoint checks. */
const call = async (path, { method = 'GET', body, headers = {}, origin, anonymous = false } = {}) => {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(origin ? { origin } : {}),
      ...(anonymous ? {} : authToken ? { authorization: `Bearer ${authToken}` } : {}),
      ...headers,
    },
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  })
  const text = await response.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }
  return { status: response.status, json, text, headers: response.headers }
}

/* Signs in and stores the token used by every later call. */
const authenticate = async () => {
  const response = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  })
  const json = await response.json().catch(() => null)
  if (!json?.data?.token) {
    console.error(
      `\n  Could not sign in as ${TEST_EMAIL}. Run "npm run seed:reset" first, then start the API.\n`,
    )
    process.exit(1)
  }
  authToken = json.data.token
}

const LEAK_PATTERNS = [/at \w+ \(/, /node_modules/, /\/Users\//, /SQLSTATE/, /Error: /]

const assertNoLeak = (label, result) => {
  const body = result.text
  const leaked = LEAK_PATTERNS.filter((pattern) => pattern.test(body))
  check(`${label} — no stack trace or path leak`, leaked.length === 0, leaked.map(String).join(', '))
}

const ids = {}

const run = async () => {
  console.log(`QuoteFlow API test suite\nTarget: ${BASE}\n`)

  /* Every business route needs a token from here on. */
  await authenticate()

  /* ---------------- Health ---------------- */
  section('Health')
  const health = await call('/api/health')
  check('GET /api/health returns 200', health.status === 200, `got ${health.status}`)
  check('health success flag is true', health.json?.success === true)
  check('health message matches spec', health.json?.message === 'QuoteFlow API is running')
  check('health reports postgresql storage', health.json?.data?.storage === 'postgresql')
  check('health reports a live database connection', health.json?.data?.database?.connected === true, JSON.stringify(health.json?.data?.database))

  /* ---------------- Dashboard (baseline) ---------------- */
  section('Dashboard stats — baseline seed values')
  /* Stage 5 scoped these totals to the signed-in user, so the figures
     are user A's slice of the seed data, not the whole database. */
  const stats = await call('/api/dashboard/stats')
  const base = stats.json?.data
  check('GET /api/dashboard/stats returns 200', stats.status === 200, `got ${stats.status}`)
  check('total quotes = 16', base?.totalQuotes === 16, `got ${base?.totalQuotes}`)
  check('pending quotes (Draft + Sent) = 6', base?.pendingQuotes === 6, `got ${base?.pendingQuotes}`)
  check('approved quotes = 8', base?.approvedQuotes === 8, `got ${base?.approvedQuotes}`)
  check('upcoming bookings = 5', base?.upcomingBookings === 5, `got ${base?.upcomingBookings}`)
  check('estimated revenue = 6840', base?.estimatedRevenue === 6840, `got ${base?.estimatedRevenue}`)
  check('quotesByStatus has all four keys', Object.keys(base?.quotesByStatus ?? {}).join(',') === 'Draft,Sent,Approved,Declined')
  check('quotesByStatus counts are correct', base?.quotesByStatus?.Draft === 3 && base?.quotesByStatus?.Sent === 3 && base?.quotesByStatus?.Approved === 8 && base?.quotesByStatus?.Declined === 2, JSON.stringify(base?.quotesByStatus))
  check('recentQuotes returns a list', Array.isArray(base?.recentQuotes) && base.recentQuotes.length === 5)
  check('upcomingBookingsList returns a list', Array.isArray(base?.upcomingBookingsList) && base.upcomingBookingsList.length === 5)
  check('customer count = 6', base?.totals?.customers === 6, `got ${base?.totals?.customers}`)

  /* ---------------- Quotes: list & filters ---------------- */
  section('Quotes — list, search, status filter')
  const allQuotes = await call('/api/quotes')
  check('GET /api/quotes returns 200', allQuotes.status === 200)
  check('all quotes returns 16 records', allQuotes.json?.data?.length === 16, `got ${allQuotes.json?.data?.length}`)
  check('list envelope has meta.count', allQuotes.json?.meta?.count === 16)

  const approved = await call('/api/quotes?status=Approved')
  check('?status=Approved returns only Approved', approved.json?.data?.every((q) => q.status === 'Approved'))
  check('?status=Approved returns 8 records', approved.json?.data?.length === 8, `got ${approved.json?.data?.length}`)

  const bySearch = await call('/api/quotes?search=Sarah')
  check('?search=Sarah matches customer name', bySearch.json?.data?.length === 2, `got ${bySearch.json?.data?.length}`)

  const byService = await call('/api/quotes?search=logo')
  check('?search is case-insensitive on service', byService.json?.data?.every((q) => q.service.toLowerCase().includes('logo')))

  const byDescription = await call('/api/quotes?search=carpet')
  check('?search matches description text', byDescription.json?.data?.length >= 1, `got ${byDescription.json?.data?.length}`)

  const combined = await call('/api/quotes?status=Sent&search=Sarah')
  check('status + search combine', combined.json?.data?.length === 1, `got ${combined.json?.data?.length}`)

  const noMatch = await call('/api/quotes?search=zzzznotathing')
  check('search with no match returns empty list', noMatch.status === 200 && noMatch.json?.data?.length === 0)

  const badStatus = await call('/api/quotes?status=Bogus')
  check('invalid ?status returns 400', badStatus.status === 400, `got ${badStatus.status}`)
  check('invalid ?status message is clean', typeof badStatus.json?.message === 'string' && badStatus.json.success === false)

  const allStatus = await call('/api/quotes?status=all')
  check('?status=all returns everything', allStatus.json?.data?.length === 16)

  /* ---------------- Quotes: single ---------------- */
  section('Quotes — get single, invalid ids')
  // Ids are generated by PostgreSQL, so look one up instead of assuming a value.
  const sampleQuote = allQuotes.json.data[0]
  const one = await call(`/api/quotes/${sampleQuote.id}`)
  check('GET /api/quotes/:id returns 200', one.status === 200)
  check('returned quote id matches', one.json?.data?.id === sampleQuote.id)
  check('returned quote has a number', typeof one.json?.data?.number === 'string')

  const missing = await call('/api/quotes/999999')
  check('unknown quote id returns 404', missing.status === 404, `got ${missing.status}`)
  check('404 message is clean', /not found/i.test(missing.json?.message ?? ''), missing.json?.message)
  assertNoLeak('404 quote', missing)

  const malformed = await call('/api/quotes/abc')
  check('non-numeric quote id returns 400', malformed.status === 400, `got ${malformed.status}`)

  /* ---------------- Quotes: create ---------------- */
  section('Quotes — create')
  const created = await call('/api/quotes', {
    method: 'POST',
    body: { customerId: 1, service: 'Website Redesign', description: 'Complete website redesign', amount: 1200, validUntil: '2026-10-15', status: 'Draft' },
  })
  ids.quote = created.json?.data?.id
  check('POST /api/quotes returns 201', created.status === 201, `got ${created.status}`)
  check('server generated an id', Number.isInteger(ids.quote), `id=${ids.quote}`)
  check('server generated a quote number', /^QF-\d+$/.test(created.json?.data?.number ?? ''), created.json?.data?.number)
  check('customerName snapshotted from customer', created.json?.data?.customerName === 'Sarah Johnson', created.json?.data?.customerName)
  check('createdAt set by server', typeof created.json?.data?.createdAt === 'string')

  const statusDefault = await call('/api/quotes', { method: 'POST', body: { customerId: 1, service: 'Consultation Hour', amount: 100, validUntil: '2026-11-01' } })
  ids.quoteNoStatus = statusDefault.json?.data?.id
  check('status defaults to Draft when omitted', statusDefault.json?.data?.status === 'Draft', statusDefault.json?.data?.status)

  section('Quotes — create validation')
  const badCases = [
    ['missing service', { customerId: 1, amount: 100, validUntil: '2026-10-15', status: 'Draft' }, 'service'],
    ['missing customerId', { service: 'Logo Design', amount: 100, validUntil: '2026-10-15', status: 'Draft' }, 'customerId'],
    ['missing amount', { customerId: 1, service: 'Logo Design', validUntil: '2026-10-15', status: 'Draft' }, 'amount'],
    ['missing validUntil', { customerId: 1, service: 'Logo Design', amount: 100, status: 'Draft' }, 'validUntil'],
    ['zero amount', { customerId: 1, service: 'Logo Design', amount: 0, validUntil: '2026-10-15', status: 'Draft' }, 'amount'],
    ['negative amount', { customerId: 1, service: 'Logo Design', amount: -50, validUntil: '2026-10-15', status: 'Draft' }, 'amount'],
    ['non-numeric amount', { customerId: 1, service: 'Logo Design', amount: 'abc', validUntil: '2026-10-15', status: 'Draft' }, 'amount'],
    ['over-max amount', { customerId: 1, service: 'Logo Design', amount: 9_999_999, validUntil: '2026-10-15', status: 'Draft' }, 'amount'],
    ['invalid status', { customerId: 1, service: 'Logo Design', amount: 100, validUntil: '2026-10-15', status: 'Shipped' }, 'status'],
    ['invalid date format', { customerId: 1, service: 'Logo Design', amount: 100, validUntil: '15/10/2026', status: 'Draft' }, 'validUntil'],
    ['impossible date', { customerId: 1, service: 'Logo Design', amount: 100, validUntil: '2026-02-31', status: 'Draft' }, 'validUntil'],
    ['non-existent customer', { customerId: 999999, service: 'Logo Design', amount: 100, validUntil: '2026-10-15', status: 'Draft' }, 'customerId'],
    ['non-numeric customerId', { customerId: 'abc', service: 'Logo Design', amount: 100, validUntil: '2026-10-15', status: 'Draft' }, 'customerId'],
    ['service too short', { customerId: 1, service: 'ab', amount: 100, validUntil: '2026-10-15', status: 'Draft' }, 'service'],
    ['unknown field', { customerId: 1, service: 'Logo Design', amount: 100, validUntil: '2026-10-15', status: 'Draft', hacked: true }, null],
  ]

  for (const [label, body, expectedField] of badCases) {
    const res = await call('/api/quotes', { method: 'POST', body })
    check(`POST rejects ${label} with 400`, res.status === 400, `got ${res.status}`)
    check(`POST ${label} — success false`, res.json?.success === false)
    if (expectedField) {
      check(`POST ${label} — reports field ${expectedField}`, Boolean(res.json?.errors?.[expectedField]), JSON.stringify(res.json?.errors))
    }
    assertNoLeak(`POST ${label}`, res)
  }

  const emptyBody = await call('/api/quotes', { method: 'POST', body: {} })
  check('POST with empty body returns 400', emptyBody.status === 400, `got ${emptyBody.status}`)

  /* ---------------- Quotes: update ---------------- */
  section('Quotes — update')
  const patched = await call(`/api/quotes/${ids.quote}`, { method: 'PATCH', body: { status: 'Sent', amount: 1500 } })
  check('PATCH /api/quotes/:id returns 200', patched.status === 200, `got ${patched.status}`)
  check('PATCH applied the status', patched.json?.data?.status === 'Sent', patched.json?.data?.status)
  check('PATCH applied the amount', patched.json?.data?.amount === 1500, String(patched.json?.data?.amount))
  check('PATCH left untouched fields alone', patched.json?.data?.service === 'Website Redesign')

  const reassign = await call(`/api/quotes/${ids.quote}`, { method: 'PATCH', body: { customerId: 3 } })
  check('PATCH can reassign customer', reassign.json?.data?.customerId === 3, String(reassign.json?.data?.customerId))
  check('PATCH re-syncs customerName', reassign.json?.data?.customerName === 'Bright Studio', reassign.json?.data?.customerName)

  const patchBad = [
    ['invalid status', { status: 'Nope' }, 'status'],
    ['negative amount', { amount: -1 }, 'amount'],
    ['invalid date', { validUntil: 'not-a-date' }, 'validUntil'],
    ['non-existent customer', { customerId: 424242 }, 'customerId'],
  ]
  for (const [label, body, field] of patchBad) {
    const res = await call(`/api/quotes/${ids.quote}`, { method: 'PATCH', body })
    check(`PATCH rejects ${label} with 400`, res.status === 400, `got ${res.status}`)
    check(`PATCH ${label} — reports field ${field}`, Boolean(res.json?.errors?.[field]), JSON.stringify(res.json?.errors))
  }

  const patchEmpty = await call(`/api/quotes/${ids.quote}`, { method: 'PATCH', body: {} })
  check('PATCH with empty body returns 400', patchEmpty.status === 400, `got ${patchEmpty.status}`)

  const patchMissing = await call('/api/quotes/999999', { method: 'PATCH', body: { status: 'Sent' } })
  check('PATCH unknown quote returns 404', patchMissing.status === 404, `got ${patchMissing.status}`)

  /* ---------------- Quotes: delete ---------------- */
  section('Quotes — delete')
  const removed = await call(`/api/quotes/${ids.quoteNoStatus}`, { method: 'DELETE' })
  check('DELETE /api/quotes/:id returns 200', removed.status === 200, `got ${removed.status}`)
  check('DELETE returns a success message', typeof removed.json?.message === 'string' && removed.json.success === true)
  const afterDelete = await call(`/api/quotes/${ids.quoteNoStatus}`)
  check('deleted quote is gone', afterDelete.status === 404, `got ${afterDelete.status}`)
  const deleteAgain = await call(`/api/quotes/${ids.quoteNoStatus}`, { method: 'DELETE' })
  check('DELETE unknown quote returns 404', deleteAgain.status === 404, `got ${deleteAgain.status}`)

  /* ---------------- Bookings ---------------- */
  section('Bookings — list, search, status, date filters')
  const allBookings = await call('/api/bookings')
  check('GET /api/bookings returns 200', allBookings.status === 200)
  check('all bookings returns 8 records', allBookings.json?.data?.length === 8, `got ${allBookings.json?.data?.length}`)

  const upcomingOnly = await call('/api/bookings?status=Upcoming')
  check('?status=Upcoming returns 5 records', upcomingOnly.json?.data?.length === 5, `got ${upcomingOnly.json?.data?.length}`)

  const bookingSearch = await call('/api/bookings?search=Emma')
  check('?search matches booking customer', bookingSearch.json?.data?.every((b) => b.customerName === 'Emma Brown'))

  const bookingServiceSearch = await call('/api/bookings?search=boiler')
  check('?search matches booking service', bookingServiceSearch.json?.data?.length >= 1)

  const dateExact = await call('/api/bookings?date=2026-10-05')
  check('?date=YYYY-MM-DD filters to one day', dateExact.json?.data?.length === 1, `got ${dateExact.json?.data?.length}`)
  check('?date result is the right booking', dateExact.json?.data?.[0]?.service === 'Boiler Servicing')

  const dateUpcoming = await call('/api/bookings?date=upcoming')
  check('?date=upcoming returns 5 records', dateUpcoming.json?.data?.length === 5, `got ${dateUpcoming.json?.data?.length}`)
  const datePast = await call('/api/bookings?date=past')
  check('?date=past returns 3 records', datePast.json?.data?.length === 3, `got ${datePast.json?.data?.length}`)

  const badDate = await call('/api/bookings?date=nonsense')
  check('invalid ?date returns 400', badDate.status === 400, `got ${badDate.status}`)
  const badBookingStatus = await call('/api/bookings?status=Approved')
  check('quote-only status rejected on bookings', badBookingStatus.status === 400, `got ${badBookingStatus.status}`)

  section('Bookings — get single, create, update, delete')
  const oneBooking = await call('/api/bookings/1')
  check('GET /api/bookings/:id returns 200', oneBooking.status === 200)
  check('booking id matches', oneBooking.json?.data?.id === 1)
  const bookingMissing = await call('/api/bookings/999999')
  check('unknown booking id returns 404', bookingMissing.status === 404, `got ${bookingMissing.status}`)
  const bookingMalformed = await call('/api/bookings/xyz')
  check('non-numeric booking id returns 400', bookingMalformed.status === 400, `got ${bookingMalformed.status}`)

  const newBooking = await call('/api/bookings', {
    method: 'POST',
    body: { customerId: 1, service: 'Website Consultation', date: '2026-10-05', time: '10:00', status: 'Upcoming', notes: 'Initial consultation' },
  })
  ids.booking = newBooking.json?.data?.id
  check('POST /api/bookings returns 201', newBooking.status === 201, `got ${newBooking.status}`)
  check('server generated a booking id', Number.isInteger(ids.booking), `id=${ids.booking}`)
  check('customerName snapshotted', newBooking.json?.data?.customerName === 'Sarah Johnson')
  check('notes persisted', newBooking.json?.data?.notes === 'Initial consultation')

  const bookingNoStatus = await call('/api/bookings', { method: 'POST', body: { customerId: 1, service: 'Design Review', date: '2026-11-02', time: '09:00' } })
  ids.bookingNoStatus = bookingNoStatus.json?.data?.id
  check('booking status defaults to Upcoming', bookingNoStatus.json?.data?.status === 'Upcoming', bookingNoStatus.json?.data?.status)

  const bookingBadCases = [
    ['missing service', { customerId: 1, date: '2026-10-05', time: '10:00', status: 'Upcoming' }, 'service'],
    ['missing date', { customerId: 1, service: 'Consultation', time: '10:00', status: 'Upcoming' }, 'date'],
    ['missing time', { customerId: 1, service: 'Consultation', date: '2026-10-05', status: 'Upcoming' }, 'time'],
    ['malformed time', { customerId: 1, service: 'Consultation', date: '2026-10-05', time: '25:99', status: 'Upcoming' }, 'time'],
    ['invalid status', { customerId: 1, service: 'Consultation', date: '2026-10-05', time: '10:00', status: 'Pending' }, 'status'],
    ['non-existent customer', { customerId: 888888, service: 'Consultation', date: '2026-10-05', time: '10:00', status: 'Upcoming' }, 'customerId'],
    ['invalid date', { customerId: 1, service: 'Consultation', date: 'tomorrow', time: '10:00', status: 'Upcoming' }, 'date'],
  ]
  for (const [label, body, field] of bookingBadCases) {
    const res = await call('/api/bookings', { method: 'POST', body })
    check(`POST booking rejects ${label} with 400`, res.status === 400, `got ${res.status}`)
    check(`POST booking ${label} — reports field ${field}`, Boolean(res.json?.errors?.[field]), JSON.stringify(res.json?.errors))
  }

  const patchBooking = await call(`/api/bookings/${ids.booking}`, { method: 'PATCH', body: { status: 'Completed', time: '11:30' } })
  check('PATCH /api/bookings/:id returns 200', patchBooking.status === 200, `got ${patchBooking.status}`)
  check('PATCH applied booking status', patchBooking.json?.data?.status === 'Completed', patchBooking.json?.data?.status)
  check('PATCH applied booking time', patchBooking.json?.data?.time === '11:30', patchBooking.json?.data?.time)

  const patchBookingBad = await call(`/api/bookings/${ids.booking}`, { method: 'PATCH', body: { status: 'Approved' } })
  check('PATCH booking rejects quote status with 400', patchBookingBad.status === 400, `got ${patchBookingBad.status}`)
  const patchBookingMissing = await call('/api/bookings/999999', { method: 'PATCH', body: { status: 'Completed' } })
  check('PATCH unknown booking returns 404', patchBookingMissing.status === 404, `got ${patchBookingMissing.status}`)

  const deleteBooking = await call(`/api/bookings/${ids.bookingNoStatus}`, { method: 'DELETE' })
  check('DELETE /api/bookings/:id returns 200', deleteBooking.status === 200, `got ${deleteBooking.status}`)
  const bookingGone = await call(`/api/bookings/${ids.bookingNoStatus}`)
  check('deleted booking is gone', bookingGone.status === 404, `got ${bookingGone.status}`)

  /* ---------------- Customers ---------------- */
  section('Customers — list, search')
  const allCustomers = await call('/api/customers')
  check('GET /api/customers returns 200', allCustomers.status === 200)
  check('all customers returns 6 records', allCustomers.json?.data?.length === 6, `got ${allCustomers.json?.data?.length}`)
  check('customers include usage counts', typeof allCustomers.json?.data?.[0]?.usage?.quotes === 'number')

  const searchName = await call('/api/customers?search=Bright')
  check('?search matches customer name', searchName.json?.data?.length === 1, `got ${searchName.json?.data?.length}`)
  const searchEmail = await call('/api/customers?search=gmail.com')
  check('?search matches email', searchEmail.json?.data?.length >= 1, `got ${searchEmail.json?.data?.length}`)
  const searchPhone = await call('/api/customers?search=555-0142')
  check('?search matches phone', searchPhone.json?.data?.length === 1, `got ${searchPhone.json?.data?.length}`)
  const searchCompany = await call('/api/customers?search=Miller Property')
  check('?search matches company', searchCompany.json?.data?.length === 1, `got ${searchCompany.json?.data?.length}`)

  section('Customers — get single, create, update')
  const oneCustomer = await call('/api/customers/1')
  check('GET /api/customers/:id returns 200', oneCustomer.status === 200)
  check('customer id matches', oneCustomer.json?.data?.id === 1)
  check('single customer reports usage', typeof oneCustomer.json?.data?.usage === 'object')
  const customerMissing = await call('/api/customers/999999')
  check('unknown customer id returns 404', customerMissing.status === 404, `got ${customerMissing.status}`)
  const customerMalformed = await call('/api/customers/abc')
  check('non-numeric customer id returns 400', customerMalformed.status === 400, `got ${customerMalformed.status}`)

  const newCustomer = await call('/api/customers', {
    method: 'POST',
    body: { name: 'Sarah Johnson', email: 'sarah@example.com', phone: '+123456789', company: 'Sarah Design' },
  })
  ids.customer = newCustomer.json?.data?.id
  check('POST /api/customers returns 201', newCustomer.status === 201, `got ${newCustomer.status}`)
  check('server generated a customer id', Number.isInteger(ids.customer), `id=${ids.customer}`)
  check('createdAt set by server', typeof newCustomer.json?.data?.createdAt === 'string')

  const minimalCustomer = await call('/api/customers', { method: 'POST', body: { name: 'Minimal Person' } })
  ids.customerMinimal = minimalCustomer.json?.data?.id
  check('customer with only a name is accepted', minimalCustomer.status === 201, `got ${minimalCustomer.status}`)

  const customerBadCases = [
    ['missing name', { email: 'x@example.com' }, 'name'],
    ['name too short', { name: 'A' }, 'name'],
    ['malformed email', { name: 'Test Person', email: 'not-an-email' }, 'email'],
    ['malformed phone', { name: 'Test Person', phone: 'call me' }, 'phone'],
    ['unknown field', { name: 'Test Person', isAdmin: true }, null],
  ]
  for (const [label, body, field] of customerBadCases) {
    const res = await call('/api/customers', { method: 'POST', body })
    check(`POST customer rejects ${label} with 400`, res.status === 400, `got ${res.status}`)
    if (field) check(`POST customer ${label} — reports field ${field}`, Boolean(res.json?.errors?.[field]), JSON.stringify(res.json?.errors))
  }

  const patchCustomer = await call(`/api/customers/${ids.customer}`, { method: 'PATCH', body: { name: 'Sarah Johnson-Studio', company: 'Sarah Design Co' } })
  check('PATCH /api/customers/:id returns 200', patchCustomer.status === 200, `got ${patchCustomer.status}`)
  check('PATCH applied the rename', patchCustomer.json?.data?.name === 'Sarah Johnson-Studio', patchCustomer.json?.data?.name)

  section('Customers — rename cascades to quotes and bookings')
  const newCustomerId = ids.customer
  const reassignedQuote = await call('/api/quotes', { method: 'POST', body: { customerId: newCustomerId, service: 'Cascade Check', amount: 300, validUntil: '2026-12-01', status: 'Draft' } })
  const cascadeQuoteId = reassignedQuote.json?.data?.id
  const renamedBack = await call(`/api/customers/${newCustomerId}`, { method: 'PATCH', body: { name: 'Sarah Renamed' } })
  check('rename returns 200', renamedBack.status === 200, `got ${renamedBack.status}`)
  const cascaded = await call(`/api/quotes/${cascadeQuoteId}`)
  check('quote customerName followed the rename', cascaded.json?.data?.customerName === 'Sarah Renamed', cascaded.json?.data?.customerName)
  await call(`/api/quotes/${cascadeQuoteId}`, { method: 'DELETE' })

  section('Customers — delete guard')
  const linked = await call('/api/customers/1')
  const withRecords = await call(`/api/customers/${linked.json.data.id}`, { method: 'DELETE' })
  check('DELETE customer with quotes returns 409', withRecords.status === 409, `got ${withRecords.status}`)
  check('409 message explains the conflict', /has \d+ quote/.test(withRecords.json?.message ?? ''), withRecords.json?.message)
  check('409 includes usage detail', typeof withRecords.json?.errors?.usage === 'object')
  const stillThere = await call('/api/customers/1')
  check('refused customer was not deleted', stillThere.status === 200, `got ${stillThere.status}`)

  const deleteFree = await call(`/api/customers/${ids.customerMinimal}`, { method: 'DELETE' })
  check('DELETE customer with no records returns 200', deleteFree.status === 200, `got ${deleteFree.status}`)
  const freed = await call(`/api/customers/${ids.customerMinimal}`)
  check('deleted customer is gone', freed.status === 404, `got ${freed.status}`)

  const deleteMissing = await call('/api/customers/999999', { method: 'DELETE' })
  check('DELETE unknown customer returns 404', deleteMissing.status === 404, `got ${deleteMissing.status}`)

  /* ---------------- Dashboard reflects mutations ---------------- */
  section('Dashboard stats — recomputed after mutations')
  const after = await call('/api/dashboard/stats')
  const now = after.json?.data
  check('total quotes rose to 17 after create', now?.totalQuotes === 17, `got ${now?.totalQuotes}`)
  check('total bookings rose to 9 after create', now?.totals?.bookings === 9, `got ${now?.totals?.bookings}`)
  check('total customers rose to 7 after create', now?.totals?.customers === 7, `got ${now?.totals?.customers}`)
  check('upcoming bookings changed after status flip', now?.upcomingBookings === 5, `got ${now?.upcomingBookings}`)
  check('estimated revenue unchanged by Draft quote', now?.estimatedRevenue === 6840, `got ${now?.estimatedRevenue}`)

  const approve = await call(`/api/quotes/${ids.quote}`, { method: 'PATCH', body: { status: 'Approved' } })
  check('approve the test quote', approve.status === 200, `got ${approve.status}`)
  const afterApprove = await call('/api/dashboard/stats')
  check('estimated revenue rose to 6840 + 1500', afterApprove.json?.data?.estimatedRevenue === 8340, `got ${afterApprove.json?.data?.estimatedRevenue}`)
  check('approved count rose to 9', afterApprove.json?.data?.approvedQuotes === 9, `got ${afterApprove.json?.data?.approvedQuotes}`)

  /* ---------------- Error handling ---------------- */
  section('Error handling')
  const badJson = await call('/api/quotes', { method: 'POST', body: '{ not json' })
  check('malformed JSON returns 400', badJson.status === 400, `got ${badJson.status}`)
  check('malformed JSON message is clean', /valid JSON/i.test(badJson.json?.message ?? ''), badJson.json?.message)

  const unknownRoute = await call('/api/nope')
  check('unknown route returns 404', unknownRoute.status === 404, `got ${unknownRoute.status}`)
  check('unknown route returns JSON envelope', unknownRoute.json?.success === false && typeof unknownRoute.json?.message === 'string')
  assertNoLeak('unknown route', unknownRoute)

  const root = await call('/')
  check('unmounted root returns 404', root.status === 404, `got ${root.status}`)

  const wrongMethod = await call('/api/health', { method: 'DELETE' })
  check('wrong method on health returns 404', wrongMethod.status === 404, `got ${wrongMethod.status}`)

  const xPowered = await call('/api/health')
  check('X-Powered-By header removed', xPowered.headers.get('x-powered-by') === null, xPowered.headers.get('x-powered-by'))

  /* ---------------- CORS ---------------- */
  section('CORS')
  const allowed = await call('/api/health', { origin: CLIENT_ORIGIN })
  check('allowed origin receives the header', allowed.headers.get('access-control-allow-origin') === CLIENT_ORIGIN, allowed.headers.get('access-control-allow-origin'))

  const blocked = await call('/api/health', { origin: BLOCKED_ORIGIN })
  check('blocked origin receives no CORS header', blocked.headers.get('access-control-allow-origin') === null, blocked.headers.get('access-control-allow-origin'))

  const preflight = await fetch(`${BASE}/api/quotes`, { method: 'OPTIONS', headers: { origin: CLIENT_ORIGIN, 'access-control-request-method': 'POST' } })
  check('preflight from allowed origin succeeds', preflight.status === 204, `got ${preflight.status}`)
  check('preflight allows POST', String(preflight.headers.get('access-control-allow-methods')).includes('POST'))

  const badPreflight = await fetch(`${BASE}/api/quotes`, { method: 'OPTIONS', headers: { origin: BLOCKED_ORIGIN, 'access-control-request-method': 'POST' } })
  check('preflight from blocked origin has no allow-origin', badPreflight.headers.get('access-control-allow-origin') === null)

  /* ---------------- Teardown ----------------
     Without this the probe quote, booking and customer survive the run,
     and the next run's absolute assertions (?date=upcoming, list counts)
     fail against a dirtied database. Cleaning up here is what makes the
     suite repeatable without a reseed between runs. */
  section('Teardown — remove the records this run created')

  const droppedQuote = await call(`/api/quotes/${ids.quote}`, { method: 'DELETE' })
  check('probe quote deleted', droppedQuote.status === 200, `got ${droppedQuote.status}`)

  const droppedBooking = await call(`/api/bookings/${ids.booking}`, { method: 'DELETE' })
  check('probe booking deleted', droppedBooking.status === 200, `got ${droppedBooking.status}`)

  const droppedCustomer = await call(`/api/customers/${ids.customer}`, { method: 'DELETE' })
  check('probe customer deleted', droppedCustomer.status === 200, `got ${droppedCustomer.status}`)

  const quoteGone = await call(`/api/quotes/${ids.quote}`)
  check('probe quote is gone', quoteGone.status === 404, `got ${quoteGone.status}`)

  /* ---------------- Summary ---------------- */
  console.log(`\n${'═'.repeat(64)}`)
  console.log(`  PASSED ${passed}   FAILED ${failed}`)
  if (failed > 0) {
    console.log('\n  Failing:')
    failures.forEach((name) => console.log(`   • ${name}`))
  }
  console.log(`${'═'.repeat(64)}\n`)

  process.exit(failed === 0 ? 0 : 1)
}

run().catch((error) => {
  console.error('\nTest suite crashed:', error)
  process.exit(1)
})
