import { toneForStatus } from '../utils/status'

export default function StatusBadge({ status, size = 'md', dot = true, className = '' }) {
  if (!status) return null
  const tone = toneForStatus(status)

  return (
    <span
      className={`qf-badge qf-badge--${tone} ${size === 'lg' ? 'qf-badge--lg' : ''} ${className}`}
    >
      {dot && <span className="qf-badge__dot" />}
      {status}
    </span>
  )
}
