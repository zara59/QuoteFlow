/* ============================================================
   QuoteFlow API — async route wrapper
   Express 4 does not catch rejected promises from handlers, so every
   async controller is wrapped in this to forward errors to the
   centralised error handler.
   ============================================================ */

export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next)
}
