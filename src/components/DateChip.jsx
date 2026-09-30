import { toDate } from '../utils/format'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Compact date block: month strip on top, day number below. */
export default function DateChip({ value, isToday = false }) {
  const date = toDate(value)

  return (
    <div className={`qf-datechip ${isToday ? 'qf-datechip--today' : ''}`}>
      <span className="qf-datechip__month">{MONTHS[date.getMonth()]}</span>
      <span className="qf-datechip__day">{date.getDate()}</span>
    </div>
  )
}
