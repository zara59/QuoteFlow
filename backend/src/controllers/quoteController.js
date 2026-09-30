/* ============================================================
   QuoteFlow API — quote controller
   Filtering and searching now happen in SQL; the response shape,
   validation and status codes are unchanged from Stage 3.

   OWNERSHIP (Stage 5)
   Every handler passes req.user.id into the query layer. requireCustomer
   checks the customer against the *same* id, so a user cannot attach a
   quote to somebody else's customer. A quote belonging to another user
   is reported as 404, not 403 — the response never confirms that the
   id exists.
   ============================================================ */

import { ApiError } from '../utils/ApiError.js'
import { readIdParam, readSearch, readStatus } from '../utils/query.js'
import { sendData, sendMessage } from '../utils/respond.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { validateQuotePayload } from '../validators/resourceValidators.js'
import { QUOTE_STATUSES } from '../data/constants.js'
import * as quotes from '../db/queries/quoteQueries.js'
import { findCustomerById } from '../db/queries/customerQueries.js'

/* The caller's id comes from the JWT-verified user the auth middleware
   attached. It is the only source of ownership in this file. */
const ownerId = (req) => req.user.id

const requireCustomer = async (userId, customerId) => {
  if (!(await findCustomerById(userId, customerId))) {
    throw ApiError.badRequest('Customer not found.', { customerId: 'Select an existing customer.' })
  }
}

export const listQuotes = asyncHandler(async (req, res) => {
  const term = readSearch(req)
  const status = readStatus(req, QUOTE_STATUSES, 'Quote status')

  const data = await quotes.listQuotes(ownerId(req), { term, status })
  return sendData(res, data, { count: data.length })
})

export const getQuote = asyncHandler(async (req, res) => {
  const id = readIdParam(req, 'Quote id')
  const quote = await quotes.findQuoteById(ownerId(req), id)
  if (!quote) throw ApiError.notFound(`Quote ${id} not found.`)
  return sendData(res, quote)
})

export const createQuote = asyncHandler(async (req, res) => {
  const values = validateQuotePayload(req.body)
  await requireCustomer(ownerId(req), values.customerId)

  const quote = await quotes.insertQuote(ownerId(req), values)
  return res.status(201).json({ success: true, data: quote })
})

export const updateQuote = asyncHandler(async (req, res) => {
  const id = readIdParam(req, 'Quote id')
  if (!(await quotes.findQuoteById(ownerId(req), id))) throw ApiError.notFound(`Quote ${id} not found.`)

  const values = validateQuotePayload(req.body, { partial: true })
  if (Object.keys(values).length === 0) {
    throw ApiError.badRequest('Send at least one field to update.')
  }
  // Reassignment is checked against the caller's own customers only.
  if (values.customerId !== undefined) {
    await requireCustomer(ownerId(req), values.customerId)
  }

  return sendData(res, await quotes.updateQuoteRecord(ownerId(req), id, values))
})

export const deleteQuote = asyncHandler(async (req, res) => {
  const id = readIdParam(req, 'Quote id')
  const quote = await quotes.findQuoteById(ownerId(req), id)
  if (!quote) throw ApiError.notFound(`Quote ${id} not found.`)

  await quotes.removeQuote(ownerId(req), id)
  return sendMessage(res, `Quote ${quote.number} deleted.`)
})
