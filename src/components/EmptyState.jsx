export default function EmptyState({ icon, title, text, action }) {
  return (
    <div className="qf-empty">
      {icon && <span className="qf-empty__icon">{icon}</span>}
      <p className="qf-empty__title">{title}</p>
      {text && <p className="qf-empty__text">{text}</p>}
      {action && <div className="qf-empty__actions">{action}</div>}
    </div>
  )
}
