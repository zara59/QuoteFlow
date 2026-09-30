/* ============================================================
   QuoteFlow API — resource validators
   Quote, booking and customer payload rules. Each returns the
   cleaned, coerced values the controller should store.
   ============================================================ */

import { FieldChecker, rejectUnknownKeys } from '../utils/validation.js'
import {
  BOOKING_STATUSES,
  DEFAULT_BOOKING_STATUS,
  DEFAULT_QUOTE_STATUS,
  QUOTE_STATUSES,
} from '../data/constants.js'

const QUOTE_FIELDS = ['customerId', 'service', 'description', 'amount', 'validUntil', 'status']
const BOOKING_FIELDS = ['customerId', 'service', 'date', 'time', 'duration', 'status', 'location', 'notes']
const CUSTOMER_FIELDS = ['name', 'email', 'phone', 'company', 'location']

export function validateQuotePayload(payload, { partial = false } = {}) {
  rejectUnknownKeys(payload, QUOTE_FIELDS)

  const checker = new FieldChecker(payload, { partial })

  checker.id('customerId', 'Customer')
  checker.text('service', 'Service', { min: 3, max: 120 })
  checker.text('description', 'Description', { required: false, max: 2000 })
  checker.amount('amount', 'Amount')
  checker.date('validUntil', 'Valid until')
  checker.status('status', 'Status', QUOTE_STATUSES, { required: !partial, fallback: DEFAULT_QUOTE_STATUS })

  checker.throwIfInvalid('Quote could not be saved — please check the fields below.')
  return checker.values
}

export function validateBookingPayload(payload, { partial = false } = {}) {
  rejectUnknownKeys(payload, BOOKING_FIELDS)

  const checker = new FieldChecker(payload, { partial })

  checker.id('customerId', 'Customer')
  checker.text('service', 'Service', { min: 3, max: 120 })
  checker.date('date', 'Date')
  checker.time('time', 'Time')
  checker.text('duration', 'Duration', { required: false, max: 40 })
  checker.status('status', 'Status', BOOKING_STATUSES, { required: !partial, fallback: DEFAULT_BOOKING_STATUS })
  checker.text('location', 'Location', { required: false, max: 80 })
  checker.text('notes', 'Notes', { required: false, max: 2000 })

  checker.throwIfInvalid('Booking could not be saved — please check the fields below.')
  return checker.values
}

export function validateCustomerPayload(payload, { partial = false } = {}) {
  rejectUnknownKeys(payload, CUSTOMER_FIELDS)

  const checker = new FieldChecker(payload, { partial })

  checker.text('name', 'Name', { min: 2, max: 120 })
  checker.email('email', { required: false })
  checker.phone('phone', { required: false })
  checker.text('company', 'Company', { required: false, max: 80 })
  checker.text('location', 'Location', { required: false, max: 80 })

  checker.throwIfInvalid('Customer could not be saved — please check the fields below.')
  return checker.values
}
