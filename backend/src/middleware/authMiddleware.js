/* ============================================================
   QuoteFlow API — authentication middleware
   Turns a verified JWT into req.user. Everything downstream reads
   the caller's id from there, never from the request body or query.
   ============================================================ */

import { verifyToken } from '../utils/jwt.js'
import { findUserById } from '../db/queries/userQueries.js'

/* One generic message for every failure mode. Telling a client
   whether a token was "expired" versus "malformed" is free
   information for someone probing, and neither helps them. */
const unauthorized = () => {
  const error = new Error('Authentication required.')
  error.status = 401
  error.code = 'UNAUTHORIZED'
  return error
}

const bearerToken = (header) => {
  if (typeof header !== 'string') return null
  const match = /^Bearer[ ]+(\S+)$/.exec(header.trim())
  return match ? match[1] : null
}

export const requireAuth = async (req, _res, next) => {
  try {
    const token = bearerToken(req.get('authorization'))
    if (!token) throw unauthorized()

    let payload
    try {
      payload = verifyToken(token)
    } catch {
      // Expired, bad signature, wrong algorithm, malformed — all the
      // same to the caller. The reason is intentionally discarded.
      throw unauthorized()
    }

    const userId = Number.parseInt(payload?.sub, 10)
    if (!Number.isInteger(userId) || userId < 1) throw unauthorized()

    /* The token only carries an id, so the account is re-read here.
     * That means a token for a deleted or disabled user stops
     * working immediately instead of staying valid until it expires,
     * and the rest of the request gets a real user object rather
     * than trusting the token's claims. */
    const user = await findUserById(userId)
    if (!user) throw unauthorized()

    req.user = user
    next()
  } catch (error) {
    next(error)
  }
}
