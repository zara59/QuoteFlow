/* ============================================================
   QuoteFlow — shared form validation
   Pure functions: return an errors object keyed by field name.
   An empty object means the payload is valid.
   ============================================================ */

import { QUOTE_STATUSES, BOOKING_STATUSES } from '../data/constants'

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const PHONE_PATTERN = /^[+()\d][\d\s()+-]{5,}$/
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

const text = (value) => (value ?? '').toString().trim()

export function validateQuote(values) {
  const errors = {}

  if (!values.customerId) {
    errors.customerId = 'Customer is required.'
  }

  if (!text(values.service)) {
    errors.service = 'Service is required.'
  } else if (text(values.service).length < 3) {
    errors.service = 'Service must be at least 3 characters.'
  }

  const amount = Number(values.amount)
  if (text(values.amount) === '') {
    errors.amount = 'Amount is required.'
  } else if (!Number.isFinite(amount)) {
    errors.amount = 'Amount must be a number.'
  } else if (amount <= 0) {
    errors.amount = 'Amount must be greater than 0.'
  } else if (amount > 1_000_000) {
    errors.amount = 'Amount looks too large — enter a value under $1,000,000.'
  }

  if (!values.validUntil) {
    errors.validUntil = 'Valid until date is required.'
  }

  if (!QUOTE_STATUSES.includes(values.status)) {
    errors.status = 'Choose a valid status.'
  }

  return errors
}

export function validateBooking(values) {
  const errors = {}

  if (!values.customerId) {
    errors.customerId = 'Customer is required.'
  }

  if (!text(values.service)) {
    errors.service = 'Service is required.'
  } else if (text(values.service).length < 3) {
    errors.service = 'Service must be at least 3 characters.'
  }

  if (!values.date) {
    errors.date = 'Booking date is required.'
  } else if (Number.isNaN(new Date(values.date).getTime())) {
    errors.date = 'Enter a valid date.'
  }

  if (!values.time) {
    errors.time = 'Time is required.'
  } else if (!TIME_PATTERN.test(values.time)) {
    errors.time = 'Enter a valid time (HH:MM).'
  }

  if (values.duration && text(values.duration).length > 40) {
    errors.duration = 'Keep the duration under 40 characters.'
  }

  if (values.location && text(values.location).length > 80) {
    errors.location = 'Keep the location under 80 characters.'
  }

  if (!BOOKING_STATUSES.includes(values.status)) {
    errors.status = 'Choose a valid status.'
  }

  return errors
}

export function validateCustomer(values) {
  const errors = {}

  if (!text(values.name)) {
    errors.name = 'Name is required.'
  } else if (text(values.name).length < 2) {
    errors.name = 'Name must be at least 2 characters.'
  }

  if (!text(values.email)) {
    errors.email = 'Email is required.'
  } else if (!EMAIL_PATTERN.test(text(values.email))) {
    errors.email = 'Enter a valid email address.'
  }

  if (!text(values.phone)) {
    errors.phone = 'Phone is required.'
  } else if (!PHONE_PATTERN.test(text(values.phone))) {
    errors.phone = 'Enter a valid phone number.'
  }

  if (text(values.company).length > 80) {
    errors.company = 'Keep the company name under 80 characters.'
  }

  return errors
}

/** Drops an error for a field as soon as the user edits it. */
export function clearFieldError(errors, key) {
  if (!errors[key]) return errors
  const next = { ...errors }
  delete next[key]
  return next
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0
}

/* ---------- Auth ----------
   Mirrors backend/src/validators/authValidators.js so the form can
   reject bad input before a round trip. The API stays the authority;
   these rules exist to give instant feedback, not to replace it. */

export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 72 // bcrypt ignores bytes past 72, so reject
const NAME_MAX = 120

const byteLength = (value) => new TextEncoder().encode(value).length

export function validateCredentials(values) {
  const errors = {}

  if (!text(values.email)) {
    errors.email = 'Email is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text(values.email))) {
    errors.email = 'Enter a valid email address.'
  }

  if (!values.password) {
    errors.password = 'Password is required.'
  }

  return errors
}

export function validateRegistration(values) {
  const errors = validateCredentials(values)

  const name = text(values.name)
  if (!name) {
    errors.name = 'Name is required.'
  } else if (name.length < 2 || name.length > NAME_MAX) {
    errors.name = `Must be between 2 and ${NAME_MAX} characters.`
  }

  const password = values.password ?? ''
  if (password && byteLength(password) > PASSWORD_MAX) {
    errors.password = 'Password is too long (72 bytes maximum).'
  } else if (password && password.length < PASSWORD_MIN) {
    errors.password = `Must be at least ${PASSWORD_MIN} characters.`
  }

  if (values.confirmPassword !== undefined && values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Passwords do not match.'
  }

  return errors
}
