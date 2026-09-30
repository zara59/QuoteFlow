import { useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import { clearFieldError, hasErrors, validateCustomer } from '../utils/validation'
import FormField from './FormField'
import { IconAlert } from './Icons'

function blank() {
  return { name: '', email: '', phone: '', company: '', location: '' }
}

function fromCustomer(customer) {
  return {
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    company: customer.company ?? '',
    location: customer.location && customer.location !== '—' ? customer.location : '',
  }
}

/**
 * Create and edit share one form; the parent remounts via `key`.
 *
 * `onSubmit` is awaited because it now performs a network write. The
 * parent owns `submitting` so the modal's footer button (which sits
 * outside this <form>) can disable in step with the fields.
 */
export default function CustomerForm({ customer, onSubmit, submitting = false, submitError = '' }) {
  const { customers } = useAppData()
  const [values, setValues] = useState(() => (customer ? fromCustomer(customer) : blank()))
  const [errors, setErrors] = useState({})
  const isEdit = Boolean(customer)

  const set = (key) => (event) => {
    const { value } = event.target
    setValues((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => clearFieldError(prev, key))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return
    const nextErrors = validateCustomer(values)
    setErrors(nextErrors)
    if (hasErrors(nextErrors)) return
    await onSubmit?.(values)
  }

  const others = customers.filter((row) => row.id !== customer?.id).length

  return (
    <form id="qf-customer-form" onSubmit={handleSubmit} noValidate>
      {submitError && (
        <div className="qf-alert qf-form-grid--full" role="alert" style={{ marginBottom: 14 }}>
          <IconAlert size={16} />
          <span>{submitError}</span>
        </div>
      )}

      <fieldset className="qf-form-fieldset" disabled={submitting}>
      <div className="qf-form-grid">
        <div className="qf-form-grid--full">
          <FormField
            label="Full Name"
            htmlFor="qf-cust-name"
            required
            error={errors.name}
            hint={isEdit ? 'Renaming updates this customer on every quote and booking.' : undefined}
          >
            <input
              id="qf-cust-name"aria-describedby={errors.name ? 'qf-cust-name-error' : undefined} 
              className="qf-input"
              value={values.name}
              onChange={set('name')}
              placeholder="e.g. Jordan Ellis"
              aria-invalid={Boolean(errors.name)}
            />
          </FormField>
        </div>

        <FormField label="Email" htmlFor="qf-cust-email" required error={errors.email}>
          <input
            id="qf-cust-email"aria-describedby={errors.email ? 'qf-cust-email-error' : undefined} 
            className="qf-input"
            type="email"
            value={values.email}
            onChange={set('email')}
            placeholder="name@company.com"
            aria-invalid={Boolean(errors.email)}
          />
        </FormField>

        <FormField label="Phone" htmlFor="qf-cust-phone" required error={errors.phone}>
          <input
            id="qf-cust-phone"aria-describedby={errors.phone ? 'qf-cust-phone-error' : undefined} 
            className="qf-input"
            type="tel"
            value={values.phone}
            onChange={set('phone')}
            placeholder="+1 (555) 000-0000"
            aria-invalid={Boolean(errors.phone)}
          />
        </FormField>

        <div className="qf-form-grid--full">
          <FormField label="Company" htmlFor="qf-cust-company" error={errors.company} hint="Optional — leave blank for individuals.">
            <input
              id="qf-cust-company"aria-describedby={errors.company ? 'qf-cust-company-error' : undefined} 
              className="qf-input"
              value={values.company}
              onChange={set('company')}
              placeholder="e.g. Bright Studio LLC"
              aria-invalid={Boolean(errors.company)}
            />
          </FormField>
        </div>

        <div className="qf-form-grid--full">
          <FormField label="Location" htmlFor="qf-cust-location" hint="Optional — city and state.">
            <input
              id="qf-cust-location"
              className="qf-input"
              value={values.location}
              onChange={set('location')}
              placeholder="e.g. Oakland, CA"
            />
          </FormField>
        </div>

        <p className="qf-person__meta qf-form-grid--full" style={{ marginTop: 2 }}>
          {isEdit
            ? `Linked quotes and bookings keep this customer's name in sync automatically.`
            : `You currently have ${others} customer${others === 1 ? '' : 's'} on file.`}
        </p>
      </div>
      </fieldset>

      <p className="qf-sr-only" aria-live="polite">
        {hasErrors(errors) ? 'The customer form has errors. Please review the highlighted fields.' : ''}
      </p>
    </form>
  )
}
