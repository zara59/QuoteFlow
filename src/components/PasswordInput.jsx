import { useState } from 'react'

/**
 * Password input with a show/hide toggle.
 * `autoComplete` is forwarded so browsers can offer saved credentials
 * and password managers behave correctly on both auth screens.
 */
export default function PasswordInput({
  id,
  value,
  onChange,
  error,
  autoComplete = 'current-password',
  placeholder = '••••••••',
  label,
  hint,
  required = true,
  disabled = false,
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="qf-field">
      {label && (
        <label className="qf-label" htmlFor={id}>
          {label}
          {required && <span className="qf-label__req">*</span>}
        </label>
      )}

      <div className="qf-input-wrap qf-input-wrap--action">
        <input
          id={id}
          name={id}
          className={`qf-input ${error ? 'qf-input--invalid' : ''}`}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <button
          type="button"
          className="qf-input-wrap__clear"
          onClick={() => setVisible((prev) => !prev)}
          /* Keeps the caret in the password box for keyboard users. */
          onMouseDown={(event) => event.preventDefault()}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          disabled={disabled}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>

      {error && (
        <p className="qf-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}

      {hint && !error && <p className="qf-field-hint">{hint}</p>}
    </div>
  )
}