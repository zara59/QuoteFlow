import { useMemo, useState } from 'react'
import BookingCalendar from '../components/BookingCalendar'
import BookingCard from '../components/BookingCard'
import BookingForm from '../components/BookingForm'
import BookingTable from '../components/BookingTable'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import Toolbar from '../components/Toolbar'
import { IconCalendar, IconGrid, IconList, IconPlus } from '../components/Icons'
import { BOOKING_DATE_FILTERS, BOOKING_STATUSES, BOOKING_STATUS_FILTERS } from '../data/constants'
import { useSearchParams } from 'react-router-dom'
import PageState from '../components/PageState'
import { useAppData } from '../context/AppDataContext'
import useToast from '../hooks/useToast'
import { filterBookings } from '../services/filters'
import { formatDate, formatTime, todayISO } from '../utils/format'

const VIEWS = [
  { id: 'list', label: 'List', Icon: IconList },
  { id: 'cards', label: 'Cards', Icon: IconGrid },
  { id: 'calendar', label: 'Calendar', Icon: IconCalendar },
]

export default function Bookings() {
  const { bookings, actions, ready, load, refresh } = useAppData()
  const { addBooking, editBooking, removeBooking, changeBookingStatus } = actions

  const [view, setView] = useState('list')
  /* The browser's own date, so relative labels stay correct over time
     instead of freezing on the date the project was first built. */
  const today = todayISO()
  // Search lives in the URL so the header's global search, the page filter
  // and a shared link are all the same single source of truth.
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('q') ?? ''

  const setSearch = (value) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set('q', value)
    else next.delete('q')
    setSearchParams(next, { replace: true })
  }
  const [status, setStatus] = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [notice, setNotice] = useToast()

  const visible = useMemo(
    () => filterBookings(bookings, { search, status, date: dateRange }),
    [bookings, search, status, dateRange],
  )

  const isFiltered = search.trim() !== '' || status !== 'all' || dateRange !== 'all'

  const clearFilters = () => {
    setSearch('')
    setStatus('all')
    setDateRange('all')
  }

  const openCreate = () => {
    setSubmitError('')
    setEditing({ mode: 'create' })
  }
  const openEdit = (booking) => {
    setSubmitError('')
    setEditing({ mode: 'edit', booking })
  }
  const closeForm = () => {
    setEditing(null)
    setSubmitError('')
  }

  const handleSubmit = async (values) => {
    setSubmitting(true)
    setSubmitError('')
    try {
      if (editing?.mode === 'edit') {
        await editBooking(editing.booking.id, values)
        setNotice(`Booking for ${editing.booking.customerName} updated.`)
      } else {
        await addBooking(values)
        setNotice('Booking created and added to your schedule.')
      }
      closeForm()
    } catch (error) {
      setSubmitError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    const target = deleting
    setSubmitting(true)
    try {
      await removeBooking(target.id)
      setNotice(`Booking for ${target.customerName} on ${formatDate(target.date)} deleted.`)
      setDeleting(null)
    } catch (error) {
      setNotice(error.message, 'error')
      setDeleting(null)
    } finally {
      setSubmitting(false)
    }
  }

  /* Fired straight from the table and card status controls. */
  const handleStatusChange = async (id, next) => {
    try {
      await changeBookingStatus(id, next)
      setNotice(`Booking marked ${next.toLowerCase()}.`)
    } catch (error) {
      setNotice(error.message, 'error')
    }
  }

  const emptyProps = {
    emptyTitle: isFiltered ? 'No bookings match your filters' : 'No bookings yet',
    emptyText: isFiltered
      ? 'Try another search term, status or date range.'
      : 'Confirmed appointments will appear here automatically.',
    emptyAction: isFiltered ? (
      <button type="button" className="qf-btn qf-btn--secondary" onClick={clearFilters}>
        Clear filters
      </button>
    ) : (
      <button type="button" className="qf-btn qf-btn--primary" onClick={openCreate}>
        <IconPlus size={16} />
        New Booking
      </button>
    ),
  }

  const rowProps = {
    onEdit: openEdit,
    onDelete: setDeleting,
    onStatusChange: handleStatusChange,
    statuses: BOOKING_STATUSES,
  }

  if (!ready) return <PageState kind="loading" label="Loading bookings…" />

  if (load.bookings.error) {
    return (
      <PageState
        kind="error"
        title="We couldn’t load your bookings"
        message={load.bookings.error.message}
        onRetry={() => refresh.bookings()}
      />
    )
  }

  return (
    <>
      <div className="qf-page-head">
        <p className="qf-muted">
          <b style={{ color: 'var(--qf-ink)' }}>{visible.length}</b> of {bookings.length} bookings ·
          next up {formatDate(today, 'long')}
        </p>
        <div className="qf-page-head__actions">
          <div className="qf-segment" role="tablist" aria-label="Booking view">
            {VIEWS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={view === id}
                className={`qf-segment__item ${view === id ? 'qf-segment__item--active' : ''}`}
                onClick={() => setView(id)}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
          <button type="button" className="qf-btn qf-btn--primary" onClick={openCreate}>
            <IconPlus size={17} />
            New Booking
          </button>
        </div>
      </div>

      <section className="qf-card">
        <Toolbar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search by customer, service, location or notes…"
          searchLabel="Search bookings"
          count={`${visible.length} booking${visible.length === 1 ? '' : 's'}`}
          filters={[
            { label: 'Filter by status', value: status, onChange: setStatus, options: BOOKING_STATUS_FILTERS },
            { label: 'Filter by date', value: dateRange, onChange: setDateRange, options: BOOKING_DATE_FILTERS },
          ]}
        />

        {view === 'list' && <BookingTable bookings={visible} {...emptyProps} {...rowProps} />}

        {view === 'cards' &&
          (visible.length === 0 ? (
            <EmptyState
              icon={<IconCalendar size={24} />}
              title={emptyProps.emptyTitle}
              text={emptyProps.emptyText}
              action={emptyProps.emptyAction}
            />
          ) : (
            <div className="qf-booking-grid">
              {visible.map((booking) => (
                <BookingCard key={booking.id} booking={booking} today={today} {...rowProps} />
              ))}
            </div>
          ))}

        {view === 'calendar' && <BookingCalendar bookings={visible} today={today} />}
      </section>

      <Modal
        open={Boolean(editing)}
        onClose={closeForm}
        title={editing?.mode === 'edit' ? 'Edit Booking' : 'New Booking'}
        subtitle={
          editing?.mode === 'edit'
            ? 'Update the appointment details for this customer.'
            : 'Schedule an appointment against an existing customer.'
        }
        footer={
          <>
            <button type="button" className="qf-btn qf-btn--secondary" onClick={closeForm}>
              Cancel
            </button>
            <button type="submit" form="qf-booking-form" className="qf-btn qf-btn--primary" disabled={submitting}>
              {submitting ? 'Saving…' : editing?.mode === 'edit' ? 'Save Changes' : 'Create Booking'}
            </button>
          </>
        }
      >
        <BookingForm
          key={editing?.mode === 'edit' ? editing.booking.id : 'create'}
          booking={editing?.mode === 'edit' ? editing.booking : null}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitError={submitError}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this booking?"
        confirmLabel="Delete Booking"
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        body={
          <>
            <p>
              <b>{deleting?.service}</b> for {deleting?.customerName} on {formatDate(deleting?.date, 'long')} at{' '}
              {formatTime(deleting?.time)}.
            </p>
            <p>The appointment will be removed from your schedule and cannot be undone.</p>
          </>
        }
      />

      <Toast message={notice?.message} tone={notice?.tone} />
    </>
  )
}
