/* ============================================================
   QuoteFlow — shared constants
   Status vocabularies and option lists used by forms, tables and the
   API layer. These mirror the CHECK constraints in the database
   schema; user-specific values (name, email) come from the API and
   never from here.
   ============================================================ */

/* ---------- Status vocabularies (single source of truth) ---------- */

export const QUOTE_STATUSES = ['Draft', 'Sent', 'Approved', 'Declined']

export const BOOKING_STATUSES = ['Upcoming', 'Completed', 'Cancelled']

/** Statuses that count as "still awaiting a decision". */
export const PENDING_QUOTE_STATUSES = ['Draft', 'Sent']

export const PIPELINE_COLUMNS = [
  { key: 'Draft', tone: 'neutral' },
  { key: 'Sent', tone: 'info' },
  { key: 'Approved', tone: 'success' },
  { key: 'Declined', tone: 'danger' },
]

/* ---------- Filter options ---------- */

export const QUOTE_DATE_FILTERS = [
  { value: 'all', label: 'All dates' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
]

export const BOOKING_DATE_FILTERS = [
  { value: 'all', label: 'All dates' },
  { value: 'upcoming', label: 'Upcoming only' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'past', label: 'Past bookings' },
]

export const QUOTE_STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  ...QUOTE_STATUSES.map((status) => ({ value: status, label: status })),
]

export const BOOKING_STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  ...BOOKING_STATUSES.map((status) => ({ value: status, label: status })),
]

/* ---------- Settings options ---------- */

export const BUSINESS_TYPES = [
  'Design & Consulting',
  'Photography & Video',
  'Home Cleaning',
  'Plumbing & HVAC',
  'Electrical',
  'Landscaping & Garden',
  'Construction & Renovation',
  'Consulting',
  'Other',
]

export const CURRENCIES = [
  'USD — US Dollar ($)',
  'EUR — Euro (€)',
  'GBP — British Pound (£)',
  'CAD — Canadian Dollar ($)',
  'AUD — Australian Dollar ($)',
]

/** Service names offered as autocomplete suggestions in the quote form. */
export const SERVICE_SUGGESTIONS = [
  'Website Redesign',
  'Logo Design',
  'Brand Guidelines',
  'Photography Session',
  'Home Cleaning',
  'Kitchen Renovation',
  'Consultation Hour',
]
