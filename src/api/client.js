/* ============================================================
   QuoteFlow — API client
   The single place that talks to the Express backend. Every other
   module in src/api goes through request(), so the base URL, the
   Authorization header, JSON handling and error shaping all live
   here rather than being repeated in each service.
   ============================================================ */

const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api').replace(/\/$/, '')

const TOKEN_KEY = 'quoteflow.token'

/* ---------- Token storage ----------
   localStorage is the right call for this app: it survives a reload
   (no forced re-login) and is readable synchronously, which avoids
   flashing the login screen while the session is re-checked.
   The token is a bearer credential, so an XSS elsewhere on the
   origin could read it — that is the trade-off versus an httpOnly
   cookie, and the backend treats the frontend as untrusted either
   way. Authorization is always enforced server-side. */

export const getToken = () => {
  try {
    return window.localStorage.getItem(TOKEN_KEY)
  } catch {
    // Private browsing or blocked storage: fall back to no token.
    return null
  }
}

export const setToken = (token) => {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token)
    else window.localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore: the session simply won't survive a reload */
  }
}

/* ---------- Errors ---------- */

/**
 * A failed request, carrying a message that is safe to show a user.
 * The backend already returns clean messages and never leaks SQL,
 * stack traces or JWT internals, so `message` is display-ready.
 * Anything unrecognised collapses to a generic line.
 */
export class ApiError extends Error {
  constructor(message, { status = 0, fields = null, isNetwork = false } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
    this.isNetwork = isNetwork
  }
}

/* A 401 anywhere means the token is gone, expired or invalid.
   The auth context listens for this and signs the user out, so a
   stale session can never leave the UI in a half-authenticated state. */
const notifyUnauthorized = () => {
  window.dispatchEvent(new CustomEvent('quoteflow:unauthorized'))
}

const GENERIC = 'Something went wrong. Please try again.'
const NETWORK = "Can't reach the server. Check that the API is running."

/* ---------- Core request ---------- */

const request = async (path, { method = 'GET', body, auth = true, signal } = {}) => {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (error) {
    // fetch only rejects for network/abort failures, never for HTTP status.
    if (error?.name === 'AbortError') throw error
    throw new ApiError(NETWORK, { isNetwork: true })
  }

  if (response.status === 204) return null

  const text = await response.text()
  let payload = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
  }

  if (response.ok) return payload?.data ?? null

  if (response.status === 401) {
    /* Two very different things arrive as 401:
       • an authenticated request whose token expired or was revoked —
         clear the session so the app returns to /login;
       • a rejected credential on /auth/login or /auth/register —
         not a session problem, and the server's wording ("Email or
         password is incorrect.") is the useful one.
       Login and registration call with auth:false, which is what
       separates the two. */
    if (auth) notifyUnauthorized()

    throw new ApiError(
      payload?.message || (auth ? 'Your session has expired. Please log in again.' : GENERIC),
      { status: 401 },
    )
  }

  throw new ApiError(payload?.message || GENERIC, {
    status: response.status,
    fields: payload?.errors ?? null,
  })
}

/** Builds `?a=1&b=2`, dropping empty values so URLs stay clean. */
export const queryString = (params) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null || value === '' || value === 'all') continue
    search.set(key, String(value))
  }
  const asString = search.toString()
  return asString ? `?${asString}` : ''
}

export { BASE_URL, request }
