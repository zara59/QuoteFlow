import { formatDate, formatTime, isSameDay, relativeDay } from '../utils/format'
import { IconClock, IconMapPin } from './Icons'
import { RowActions } from './Cells'
import StatusBadge from './StatusBadge'
import StatusSelect from './StatusSelect'

/** Card variant used in the bookings "cards" view. */
export default function BookingCard({ booking, today, onEdit, onDelete, onStatusChange, statuses }) {
  return (
    <article className="qf-bcard">
      <div className="qf-bcard__top">
        <div style={{ minWidth: 0 }}>
          <p className="qf-bcard__service">{booking.service}</p>
          <p className="qf-card-sub qf-truncate" style={{ marginTop: 2 }}>
            {booking.customerName}
          </p>
        </div>
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
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        <span className="qf-bcard__when">
          <IconClock size={15} />
          {formatTime(booking.time)} · {booking.duration}
        </span>
        <span className="qf-card-sub qf-truncate" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconMapPin size={15} style={{ flex: 'none' }} />
          {booking.location}
        </span>
      </div>

      <div className="qf-bcard__foot">
        <span className="qf-person__meta">
          {today
            ? relativeDay(booking.date, today)
            : formatDate(booking.date, 'medium')}
          {today && isSameDay(booking.date, today) && ' · Today'}
        </span>
        <RowActions
          label={`booking for ${booking.customerName} on ${formatDate(booking.date)}`}
          onEdit={onEdit ? () => onEdit(booking) : undefined}
          onDelete={onDelete ? () => onDelete(booking) : undefined}
        />
      </div>
    </article>
  )
}
