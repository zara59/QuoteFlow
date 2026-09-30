import { formatCurrency, formatDate } from '../utils/format'
import { PersonCell, RowActions } from './Cells'
import EmptyState from './EmptyState'
import { IconCustomers, IconMail } from './Icons'

export default function CustomerTable({ customers, onAdd, emptyText, onEdit, onDelete }) {
  if (customers.length === 0) {
    return (
      <EmptyState
        icon={<IconCustomers size={24} />}
        title="No customers found"
        text={emptyText}
        action={
          onAdd && (
            <button type="button" className="qf-btn qf-btn--primary" onClick={onAdd}>
              Add your first customer
            </button>
          )
        }
      />
    )
  }

  return (
    <div className="qf-table-wrap">
      <table className="qf-table" style={{ minWidth: 880 }}>
        <thead>
          <tr>
            <th scope="col">Customer</th>
            <th scope="col">Email</th>
            <th scope="col">Phone</th>
            <th scope="col" className="qf-table__num">Total Quotes</th>
            <th scope="col" className="qf-table__num">Bookings</th>
            <th scope="col">Last Activity</th>
            <th scope="col" className="qf-table__num">Lifetime Value</th>
            <th scope="col" className="qf-table__actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id}>
              <td>
                <PersonCell
                  id={customer.id}
                  name={customer.name}
                  meta={customer.company || customer.location}
                  size="sm"
                />
              </td>
              <td>
                <span className="qf-truncate" style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: 220 }}>
                  <IconMail size={14} style={{ flex: 'none', color: 'var(--qf-ink-4)' }} />
                  {customer.email}
                </span>
              </td>
              <td className="qf-num">{customer.phone}</td>
              <td className="qf-table__num">{customer.totalQuotes}</td>
              <td className="qf-table__num">
                {customer.totalBookings}
                {customer.upcomingBookings > 0 && (
                  <span className="qf-person__meta"> ({customer.upcomingBookings} upcoming)</span>
                )}
              </td>
              <td className="qf-num">{formatDate(customer.lastActivity, 'short')}</td>
              <td className="qf-table__num">{formatCurrency(customer.lifetimeValue)}</td>
              <td className="qf-table__actions">
                <RowActions
                  label={customer.name}
                  onEdit={onEdit ? () => onEdit(customer) : undefined}
                  onDelete={onDelete ? () => onDelete(customer) : undefined}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
