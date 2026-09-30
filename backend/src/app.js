/* ============================================================
   QuoteFlow API — Express application
   Exported without calling listen() so the app can be started by
   server.js and exercised independently in tests.
   ============================================================ */

import express from 'express'
import cors from 'cors'
import routes from './routes/index.js'
import { errorHandler } from './middleware/errorHandler.js'
import { notFoundHandler } from './middleware/notFound.js'
import { config } from './config/env.js'

const app = express()

app.disable('x-powered-by')

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header: same-origin request or a non-browser client.
      if (!origin) return callback(null, true)
      // An unlisted origin gets no CORS headers at all, so the browser
      // blocks the response instead of the request failing server-side.
      return callback(null, config.clientOrigins.includes(origin))
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: false,
  }),
)

app.use(express.json({ limit: '100kb' }))

if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    const startedAt = Date.now()
    res.on('finish', () => {
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startedAt}ms`)
    })
    next()
  })
}

app.use('/api', routes)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
