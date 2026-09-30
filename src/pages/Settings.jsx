/* ============================================================
   QuoteFlow — Settings

   Everything on this page is read-only, and every value is real.
   The API has no profile-edit and no business-profile endpoint, so
   this screen reports the signed-in account and the records the
   session actually owns. There are deliberately no switches here:
   a toggle that persists to localStorage but changes nothing
   anywhere else would be a lie about what the app does.
   ============================================================ */

import { useMemo } from 'react'
import { IconCheckCircle, IconGrid, IconLock, IconUser } from '../components/Icons'
import { useAuth } from '../context/AuthContext'
import { useAppData } from '../context/AppDataContext'
import { formatDate } from '../utils/format'

const SECTIONS = [
  { id: 'account', label: 'Account', Icon: IconUser },
  { id: 'data', label: 'Your data', Icon: IconGrid },
]

function Field({ label, htmlFor, children, hint }) {
  return (
    <div className="qf-field">
      <label className="qf-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <span className="qf-person__meta">{hint}</span>}
    </div>
  )
}

function SectionCard({ id, title, sub, children, footer }) {
  return (
    <section className="qf-card qf-settings__section" id={id}>
      <div className="qf-card-head">
        <div>
          <h2 className="qf-card-title">{title}</h2>
          {sub && <p className="qf-card-sub">{sub}</p>}
        </div>
      </div>
      <div className="qf-card-body">
        {children}
        {footer && <div className="qf-form-actions">{footer}</div>}
      </div>
    </section>
  )
}

export default function Settings() {
  const { user, initials } = useAuth()
  const { quotes, customers, bookings, dashboard } = useAppData()

  /* The server derives a quote's reference from its row id
     (QF-<1000 + id>), so the only honest thing to show is the range
     already issued — not an invented "next" number. */
  const quoteRange = useMemo(() => {
    const ids = quotes.map((quote) => Number(quote.id)).filter(Number.isInteger)
    if (ids.length === 0) return 'None issued yet'
    return `QF-${1000 + Math.min(...ids)} – QF-${1000 + Math.max(...ids)}`
  }, [quotes])

  return (
    <div className="qf-settings">
      <nav className="qf-card qf-settings__nav" aria-label="Settings sections">
        {SECTIONS.map(({ id, label, Icon }) => (
          <a key={id} href={`#${id}`} className="qf-settings__nav-item">
            <Icon size={16} />
            {label}
          </a>
        ))}
      </nav>

      <div>
        <SectionCard
          id="account"
          title="Account"
          sub="The details on your QuoteFlow account, stored in PostgreSQL."
          footer={
            <span className="qf-save-hint">
              <IconLock size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
              Read-only — the API has no profile-edit endpoint.
            </span>
          }
        >
          <div className="qf-form-grid">
            <Field label="Full Name" htmlFor="qf-set-name">
              <input
                id="qf-set-name"
                className="qf-input"
                value={user?.name ?? ''}
                readOnly
                aria-readonly="true"
              />
            </Field>

            <Field label="Email" htmlFor="qf-set-email" hint="Used to sign in, and never shared with customers.">
              <input
                id="qf-set-email"
                className="qf-input"
                type="email"
                value={user?.email ?? ''}
                readOnly
                aria-readonly="true"
              />
            </Field>

            <Field label="Member since" htmlFor="qf-set-created">
              <input
                id="qf-set-created"
                className="qf-input"
                value={user?.createdAt ? formatDate(user.createdAt) : '—'}
                readOnly
                aria-readonly="true"
              />
            </Field>

            <Field label="Signed in as" htmlFor="qf-set-owner">
              <div className="qf-static" id="qf-set-owner">
                <IconCheckCircle size={15} />
                {user?.email}
              </div>
            </Field>
          </div>

          <div className="qf-person qf-settings__owner" style={{ marginTop: 18 }}>
            <span className="qf-avatar qf-avatar--accent">{initials || '—'}</span>
            <div>
              <p className="qf-person__name">{user?.name}</p>
              <p className="qf-person__meta">{user?.email}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          id="data"
          title="Your data"
          sub="Live counts for the records this account owns. Every row is scoped to you in SQL."
        >
          <div className="qf-form-grid">
            <Field label="Customers" htmlFor="qf-set-customers">
              <div className="qf-static" id="qf-set-customers">
                {customers.length}
              </div>
            </Field>

            <Field label="Quotes" htmlFor="qf-set-quotes">
              <div className="qf-static" id="qf-set-quotes">
                {quotes.length}
              </div>
            </Field>

            <Field label="Bookings" htmlFor="qf-set-bookings">
              <div className="qf-static" id="qf-set-bookings">
                {bookings.length}
              </div>
            </Field>

            <Field label="Quote references issued" htmlFor="qf-set-numbering" hint="Derived from row ids.">
              <div className="qf-static" id="qf-set-numbering">
                {quoteRange}
              </div>
            </Field>
          </div>

          {dashboard?.generatedAt && (
            <p className="qf-person__meta" style={{ marginTop: 16 }}>
              Figures aggregated by the server at {formatDate(dashboard.generatedAt)}.
            </p>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
