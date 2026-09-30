/* ============================================================
   QuoteFlow API — unmatched route handler
   Runs after every router, so an unknown path produces the same
   clean JSON envelope as any other error.
   ============================================================ */

import { ApiError } from '../utils/ApiError.js'

export const notFoundHandler = (req, _res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`))
}
