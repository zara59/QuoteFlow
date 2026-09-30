-- ============================================================
-- QuoteFlow API — PostgreSQL schema (Stage 5)
--
-- Run with:  npm run migrate
-- Re-runnable: every statement is IF NOT EXISTS.
-- Pass --force to drop the tables first (destroys all data).
--
-- Ownership model (Stage 5):
--
--   users
--     ├── customers ── quotes
--     │            └─ bookings
--     ├── quotes      (direct ownership, as well as via customer)
--     └── bookings    (direct ownership, as well as via customer)
--
-- Every business table carries user_id directly, so an ownership check
-- never has to rely on a join. The customer_id relationship is kept as
-- well, so a user cannot attach a quote to somebody else's customer.
-- ON DELETE RESTRICT everywhere: deleting a user never silently
-- destroys business data.
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT        NOT NULL CHECK (char_length(btrim(name)) >= 2),
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Emails are compared case-insensitively, so store them folded to lower
-- case and enforce uniqueness on the stored form.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email));

-- ============================================================
-- MIGRATION SPLIT MARKER — do not move this line.
--
-- migrate.js applies everything above this marker first, then adds
-- the user_id columns to any pre-Stage-5 table, then applies
-- everything below. That ordering matters: the ownership indexes at
-- the end reference user_id, so they cannot run against a legacy
-- table that does not have the column yet.
-- ============================================================

-- @@MIGRATION-SPLIT@@

CREATE TABLE IF NOT EXISTS customers (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER     NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  name       TEXT        NOT NULL CHECK (char_length(btrim(name)) >= 2),
  email      TEXT,
  phone      TEXT,
  company    TEXT,
  location   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotes (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER       NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  customer_id INTEGER       NOT NULL REFERENCES customers (id) ON DELETE RESTRICT,
  service     TEXT          NOT NULL,
  description TEXT,
  amount      NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  valid_until DATE          NOT NULL,
  status      TEXT          NOT NULL DEFAULT 'Draft'
              CHECK (status IN ('Draft', 'Sent', 'Approved', 'Declined')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER      NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  customer_id INTEGER      NOT NULL REFERENCES customers (id) ON DELETE RESTRICT,
  service     TEXT         NOT NULL,
  date        DATE         NOT NULL,
  "time"      TIME         NOT NULL,
  status      TEXT         NOT NULL DEFAULT 'Upcoming'
              CHECK (status IN ('Upcoming', 'Completed', 'Cancelled')),
  duration    TEXT,
  location    TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ownership lookups
CREATE INDEX IF NOT EXISTS customers_user_id_idx ON customers (user_id);
CREATE INDEX IF NOT EXISTS quotes_user_id_idx    ON quotes (user_id);
CREATE INDEX IF NOT EXISTS bookings_user_id_idx  ON bookings (user_id);

-- The list endpoints filter and sort on exactly these columns.
CREATE INDEX IF NOT EXISTS quotes_customer_id_idx  ON quotes (customer_id);
CREATE INDEX IF NOT EXISTS quotes_status_idx       ON quotes (status);
CREATE INDEX IF NOT EXISTS quotes_created_at_idx   ON quotes (created_at DESC);
CREATE INDEX IF NOT EXISTS quotes_valid_until_idx  ON quotes (valid_until);

CREATE INDEX IF NOT EXISTS bookings_customer_id_idx ON bookings (customer_id);
CREATE INDEX IF NOT EXISTS bookings_status_idx      ON bookings (status);
CREATE INDEX IF NOT EXISTS bookings_date_idx        ON bookings (date);

CREATE INDEX IF NOT EXISTS customers_name_idx       ON customers (name);
