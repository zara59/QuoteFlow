# QuoteFlow API — Stage 5

Express REST API for QuoteFlow, backed by PostgreSQL through the `pg` driver.
No ORM — every statement is hand-written, parameterised SQL.

Every customer's business data is private to the account that owns it. A JWT
identifies the caller, and every query is scoped to that id in SQL.

The Stage 2 React frontend is **not** connected to this API yet and continues to
run on its own local state. Stage 6 wires it up.

## Running

```bash
cd backend
cp .env.example .env      # set DATABASE_URL and JWT_SECRET
npm install
npm run migrate           # create tables   (--force drops them first)
npm run seed              # load sample data (--reset wipes and reloads)
npm start                 # or: npm run dev  (restarts on change)
```

Generate a signing secret (the server refuses the placeholder from
`.env.example`):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Default: <http://localhost:5000>

### Seeded accounts

`npm run seed` creates two development users so there is something to sign in
as. The sample data is split between them, which is what makes the ownership
tests meaningful.

| Email | Password | Customers | Quotes | Bookings |
| --- | --- | --- | --- | --- |
| `usera@example.com` | `Password123!` | 6 | 16 | 8 |
| `userb@example.com` | `Password123!` | 5 | 8 | 4 |

These are local throwaway credentials and are printed by the seed on every run.
Do not use them anywhere real.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `5000` | Port the API listens on. |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Comma-separated list of browser origins allowed by CORS. An unlisted origin receives no CORS headers. |
| `DATABASE_URL` | *(required)* | PostgreSQL connection string. The server refuses to start without it. |
| `JWT_SECRET` | *(required)* | Signs the auth tokens. Must be at least 32 characters and must not be the `.env.example` placeholder. The server refuses to start otherwise. |
| `JWT_EXPIRES_IN` | `1d` | Token lifetime. Seconds (`900`) or a duration (`30m`, `12h`, `7d`). |
| `REFERENCE_DATE` | real today | Pins "today" for the booking `date=upcoming`/`date=past` filters so results are reproducible. |
| `NODE_ENV` | `production` | `development` enables request logging. |

`.env` is git-ignored. No secrets are stored in the repository.

## Authentication

Two endpoints are public. Everything else needs `Authorization: Bearer <token>`:

```bash
TOKEN=$(curl -s -X POST localhost:5000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"usera@example.com","password":"Password123!"}' \
  | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).data.token")

curl localhost:5000/api/auth/me -H "Authorization: Bearer $TOKEN"
```

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | public | Creates an account and returns a token. |
| `POST` | `/api/auth/login` | public | Returns a token. |
| `GET` | `/api/auth/me` | **required** | The signed-in user's profile. |
| `GET` | `/api/health` | public | Liveness check. |
| — | `/api/customers`, `/api/quotes`, `/api/bookings`, `/api/dashboard/stats` | **required** | Scoped to the caller. |

Passwords are hashed with bcrypt (12 rounds) and never returned. The token
carries only the user id as `sub`; everything else is re-read from the database
on each request, so a token cannot carry a forged or stale claim.

A missing, malformed, expired or wrongly-signed token all return the same
`401` with one generic message — the API never says which, and never exposes
JWT internals.

## Ownership

`user_id` sits on `customers`, `quotes` and `bookings`, each with an
`ON DELETE RESTRICT` foreign key to `users`. The `customer_id` relationships
are kept as well, so a quote is also constrained to its own customer's owner.

Two rules do the work:

1. Every business query takes the caller's `userId` as a required first
   argument and filters on it. Making it required means "forgot to scope this
   query" is a mistake at the call site, and a missing id matches nothing
   rather than returning everything.
2. Creation uses `INSERT ... SELECT` with the customer lookup inside it, so a
   quote or booking pointed at another user's `customer_id` is never written at
   all.

Another user's record is reported as `404`, not `403` — the API never confirms
that an id exists. The client never chooses a `user_id`: the authenticated id
always comes from the verified token, and a `user_id` in a request body is
rejected as an unknown field.

## Response shape

Success:

```json
{ "success": true, "data": { }, "meta": { "count": 24 } }
```

Error:

```json
{ "success": false, "message": "Quote 999 not found.", "errors": { "amount": "Amount must be greater than 0." } }
```

`errors` appears only on validation failures. Stack traces, file paths and
environment values are never sent to clients.

## Endpoints

Base path `/api`.

### Health

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness check. |

### Quotes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/quotes` | Query: `search`, `status`, `all`. |
| `GET` | `/api/quotes/:id` | 404 when absent. |
| `POST` | `/api/quotes` | Server generates `id`, `number`, `createdAt`. |
| `PATCH` | `/api/quotes/:id` | Partial update; only the sent fields change. |
| `DELETE` | `/api/quotes/:id` | 404 when absent. |

`search` matches customer name, service, description, quote number and status.

### Bookings

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/bookings` | Query: `search`, `status`, `date`. |
| `GET` | `/api/bookings/:id` | 404 when absent. |
| `POST` | `/api/bookings` | Server generates `id`. |
| `PATCH` | `/api/bookings/:id` | Partial update. |
| `DELETE` | `/api/bookings/:id` | 404 when absent. |

`search` matches customer name, service, notes, location and status.
`date` accepts `upcoming`, `past`, or a specific `YYYY-MM-DD`.

### Customers

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/customers` | Query: `search`. |
| `GET` | `/api/customers/:id` | 404 when absent. |
| `POST` | `/api/customers` | Server generates `id`, `createdAt`. |
| `PATCH` | `/api/customers/:id` | Renaming cascades to linked quotes and bookings. |
| `DELETE` | `/api/customers/:id` | **409** when quotes or bookings still reference the customer. |

`search` matches name, email, phone, company and location.

### Dashboard

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/dashboard/stats` | Computed from current data on every request. |

Returns totals, total/pending/approved quotes, upcoming bookings, estimated
revenue (sum of approved amounts), a quote count per status, five recent
quotes and the next five upcoming bookings.

## Validation

Server-side, per resource, and reusable across routes:

- **Quotes** — `customerId` (must exist), `service` (3–120 chars), `amount`
  (number, greater than 0, under 1,000,000), `validUntil` (real `YYYY-MM-DD`),
  `status` in `Draft | Sent | Approved | Declined`.
- **Bookings** — `customerId` (must exist), `service`, `date` (real
  `YYYY-MM-DD`), `time` (`HH:MM`), `status` in `Upcoming | Completed |
  Cancelled`.
- **Customers** — `name` (2–120 chars), `email` (format-checked when supplied),
  `phone` (format-checked when supplied).

`status` defaults to `Draft` for quotes and `Upcoming` for bookings when
omitted. Unknown fields are rejected so nothing unexpected is written.

## Status codes

| Code | When |
| --- | --- |
| `200` / `201` | Success / resource created. |
| `400` | Validation failure, malformed id, bad JSON, or unusable filter. |
| `404` | Unknown resource or route. |
| `409` | Deleting a customer with linked records. |
| `500` | Unexpected server error (generic message). |

## Tests

With the API running, from a known baseline:

```bash
npm run seed:reset      # the data persists, so start from a known state
npm test                # 220 API checks + 126 auth/ownership checks
npm run test:auth       # auth and two-user isolation only
```

`scripts/auth-test.mjs` covers registration and login (including duplicate,
case-insensitive and malformed input), token handling (expired, wrong
signature, `alg=none`, a token for a user that does not exist), the 401 gate on
every protected route, and a full two-user isolation sweep across customers,
quotes, bookings and the dashboard.

Confirming data outlives the process:

```bash
node scripts/persistence-test.mjs create
# restart the server here
node scripts/persistence-test.mjs verify
```

The verify phase also signs in as the *other* user and confirms the restored
records are still private, so ownership is shown to outlive the process too.

## Layout

```
backend/src
├── app.js                  Express app: JSON, CORS, routes, error handler
├── server.js               Verifies the DB and JWT config, binds the port, clean shutdown
├── config/env.js           All environment parsing, fail-fast assertions
├── routes/index.js         Route table; requireAuth applied to the protected half
├── controllers/            One per resource (async, wrapped in asyncHandler)
│   └── authController.js   register / login / me
├── validators/             Per-resource payload rules, plus authValidators.js
├── middleware/
│   ├── authMiddleware.js   Bearer parsing, JWT verification, req.user
│   ├── errorHandler.js     Centralised errors (maps SQLSTATE and auth)
│   └── notFound.js
├── db/
│   ├── pool.js             pg Pool, query(), transaction, type parsers
│   ├── schema.sql          DDL with CHECK and FOREIGN KEY constraints
│   ├── migrate.js          Applies the schema; upgrades a pre-Stage-5 database
│   ├── seed.js             Sample data, split across the two seed users
│   ├── seedUsers.js        Development users, shared by migrate and seed
│   └── queries/            All SQL lives here, one module per resource
├── data/constants.js       Status vocabularies shared with validators
└── utils/                  ApiError, asyncHandler, JWT, response envelope, query parsing
```

`db/queries/` is the only layer that contains SQL. Controllers never build
statements, and no request value is ever interpolated into SQL text — every
user-provided value is a `$1`-style parameter.
