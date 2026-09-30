/* ============================================================
   QuoteFlow — Create account
   A successful sign-up returns a session, so this signs the new user
   straight into the dashboard.
   ============================================================ */

import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import PasswordInput from '../components/PasswordInput'
import { IconAlert, IconArrowRight, IconMail, IconUser } from '../components/Icons'
import { useAuth } from '../context/AuthContext'
import { clearFieldError, hasErrors, validateRegistration } from '../utils/validation'

const EMPTY = { name: '', email: '', password: '', confirmPassword: '' }

export default function Register() {
  const { signUp, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (isLoading) return null
  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  const update = (key) => (event) => {
    setValues((prev) => ({ ...prev, [key]: event.target.value }))
    setErrors((prev) => clearFieldError(prev, key))
    setFormError('')
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return

    const found = validateRegistration(values)
    if (hasErrors(found)) {
      setErrors(found)
      return
    }

    setSubmitting(true)
    setFormError('')
    try {
      // confirmPassword is client-only and never sent to the API.
      await signUp({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      })
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setFormError(error.message)
      // Surface per-field messages the validator returned, so the
      // problem lands on the input that caused it rather than only
      // in the banner at the top.
      if (error.fields) setErrors((prev) => ({ ...prev, ...error.fields }))
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      footer={
        <>
          Already have an account? <Link to="/login">Sign in</Link>
        </>
      }
    >
      <div className="qf-card-head qf-auth__head">
        <h1 className="qf-card-title qf-auth__title">Create your account</h1>
        <p className="qf-card-sub">A few details and your workspace is ready.</p>
      </div>

      <form className="qf-auth__form" onSubmit={onSubmit} noValidate>
        {formError && (
          <div className="qf-alert" role="alert">
            <IconAlert size={16} />
            <span>{formError}</span>
          </div>
        )}

        <div className="qf-field">
          <label className="qf-label" htmlFor="name">
            Full name<span className="qf-label__req">*</span>
          </label>
          <div className="qf-input-wrap">
            <IconUser size={16} />
            <input
              id="name"
              name="name"
              className={`qf-input ${errors.name ? 'qf-input--invalid' : ''}`}
              type="text"
              value={values.name}
              onChange={update('name')}
              placeholder="Alex Morgan"
              autoComplete="name"
              autoFocus
              required
              disabled={submitting}
              aria-invalid={errors.name ? 'true' : undefined}
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
          </div>
          {errors.name && (
            <p className="qf-error" id="name-error" role="alert">
              {errors.name}
            </p>
          )}
        </div>

        <div className="qf-field">
          <label className="qf-label" htmlFor="email">
            Email<span className="qf-label__req">*</span>
          </label>
          <div className="qf-input-wrap">
            <IconMail size={16} />
            <input
              id="email"
              name="email"
              className={`qf-input ${errors.email ? 'qf-input--invalid' : ''}`}
              type="email"
              value={values.email}
              onChange={update('email')}
              placeholder="you@company.com"
              autoComplete="email"
              required
              disabled={submitting}
              aria-invalid={errors.email ? 'true' : undefined}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
          </div>
          {errors.email && (
            <p className="qf-error" id="email-error" role="alert">
              {errors.email}
            </p>
          )}
        </div>

        <PasswordInput
          id="password"
          label="Password"
          value={values.password}
          onChange={update('password')}
          error={errors.password}
          autoComplete="new-password"
          hint="At least 8 characters."
          disabled={submitting}
        />

        <PasswordInput
          id="confirmPassword"
          label="Confirm password"
          value={values.confirmPassword}
          onChange={update('confirmPassword')}
          error={errors.confirmPassword}
          autoComplete="new-password"
          disabled={submitting}
        />

        <button type="submit" className="qf-btn qf-btn--primary qf-btn--lg qf-btn--block" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
          {!submitting && <IconArrowRight size={16} />}
        </button>

        <p className="qf-auth__terms">
          Your account is private by default — no record you create is visible to another user.
        </p>
      </form>
    </AuthShell>
  )
}