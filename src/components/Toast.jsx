import { IconAlert, IconCheckCircle } from './Icons'

const TONES = {
  success: { Icon: IconCheckCircle, className: '' },
  error: { Icon: IconAlert, className: 'qf-toast--error' },
}

/**
 * Lightweight feedback for a completed action. Auto-dismisses via the
 * parent timer. `tone` distinguishes a confirmation from a failure so
 * a rejected write never reads as a success.
 */
export default function Toast({ message, tone = 'success' }) {
  if (!message) return null

  const { Icon, className } = TONES[tone] ?? TONES.success

  return (
    <div className={`qf-toast ${className}`} role="status">
      <span className="qf-toast__icon">
        <Icon size={16} />
      </span>
      {message}
    </div>
  )
}