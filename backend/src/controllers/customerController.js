/* ============================================================
   QuoteFlow API — customer controller
   Deletion is refused while quotes or bookings reference the
   customer. The application check gives a clear 409 message; the
   ON DELETE RESTRICT foreign key is the backstop that guarantees
   the same rule even if the check is bypassed.
   ============================================================ */

import { ApiError } from '../utils/ApiError.js'
import { readIdParam, readSearch } from '../utils/query.js'
import { sendData, sendMessage } from '../utils/respond.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { validateCustomerPayload } from '../validators/resourceValidators.js'
import * as customers from '../db/queries/customerQueries.js'

/* The caller's id is read once, here, from the JWT-verified user the
   auth middleware attached. It is the only source of ownership in this
   file — no handler reads a user id from params, query or body. */
const ownerId = (req) => req.user.id

export const listCustomers = asyncHandler(async (req, res) => {
  const term = readSearch(req)
  const data = await customers.listCustomers(ownerId(req), { term })
  return sendData(res, data, { count: data.length })
})

export const getCustomer = asyncHandler(async (req, res) => {
  const id = readIdParam(req, 'Customer id')
  const customer = await customers.findCustomerById(ownerId(req), id)
  if (!customer) throw ApiError.notFound(`Customer ${id} not found.`)
  return sendData(res, customer)
})

export const createCustomer = asyncHandler(async (req, res) => {
  const values = validateCustomerPayload(req.body)
  return res
    .status(201)
    .json({ success: true, data: await customers.insertCustomer(ownerId(req), values) })
})

export const updateCustomer = asyncHandler(async (req, res) => {
  const id = readIdParam(req, 'Customer id')
  if (!(await customers.findCustomerById(ownerId(req), id))) throw ApiError.notFound(`Customer ${id} not found.`)

  const values = validateCustomerPayload(req.body, { partial: true })
  if (Object.keys(values).length === 0) {
    throw ApiError.badRequest('Send at least one field to update.')
  }

  return sendData(res, await customers.updateCustomerRecord(ownerId(req), id, values))
})

export const deleteCustomer = asyncHandler(async (req, res) => {
  const id = readIdParam(req, 'Customer id')
  const customer = await customers.findCustomerById(ownerId(req), id)
  if (!customer) throw ApiError.notFound(`Customer ${id} not found.`)

  const usage = await customers.customerUsage(ownerId(req), id)
  if (usage.quotes > 0 || usage.bookings > 0) {
    throw ApiError.conflict(
      `Customer ${customer.name} has ${usage.quotes} quote(s) and ${usage.bookings} booking(s). ` +
        'Delete or reassign those records first.',
      { usage },
    )
  }

  await customers.removeCustomer(ownerId(req), id)
  return sendMessage(res, `Customer ${customer.name} deleted.`)
})
