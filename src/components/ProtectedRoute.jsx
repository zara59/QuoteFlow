/* ============================================================
   QuoteFlow — ProtectedRoute
   Gate for every signed-in screen.

   While the stored token is being verified the gate shows a
   full-screen loader rather than redirecting. Without that wait,
   reloading on /dashboard would flash the login form for a split
   second even though the session is perfectly valid.
   ============================================================ */

import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import FullPageLoader from './FullPageLoader'

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <FullPageLoader message="Restoring your session…" />

  if (!isAuthenticated) {
    // Remember where they were headed so login can return them there.
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  return <Outlet />
}