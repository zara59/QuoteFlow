import { IconAlert } from './Icons'

/** Labelled form control with inline error / hint slot. */
export default function FormField({ label, htmlFor, required, error, hint, children }) {
  return (
    <div className="qf-field">
      <label className="qf-label" htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="qf-label__req">
            <span aria-hidden="true">*</span>
            <span className="qf-sr-only"> (required)</span>
          </span>
        )}
      </label>
      {children}
      {error ? (
        <span className="qf-error" id={htmlFor ? `${htmlFor}-error` : undefined}>
          <IconAlert size={13} />
          {error}
        </span>
      ) : (
        hint && <span className="qf-person__meta">{hint}</span>
      )}
    </div>
  )
}
