/* ============================================================
   QuoteFlow API — JWT helpers
   The single place that signs or verifies tokens, so the payload
   shape and the secret handling stay in one spot.
   ============================================================ */

import jwt from 'jsonwebtoken'
import { config } from '../config/env.js'

/* Deliberately minimal: the subject and nothing else. No email, no
   name, no role, no permissions. Anything the API needs to know
   about the caller is re-read from the database, so a token can
   never carry a stale or forged authority claim. */
export const signToken = (user) =>
  jwt.sign({ sub: String(user.id) }, config.jwtSecret, { expiresIn: config.jwtExpiresIn })

/* Resolves to the payload, or throws the raw jsonwebtoken error
   (TokenExpiredError / JsonWebTokenError). Callers translate both
   into a generic 401 so a client learns nothing about why. */
export const verifyToken = (token) => jwt.verify(token, config.jwtSecret)

/* Token lifetime in seconds. Used by tests to mint a genuinely
   expired token instead of faking the claim. */
export const tokenTtlSeconds = () => {
  const probe = jwt.sign({ sub: '0' }, config.jwtSecret, { expiresIn: config.jwtExpiresIn })
  const { exp, iat } = jwt.decode(probe)
  return exp - iat
}
