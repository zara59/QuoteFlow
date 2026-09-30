import { useState } from 'react'
import { BOOKING_STATUSES, SERVICE_SUGGESTIONS } from '../data/constants'
import { useAppData } from '../context/AppDataContext'
import { clearFieldError, hasErrors, validateBooking } from '../utils/validation'
import FormField from './FormField'
import { IconAlert } from './Icons'

function blank() {
  return {
    customerId: '',
    service: '',
    date: '',
    time: '',
    duration: '',
    status: 'Upcoming',
    location: '',
    notes: '',
  }
}

function fromBooking(booking) {
  return {
    customerId: booking.customerId,
    service: booking.service,
    date: booking.date,
    time: booking.time,
    duration: booking.duration ?? '',
    status: booking.status,
    location: booking.location ?? '',
    notes: booking.notes ?? '',
  }
}

/**
 * Create and edit share one form; the parent remounts via `key`.
 *
 * `onSubmit` is awaited because it now performs a network write. The
 * parent owns `submitting` so the modal's footer button (which sits
 * outside this <form>) can disable in step with the fields.
 */
export default function BookingForm({ booking, onSubmit, submitting = false, submitError = '' }) {
  const { customers } = useAppData()
  const [values, setValues] = useState(() => (booking ? fromBooking(booking) : blank()))
  const [errors, setErrors] = useState({})
  const isEdit = Boolean(booking)

  const set = (key) => (event) => {
    const { value } = event.target
    setValues((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => clearFieldError(prev, key))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return
    const nextErrors = validateBooking(values)
    setErrors(nextErrors)
    if (hasErrors(nextErrors)) return
    await onSubmit?.(values)
  }

  return (
    <form id="qf-booking-form" onSubmit={handleSubmit} noValidate>
      {submitError && (
        <div className="qf-alert" role="alert" style={{ marginBottom: 14 }}>
          <IconAlert size={16} />
          <span>{submitError}</span>
        </div>
      )}

      <fieldset className="qf-form-fieldset" disabled={submitting}>
      <div className="qf-form-grid">
        <div className="qf-form-grid--full">
          <FormField label="Customer" htmlFor="qf-booking-customer" required error={errors.customerId}>
            <select
              id="qf-booking-customer"aria-describedby={errors.customerId ? 'qf-booking-customer-error' : undefined} 
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
          <FormField label="Service" htmlFor="qf-booking-service" required error={errors.service}>
            <input
              id="qf-booking-service"aria-describedby={errors.service ? 'qf-booking-service-error' : undefined} 
              className="qf-input"
              list="qf-service-suggestions"
              value={values.service}
              onChange={set('service')}
              placeholder="e.g. Photography Session"
              aria-invalid={Boolean(errors.service)}
            />
            <datalist id="qf-service-suggestions">
              {SERVICE_SUGGESTIONS.map((service) => (
                <option key={service} value={service} />
              ))}
            </datalist>
          </FormField>
        </div>

        <FormField label="Date" htmlFor="qf-booking-date" required error={errors.date}>
          <input
            id="qf-booking-date"aria-describedby={errors.date ? 'qf-booking-date-error' : undefined} 
            className="qf-input"
            type="date"
            value={values.date}
            onChange={set('date')}
            aria-invalid={Boolean(errors.date)}
          />
        </FormField>

        <FormField label="Time" htmlFor="qf-booking-time" required error={errors.time}>
          <input
            id="qf-booking-time"aria-describedby={errors.time ? 'qf-booking-time-error' : undefined} 
            className="qf-input"
            type="time"
            value={values.time}
            onChange={set('time')}
            aria-invalid={Boolean(errors.time)}
          />
        </FormField>

        <FormField label="Duration" htmlFor="qf-booking-duration" error={errors.duration} hint="Defaults to 1 hr.">
          <input
            id="qf-booking-duration"aria-describedby={errors.duration ? 'qf-booking-duration-error' : undefined} 
            className="qf-input"
            value={values.duration}
            onChange={set('duration')}
            placeholder="e.g. 90 min"
            aria-invalid={Boolean(errors.duration)}
          />
        </FormField>

        <FormField label="Location" htmlFor="qf-booking-location" error={errors.location} hint="Address, room or “Video call”.">
          <input
            id="qf-booking-location"aria-describedby={errors.location ? 'qf-booking-location-error' : undefined} 
            className="qf-input"
            value={values.location}
            onChange={set('location')}
            placeholder="e.g. Oakland, CA"
            aria-invalid={Boolean(errors.location)}
          />
        </FormField>

        <div className="qf-form-grid--full">
          <FormField
            label="Status"
            htmlFor="qf-booking-status"
            error={errors.status}
            hint={isEdit ? 'Mark it completed once the appointment has happened.' : 'New bookings start as upcoming.'}
          >
            <select
              id="qf-booking-status"aria-describedby={errors.status ? 'qf-booking-status-error' : undefined} 
              className="qf-select"
              value={values.status}
              onChange={set('status')}
              aria-invalid={Boolean(errors.status)}
            >
              {BOOKING_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="qf-form-grid--full">
          <FormField label="Notes" htmlFor="qf-booking-notes" hint="Anything you need on the day.">
            <textarea
              id="qf-booking-notes"
              className="qf-textarea"
              value={values.notes}
              onChange={set('notes')}
              placeholder="Add preparation notes, access details, links…"
              rows={3}
            />
          </FormField>
        </div>
      </div>
      </fieldset>

      <p className="qf-sr-only" aria-live="polite">
        {hasErrors(errors) ? 'The booking form has errors. Please review the highlighted fields.' : ''}
      </p>
    </form>
  )
}
