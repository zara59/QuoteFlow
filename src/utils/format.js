/* ============================================================
   QuoteFlow — formatting helpers (Stage 1, locale defaults)
   ============================================================ */

const CURRENCY = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const CURRENCY_PRECISE = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const DATE_SHORT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
})

const DATE_MEDIUM = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const DATE_LONG = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

const MONTH_YEAR = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
})

/** Parses 'YYYY-MM-DD' as a local date (avoids UTC off-by-one). */
export function toDate(value) {
  if (value instanceof Date) return value
  if (typeof value !== 'string') return new Date(value)
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function formatCurrency(value, { precise = false } = {}) {
  return precise ? CURRENCY_PRECISE.format(value) : CURRENCY.format(value)
}

/** Compact form for tight stat spaces: $8,420 → $8.4k */
export function formatCompactCurrency(value) {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`
  }
  return CURRENCY.format(value)
}

export function formatDate(value, variant = 'medium') {
  if (!value) return '—'
  const date = toDate(value)
  if (variant === 'short') return DATE_SHORT.format(date)
  if (variant === 'long') return DATE_LONG.format(date)
  if (variant === 'monthYear') return MONTH_YEAR.format(date)
  return DATE_MEDIUM.format(date)
}

export function formatMonthYear(value) {
  return MONTH_YEAR.format(toDate(value))
}

export function formatTime(value) {
  if (!value) return '—'
  const [hours, minutes] = value.split(':').map(Number)
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`
}

export function formatDelta(value) {
  if (value === undefined || value === null) return ''
  const rounded = Math.abs(value) < 10 ? Number(value).toFixed(1) : Math.round(value)
  return `${rounded}%`
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

/** 'Kitchen Renovation' → 'KR' for quote numbers and compact labels. */
export function shortCode(text = '') {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export function isSameDay(a, b) {
  const da = toDate(a)
  const db = toDate(b)
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  )
}

export function daysBetween(a, b) {
  const MS = 24 * 60 * 60 * 1000
  return Math.round((toDate(a) - toDate(b)) / MS)
}

/**
 * Today as 'YYYY-MM-DD' in the browser's own timezone.
 * en-CA formats exactly that way. `new Date().toISOString()` would be
 * UTC and can be a day off around midnight, which would mislabel
 * "Today" / "Tomorrow" on bookings.
 */
export function todayISO() {
  return new Date().toLocaleDateString('en-CA')
}

export function relativeDay(value, today) {
  const diff = daysBetween(value, today)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff > 1 && diff < 7) return `In ${diff} days`
  if (diff < -1 && diff > -7) return `${Math.abs(diff)} days ago`
  return formatDate(value, 'short')
}
