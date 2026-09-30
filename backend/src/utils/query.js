/* ============================================================
   QuoteFlow API — query-string helpers
   Centralised so every list endpoint reads and validates filters
   the same way, and an unusable filter is a 400 rather than a
   silently empty result.
   ============================================================ */

import { ApiError } from './ApiError.js'
import { DATE_PATTERN } from './validation.js'

export const readSearch = (req) => String(req.query.search ?? '').trim().toLowerCase()

export const readStatus = (req, allowed, label = 'Status') => {
  const raw = String(req.query.status ?? '').trim()
  if (!raw || raw.toLowerCase() === 'all') return undefined

  const match = allowed.find((candidate) => candidate.toLowerCase() === raw.toLowerCase())
  if (!match) {
    throw ApiError.badRequest(`${label} filter must be one of: ${allowed.join(', ')}.`)
  }
  return match
}

export const readDateFilter = (req) => {
  const raw = String(req.query.date ?? '').trim().toLowerCase()
  if (!raw || raw === 'all') return undefined
  if (raw === 'upcoming' || raw === 'past') return raw
  if (!DATE_PATTERN.test(raw) || Number.isNaN(new Date(`${raw}T00:00:00Z`).getTime())) {
    throw ApiError.badRequest('Date filter must be "upcoming", "past", or a date in YYYY-MM-DD format.')
  }
  return raw
}

/** Case-insensitive "does any of these fields contain the term" test. */
export const matchesTerm = (row, fields, term) => {
  if (!term) return true
  return fields.some((field) => String(row[field] ?? '').toLowerCase().includes(term))
}

/** Reads a positive integer route param, or rejects the request. */
export const readIdParam = (req, label = 'Id') => {
  const raw = String(req.params.id ?? '').trim()
  const id = Number(raw)
  if (!raw || !Number.isInteger(id) || id < 1) {
    throw ApiError.badRequest(`${label} must be a positive integer.`)
  }
  return id
}
