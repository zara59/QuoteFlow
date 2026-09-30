import { useMemo, useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'
import CustomerForm from '../components/CustomerForm'
import CustomerTable from '../components/CustomerTable'
import Modal from '../components/Modal'
import SearchField from '../components/SearchField'
import Toast from '../components/Toast'
import { IconAlert, IconPlus } from '../components/Icons'
import { useSearchParams } from 'react-router-dom'
import PageState from '../components/PageState'
import { useAppData } from '../context/AppDataContext'
import useToast from '../hooks/useToast'
import { filterCustomers } from '../services/filters'
import { formatCurrency } from '../utils/format'

/** One line per linked record type, e.g. "3 quotes and 1 booking". */
function describeUsage({ quotes, bookings }) {
  const parts = []
  if (quotes) parts.push(`${quotes} quote${quotes === 1 ? '' : 's'}`)
  if (bookings) parts.push(`${bookings} booking${bookings === 1 ? '' : 's'}`)
  return parts.join(' and ')
}

export default function Customers() {
  const { customers, actions, ready, load, refresh } = useAppData()
  const { addCustomer, editCustomer, removeCustomer } = actions

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
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [blocked, setBlocked] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [notice, setNotice] = useToast()

  const visible = useMemo(() => filterCustomers(customers, { search }), [customers, search])
  const totalValue = visible.reduce((sum, customer) => sum + customer.lifetimeValue, 0)
  const isFiltered = search.trim() !== ''

  const openCreate = () => {
    setSubmitError('')
    setEditing({ mode: 'create' })
  }
  const openEdit = (customer) => {
    setSubmitError('')
    setEditing({ mode: 'edit', customer })
  }
  const closeForm = () => {
    setEditing(null)
    setSubmitError('')
  }

  /* Both writes go through the API. The modal stays open on failure so
     the user can correct the problem without losing what they typed. */
  const handleSubmit = async (values) => {
    setSubmitting(true)
    setSubmitError('')
    try {
      if (editing?.mode === 'edit') {
        await editCustomer(editing.customer.id, values)
        setNotice(`${editing.customer.name} updated.`)
      } else {
        await addCustomer(values)
        setNotice(`${values.name} added to your customers.`)
      }
      closeForm()
    } catch (error) {
      setSubmitError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  /** A customer with linked work cannot be deleted; explain why instead. */
  const handleDelete = async () => {
    const target = deleting
    setSubmitting(true)
    try {
      await removeCustomer(target.id)
      setNotice(`${target.name} deleted.`)
      setDeleting(null)
    } catch (error) {
      // 409 carries the linked-record counts in `fields.usage`.
      const usage = error.fields?.usage
      if (error.status === 409 && usage) {
        setBlocked({ customer: target, usage })
        setDeleting(null)
      } else {
        setNotice(error.message, 'error')
        setDeleting(null)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!ready) return <PageState kind="loading" label="Loading customers…" />

  if (load.customers.error) {
    return (
      <PageState
        kind="error"
        title="We couldn’t load your customers"
        message={load.customers.error.message}
        onRetry={() => refresh.customers()}
      />
    )
  }

  return (
    <>
      <div className="qf-page-head">
        <p className="qf-muted">
          <b style={{ color: 'var(--qf-ink)' }}>{visible.length}</b> of {customers.length} customers ·{' '}
          {formatCurrency(totalValue)} lifetime value
        </p>
        <div className="qf-page-head__actions">
          <button type="button" className="qf-btn qf-btn--primary" onClick={openCreate}>
            <IconPlus size={17} />
            Add Customer
          </button>
        </div>
      </div>

      <section className="qf-card">
        <div className="qf-toolbar">
          <div className="qf-toolbar__search">
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Search by name, email, company, phone or location…"
              label="Search customers"
            />
          </div>
          <span className="qf-toolbar__count">
            {visible.length} customer{visible.length === 1 ? '' : 's'}
          </span>
        </div>

        <CustomerTable
          customers={visible}
          onAdd={openCreate}
          onEdit={openEdit}
          onDelete={setDeleting}
          emptyText="No customers match that search. Try a different name, email or phone number."
        />
      </section>

      <Modal
        open={Boolean(editing)}
        onClose={closeForm}
        title={editing?.mode === 'edit' ? `Edit ${editing.customer.name}` : 'Add Customer'}
        subtitle={
          editing?.mode === 'edit'
            ? 'Update the contact details you send quotes and bookings to.'
            : 'Store the contact details you send quotes and bookings to.'
        }
        footer={
          <>
            <button type="button" className="qf-btn qf-btn--secondary" onClick={closeForm}>
              Cancel
            </button>
            <button type="submit" form="qf-customer-form" className="qf-btn qf-btn--primary" disabled={submitting}>
              {submitting ? 'Saving…' : editing?.mode === 'edit' ? 'Save Changes' : 'Add Customer'}
            </button>
          </>
        }
      >
        <CustomerForm
          key={editing?.mode === 'edit' ? editing.customer.id : 'create'}
          customer={editing?.mode === 'edit' ? editing.customer : null}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitError={submitError}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this customer?"
        confirmLabel="Delete Customer"
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        body={
          <>
            <p>
              <b>{deleting?.name}</b>
              {deleting?.company ? ` — ${deleting.company}` : ''} will be removed from your customer list.
            </p>
            {isFiltered && (
              <p>Only customers matching “{search.trim()}” are shown, but the delete applies by record.</p>
            )}
          </>
        }
      />

      <Modal
        open={Boolean(blocked)}
        onClose={() => setBlocked(null)}
        title="This customer can't be deleted"
        footer={
          <>
            <button type="button" className="qf-btn qf-btn--secondary" onClick={() => setBlocked(null)}>
              Close
            </button>
            <button type="button" className="qf-btn qf-btn--primary" onClick={() => setBlocked(null)}>
              Got it
            </button>
          </>
        }
      >
        <div className="qf-confirm">
          <span className="qf-confirm__icon">
            <IconAlert size={18} />
          </span>
          <div className="qf-confirm__body">
            <p>
              <b>{blocked?.customer.name}</b> still has {describeUsage(blocked?.usage ?? {})} linked to their record.
            </p>
            <p>
              Deleting them would leave those records pointing at a customer that no longer exists. Cancel or complete
              the {blocked?.usage?.quotes ? 'quotes' : ''}
              {blocked?.usage?.quotes && blocked?.usage?.bookings ? ' and ' : ''}
              {blocked?.usage?.bookings ? 'bookings' : ''} first, then delete the customer.
            </p>
          </div>
        </div>
      </Modal>

      <Toast message={notice?.message} tone={notice?.tone} />
    </>
  )
}
