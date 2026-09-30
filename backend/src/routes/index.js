/* ============================================================
   QuoteFlow API — route definitions
   Mounted under /api by routes/index.js.

   Public:   /api/health, /api/auth/register, /api/auth/login
   Protected: everything else, via requireAuth.

   requireAuth is applied with router.use on the protected section
   rather than per-route. A new route added below is protected by
   default instead of by remembering to add a middleware argument.
   ============================================================ */

import { Router } from 'express'
import * as quotes from '../controllers/quoteController.js'
import * as bookings from '../controllers/bookingController.js'
import * as customers from '../controllers/customerController.js'
import * as dashboard from '../controllers/dashboardController.js'
import * as auth from '../controllers/authController.js'
import { getHealth } from '../controllers/healthController.js'
import { requireAuth } from '../middleware/authMiddleware.js'

const router = Router()

/* ---------------------------------------------------------------- public */

router.get('/health', getHealth)

router.post('/auth/register', auth.register)
router.post('/auth/login', auth.login)

/* ------------------------------------------------------------- protected */
/* Everything past this line requires a valid Bearer token. */

router.use(requireAuth)

router.get('/auth/me', auth.me)

router.get('/dashboard/stats', dashboard.getStats)

router.get('/quotes', quotes.listQuotes)
router.post('/quotes', quotes.createQuote)
router.get('/quotes/:id', quotes.getQuote)
router.patch('/quotes/:id', quotes.updateQuote)
router.delete('/quotes/:id', quotes.deleteQuote)

router.get('/bookings', bookings.listBookings)
router.post('/bookings', bookings.createBooking)
router.get('/bookings/:id', bookings.getBooking)
router.patch('/bookings/:id', bookings.updateBooking)
router.delete('/bookings/:id', bookings.deleteBooking)

router.get('/customers', customers.listCustomers)
router.post('/customers', customers.createCustomer)
router.get('/customers/:id', customers.getCustomer)
router.patch('/customers/:id', customers.updateCustomer)
router.delete('/customers/:id', customers.deleteCustomer)

export default router
