/* ============================================================
   QuoteFlow API — response helpers
   One consistent envelope for the whole API:
     success -> { success: true, data }
     error   -> { success: false, message }
   ============================================================ */

export const sendData = (res, data, meta) => {
  const body = { success: true, data }
  if (meta) body.meta = meta
  return res.json(body)
}

export const sendMessage = (res, message, status = 200) =>
  res.status(status).json({ success: true, message })
