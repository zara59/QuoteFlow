import { PIPELINE_COLUMNS } from '../data/constants'
import { formatCurrency, formatDate, initials } from '../utils/format'
import StatusBadge from './StatusBadge'

const DOT_COLORS = {
  neutral: 'var(--qf-ink-4)',
  info: 'var(--qf-info)',
  success: 'var(--qf-success)',
  danger: 'var(--qf-danger)',
  accent: 'var(--qf-accent)',
  warning: 'var(--qf-warning)',
}

function QuoteCard({ quote }) {
  return (
    <button type="button" className="qf-qcard">
      <span className="qf-qcard__top">
        <span className="qf-qcard__service qf-truncate">{quote.service}</span>
        <span className="qf-qcard__amount">{formatCurrency(quote.amount)}</span>
      </span>

      <span className="qf-qcard__customer qf-truncate">
        <span className="qf-avatar qf-avatar--sm" style={{ width: 20, height: 20, fontSize: '0.5625rem' }}>
          {initials(quote.customerName)}
        </span>
        {quote.customerName}
      </span>

      <span className="qf-qcard__foot">
        <StatusBadge status={quote.status} />
        <span className="qf-qcard__date">{formatDate(quote.createdAt, 'short')}</span>
      </span>
    </button>
  )
}

/** Kanban-style quote pipeline. Shows a capped preview per column. */
export default function QuotePipeline({ quotes, perColumn = 3, onViewAll }) {
  return (
    <div className="qf-pipeline">
      {PIPELINE_COLUMNS.map(({ key, tone }) => {
        const columnQuotes = quotes.filter((quote) => quote.status === key)
        const visible = columnQuotes.slice(0, perColumn)
        const total = columnQuotes.reduce((sum, quote) => sum + quote.amount, 0)

        return (
          <section key={key} className="qf-pipeline__col" aria-label={`${key} quotes`}>
            <header className="qf-pipeline__head">
              <span className="qf-pipeline__dot" style={{ background: DOT_COLORS[tone] }} />
              <h3 className="qf-pipeline__name">{key}</h3>
              <span className="qf-pipeline__count">{columnQuotes.length}</span>
            </header>

            <div className="qf-pipeline__total">
              <span>Value</span>
              <b>{formatCurrency(total)}</b>
            </div>

            {visible.map((quote) => (
              <QuoteCard key={quote.id} quote={quote} />
            ))}

            {columnQuotes.length === 0 && (
              <p
                className="qf-muted"
                style={{
                  fontSize: '0.75rem',
                  textAlign: 'center',
                  padding: '18px 8px',
                  border: '1px dashed var(--qf-border)',
                  borderRadius: 'var(--qf-r-md)',
                }}
              >
                Nothing here yet
              </p>
            )}

            {columnQuotes.length > perColumn && (
              <button type="button" className="qf-pipeline__more" onClick={onViewAll}>
                +{columnQuotes.length - perColumn} more
              </button>
            )}
          </section>
        )
      })}
    </div>
  )
}
