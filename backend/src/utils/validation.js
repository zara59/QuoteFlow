/* ============================================================
   QuoteFlow API — validation primitives
   A small reusable checker shared by every validator. Each method
   records a field error and, when the key is present in the payload,
   records the coerced value the controller should store.

   Client input is never trusted: nothing reaches the store until
   throwIfInvalid() has passed.
   ============================================================ */

import { ApiError } from './ApiError.js'
import { MAX_AMOUNT } from '../data/constants.js'

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const PHONE_PATTERN = /^[+()\d][\d\s()+-]{5,}$/
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const present = (payload, key) => Object.prototype.hasOwnProperty.call(payload, key) && payload[key] !== undefined

const asText = (value) => (value === null || value === undefined ? '' : String(value).trim())

const isRealDate = (value) => {
  if (!DATE_PATTERN.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  )
}

export class FieldChecker {
  constructor(payload, { partial = false } = {}) {
    this.payload = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {}
    this.partial = partial
    this.errors = {}
    this.values = {}
  }

  fail(key, message) {
    this.errors[key] = message
    return this
  }

  skip(key) {
    return this.partial && !present(this.payload, key)
  }

  text(key, label, { required = true, min = 1, max = 200 } = {}) {
    if (this.skip(key)) return this
    const raw = asText(this.payload[key])

    if (!raw) {
      if (required) this.fail(key, `${label} is required.`)
      else this.values[key] = ''
      return this
    }
    if (raw.length < min) {
      this.fail(key, `${label} must be at least ${min} characters.`)
      return this
    }
    if (raw.length > max) {
      this.fail(key, `Keep the ${label.toLowerCase()} under ${max} characters.`)
      return this
    }
    this.values[key] = raw
    return this
  }

  id(key, label, { required = true } = {}) {
    if (this.skip(key)) return this
    const raw = this.payload[key]
    if (raw === null || raw === undefined || asText(raw) === '') {
      if (required) this.fail(key, `${label} is required.`)
      return this
    }
    const id = Number(raw)
    if (!Number.isInteger(id) || id < 1) {
      this.fail(key, `${label} must be a valid id.`)
      return this
    }
    this.values[key] = id
    return this
  }

  amount(key = 'amount', label = 'Amount', { required = true } = {}) {
    if (this.skip(key)) return this
    const raw = this.payload[key]

    if (raw === null || raw === undefined || asText(raw) === '') {
      if (required) this.fail(key, `${label} is required.`)
      return this
    }
    const value = Number(raw)
    if (!Number.isFinite(value)) {
      this.fail(key, `${label} must be a number.`)
      return this
    }
    if (value <= 0) {
      this.fail(key, `${label} must be greater than 0.`)
      return this
    }
    if (value > MAX_AMOUNT) {
      this.fail(key, `${label} looks too large — enter a value under $${MAX_AMOUNT.toLocaleString('en-US')}.`)
      return this
    }
    this.values[key] = Math.round(value * 100) / 100
    return this
  }

  date(key, label, { required = true } = {}) {
    if (this.skip(key)) return this
    const value = asText(this.payload[key])

    if (!value) {
      if (required) this.fail(key, `${label} is required.`)
      return this
    }
    if (!isRealDate(value)) {
      this.fail(key, `Enter a valid ${label.toLowerCase()} in YYYY-MM-DD format.`)
      return this
    }
    this.values[key] = value
    return this
  }

  time(key, label, { required = true } = {}) {
    if (this.skip(key)) return this
    const value = asText(this.payload[key])

    if (!value) {
      if (required) this.fail(key, `${label} is required.`)
      return this
    }
    if (!TIME_PATTERN.test(value)) {
      this.fail(key, `Enter a valid ${label.toLowerCase()} in HH:MM format.`)
      return this
    }
    this.values[key] = value
    return this
  }

  status(key, label, allowed, { required = true, fallback } = {}) {
    if (this.skip(key)) return this
    const provided = present(this.payload, key)
    const value = asText(this.payload[key])

    if (!value) {
      // Omitted entirely: fall back to the default for this resource.
      if (!provided && fallback) {
        this.values[key] = fallback
        return this
      }
      // Sent blank: that is a mistake worth reporting, not a silent default.
      if (required || provided) this.fail(key, `${label} is required.`)
      return this
    }
    const match = allowed.find((candidate) => candidate.toLowerCase() === value.toLowerCase())
    if (!match) {
      this.fail(key, `${label} must be one of: ${allowed.join(', ')}.`)
      return this
    }
    this.values[key] = match
    return this
  }

  email(key = 'email', { required = false } = {}) {
    if (this.skip(key)) return this
    const value = asText(this.payload[key])

    if (!value) {
      if (required) this.fail(key, 'Email is required.')
      else this.values[key] = ''
      return this
    }
    if (value.length > 160 || !EMAIL_PATTERN.test(value)) {
      this.fail(key, 'Enter a valid email address.')
      return this
    }
    this.values[key] = value
    return this
  }

  phone(key = 'phone', { required = false } = {}) {
    if (this.skip(key)) return this
    const value = asText(this.payload[key])

    if (!value) {
      if (required) this.fail(key, 'Phone is required.')
      else this.values[key] = ''
      return this
    }
    if (value.length > 40 || !PHONE_PATTERN.test(value)) {
      this.fail(key, 'Enter a valid phone number.')
      return this
    }
    this.values[key] = value
    return this
  }

  throwIfInvalid(message = 'Please correct the highlighted fields.') {
    if (Object.keys(this.errors).length === 0) return this
    throw ApiError.badRequest(message, this.errors)
  }
}

/** Rejects any key the API does not own, so nothing unexpected is written. */
export const rejectUnknownKeys = (payload, allowed) => {
  const unknown = Object.keys(payload ?? {}).filter((key) => !allowed.includes(key))
  if (unknown.length === 0) return
  throw ApiError.badRequest(`Unsupported field${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}.`)
}
