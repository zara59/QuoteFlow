import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { IconX } from './Icons'

/**
 * Stage 1 modal: presentational only, no data side effects.
 * Handles Escape, backdrop click, focus-on-open and body scroll lock.
 */
export default function Modal({ open, onClose, title, subtitle, footer, children, wide = false }) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    panelRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="qf-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.()
      }}
    >
      <div
        className={`qf-modal ${wide ? 'qf-modal--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={panelRef}
      >
        <div className="qf-modal__head">
          <div>
            <h2 className="qf-modal__title">{title}</h2>
            {subtitle && <p className="qf-modal__sub">{subtitle}</p>}
          </div>
          <button
            type="button"
            className="qf-icon-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="qf-modal__body">{children}</div>

        {footer && <div className="qf-modal__foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
