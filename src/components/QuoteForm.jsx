import { useState } from 'react'
import { QUOTE_STATUSES, SERVICE_SUGGESTIONS } from '../data/constants'
import { useAppData } from '../context/AppDataContext'
import { clearFieldError, hasErrors, validateQuote } from '../utils/validation'
import FormField from './FormField'
import { IconAlert } from './Icons'

function blank() {
  return {
    customerId: '',
    service: '',
    description: '',
    amount: '',
    validUntil: '',
    status: 'Draft',
  }
}

/** Maps a stored quote back onto the form's string-based shape. */
function fromQuote(quote) {
  return {
    customerId: quote.customerId,
    service: quote.service,
    description: quote.description,
    amount: String(quote.amount),
    validUntil: quote.validUntil,
    status: quote.status,
  }
}

/**
 * Create and edit share one form. The parent remounts it with a
 * `key` when the target record changes, which resets values and
 * errors without any effect bookkeeping.
 *
 * `onSubmit` is awaited because it now performs a network write. The
 * parent owns `submitting` so the modal's footer button (which sits
 * outside this <form>) can disable in step with the fields.
 */
export default function QuoteForm({ quote, onSubmit, submitting = false, submitError = '' }) {
  const { customers } = useAppData()
  const [values, setValues] = useState(() => (quote ? fromQuote(quote) : blank()))
  const [errors, setErrors] = useState({})
  const isEdit = Boolean(quote)

  const set = (key) => (event) => {
    const { value } = event.target
    setValues((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => clearFieldError(prev, key))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return
    const nextErrors = validateQuote(values)
    setErrors(nextErrors)
    if (hasErrors(nextErrors)) return
    await onSubmit?.(values)
  }

  return (
    <form id="qf-quote-form" onSubmit={handleSubmit} noValidate>
      {submitError && (
        <div className="qf-alert" role="alert" style={{ marginBottom: 14 }}>
          <IconAlert size={16} />
          <span>{submitError}</span>
        </div>
      )}

      <fieldset className="qf-form-fieldset" disabled={submitting}>
      <div className="qf-form-grid">
        <div className="qf-form-grid--full">
          <FormField label="Customer" htmlFor="qf-quote-customer" required error={errors.customerId}>
            <select
              id="qf-quote-customer"aria-describedby={errors.customerId ? 'qf-quote-customer-error' : undefined} 
              className="qf-select"
              value={values.customerId}
              onChange={set('customerId')}
              aria-invalid={Boolean(errors.customerId)}
            >
              <option value="">Select a customer…</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                  {customer.company ? ` — ${customer.company}` : ''}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="qf-form-grid--full">
          <FormField label="Service" htmlFor="qf-quote-service" required error={errors.service}>
            <input
              id="qf-quote-service"aria-describedby={errors.service ? 'qf-quote-service-error' : undefined} 
              className="qf-input"
              list="qf-service-suggestions"
              value={values.service}
              onChange={set('service')}
              placeholder="e.g. Website Redesign"
              aria-invalid={Boolean(errors.service)}
            />
            <datalist id="qf-service-suggestions">
              {SERVICE_SUGGESTIONS.map((service) => (
                <option key={service} value={service} />
              ))}
            </datalist>
          </FormField>
        </div>

        <div className="qf-form-grid--full">
          <FormField
            label="Description"
            htmlFor="qf-quote-description"
            hint="Scope, deliverables and anything the customer should know."
          >
            <textarea
              id="qf-quote-description"
              className="qf-textarea"
              value={values.description}
              onChange={set('description')}
              placeholder="Describe the work included in this quote…"
              rows={4}
            />
          </FormField>
        </div>

        <FormField label="Amount" htmlFor="qf-quote-amount" required error={errors.amount}>
          <input
            id="qf-quote-amount"aria-describedby={errors.amount ? 'qf-quote-amount-error' : undefined} 
            className="qf-input"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={values.amount}
            onChange={set('amount')}
            placeholder="0.00"
            aria-invalid={Boolean(errors.amount)}
          />
        </FormField>

        <FormField label="Valid Until" htmlFor="qf-quote-valid" required error={errors.validUntil}>
          <input
            id="qf-quote-valid"aria-describedby={errors.validUntil ? 'qf-quote-valid-error' : undefined} 
            className="qf-input"
            type="date"
            value={values.validUntil}
            onChange={set('validUntil')}
            aria-invalid={Boolean(errors.validUntil)}
          />
        </FormField>

        <div className="qf-form-grid--full">
          <FormField
            label="Status"
            htmlFor="qf-quote-status"
            error={errors.status}
            hint={
              isEdit
                ? `Editing ${quote.number} · the quote number never changes.`
                : 'Drafts stay private until you send them.'
            }
          >
            <select
              id="qf-quote-status"aria-describedby={errors.status ? 'qf-quote-status-error' : undefined} 
              className="qf-select"
              value={values.status}
              onChange={set('status')}
              aria-invalid={Boolean(errors.status)}
            >
              {QUOTE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </div>
      </fieldset>

      <p className="qf-sr-only" aria-live="polite">
        {hasErrors(errors) ? 'The quote form has errors. Please review the highlighted fields.' : ''}
      </p>
    </form>
  )
}
