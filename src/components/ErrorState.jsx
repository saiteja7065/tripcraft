import { useEffect, useRef, useState } from 'react'
import { describeError } from '../lib/errors.js'
import { IconAlert, IconRefresh, IconWifiOff } from './Icons.jsx'

export default function ErrorState({ error, onRetry, onBack, onEdit, online = true }) {
  const info = describeError(error)
  const headingRef = useRef(null)
  const [wait, setWait] = useState(0)

  // Move focus to the error so keyboard and screen reader users notice it.
  useEffect(() => {
    headingRef.current?.focus()
    setWait(error?.code === 'RATE_LIMITED' ? (error.retryAfter ?? 0) : 0)
  }, [error])

  // When rate limited, disable Retry until the server's Retry-After has passed.
  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  const offline = !online || error?.code === 'OFFLINE'
  const retryDisabled = wait > 0 || !online

  return (
    <section className="card error-state" role="alert">
      <div className="error-icon" aria-hidden="true">
        {offline ? <IconWifiOff size={22} /> : <IconAlert size={22} />}
      </div>
      <h2 ref={headingRef} tabIndex={-1}>
        {info.title}
      </h2>
      <p className="muted">{info.hint}</p>

      <div className="error-actions">
        {info.retry && (
          <button type="button" className="btn btn-primary" onClick={onRetry} disabled={retryDisabled}>
            <IconRefresh size={16} />
            {wait > 0 ? `Try again in ${wait}s` : !online ? 'Waiting for connection' : 'Try again'}
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={onEdit}>
          Edit request
        </button>
        {onBack && (
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            Back to my trip
          </button>
        )}
      </div>

      {(error?.details?.length > 0 || info.code) && (
        <details className="tech-details">
          <summary>Technical details</summary>
          <p>
            <code>{info.code}</code> {error?.message}
          </p>
          {error?.details?.length > 0 && (
            <ul>
              {error.details.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          )}
        </details>
      )}
    </section>
  )
}
