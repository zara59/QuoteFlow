/* ============================================================
   QuoteFlow API — statuses and shared vocabularies
   Mirrors src/data/constants.js in the Stage 2 frontend.
   ============================================================ */

export const QUOTE_STATUSES = ['Draft', 'Sent', 'Approved', 'Declined']

export const BOOKING_STATUSES = ['Upcoming', 'Completed', 'Cancelled']

/** Statuses that still count as "awaiting a decision". */
export const PENDING_QUOTE_STATUSES = ['Draft', 'Sent']

export const DEFAULT_QUOTE_STATUS = 'Draft'
export const DEFAULT_BOOKING_STATUS = 'Upcoming'

export const MAX_AMOUNT = 1_000_000
