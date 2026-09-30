/* ============================================================
   QuoteFlow — PageState
   One component for the three states every data-backed screen can be
   in: first load, failed load, and nothing to show yet. Using it
   consistently means a network failure looks the same everywhere
   instead of showing an empty table that reads like "no records".
   ============================================================ */

import { IconAlert, IconCheckCircle, IconInbox } from './Icons'
import FullPageLoader from './FullPageLoader'

export default function PageState({ kind = 'empty', title, message, action, onRetry, inline = false }) {
  if (kind === 'loading') {
    // Inline keeps the page chrome (header, nav) visible while the
    // body fills in; full-screen is for route transitions.
    return inline ? <InlineSkeleton label={title} /> : <FullPageLoader message={title ?? 'Loading…'} />
  }

  if (kind === 'success') {
    return (
      <div className="qf-state qf-state--success" role="status">
        <span className="qf-state__icon">
          <IconCheckCircle size={20} />
        </span>
        <p className="qf-state__title">{title}</p>
        {message && <p className="qf-state__text">{message}</p>}
        {action && <div className="qf-state__actions">{action}</div>}
      </div>
    )
  }

  if (kind === 'error') {
    return (
      <div className="qf-state" role="alert">
        <span className="qf-state__icon qf-state__icon--danger">
          <IconAlert size={20} />
        </span>
        <p className="qf-state__title">{title ?? 'Something went wrong'}</p>
        {message && <p className="qf-state__text">{message}</p>}
        {onRetry && (
          <div className="qf-state__actions">
            <button type="button" className="qf-btn qf-btn--secondary" onClick={onRetry}>
              Try again
            </button>
          </div>
        )}
        {action && <div className="qf-state__actions">{action}</div>}
      </div>
    )
  }

  return (
    <div className="qf-state">
      <span className="qf-state__icon">
        <IconInbox size={20} />
      </span>
      <p className="qf-state__title">{title ?? 'Nothing here yet'}</p>
      {message && <p className="qf-state__text">{message}</p>}
      {action && <div className="qf-state__actions">{action}</div>}
    </div>
  )
}

function InlineSkeleton({ label }) {
  return (
    <div className="qf-state qf-state--loading" role="status" aria-live="polite">
      <span className="qf-boot__spinner" aria-hidden="true" />
      <p className="qf-state__text">{label ?? 'Loading…'}</p>
    </div>
  )
}