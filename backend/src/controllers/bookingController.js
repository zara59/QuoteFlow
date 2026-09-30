/* ============================================================
   QuoteFlow API — booking controller
   Search, status and date filters are applied in SQL. The date
   filter is resolved against REFERENCE_DATE so results are stable.

   OWNERSHIP (Stage 5) — same pattern as quoteController.js: the
   caller's id comes from req.user, and requireCustomer validates the
   customer against that same id. Another user's booking is a 404.
   ============================================================ */

import { ApiError } from '../utils/ApiError.js'
import { readDateFilter, readIdParam, readSearch, readStatus } from '../utils/query.js'
import { sendData, sendMessage } from '../utils/respond.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { validateBookingPayload } from '../validators/resourceValidators.js'
import { BOOKING_STATUSES } from '../data/constants.js'
import { todayIso } from '../config/env.js'
import * as bookings from '../db/queries/bookingQueries.js'
import { findCustomerById } from '../db/queries/customerQueries.js'

/* The caller's id comes from the JWT-verified user the auth middleware
   attached. It is the only source of ownership in this file. */
const ownerId = (req) => req.user.id

const requireCustomer = async (userId, customerId) => {
  if (!(await findCustomerById(userId, customerId))) {
    throw ApiError.badRequest('Customer not found.', { customerId: 'Select an existing customer.' })
  }
}

export const listBookings = asyncHandler(async (req, res) => {
  const term = readSearch(req)
  const status = readStatus(req, BOOKING_STATUSES, 'Booking status')
  const dateFilter = readDateFilter(req)

  const data = await bookings.listBookings(ownerId(req), {
    term,
    status,
    dateFilter,
    referenceDate: todayIso(),
  })
  return sendData(res, data, { count: data.length })
})

export const getBooking = asyncHandler(async (req, res) => {
  const id = readIdParam(req, 'Booking id')
  const booking = await bookings.findBookingById(ownerId(req), id)
  if (!booking) throw ApiError.notFound(`Booking ${id} not found.`)
  return sendData(res, booking)
})

export const createBooking = asyncHandler(async (req, res) => {
  const values = validateBookingPayload(req.body)
  await requireCustomer(ownerId(req), values.customerId)

  const booking = await bookings.insertBooking(ownerId(req), values)
  return res.status(201).json({ success: true, data: booking })
})

export const updateBooking = asyncHandler(async (req, res) => {
  const id = readIdParam(req, 'Booking id')
  if (!(await bookings.findBookingById(ownerId(req), id))) throw ApiError.notFound(`Booking ${id} not found.`)

  const values = validateBookingPayload(req.body, { partial: true })
  if (Object.keys(values).length === 0) {
    throw ApiError.badRequest('Send at least one field to update.')
  }
  // Reassignment is checked against the caller's own customers only.
  if (values.customerId !== undefined) {
    await requireCustomer(ownerId(req), values.customerId)
  }

  return sendData(res, await bookings.updateBookingRecord(ownerId(req), id, values))
})

export const deleteBooking = asyncHandler(async (req, res) => {
  const id = readIdParam(req, 'Booking id')
  const booking = await bookings.findBookingById(ownerId(req), id)
  if (!booking) throw ApiError.notFound(`Booking ${id} not found.`)

  await bookings.removeBooking(ownerId(req), id)
  return sendMessage(res, `Booking for ${booking.customerName} deleted.`)
})
