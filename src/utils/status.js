/* ============================================================
   QuoteFlow — status → visual tone mapping
   Shared by StatusBadge and StatusSelect so a badge and its
   inline dropdown always render the same colour.
   ============================================================ */

const TONES = {
  Draft: 'neutral',
  Sent: 'info',
  Approved: 'success',
  Declined: 'danger',
  Upcoming: 'accent',
  Completed: 'success',
  Cancelled: 'danger',
  Paid: 'success',
  Pending: 'warning',
  Overdue: 'danger',
}

/** Status label → badge tone. Falls back to neutral for unknown values. */
export function toneForStatus(status) {
  return TONES[status] ?? 'neutral'
}
