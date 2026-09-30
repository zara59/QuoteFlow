/* ============================================================
   QuoteFlow API — centralised error handling
   Only expected ApiError messages reach the client. PostgreSQL
   error codes are translated into the same envelope, and unexpected
   failures are logged server-side and answered with a generic 500,
   so stack traces, SQL text, file paths and connection strings are
   never leaked.
   ============================================================ */

import { ApiError } from '../utils/ApiError.js'
import { isDevelopment } from '../config/env.js'

/** Malformed JSON bodies arrive here from express.json(). */
const normalizeHttp = (error) => {
  if (error instanceof ApiError) return error

  if (error?.type === 'entity.parse.failed') {
    return ApiError.badRequest('Request body must be valid JSON.')
  }
  if (error?.type === 'entity.too.large') {
    return new ApiError(413, 'Request body is too large.')
  }
  return null
}

/**
 * Maps PostgreSQL SQLSTATE codes onto the public status codes.
 * The database message is never forwarded — the API states the
 * problem in its own words instead.
 */
const normalizeDatabase = (error) => {
  const code = error?.code

  switch (code) {
    case '23503': // foreign_key_violation
      return ApiError.conflict('That record is still referenced by other records.')
    case '23505': // unique_violation
      return ApiError.conflict('A record with those details already exists.')
    case '23502': // not_null_violation
      return ApiError.badRequest('A required field was missing.')
    case '23514': // check_violation
      return ApiError.badRequest('A field value is not allowed.')
    case '22P02': // invalid_text_representation
      return ApiError.badRequest('A field had the wrong format.')
    case '42804': // datatype_mismatch
      return ApiError.badRequest('A field had a value of the wrong type.')
    case '22003': // numeric_value_out_of_range
      return ApiError.badRequest('A number was outside the allowed range.')
    case 'ECONNREFUSED':
    case 'ENOTFOUND':
    case 'ETIMEDOUT':
    case '57P03': // cannot_connect_now
    case '08006': // connection_failure
    case '53300': // too_many_connections
      return ApiError.internal('The database is unavailable. Please try again shortly.')
    default:
      return null
  }
}

/**
 * The auth middleware throws plain errors with a status rather than
 * ApiErrors, so that it has no way to leak a jsonwebtoken message such
 * as "jwt expired" or "invalid signature". They are translated here
 * into the same clean envelope as everything else.
 */
const normalizeAuth = (error) => {
  if (error?.code !== 'UNAUTHORIZED') return null
  return new ApiError(401, error.message)
}

export const errorHandler = (error, _req, res, _next) => {
  const known = normalizeAuth(error) ?? normalizeHttp(error) ?? normalizeDatabase(error)

  if (known) {
    const body = { success: false, message: known.message }
    if (known.details) body.errors = known.details
    if (isDevelopment) body.status = known.status
    return res.status(known.status).json(body)
  }

  // Unexpected: log the detail, tell the client nothing.
  console.error('[quoteflow-api] unhandled error:', error)
  return res.status(500).json({ success: false, message: 'Something went wrong on the server.' })
}
