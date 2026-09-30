/* ============================================================
   QuoteFlow API — environment configuration
   Every value the process depends on is resolved here, once.
   ============================================================ */

import 'dotenv/config'

const toPort = (raw) => {
  const port = Number.parseInt(raw ?? '', 10)
  if (!Number.isInteger(port) || port < 1 || port > 65535) return 5000
  return port
}

const toOrigins = (raw) =>
  String(raw ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

const toReferenceDate = (raw) => {
  const value = String(raw ?? '').trim()
  if (!value) return new Date()
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

const toDatabaseUrl = (raw) => String(raw ?? '').trim()

/* jsonwebtoken accepts a duration string ("1d", "12h") or a number of
   seconds. Anything else is rejected here rather than at sign time. */
const toExpiresIn = (raw) => {
  const value = String(raw ?? '').trim() || '1d'
  if (/^\d+$/.test(value)) return Number.parseInt(value, 10)
  if (/^\d+[smhd]$/.test(value)) return value
  throw new Error(
    `JWT_EXPIRES_IN must be a number of seconds or a duration like "1d". Received "${value}".`,
  )
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'production',
  port: toPort(process.env.PORT),
  clientOrigins: toOrigins(process.env.CLIENT_ORIGIN),
  referenceDate: toReferenceDate(process.env.REFERENCE_DATE),
  databaseUrl: toDatabaseUrl(process.env.DATABASE_URL),
  jwtSecret: String(process.env.JWT_SECRET ?? '').trim(),
  jwtExpiresIn: toExpiresIn(process.env.JWT_EXPIRES_IN),
}

/* The placeholder shipped in .env.example. Signing with it would mean
   every local copy of this project shares one secret, so refuse it
   outright rather than letting a demo token become a real one. */
const PLACEHOLDER_SECRET = 'replace_with_a_long_random_secret'
const MIN_SECRET_LENGTH = 32

export const isDevelopment = config.nodeEnv === 'development'

/** `YYYY-MM-DD` for the reference day, in UTC. */
export const todayIso = () => config.referenceDate.toISOString().slice(0, 10)

/** Fails fast at boot rather than on the first request. */
export const assertDatabaseConfigured = () => {
  if (config.databaseUrl) return
  throw new Error(
    'DATABASE_URL is not set. Copy backend/.env.example to backend/.env and set it to your PostgreSQL connection string.',
  )
}

/** Same idea for the signing key: a weak or leftover placeholder secret
    is a vulnerability, not a convenience, so the process refuses to start. */
export const assertJwtConfigured = () => {
  if (!config.jwtSecret) {
    throw new Error(
      'JWT_SECRET is not set. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"',
    )
  }
  if (config.jwtSecret === PLACEHOLDER_SECRET) {
    throw new Error(
      'JWT_SECRET is still the placeholder from .env.example. Generate a unique secret for this project.',
    )
  }
  if (config.jwtSecret.length < MIN_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters.`)
  }
}
