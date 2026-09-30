import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import BookingList from '../components/BookingList'
import {
  IconArrowRight,
  IconBookings,
  IconCheckCircle,
  IconClock,
  IconInbox,
  IconWallet,
} from '../components/Icons'
import QuotePipeline from '../components/QuotePipeline'
import QuoteTable from '../components/QuoteTable'
import StatCard from '../components/StatCard'
import PageState from '../components/PageState'
import { useAppData } from '../context/AppDataContext'
import { dashboardStatCards } from '../services/selectors'
import { todayISO } from '../utils/format'
import { useAuth } from '../context/AuthContext'

const STAT_ICONS = {
  inbox: IconInbox,
  clock: IconClock,
  check: IconCheckCircle,
  calendar: IconBookings,
  wallet: IconWallet,
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { firstName } = useAuth()
  const { dashboard, quotes, pipeline, ready, load, refresh } = useAppData()

  /* Headline figures come from the SQL aggregate the API just
     returned; the arrows are derived from the same quote rows. */
  const stats = useMemo(() => dashboardStatCards(dashboard, quotes), [dashboard, quotes])

  /* The pipeline, recent quotes and upcoming bookings are all in the
     dashboard payload, so the lists and the numbers are guaranteed to
     come from the same snapshot. */
  const pipelineQuotes = useMemo(() => pipeline.flatMap((group) => group.quotes), [pipeline])
  const recentQuotes = dashboard?.recentQuotes ?? []
  const upcoming = dashboard?.upcomingBookingsList ?? []

  if (!ready) return <PageState kind="loading" label="Loading your workspace…" />

  if (load.dashboard.error) {
    return (
      <PageState
        kind="error"
        title="We couldn’t load your dashboard"
        message={load.dashboard.error.message}
        onRetry={() => refresh.dashboard()}
      />
    )
  }

  const greeting = firstName ? `Welcome back, ${firstName}.` : 'Welcome back.'

  return (
    <>
      <p className="qf-dash-greeting">{greeting}</p>

      <section className="qf-stats" aria-label="Key metrics">
        {stats.map((stat) => (
          <StatCard key={stat.id} stat={stat} Icon={STAT_ICONS[stat.icon]} />
        ))}
      </section>

      <section className="qf-card" style={{ marginBottom: 18 }}>
        <div className="qf-card-head">
          <div>
            <h2 className="qf-card-title">Quote Pipeline</h2>
            <p className="qf-card-sub">Track every quote from draft to decision.</p>
          </div>
          <button type="button" className="qf-link" onClick={() => navigate('/quotes')}>
            All quotes
            <IconArrowRight size={15} />
          </button>
        </div>
        <QuotePipeline quotes={pipelineQuotes} onViewAll={() => navigate('/quotes')} />
      </section>

      <div className="qf-dash-row qf-dash-row--split">
        <section className="qf-card">
          <div className="qf-card-head">
            <div>
              <h2 className="qf-card-title">Recent Quotes</h2>
              <p className="qf-card-sub">Your most recently created quotes.</p>
            </div>
            <button type="button" className="qf-link" onClick={() => navigate('/quotes')}>
              View all
              <IconArrowRight size={15} />
            </button>
          </div>
          <QuoteTable
            quotes={recentQuotes}
            emptyTitle="No quotes yet"
            emptyText="Create your first quote to see it here."
          />
        </section>

        <section className="qf-card">
          <div className="qf-card-head">
            <div>
              <h2 className="qf-card-title">Upcoming Bookings</h2>
              <p className="qf-card-sub">Your next confirmed appointments.</p>
            </div>
            <button type="button" className="qf-link" onClick={() => navigate('/bookings')}>
              View all
              <IconArrowRight size={15} />
            </button>
          </div>
          <BookingList
            bookings={upcoming}
            today={todayISO()}
            emptyTitle="No upcoming bookings"
            emptyText="Confirmed appointments will appear here."
          />
        </section>
      </div>
    </>
  )
}