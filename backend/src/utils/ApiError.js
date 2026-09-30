/* ============================================================
   QuoteFlow API — operational error
   Carries an HTTP status and a message that is safe to send to a
   client. Unexpected failures use status 500 and a generic message.
   ============================================================ */

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.expected = true
    if (details) this.details = details
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details)
  }

  static unauthorized(message = 'Authentication required.') {
    return new ApiError(401, message)
  }

  static notFound(message) {
    return new ApiError(404, message)
  }

  static conflict(message, details) {
    return new ApiError(409, message, details)
  }

  static internal(message = 'Something went wrong. Please try again.') {
    return new ApiError(500, message)
  }
}
