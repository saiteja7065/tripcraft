import { useEffect } from 'react'
import { IconX } from './Icons.jsx'

// Single toast slot: a new toast replaces the current one and restarts the timer.
export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, toast.action ? 6000 : 3500)
    return () => clearTimeout(t)
  }, [toast, onClose])

  return (
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      {toast && (
        <div className="toast" role="status">
          <span>{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                toast.action.run()
                onClose()
              }}
            >
              {toast.action.label}
            </button>
          )}
          <button type="button" className="icon-btn toast-close" onClick={onClose} aria-label="Dismiss">
            <IconX size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
