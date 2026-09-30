import { initials } from '../utils/format'
import { IconEdit, IconTrash } from './Icons'

const AVATAR_TONES = ['qf-avatar--accent', '', 'qf-avatar--navy', '']

function toneFor(id = '') {
  let sum = 0
  for (let i = 0; i < id.length; i += 1) sum += id.charCodeAt(i)
  return AVATAR_TONES[sum % AVATAR_TONES.length]
}

export function PersonCell({ name, meta, id, size = 'md' }) {
  const sizeClass = size === 'sm' ? 'qf-avatar--sm' : size === 'lg' ? 'qf-avatar--lg' : ''

  return (
    <div className="qf-person">
      <span className={`qf-avatar ${sizeClass} ${toneFor(id)}`}>{initials(name)}</span>
      <span style={{ minWidth: 0 }}>
        <span className="qf-person__name qf-truncate" style={{ display: 'block' }}>
          {name}
        </span>
        {meta && (
          <span className="qf-person__meta qf-truncate" style={{ display: 'block' }}>
            {meta}
          </span>
        )}
      </span>
    </div>
  )
}

/**
 * View / Edit / Delete row actions. Without handlers it degrades to a
 * decorative row so the dashboard's read-only table stays non-interactive.
 */
export function RowActions({ label = 'row', onEdit, onDelete }) {
  if (!onEdit && !onDelete) return null

  return (
    <div style={{ display: 'inline-flex', gap: 2 }}>
      {onEdit && (
        <button
          type="button"
          className="qf-icon-btn qf-icon-btn--sm"
          aria-label={`Edit ${label}`}
          title={`Edit ${label}`}
          onClick={onEdit}
        >
          <IconEdit size={16} />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          className="qf-icon-btn qf-icon-btn--sm"
          aria-label={`Delete ${label}`}
          title={`Delete ${label}`}
          onClick={onDelete}
          style={{ color: 'var(--qf-danger)' }}
        >
          <IconTrash size={16} />
        </button>
      )}
    </div>
  )
}
