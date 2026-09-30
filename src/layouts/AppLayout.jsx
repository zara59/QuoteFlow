import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import Header from '../components/Header'
import Sidebar, { NAV } from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'

const PAGE_META = {
  '/dashboard': {
    subtitle: 'Here’s what’s happening with your business.',
  },
  '/quotes': {
    title: 'Quotes',
    subtitle: 'Create and manage service quotes.',
  },
  '/bookings': {
    title: 'Bookings',
    subtitle: 'Manage upcoming and completed appointments.',
  },
  '/customers': {
    title: 'Customers',
    subtitle: 'Your client list, contact details and activity.',
  },
  '/settings': {
    title: 'Settings',
    subtitle: 'Manage your profile, business details and preferences.',
  },
}

/* Time-of-day greeting built from the signed-in user's first name. */
function dashboardTitle(firstName) {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  return firstName ? `${part}, ${firstName}` : part
}

export default function AppLayout() {
  const { pathname } = useLocation()
  const { firstName } = useAuth()

  // Derive drawer state: it can only be open on the route it was opened from,
  // so a route change (including browser back) closes it without an effect.
  const [openedOn, setOpenedOn] = useState(null)
  const navOpen = openedOn === pathname

  const openNav = () => setOpenedOn(pathname)
  const closeNav = () => setOpenedOn(null)

  const fallback = {
    title: 'Page not found',
    subtitle: 'That screen does not exist yet.',
  }

  // The dashboard title greets by name, so it cannot come from the
  // static table above.
  const meta =
    pathname === '/dashboard'
      ? { ...PAGE_META['/dashboard'], title: dashboardTitle(firstName) }
      : PAGE_META[pathname] ?? fallback

  // Escape closes the drawer; body scroll locks while it is open.
  useEffect(() => {
    if (!navOpen) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeNav()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [navOpen])

  return (
    <div className="qf-app">
      <Sidebar open={navOpen} onNavigate={closeNav} />

      {navOpen && (
        <button
          type="button"
          className="qf-scrim"
          aria-label="Close navigation menu"
          onClick={closeNav}
        />
      )}

      <div className="qf-main">
        <Header title={meta.title} subtitle={meta.subtitle} onMenu={openNav} />

        <main className="qf-content">
          <Outlet />
        </main>
      </div>

      <nav className="qf-mobile-nav" aria-label="Primary">
        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `qf-mobile-nav__item ${isActive ? 'qf-mobile-nav__item--active' : ''}`
            }
          >
            <Icon size={19} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
