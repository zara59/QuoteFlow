/* ============================================================
   QuoteFlow API — dashboard controller
   Same response shape as Stage 3; every figure is now an SQL
   aggregate rather than an in-memory calculation.
   ============================================================ */

import { asyncHandler } from '../utils/asyncHandler.js'
import { todayIso } from '../config/env.js'
import { getDashboardStats } from '../db/queries/dashboardQueries.js'

export const getStats = asyncHandler(async (req, res) => {
  const stats = await getDashboardStats(req.user.id, { referenceDate: todayIso() })
  return res.json({ success: true, data: stats })
})
