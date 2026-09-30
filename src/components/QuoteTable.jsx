import { formatCurrency, formatDate } from '../utils/format'
import { PersonCell, RowActions } from './Cells'
import EmptyState from './EmptyState'
import { IconQuotes } from './Icons'
import StatusBadge from './StatusBadge'
import StatusSelect from './StatusSelect'

/**
 * Shared quote table — used by the dashboard "Recent Quotes" card
 * and the dedicated Quotes page. Wraps in a horizontal scroll
 * container so narrow screens never break the layout.
 *
 * The dashboard passes no handlers, which keeps that card
 * read-only; the Quotes page passes them to make the row live.
 */
export default function QuoteTable({
  quotes,
  emptyTitle,
  emptyText,
  emptyAction,
  onEdit,
  onDelete,
  onStatusChange,
  statuses,
}) {
  if (quotes.length === 0) {
    return <EmptyState icon={<IconQuotes size={24} />} title={emptyTitle} text={emptyText} action={emptyAction} />
  }

  const readOnly = !onEdit && !onDelete

  return (
    <div className="qf-table-wrap">
      <table className="qf-table">
        <thead>
          <tr>
            <th scope="col">Customer</th>
            <th scope="col">Service</th>
            <th scope="col" className="qf-table__num">Amount</th>
            <th scope="col">Date</th>
            <th scope="col">Status</th>
            {!readOnly && (
              <th scope="col" className="qf-table__actions">Action</th>
            )}
          </tr>
        </thead>
        <tbody>
          {quotes.map((quote) => (
            <tr key={quote.id}>
              <td>
                <PersonCell
                  id={quote.customerId}
                  name={quote.customerName}
                  meta={quote.customer?.company || quote.customer?.email}
                  size="sm"
                />
              </td>
              <td>
                <span className="qf-truncate" style={{ display: 'block', maxWidth: 220 }}>
                  {quote.service}
                </span>
                <span className="qf-person__meta">{quote.number}</span>
              </td>
              <td className="qf-table__num">{formatCurrency(quote.amount)}</td>
              <td className="qf-num">{formatDate(quote.createdAt, 'short')}</td>
              <td>
                {onStatusChange && statuses ? (
                  <StatusSelect
                    value={quote.status}
                    options={statuses}
                    label={`Change status for quote ${quote.number}`}
                    onChange={(next) => onStatusChange(quote.id, next)}
                  />
                ) : (
                  <StatusBadge status={quote.status} />
                )}
              </td>
              {!readOnly && (
                <td className="qf-table__actions">
                  <RowActions
                    label={`quote ${quote.number}`}
                    onEdit={onEdit ? () => onEdit(quote) : undefined}
                    onDelete={onDelete ? () => onDelete(quote) : undefined}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
