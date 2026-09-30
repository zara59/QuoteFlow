/* ============================================================
   QuoteFlow — AuthShell
   Two-panel frame shared by /login and /register: the brand story on
   the left, the form on the right. The left panel is decorative and
   is hidden on small screens so the form owns the viewport.
   ============================================================ */

import { Link } from 'react-router-dom'
import { IconSparkle } from './Icons'

const HIGHLIGHTS = [
  {
    title: 'Quotes and bookings in one place',
    text: 'Send quotes, track every decision, and fill your calendar without a spreadsheet in sight.',
  },
  {
    title: 'Your data stays yours',
    text: 'Every record is private to your account and served straight from PostgreSQL.',
  },
  {
    title: 'Built to be trusted',
    text: 'Passwords are bcrypt-hashed, sessions are signed JWTs, and ownership is enforced on every query.',
  },
]

export default function AuthShell({ children, footer }) {
  return (
    <div className="qf-auth">
      <aside className="qf-auth__aside">
        <Link to="/" className="qf-auth__brand">
          <span className="qf-brand__mark">
            <IconSparkle />
          </span>
          <span className="qf-brand__text">
            <span className="qf-brand__name">QuoteFlow</span>
            <span className="qf-brand__tag">Quotes &amp; Bookings</span>
          </span>
        </Link>

        <div className="qf-auth__pitch">
          <h2 className="qf-auth__headline">Run the work, not the paperwork.</h2>
          <ul className="qf-auth__list">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title}>
                <p className="qf-auth__list-title">{item.title}</p>
                <p className="qf-auth__list-text">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>

        <p className="qf-auth__foot">Quotes, bookings and customers — for independent service businesses.</p>
      </aside>

      <main className="qf-auth__main">
        <div className="qf-auth__mobile-brand">
          <span className="qf-brand__mark">
            <IconSparkle />
          </span>
          <span className="qf-brand__name">QuoteFlow</span>
        </div>

        <div className="qf-card qf-auth__card">
          {children}
        </div>

        {footer && <p className="qf-auth__switch">{footer}</p>}
      </main>
    </div>
  )
}