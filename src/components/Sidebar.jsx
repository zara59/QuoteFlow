import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAppData } from '../context/AppDataContext'
import { useAuth } from '../context/AuthContext'
import {
  IconBookings,
  IconCustomers,
  IconDashboard,
  IconLogOut,
  IconQuotes,
  IconSettings,
  IconSparkle,
} from './Icons'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', Icon: IconDashboard },
  { to: '/quotes', label: 'Quotes', Icon: IconQuotes },
  { to: '/bookings', label: 'Bookings', Icon: IconBookings },
  { to: '/customers', label: 'Customers', Icon: IconCustomers },
  { to: '/settings', label: 'Settings', Icon: IconSettings },
]

export default function Sidebar({ open, onNavigate }) {
  const { quotes, bookings } = useAppData()
  const { user, initials, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  /* The backend holds no session to revoke — the JWT is stateless — so
     signing out clears the token and drops the in-memory records. The
     guard stops a double click firing twice. */
  const handleSignOut = () => {
    if (signingOut) return
    setSigningOut(true)
    signOut()
  }

  const counts = {
    '/quotes': quotes.length,
    '/bookings': bookings.filter((booking) => booking.status === 'Upcoming').length,
  }
  return (
    <aside className={`qf-sidebar ${open ? 'qf-sidebar--open' : ''}`} aria-label="Main navigation">
      <div className="qf-sidebar__brand">
        <span className="qf-brand__mark">
          <IconSparkle />
        </span>
        <span className="qf-brand__text">
          <span className="qf-brand__name">QuoteFlow</span>
          <span className="qf-brand__tag">Quotes &amp; Bookings</span>
        </span>
      </div>

      <nav className="qf-sidebar__nav">
        <p className="qf-nav-label">Workspace</p>
        <ul className="qf-nav">
          {NAV.map(({ to, label, Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                onClick={onNavigate}
                className={({ isActive }) => `qf-nav__item ${isActive ? 'qf-nav__item--active' : ''}`}
                title={label}
              >
                <Icon size={18} />
                <span>{label}</span>
                {counts[to] !== undefined && <span className="qf-nav__count">{counts[to]}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="qf-sidebar__foot">
        <div className="qf-user">
          <span className="qf-avatar qf-avatar--accent qf-avatar--sm" aria-hidden="true">
            {initials}
          </span>
          <span className="qf-user__info">
            <span className="qf-user__name qf-truncate">{user?.name}</span>
            <span className="qf-user__email qf-truncate">{user?.email}</span>
          </span>
        </div>

        <button
          type="button"
          className="qf-logout"
          onClick={handleSignOut}
          disabled={signingOut}
          title="Log out"
        >
          <IconLogOut size={17} />
          <span>{signingOut ? 'Logging out…' : 'Log out'}</span>
        </button>
      </div>
    </aside>
  )
}

export { NAV }
