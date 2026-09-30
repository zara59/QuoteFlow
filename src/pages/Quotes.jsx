import { useMemo, useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'
import Modal from '../components/Modal'
import QuoteForm from '../components/QuoteForm'
import QuoteTable from '../components/QuoteTable'
import Toast from '../components/Toast'
import Toolbar from '../components/Toolbar'
import { IconPlus } from '../components/Icons'
import { QUOTE_DATE_FILTERS, QUOTE_STATUSES, QUOTE_STATUS_FILTERS } from '../data/constants'
import { useSearchParams } from 'react-router-dom'
import PageState from '../components/PageState'
import { useAppData } from '../context/AppDataContext'
import useToast from '../hooks/useToast'
import { filterQuotes } from '../services/filters'
import { formatCurrency } from '../utils/format'

export default function Quotes() {
  const { quotes, actions, ready, load, refresh } = useAppData()
  const { addQuote, editQuote, removeQuote, changeQuoteStatus } = actions

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
    () => filterQuotes(quotes, { search, status, date: dateRange }),
    [quotes, search, status, dateRange],
  )

  const approvedValue = visible
    .filter((quote) => quote.status === 'Approved')
    .reduce((sum, quote) => sum + Number(quote.amount || 0), 0)

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
  const openEdit = (quote) => {
    setSubmitError('')
    setEditing({ mode: 'edit', quote })
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
        await editQuote(editing.quote.id, values)
        setNotice(`${editing.quote.number} updated.`)
      } else {
        await addQuote(values)
        setNotice('Quote created and added to your pipeline.')
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
      await removeQuote(target.id)
      setNotice(`Quote ${target.number} deleted.`)
      setDeleting(null)
    } catch (error) {
      setNotice(error.message, 'error')
      setDeleting(null)
    } finally {
      setSubmitting(false)
    }
  }

  /* Fired straight from the table's status <select>. Wrapped so a
     rejected PATCH surfaces as a toast instead of an unhandled
     rejection, leaving the row showing what the server actually stored. */
  const handleStatusChange = async (id, next) => {
    try {
      await changeQuoteStatus(id, next)
      setNotice(`Quote moved to ${next}.`)
    } catch (error) {
      setNotice(error.message, 'error')
    }
  }

  if (!ready) return <PageState kind="loading" label="Loading quotes…" />

  if (load.quotes.error) {
    return (
      <PageState
        kind="error"
        title="We couldn’t load your quotes"
        message={load.quotes.error.message}
        onRetry={() => refresh.quotes()}
      />
    )
  }

  return (
    <>
      <div className="qf-page-head">
        <p className="qf-muted">
          <b style={{ color: 'var(--qf-ink)' }}>{visible.length}</b> of {quotes.length} quotes ·{' '}
          {formatCurrency(approvedValue)} approved
        </p>
        <div className="qf-page-head__actions">
          <button type="button" className="qf-btn qf-btn--primary" onClick={openCreate}>
            <IconPlus size={17} />
            New Quote
          </button>
        </div>
      </div>

      <section className="qf-card">
        <Toolbar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search by customer, service, description or number…"
          searchLabel="Search quotes"
          count={`${visible.length} result${visible.length === 1 ? '' : 's'}`}
          filters={[
            { label: 'Filter by status', value: status, onChange: setStatus, options: QUOTE_STATUS_FILTERS },
            { label: 'Filter by date', value: dateRange, onChange: setDateRange, options: QUOTE_DATE_FILTERS },
          ]}
        />

        <QuoteTable
          quotes={visible}
          onEdit={openEdit}
          onDelete={setDeleting}
          onStatusChange={handleStatusChange}
          statuses={QUOTE_STATUSES}
          emptyTitle={isFiltered ? 'No quotes match your filters' : 'No quotes yet'}
          emptyText={
            isFiltered
              ? 'Try a different search term, status or date range.'
              : 'Create your first quote and it will show up in your pipeline.'
          }
          emptyAction={
            isFiltered ? (
              <button type="button" className="qf-btn qf-btn--secondary" onClick={clearFilters}>
                Clear filters
              </button>
            ) : (
              <button type="button" className="qf-btn qf-btn--primary" onClick={openCreate}>
                <IconPlus size={16} />
                New Quote
              </button>
            )
          }
        />
      </section>

      <Modal
        open={Boolean(editing)}
        onClose={closeForm}
        title={editing?.mode === 'edit' ? `Edit ${editing.quote.number}` : 'New Quote'}
        subtitle={
          editing?.mode === 'edit'
            ? 'Update the details — the quote keeps its number and creation date.'
            : 'Draft the details, then send it to your customer.'
        }
        footer={
          <>
            <button type="button" className="qf-btn qf-btn--secondary" onClick={closeForm}>
              Cancel
            </button>
            <button type="submit" form="qf-quote-form" className="qf-btn qf-btn--primary" disabled={submitting}>
              {submitting ? 'Saving…' : editing?.mode === 'edit' ? 'Save Changes' : 'Create Quote'}
            </button>
          </>
        }
      >
        {/* Remounting on the target id resets values and clears stale errors. */}
        <QuoteForm
          key={editing?.mode === 'edit' ? editing.quote.id : 'create'}
          quote={editing?.mode === 'edit' ? editing.quote : null}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitError={submitError}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this quote?"
        confirmLabel="Delete Quote"
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        body={
          <>
            <p>
              <b>{deleting?.number}</b> for {deleting?.customerName} — {formatCurrency(deleting?.amount, { precise: true })}.
            </p>
            <p>This removes it from your pipeline and cannot be undone.</p>
          </>
        }
      />

      <Toast message={notice?.message} tone={notice?.tone} />
    </>
  )
}
