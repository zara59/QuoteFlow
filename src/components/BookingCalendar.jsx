import { useMemo, useState } from 'react'
import { formatMonthYear, formatTime, toDate } from '../utils/format'
import { IconChevronLeft, IconChevronRight } from './Icons'
import StatusBadge from './StatusBadge'

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const EVENT_TONE = {
  Upcoming: '',
  Completed: 'qf-cal__event--success',
  Cancelled: 'qf-cal__event--danger',
}

function buildGrid(anchor) {
  const year = anchor.getFullYear()
  const month = anchor.getMonth()
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev = new Date(year, month, 0).getDate()

  // Monday-first offset
  const offset = (first.getDay() + 6) % 7
  const cells = []

  for (let i = offset - 1; i >= 0; i -= 1) {
    const day = daysInPrev - i
    cells.push({ date: new Date(year, month - 1, day), outside: true })
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: new Date(year, month, day), outside: false })
  }
  let next = 1
  while (cells.length < 42) {
    cells.push({ date: new Date(year, month + 1, next), outside: true })
    next += 1
  }

  return cells
}

/**
 * Visual month calendar. Purely presentational for Stage 1 —
 * no booking CRUD, no real calendar integration.
 */
export default function BookingCalendar({ bookings, today }) {
  const [anchor, setAnchor] = useState(() => toDate(today))
  const cells = useMemo(() => buildGrid(anchor), [anchor])

  const byDay = useMemo(() => {
    const map = new Map()
    bookings.forEach((booking) => {
      const key = booking.date
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(booking)
    })
    return map
  }, [bookings])

  const shift = (delta) => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1))

  return (
    <div className="qf-cal">
      <div className="qf-cal__head">
        <p className="qf-cal__month">{formatMonthYear(anchor)}</p>
        <div className="qf-cal__nav">
          <button
            type="button"
            className="qf-btn qf-btn--secondary qf-btn--sm"
            onClick={() => shift(-1)}
            aria-label="Previous month"
          >
            <IconChevronLeft size={15} />
            Prev
          </button>
          <button
            type="button"
            className="qf-btn qf-btn--secondary qf-btn--sm"
            onClick={() => setAnchor(toDate(today))}
          >
            Today
          </button>
          <button
            type="button"
            className="qf-btn qf-btn--secondary qf-btn--sm"
            onClick={() => shift(1)}
            aria-label="Next month"
          >
            Next
            <IconChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="qf-cal__grid" role="grid" aria-label="Bookings calendar">
        {DOW.map((day) => (
          <div key={day} className="qf-cal__dow">
            {day}
          </div>
        ))}

        {cells.map(({ date, outside }) => {
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
            date.getDate(),
          ).padStart(2, '0')}`
          const dayBookings = byDay.get(key) ?? []
          const isToday = today && toDate(today).getDate() === date.getDate() &&
            toDate(today).getMonth() === date.getMonth() &&
            toDate(today).getFullYear() === date.getFullYear()
          const shown = dayBookings.slice(0, 2)

          return (
            <div
              key={key}
              className={`qf-cal__day ${outside ? 'qf-cal__day--out' : ''} ${
                isToday ? 'qf-cal__day--today' : ''
              }`}
            >
              <span className="qf-cal__num">{date.getDate()}</span>

              <div className="qf-cal__events">
                {shown.map((booking) => (
                  <span
                    key={booking.id}
                    className={`qf-cal__event ${EVENT_TONE[booking.status] ?? ''}`}
                    title={`${formatTime(booking.time)} — ${booking.service} · ${booking.customerName}`}
                  >
                    {formatTime(booking.time).replace(':00', '')} {booking.customerName.split(' ')[0]}
                  </span>
                ))}
                {dayBookings.length > 2 && (
                  <span className="qf-cal__more">+{dayBookings.length - 2} more</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 14,
          flexWrap: 'wrap',
          marginTop: 16,
          paddingTop: 14,
          borderTop: '1px solid var(--qf-border-subtle)',
        }}
      >
        {['Upcoming', 'Completed', 'Cancelled'].map((status) => (
          <StatusBadge key={status} status={status} />
        ))}
      </div>
    </div>
  )
}
