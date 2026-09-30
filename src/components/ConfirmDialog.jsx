import { useState } from 'react'
import Modal from './Modal'
import { IconAlert } from './Icons'

/**
 * Destructive-action confirmation. `body` accepts a node so callers
 * can spell out exactly what will be lost.
 *
 * The confirm button manages its own pending state: a delete is a
 * network round trip now, and double-clicking it must not fire two
 * DELETEs at the same row.
 */
export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Delete',
  pendingLabel = 'Deleting…',
  onConfirm,
  onClose,
}) {
  const [busy, setBusy] = useState(false)

  const handleConfirm = async () => {
    if (busy) return
    setBusy(true)
    try {
      // The parent closes the dialog on success and owns any error toast.
      await onConfirm()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button type="button" className="qf-btn qf-btn--secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="qf-btn qf-btn--danger" onClick={handleConfirm} disabled={busy}>
            {busy ? pendingLabel : confirmLabel}
          </button>
        </>
      }
    >
      <div className="qf-confirm">
        <span className="qf-confirm__icon">
          <IconAlert size={18} />
        </span>
        <div className="qf-confirm__body">{body}</div>
      </div>
    </Modal>
  )
}