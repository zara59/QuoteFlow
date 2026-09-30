import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import AppDataProvider from './context/AppDataProvider'
import AuthProvider from './context/AuthProvider'
import AppLayout from './layouts/AppLayout'
import Bookings from './pages/Bookings'
import Customers from './pages/Customers'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Quotes from './pages/Quotes'
import Register from './pages/Register'
import Settings from './pages/Settings'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    /* AuthProvider sits outermost: the data layer needs to know who is
       signed in before it requests anything, and ProtectedRoute needs
       the resolved status before it renders a redirect. */
    <AuthProvider>
      <AppDataProvider>
        <Router>
          <Routes>
            {/* Public — each screen sends signed-in users back to the app. */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Everything below requires a valid session. */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/quotes" element={<Quotes />} />
                <Route path="/bookings" element={<Bookings />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Route>
          </Routes>
        </Router>
      </AppDataProvider>
    </AuthProvider>
  )
}