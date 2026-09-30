/* ============================================================
   QuoteFlow — dashboard API
   The server aggregates these figures in SQL, scoped to the signed-in
   user, so the dashboard reflects PostgreSQL rather than the browser.
   ============================================================ */

import { request } from './client'

export const getStats = ({ signal } = {}) => request('/dashboard/stats', { signal })
