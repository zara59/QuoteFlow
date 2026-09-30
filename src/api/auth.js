/* ============================================================
   QuoteFlow — auth API
   ============================================================ */

import { request, setToken } from './client'

/** Sign in. Stores the token, returns the safe user profile. */
export const login = async (credentials) => {
  const data = await request('/auth/login', {
    method: 'POST',
    body: credentials,
    auth: false,
  })
  setToken(data.token)
  return data.user
}

/** Create an account. The backend returns a session, so this signs
    the new user straight in. */
export const register = async (details) => {
  const data = await request('/auth/register', {
    method: 'POST',
    body: details,
    auth: false,
  })
  setToken(data.token)
  return data.user
}

/** Re-reads the profile for the stored token. Used on boot to decide
    whether a saved session is still valid. */
export const me = () => request('/auth/me')

/** Clears the token. The backend is stateless, so this is local only. */
export const logout = () => setToken(null)
