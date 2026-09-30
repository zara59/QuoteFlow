import { formatDate, formatTime } from '../utils/format'
import { PersonCell, RowActions } from './Cells'
import EmptyState from './EmptyState'
import { IconBookings } from './Icons'
import StatusBadge from './StatusBadge'
import StatusSelect from './StatusSelect'

/** Full booking table used by the Bookings page "List" view. */
export default function BookingTable({
  bookings,
  emptyTitle,
  emptyText,
  emptyAction,
  onEdit,
  onDelete,
  onStatusChange,
  statuses,
}) {
  if (bookings.length === 0) {
    return (
      <EmptyState icon={<IconBookings size={24} />} title={emptyTitle} text={emptyText} action={emptyAction} />
    )
  }

  return (
    <div className="qf-table-wrap">
      <table className="qf-table" style={{ minWidth: 760 }}>
        <thead>
          <tr>
            <th scope="col">Customer</th>
            <th scope="col">Service</th>
            <th scope="col">Date</th>
            <th scope="col">Time</th>
            <th scope="col">Status</th>
            <th scope="col" className="qf-table__actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id}>
              <td>
                <PersonCell
                  id={booking.customerId}
                  name={booking.customerName}
                  meta={booking.location}
                  size="sm"
                />
              </td>
              <td>
                <span className="qf-truncate" style={{ display: 'block', maxWidth: 220 }}>
                  {booking.service}
                </span>
                <span className="qf-person__meta">{booking.duration}</span>
              </td>
              <td className="qf-num">{formatDate(booking.date, 'short')}</td>
              <td className="qf-num">{formatTime(booking.time)}</td>
              <td>
                {onStatusChange && statuses ? (
                  <StatusSelect
                    value={booking.status}
                    options={statuses}
                    label={`Change status for ${booking.service} on ${formatDate(booking.date)}`}
                    onChange={(next) => onStatusChange(booking.id, next)}
                  />
                ) : (
                  <StatusBadge status={booking.status} />
                )}
              </td>
              <td className="qf-table__actions">
                <RowActions
                  label={`booking for ${booking.customerName} on ${formatDate(booking.date)}`}
                  onEdit={onEdit ? () => onEdit(booking) : undefined}
                  onDelete={onDelete ? () => onDelete(booking) : undefined}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
