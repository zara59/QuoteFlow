const TONE_VARS = {
  accent: {
    '--qf-stat-accent': 'var(--qf-accent-600)',
    '--qf-stat-tint': 'var(--qf-accent-tint)',
    '--qf-stat-border': 'var(--qf-accent-border)',
  },
  info: {
    '--qf-stat-accent': 'var(--qf-info)',
    '--qf-stat-tint': 'var(--qf-info-tint)',
    '--qf-stat-border': 'var(--qf-info-border)',
  },
  success: {
    '--qf-stat-accent': 'var(--qf-success)',
    '--qf-stat-tint': 'var(--qf-success-tint)',
    '--qf-stat-border': 'var(--qf-success-border)',
  },
  warning: {
    '--qf-stat-accent': 'var(--qf-warning)',
    '--qf-stat-tint': 'var(--qf-warning-tint)',
    '--qf-stat-border': 'var(--qf-warning-border)',
  },
  danger: {
    '--qf-stat-accent': 'var(--qf-danger)',
    '--qf-stat-tint': 'var(--qf-danger-tint)',
    '--qf-stat-border': 'var(--qf-danger-border)',
  },
  navy: {
    '--qf-stat-accent': 'var(--qf-ink)',
    '--qf-stat-tint': 'var(--qf-bg-soft)',
    '--qf-stat-border': 'var(--qf-border-strong)',
  },
}

const SIZES = { md: 18, sm: 16, lg: 20 }

export default function StatCard({ stat, Icon }) {
  const tone = TONE_VARS[stat.tone] ?? TONE_VARS.navy
  const direction = stat.delta > 0 ? 'up' : stat.delta < 0 ? 'down' : 'flat'

  return (
    <article className="qf-stat" style={tone}>
      <div className="qf-stat__top">
        <p className="qf-stat__label">{stat.label}</p>
        {Icon && (
          <span className="qf-stat__icon">
            <Icon size={SIZES[stat.iconSize] ?? 17} />
          </span>
        )}
      </div>

      <p className="qf-stat__value">
        {stat.isCurrency ? `$${stat.value.toLocaleString('en-US')}` : stat.value}
      </p>

      <div className="qf-stat__foot">
        {stat.delta !== undefined && (
          <span className={`qf-delta qf-delta--${direction}`}>
            {direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'} {Math.abs(stat.delta)}%
          </span>
        )}
        <span>{stat.deltaLabel}</span>
      </div>
    </article>
  )
}
