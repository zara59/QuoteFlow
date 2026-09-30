/* ============================================================
   QuoteFlow API — server entry point
   Verifies the database connection before accepting traffic, then
   shuts the HTTP server and the pool down cleanly.
   ============================================================ */

import app from './app.js'
import { assertDatabaseConfigured, assertJwtConfigured, config } from './config/env.js'
import { checkConnection, closePool } from './db/pool.js'

const start = async () => {
  // A missing or placeholder signing key is a security problem, so it is
  // checked before the port opens rather than on the first login attempt.
  assertDatabaseConfigured()
  assertJwtConfigured()

  const info = await checkConnection()
  console.log(`Database connected: ${info.database}`)

  const server = app.listen(config.port, () => {
    console.log(`QuoteFlow API listening on http://localhost:${config.port}`)
    console.log(`Environment: ${config.nodeEnv} | storage: postgresql`)
    if (config.clientOrigins.length === 0) {
      console.warn('CLIENT_ORIGIN is not set — browser requests will be blocked by CORS.')
    } else {
      console.log(`CORS allowed origins: ${config.clientOrigins.join(', ')}`)
    }
  })

  const shutdown = (signal) => async () => {
    console.log(`\n${signal} received, shutting down.`)
    server.close(async () => {
      await closePool().catch(() => {})
      process.exit(0)
    })
  }

  process.on('SIGINT', shutdown('SIGINT'))
  process.on('SIGTERM', shutdown('SIGTERM'))
}

start().catch(async (error) => {
  console.error('Failed to start QuoteFlow API:', error.message)
  console.error('Check that PostgreSQL is running and DATABASE_URL in backend/.env is correct.')
  await closePool().catch(() => {})
  process.exit(1)
})