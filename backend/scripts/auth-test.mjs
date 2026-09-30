/* ============================================================
   QuoteFlow API — Stage 5 authentication & ownership tests
   Run with:  node scripts/auth-test.mjs

   Covers registration, login, JWT handling, protected-route gating,
   two-user isolation across every resource, and the guarantee that no
   password material ever appears in a response.

   Requires a freshly seeded database:
     npm run seed:reset
   ============================================================ */

import jwt from 'jsonwebtoken'
import { config } from '../src/config/env.js'

const BASE = process.env.BASE_URL ?? 'http://localhost:5000'
const PASSWORD = 'Password123!'

let passed = 0
const failures = []

const check = (name, condition, detail) => {
  if (condition) {
    passed += 1
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`)
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`)
  }
}

const section = (title) => console.log(`\n${title}`)

/* ------------------------------------------------------------------ http */

const call = async (method, path, { body, token, headers = {} } = {}) => {
  const requestHeaders = { ...headers }
  if (body !== undefined) requestHeaders['Content-Type'] = 'application/json'
  if (token) requestHeaders.Authorization = `Bearer ${token}`

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  let json
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { _unparsable: text }
  }
  return { status: response.status, body: json, raw: text }
}

const get = (path, token) => call('GET', path, { token })
const post = (path, body, token) => call('POST', path, { body, token })
const patch = (path, body, token) => call('PATCH', path, { body, token })
const del = (path, token) => call('DELETE', path, { token })

/* Tokens that must be rejected. Signed with the real secret so only the
   expiry / signature makes them invalid. */
const expiredToken = () =>
  jwt.sign({ sub: '1' }, config.jwtSecret, { expiresIn: '-10s' })
const wrongSecretToken = () =>
  jwt.sign({ sub: '1' }, 'x'.repeat(48), { expiresIn: '1d' })
/* Correctly signed, but points at a user id that does not exist. */
const ghostToken = () => jwt.sign({ sub: '999999' }, config.jwtSecret, { expiresIn: '1d' })
const nonsenseToken = () => jwt.sign({ admin: true }, config.jwtSecret, { expiresIn: '1d' })
const unsignedToken = () =>
  Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64') + '.e30.'

const login = async (email, password = PASSWORD) =>
  (await post('/api/auth/login', { email, password })).body?.data?.token

/* ====================================================================== */

const run = async () => {
  console.log(`QuoteFlow Stage 5 — auth & ownership (${BASE})`)

  /* ------------------------------------------------------------ register */

  section('Registration')

  const unique = `stage5.${Date.now()}@example.com`
  const reg = await post('/api/auth/register', {
    name: 'Dana Fox',
    email: unique,
    password: PASSWORD,
  })
  check('register returns 201', reg.status === 201, `got ${reg.status}`)
  check('register succeeds', reg.body?.success === true)
  check('register returns a token', typeof reg.body?.data?.token === 'string')
  check('register returns the user', reg.body?.data?.user?.email === unique)
  check('register never returns a password', !/password/i.test(reg.raw), reg.raw?.slice(0, 200))
  check(
    'register never returns a hash',
    !/password_hash|\$2[aby]\$/.test(reg.raw),
    reg.raw?.slice(0, 200),
  )
  check('register id is numeric', Number.isInteger(reg.body?.data?.user?.id))

  const dupe = await post('/api/auth/register', {
    name: 'Someone Else',
    email: unique,
    password: PASSWORD,
  })
  check('duplicate email is rejected', dupe.status === 401, `got ${dupe.status}`)
  check(
    'duplicate email leaks no account detail',
    !/exists|already|taken/i.test(dupe.raw ?? ''),
    dupe.raw,
  )

  const upper = await post('/api/auth/register', {
    name: 'Case Test',
    email: unique.toUpperCase(),
    password: PASSWORD,
  })
  check('duplicate detection is case-insensitive', upper.status === 401, `got ${upper.status}`)

  for (const [label, payload] of [
    ['missing name', { email: `n.${Date.now()}@example.com`, password: PASSWORD }],
    ['missing email', { name: 'No Email', password: PASSWORD }],
    ['missing password', { name: 'No Password', email: `np.${Date.now()}@example.com` }],
    ['invalid email', { name: 'Bad Email', email: 'not-an-email', password: PASSWORD }],
    ['email without domain', { name: 'Bad Email', email: 'a@b', password: PASSWORD }],
    ['empty email', { name: 'Empty', email: '   ', password: PASSWORD }],
    ['short password', { name: 'Short', email: `s.${Date.now()}@example.com`, password: 'short1' }],
    ['numeric password', { name: 'Numeric', email: `n2.${Date.now()}@example.com`, password: 12345678 }],
    ['blank name', { name: ' ', email: `b.${Date.now()}@example.com`, password: PASSWORD }],
    ['unexpected user_id field', {
      name: 'Sneaky',
      email: `sn.${Date.now()}@example.com`,
      password: PASSWORD,
      user_id: 1,
    }],
  ]) {
    const res = await post('/api/auth/register', payload)
    check(`register rejects ${label}`, res.status === 400, `got ${res.status}`)
  }

  /* --------------------------------------------------------------- login */

  section('Login')

  const good = await post('/api/auth/login', { email: 'usera@example.com', password: PASSWORD })
  check('login returns 200', good.status === 200, `got ${good.status}`)
  check('login returns a token', typeof good.body?.data?.token === 'string')
  check('login never returns a hash', !/\$2[aby]\$/.test(good.raw), good.raw?.slice(0, 200))

  const upperLogin = await post('/api/auth/login', {
    email: '  USERB@EXAMPLE.COM  ',
    password: PASSWORD,
  })
  check('login normalizes email', upperLogin.status === 200, `got ${upperLogin.status}`)

  const wrongPw = await post('/api/auth/login', {
    email: 'usera@example.com',
    password: 'WrongPassword1!',
  })
  check('wrong password is rejected', wrongPw.status === 401, `got ${wrongPw.status}`)
  check(
    'wrong password does not confirm the account',
    !/exist|registered|found/i.test(wrongPw.raw ?? ''),
    wrongPw.raw,
  )

  const noUser = await post('/api/auth/login', {
    email: 'ghost@example.com',
    password: PASSWORD,
  })
  check('unknown email is rejected', noUser.status === 401, `got ${noUser.status}`)
  check(
    'unknown email and wrong password are indistinguishable',
    noUser.body?.message === wrongPw.body?.message,
    `${noUser.body?.message} vs ${wrongPw.body?.message}`,
  )

  for (const [label, payload] of [
    ['missing password', { email: 'usera@example.com' }],
    ['missing email', { password: PASSWORD }],
    ['empty body', {}],
    ['password as number', { email: 'usera@example.com', password: 12345 }],
  ]) {
    const res = await post('/api/auth/login', payload)
    check(`login rejects ${label}`, res.status === 400, `got ${res.status}`)
  }

  /* -------------------------------------------------------- token / auth */

  section('Token handling')

  const tokenA = await login('usera@example.com')
  const tokenB = await login('userb@example.com')
  check('both seed users can sign in', Boolean(tokenA && tokenB))
  check('the two tokens differ', tokenA !== tokenB)

  const decoded = jwt.decode(tokenA)
  /* sub is the only claim we set; iat/exp are added by the library. */
  const customClaims = Object.keys(decoded).filter((k) => !['sub', 'iat', 'exp'].includes(k))
  check(
    'token payload carries only sub (plus library iat/exp)',
    customClaims.length === 0,
    `extra claims: ${customClaims.join(',')}`,
  )
  check('token sub is the user id as a string', typeof decoded.sub === 'string')
  check('token has no email claim', decoded.email === undefined)
  check('token has no name claim', decoded.name === undefined)
  check('token has no role claim', decoded.role === undefined)
  check('token has an expiry', Number.isInteger(decoded.exp))
  check('token has no password claim', decoded.password === undefined)

  for (const [label, res] of [
    ['missing token', await get('/api/customers')],
    ['garbage token', await get('/api/customers', 'not-a-token')],
    ['expired token', await get('/api/customers', expiredToken())],
    ['wrong-signature token', await get('/api/customers', wrongSecretToken())],
    ['token for a deleted user', await get('/api/customers', ghostToken())],
    ['token with no sub claim', await get('/api/customers', nonsenseToken())],
    ['alg=none forgery', await get('/api/customers', unsignedToken())],
    ['empty bearer value', await get('/api/customers', '')],
  ]) {
    check(`${label} is 401`, res.status === 401, `got ${res.status}`)
    check(
      `${label} leaks no JWT internals`,
      !/jwt|signature|expired|malformed|TokenExpired|JsonWebToken/i.test(res.raw ?? ''),
      res.raw,
    )
  }

  const badScheme = await call('GET', '/api/customers', {
    headers: { Authorization: 'Basic dXNlcjpwYXNz' },
  })
  check('non-Bearer scheme is 401', badScheme.status === 401, `got ${badScheme.status}`)

  const rawScheme = await call('GET', '/api/customers', {
    headers: { Authorization: tokenA },
  })
  check('token without the Bearer prefix is 401', rawScheme.status === 401, `got ${rawScheme.status}`)

  /* -------------------------------------------------- protected gating */

  section('Protected routes')

  const protectedPaths = [
    '/api/auth/me',
    '/api/customers',
    '/api/quotes',
    '/api/bookings',
    '/api/dashboard/stats',
  ]
  for (const path of protectedPaths) {
    const res = await get(path)
    check(`${path} requires a token`, res.status === 401, `got ${res.status}`)
  }

  const publicPaths = ['/api/health', '/api/auth/login', '/api/auth/register']
  for (const path of publicPaths) {
    const res = path === '/api/health' ? await get(path) : await post(path, {})
    check(`${path} is reachable without a token`, res.status !== 401, `got ${res.status}`)
  }

  for (const method of ['POST', 'PATCH', 'DELETE']) {
    const res = await call(method, '/api/customers/1')
    check(`${method} /api/customers/1 requires a token`, res.status === 401, `got ${res.status}`)
  }

  const meRes = await get('/api/auth/me', tokenA)
  check('GET /api/auth/me with a valid token is 200', meRes.status === 200, `got ${meRes.status}`)
  check('me returns the caller', meRes.body?.data?.user?.email === 'usera@example.com')
  check('me never returns a hash', !/\$2[aby]\$|password/i.test(meRes.raw), meRes.raw)

  /* ------------------------------------------------ two-user isolation */

  section('Two-user isolation')

  const aCustomers = await get('/api/customers', tokenA)
  const bCustomers = await get('/api/customers', tokenB)
  check('user A sees customers', (aCustomers.body?.meta?.count ?? 0) > 0, JSON.stringify(aCustomers.body?.meta))
  check('user B sees customers', (bCustomers.body?.meta?.count ?? 0) > 0, JSON.stringify(bCustomers.body?.meta))

  const aIds = aCustomers.body.data.map((c) => c.id)
  const bIds = bCustomers.body.data.map((c) => c.id)
  check('the two user lists are disjoint', aIds.every((id) => !bIds.includes(id)), `${aIds} vs ${bIds}`)

  const aQuotes = await get('/api/quotes', tokenA)
  const bQuotes = await get('/api/quotes', tokenB)
  const aQuoteIds = aQuotes.body.data.map((q) => q.id)
  const bQuoteIds = bQuotes.body.data.map((q) => q.id)
  check('quote lists are disjoint', aQuoteIds.every((id) => !bQuoteIds.includes(id)))

  const aBookings = await get('/api/bookings', tokenA)
  const bBookings = await get('/api/bookings', tokenB)
  const aBookingIds = aBookings.body.data.map((b) => b.id)
  const bBookingIds = bBookings.body.data.map((b) => b.id)
  check('booking lists are disjoint', aBookingIds.every((id) => !bBookingIds.includes(id)))

  // User B attempts every read/write against a user A record.
  const victimCustomer = aIds[0]
  const victimQuote = aQuoteIds[0]
  const victimBooking = aBookingIds[0]

  const attempts = [
    ['GET customer', () => get(`/api/customers/${victimCustomer}`, tokenB), 404],
    ['PATCH customer', () => patch(`/api/customers/${victimCustomer}`, { name: 'Hijacked' }, tokenB), 404],
    ['DELETE customer', () => del(`/api/customers/${victimCustomer}`, tokenB), 404],
    ['GET quote', () => get(`/api/quotes/${victimQuote}`, tokenB), 404],
    ['PATCH quote', () => patch(`/api/quotes/${victimQuote}`, { amount: 1 }, tokenB), 404],
    ['DELETE quote', () => del(`/api/quotes/${victimQuote}`, tokenB), 404],
    ['GET booking', () => get(`/api/bookings/${victimBooking}`, tokenB), 404],
    ['PATCH booking', () => patch(`/api/bookings/${victimBooking}`, { service: 'Hijacked' }, tokenB), 404],
    ['DELETE booking', () => del(`/api/bookings/${victimBooking}`, tokenB), 404],
    ['create quote on user A customer', () => post('/api/quotes', {
      customerId: victimCustomer,
      service: 'Injected',
      amount: 100,
      validUntil: '2027-01-01',
    }, tokenB), 400],
    ['create booking on user A customer', () => post('/api/bookings', {
      customerId: victimCustomer,
      service: 'Injected',
      date: '2027-01-01',
      time: '10:00',
    }, tokenB), 400],
  ]

  for (const [label, run, expected] of attempts) {
    const res = await run()
    check(`user B cannot ${label}`, res.status === expected, `got ${res.status}, expected ${expected}`)
    check(
      `user B's ${label} attempt leaks no data`,
      !/Hijacked|Injected/.test(res.raw ?? ''),
      res.raw?.slice(0, 160),
    )
  }

  // And confirm user A's records are genuinely untouched.
  const stillThere = await get(`/api/customers/${victimCustomer}`, tokenA)
  check("user A's customer survived user B's delete attempts", stillThere.status === 200, `got ${stillThere.status}`)
  check("user A's customer was not renamed", stillThere.body?.data?.name !== 'Hijacked')
  const quoteStill = await get(`/api/quotes/${victimQuote}`, tokenA)
  check("user A's quote survived", quoteStill.status === 200, `got ${quoteStill.status}`)
  check("user A's quote amount unchanged", quoteStill.body?.data?.amount !== 1)
  const bookingStill = await get(`/api/bookings/${victimBooking}`, tokenA)
  check("user A's booking survived", bookingStill.status === 200, `got ${bookingStill.status}`)
  check("user A's booking was not renamed", bookingStill.body?.data?.service !== 'Hijacked')

  // Search must not leak across the boundary either.
  const bSearch = await get(`/api/customers?search=${encodeURIComponent(aCustomers.body.data[0].name)}`, tokenB)
  check("user B's search cannot find user A's customer", (bSearch.body?.meta?.count ?? -1) === 0, JSON.stringify(bSearch.body?.meta))
  const bQuoteSearch = await get(`/api/quotes?search=${encodeURIComponent(aQuotes.body.data[0].service)}`, tokenB)
  const leakedQuote = (bQuoteSearch.body?.data ?? []).some((q) => aQuoteIds.includes(q.id))
  check("user B's quote search cannot surface user A's quotes", !leakedQuote)

  /* ------------------------------------------------------ ownership cols */

  section('Ownership is server-derived')

  const forged = await post('/api/customers', { name: 'Forged Owner', user_id: 2 }, tokenA)
  check('POST customer with user_id in the body is rejected', forged.status === 400, `got ${forged.status}`)

  const myCustomer = await post('/api/customers', { name: 'Ownership Probe' }, tokenA)
  check('user A can create a customer', myCustomer.status === 201, `got ${myCustomer.status}`)
  const probeId = myCustomer.body?.data?.id

  // Whatever user_id the client asked for, the record belongs to A.
  const asB = await get(`/api/customers/${probeId}`, tokenB)
  check("a customer created by A is invisible to B", asB.status === 404, `got ${asB.status}`)

  const reassignAttempt = await patch(
    `/api/customers/${probeId}`,
    { user_id: 2 },
    tokenA,
  )
  check('PATCH customer with user_id in the body is rejected', reassignAttempt.status === 400, `got ${reassignAttempt.status}`)

  const delProbe = await del(`/api/customers/${probeId}`, tokenA)
  check('cleanup: user A deletes the probe customer', delProbe.status === 200, `got ${delProbe.status}`)

  /* ----------------------------------------------------------- dashboard */

  section('Dashboard isolation')

  const dashA = (await get('/api/dashboard/stats', tokenA)).body.data
  const dashB = (await get('/api/dashboard/stats', tokenB)).body.data

  check('user A dashboard returns totals', dashA.totals.quotes > 0)
  check('user B dashboard returns totals', dashB.totals.quotes > 0)
  check(
    'quote totals differ between users',
    dashA.totalQuotes !== dashB.totalQuotes,
    `${dashA.totalQuotes} vs ${dashB.totalQuotes}`,
  )
  check(
    'customer totals differ between users',
    dashA.totals.customers !== dashB.totals.customers,
    `${dashA.totals.customers} vs ${dashB.totals.customers}`,
  )
  check(
    'revenue differs between users',
    dashA.estimatedRevenue !== dashB.estimatedRevenue,
    `${dashA.estimatedRevenue} vs ${dashB.estimatedRevenue}`,
  )

  // Every listed record must belong to the caller.
  check(
    'recentQuotes belong to the caller',
    dashA.recentQuotes.every((q) => aQuoteIds.includes(q.id)),
  )
  check(
    'recentQuotes exclude the other user',
    !dashB.recentQuotes.some((q) => aQuoteIds.includes(q.id)),
  )
  check(
    'upcomingBookings belong to the caller',
    dashA.upcomingBookingsList.every((b) => aBookingIds.includes(b.id)),
  )
  check(
    'upcomingBookings exclude the other user',
    !dashB.upcomingBookingsList.some((b) => aBookingIds.includes(b.id)),
  )
  check(
    'customer names in the dashboard are not the other user\'s',
    dashA.recentQuotes.every(
      (q) => !bIds.includes(aCustomers.body.data.find((c) => c.name === q.customerName)?.id),
    ),
  )

  // quotesByStatus must add up to that user's own total only.
  const statusSum = Object.values(dashA.quotesByStatus).reduce((sum, n) => sum + n, 0)
  check('quotesByStatus sums to the caller total', statusSum === dashA.totalQuotes, `${statusSum} vs ${dashA.totalQuotes}`)
  check('quotesByStatus keeps canonical order', Object.keys(dashA.quotesByStatus).join(',') === 'Draft,Sent,Approved,Declined')

  // Deleting as B must not change A's dashboard.
  const before = dashA.totalQuotes
  await del(`/api/customers/${aIds[1]}`, tokenB)
  const after = (await get('/api/dashboard/stats', tokenA)).body.data.totalQuotes
  check("user B's failed delete leaves user A's dashboard unchanged", after === before, `${before} -> ${after}`)

  /* ------------------------------------------------------------- summary */

  console.log(`\n${'='.repeat(56)}`)
  if (failures.length === 0) {
    console.log(`  ALL ${passed} CHECKS PASSED`)
  } else {
    console.log(`  PASSED ${passed}   FAILED ${failures.length}`)
    console.log('\n  Failures:')
    for (const failure of failures) console.log(`    - ${failure}`)
  }
  console.log('='.repeat(56))

  process.exit(failures.length === 0 ? 0 : 1)
}

run().catch((error) => {
  console.error('Auth test suite crashed:', error)
  process.exit(1)
})
