import { useNavigate } from 'react-router-dom'
import { IconArrowRight } from '../components/Icons'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="qf-card" style={{ maxWidth: 560, margin: '40px auto', textAlign: 'center' }}>
      <div className="qf-card-body" style={{ padding: '48px 32px' }}>
        <p className="qf-stat__value" style={{ fontSize: '2.5rem', color: 'var(--qf-accent)' }}>
          404
        </p>
        <h2 style={{ marginTop: 6 }}>This page has floated away</h2>
        <p className="qf-muted" style={{ marginTop: 8 }}>
          The screen you were looking for is not part of QuoteFlow yet.
        </p>
        <button
          type="button"
          className="qf-btn qf-btn--primary"
          style={{ marginTop: 20 }}
          onClick={() => navigate('/dashboard')}
        >
          Back to dashboard
          <IconArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}
