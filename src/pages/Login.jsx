/* ============================================================
   QuoteFlow — Sign in
   ============================================================ */

import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import PasswordInput from '../components/PasswordInput'
import { IconAlert, IconArrowRight, IconMail } from '../components/Icons'
import { useAuth } from '../context/AuthContext'
import { clearFieldError, hasErrors, validateCredentials } from '../utils/validation'

const EMPTY = { email: '', password: '' }

/* The two seeded demo accounts, so a reviewer can get in without
   signing up. Development convenience only — the API decides what is
   actually valid, these are just clickable prefills. */
const DEMO_ACCOUNTS = [
  { label: 'User A', email: 'usera@example.com', hint: '6 customers · 16 quotes · 8 bookings' },
  { label: 'User B', email: 'userb@example.com', hint: '5 customers · 8 quotes · 4 bookings' },
]
const DEMO_PASSWORD = 'Password123!'

export default function Login() {
  const { signIn, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Return the user to whatever protected page sent them here.
  const from = location.state?.from || '/dashboard'

  if (isLoading) return null
  if (isAuthenticated) return <Navigate to={from} replace />

  const update = (key) => (event) => {
    setValues((prev) => ({ ...prev, [key]: event.target.value }))
    setErrors((prev) => clearFieldError(prev, key))
    setFormError('')
  }

  const prefill = (email) => {
    setValues({ email, password: DEMO_PASSWORD })
    setErrors({})
    setFormError('')
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return

    const found = validateCredentials(values)
    if (hasErrors(found)) {
      setErrors(found)
      return
    }

    setSubmitting(true)
    setFormError('')
    try {
      await signIn({ email: values.email.trim(), password: values.password })
      navigate(from, { replace: true })
    } catch (error) {
      // The API returns one generic message for a wrong email *or* a
      // wrong password, so nothing here reveals which one failed.
      setFormError(error.message)
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      footer={
        <>
          Don’t have an account? <Link to="/register">Create one</Link>
        </>
      }
    >
      <div className="qf-card-head qf-auth__head">
        <h1 className="qf-card-title qf-auth__title">Welcome back</h1>
        <p className="qf-card-sub">Sign in to pick up where you left off.</p>
      </div>

      <form className="qf-auth__form" onSubmit={onSubmit} noValidate>
        {formError && (
          <div className="qf-alert" role="alert">
            <IconAlert size={16} />
            <span>{formError}</span>
          </div>
        )}

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
              autoFocus
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
          autoComplete="current-password"
          disabled={submitting}
        />

        <button type="submit" className="qf-btn qf-btn--primary qf-btn--lg qf-btn--block" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
          {!submitting && <IconArrowRight size={16} />}
        </button>

        <div className="qf-auth__demo">
          <p className="qf-auth__demo-label">Demo accounts</p>
          <div className="qf-auth__demo-list">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                className="qf-auth__demo-item"
                onClick={() => prefill(account.email)}
                disabled={submitting}
              >
                <b>{account.label}</b>
                <span>{account.hint}</span>
              </button>
            ))}
          </div>
          <p className="qf-auth__demo-note">Both use the password {DEMO_PASSWORD}.</p>
        </div>
      </form>
    </AuthShell>
  )
}