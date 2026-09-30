import { formatTime, isSameDay, relativeDay } from '../utils/format'
import DateChip from './DateChip'
import EmptyState from './EmptyState'
import { IconBookings } from './Icons'
import StatusBadge from './StatusBadge'

/** Compact horizontal booking row used on the dashboard. */
export default function BookingList({ bookings, today, emptyTitle, emptyText, showStatus = true }) {
  if (bookings.length === 0) {
    return (
      <EmptyState
        icon={<IconBookings size={24} />}
        title={emptyTitle}
        text={emptyText}
      />
    )
  }

  return (
    <div className="qf-bookings">
      {bookings.map((booking) => (
        <article key={booking.id} className="qf-booking-row">
          <DateChip value={booking.date} isToday={today && isSameDay(booking.date, today)} />

          <div className="qf-booking-row__body">
            <p className="qf-booking-row__service qf-truncate">{booking.service}</p>
            <p className="qf-booking-row__meta">
              <span className="qf-truncate">{booking.customerName}</span>
              <span className="qf-booking-row__sep">·</span>
              <span className="qf-truncate">{booking.location}</span>
              <span className="qf-booking-row__sep">·</span>
              <span>{booking.duration}</span>
            </p>
          </div>

          <div className="qf-booking-row__right">
            {showStatus && <StatusBadge status={booking.status} />}
            <div style={{ textAlign: 'right' }}>
              <p className="qf-booking-row__time">{formatTime(booking.time)}</p>
              <p className="qf-card-sub">
                {today ? relativeDay(booking.date, today) : booking.date}
              </p>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
