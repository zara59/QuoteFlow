/* ============================================================
   QuoteFlow API — health controller
   Reports process liveness plus whether PostgreSQL is reachable,
   so a database outage is visible without the probe failing.
   ============================================================ */

import { asyncHandler } from '../utils/asyncHandler.js'
import { config } from '../config/env.js'
import { checkConnection } from '../db/pool.js'

export const getHealth = asyncHandler(async (_req, res) => {
  let database
  try {
    const info = await checkConnection()
    database = { connected: true, name: info.database }
  } catch (error) {
    /* A raw driver error can carry the connection string, host, port
       and internal detail. `/api/health` is unauthenticated, so the
       reason belongs in the server log — the response only needs to
       say that PostgreSQL is unreachable. */
    console.error('[health] database check failed:', error)
    database = { connected: false, name: null, error: 'Database unavailable' }
  }

  return res.json({
    success: true,
    message: 'QuoteFlow API is running',
    data: {
      status: 'ok',
      environment: config.nodeEnv,
      storage: 'postgresql',
      database,
      timestamp: new Date().toISOString(),
    },
  })
})
