import { toneForStatus } from '../utils/status'

/**
 * Inline status editor. Renders in the exact badge colours so the
 * Stage 1 table look is preserved, but the status becomes a real
 * dropdown the user can change without opening the edit dialog.
 */
export default function StatusSelect({ value, options, onChange, label }) {
  if (!value || options.length === 0) return null

  return (
    <span className={`qf-badge qf-badge--${toneForStatus(value)} qf-status-select-wrap`}>
      <span className="qf-badge__dot" />
      <select
        className="qf-status-select"
        value={value}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </span>
  )
}
