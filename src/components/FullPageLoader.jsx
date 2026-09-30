/* ============================================================
   QuoteFlow — FullPageLoader
   Branded splash shown while the session is checked and while the
   first batch of records loads, so nothing flashes empty.
   ============================================================ */

import { IconSparkle } from './Icons'

export default function FullPageLoader({ message = 'Loading…' }) {
  return (
    <div className="qf-boot" role="status" aria-live="polite">
      <span className="qf-brand__mark qf-brand__mark--lg">
        <IconSparkle />
      </span>
      <span className="qf-boot__spinner" aria-hidden="true" />
      <p className="qf-boot__text">{message}</p>
    </div>
  )
}