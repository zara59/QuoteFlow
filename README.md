# QuoteFlow

A small business-software app for solo service providers: manage customers, write
quotes, and keep track of bookings. React + Vite on the front, Express + PostgreSQL
on the back, and JWT auth between them.

Everything you see is real data from PostgreSQL. There is no mock layer, no
fixtures in the bundle, and no in-memory fallback.

---

## What it does

- **Accounts** — register, sign in, sign out. A JWT identifies the session and the
  database scopes every query to that account.
- **Dashboard** — headline totals, quote pipeline, recent quotes, and upcoming
  bookings, aggregated by SQL rather than counted in the browser.
- **Customers** — create, edit, search, delete. A customer with linked quotes or
  bookings cannot be deleted; the API refuses with `409` and explains why.
- **Quotes** — create, edit, change status inline, delete.
- **Bookings** — create, edit, change status inline, delete, with list and calendar
  views.
- **Settings** — a read-only view of your own account and record counts.

---

## Requirements

- Node.js 18 or newer
- PostgreSQL 13 or newer

No global installs and no database ORM — everything runs from the two
`package.json` files.

---

## Setup

### 1. Database

```bash
createdb quoteflow
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env      # then edit DATABASE_URL and JWT_SECRET
npm run migrate           # create the schema
npm run seed              # load the demo accounts
npm run dev               # http://localhost:5000
```

Generate a real signing secret rather than reusing the placeholder — the server
refuses to start with it:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### 3. Frontend

In a second terminal:

```bash
npm install
cp .env.example .env.local
npm run dev               # http://localhost:5173
```

`.env.local` only needs one value:

```
VITE_API_URL=http://localhost:5000/api
```

### Demo accounts

| Email | Password | Owns |
| --- | --- | --- |
| `usera@example.com` | `Password123!` | Alice Nguyen |
| `userb@example.com` | `Password123!` | Ben Okafor |

Signing in as one and then the other is the quickest way to see the per-account
scoping: neither can see the other's customers, quotes, or bookings, in the UI or
at the API.

---

## Scripts

### Frontend (repo root)

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server on `:5173` |
| `npm run build` | production bundle into `dist/` |
| `npm run preview` | serve the built bundle |
| `npm run lint` | Oxlint |

### Backend (`cd backend`)

| Command | Purpose |
| --- | --- |
| `npm run dev` | server with `--watch` reload |
| `npm start` | server, no watcher |
| `npm run migrate` | apply pending migrations |
| `npm run migrate:force` | re-apply from scratch |
| `npm run seed` | load demo data, leaving existing rows |
| `npm run seed:reset` | drop and reload the demo data |
| `npm test` | API regression + auth/ownership suites |
| `npm run test:api` | API regression only |
| `npm run test:auth` | auth and cross-account ownership only |
| `npm run test:persistence:create` | write rows, for the restart test |
| `npm run test:persistence:verify` | confirm they survived a restart |

The suites run against a live server and clean up after themselves, so they are
safe to re-run without reseeding.

---

## How it fits together

```
src/
  api/         one module per resource, all built on api/client.js
  context/     AuthProvider (session) + AppDataProvider (records)
  pages/       route-level screens
  components/  shared UI
  layouts/     the authenticated shell
  services/    selectors that adapt API records into view models
  utils/       formatting and validation
```

```
backend/src/
  routes/       /api router; requireAuth is applied once, so new routes
                are protected by default rather than by remembering
  controllers/  request handling
  db/           queries and migrations
  middleware/   JWT verification
  validators/   request validation
  utils/        ApiError, asyncHandler, error middleware
```

A few decisions worth knowing about:

- **One API client.** `src/api/client.js` owns the base URL, the bearer token, and
  error normalisation. A `401` on an authenticated request clears the session; a
  `401` from a rejected login does not, and keeps the server's own wording.
- **The provider is the single source of client state.** Pages read from
  `AppDataProvider` and call its actions; no page fetches directly. Writes are
  server-authoritative — the response replaces the local row.
- **Aggregate figures come from SQL.** The dashboard reads
  `GET /api/dashboard/stats`. Search and filtering run over the full result set the
  API returns, which is appropriate at this data size.
- **Errors are honest.** The health endpoint reports `Database unavailable`
  without leaking driver detail, and unexpected failures return a generic message
  while the real one is logged server-side.
- **Registration does not confirm which emails exist.** A duplicate address is
  rejected with the same generic message as a wrong password.

---

## Notes

- Passwords are hashed with bcrypt at 12 rounds.
- `user_id` comes from the verified token, never from the request body.
- Quote references (`QF-1001`) are derived from the row id by the server.
- `REFERENCE_DATE` in `backend/.env` pins "today" for the booking date filters,
  which makes time-dependent assertions stable.

See `backend/README.md` for the API reference and the full database schema.
