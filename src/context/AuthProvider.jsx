/* ============================================================
   QuoteFlow — AuthProvider
   Owns the session: who is signed in, and whether we have finished
   working that out yet.

   `status` is the important part. Protected routes must wait for it to
   leave 'loading', otherwise a reload with a valid token would briefly
   render the login screen (and a reload with no token would briefly
   flash the dashboard).
   ============================================================ */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './AuthContext'
import * as authApi from '../api/auth'
import { ApiError, getToken } from '../api/client'

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // 'loading' until the stored token has been checked exactly once.
  const [status, setStatus] = useState(() => (getToken() ? 'loading' : 'unauthenticated'))

  /* ---------- Boot: validate any stored token ----------
     The lazy initialiser above already resolved "no token" to
     unauthenticated, so there is nothing to do in that case. */

  useEffect(() => {
    if (!getToken()) return undefined

    let cancelled = false
    authApi
      .me()
      .then((profile) => {
        if (cancelled) return
        setUser(profile)
        setStatus('authenticated')
      })
      .catch(() => {
        if (cancelled) return
        // Expired, revoked or malformed: drop it and start clean.
        authApi.logout()
        setUser(null)
        setStatus('unauthenticated')
      })

    return () => {
      cancelled = true
    }
  }, [])

  /* ---------- Any 401 from anywhere signs the user out ---------- */

  useEffect(() => {
    const onUnauthorized = () => {
      authApi.logout()
      setUser(null)
      setStatus('unauthenticated')
    }
    window.addEventListener('quoteflow:unauthorized', onUnauthorized)
    return () => window.removeEventListener('quoteflow:unauthorized', onUnauthorized)
  }, [])

  /* ---------- Actions ---------- */

  const signIn = useCallback(async (credentials) => {
    const profile = await authApi.login(credentials)
    setUser(profile)
    setStatus('authenticated')
    return profile
  }, [])

  const signUp = useCallback(async (details) => {
    const profile = await authApi.register(details)
    setUser(profile)
    setStatus('authenticated')
    return profile
  }, [])

  const signOut = useCallback(() => {
    authApi.logout()
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  /* ---------- Derived profile bits the UI shows ---------- */

  const value = useMemo(() => {
    const name = user?.name ?? ''
    return {
      user,
      status,
      isAuthenticated: status === 'authenticated',
      isLoading: status === 'loading',
      firstName: name.split(' ')[0] || name,
      initials: name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join(''),
      signIn,
      signUp,
      signOut,
    }
  }, [user, status, signIn, signUp, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { ApiError }
