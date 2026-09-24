import { useEffect, useState } from 'react'

// Being honest about slowness is better than a spinner that looks the same at
// 2s and at 40s. The text changes as time passes so the user knows whether
// to wait or cancel.

function message(stage, seconds) {
  if (stage === 'repairing') return "The AI's reply came back broken, asking it to fix it..."
  if (stage === 'retrying') return 'Connection dropped, trying once more...'
  if (seconds < 8) return 'Planning your trip...'
  if (seconds < 20) return 'Still working, this one is taking a bit longer.'
  return 'This is slow. The server may be waking up or your network is slow. You can keep waiting or cancel.'
}

export default function LoadingState({ stage, startedAt, onCancel }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const seconds = Math.max(0, Math.floor((now - (startedAt ?? now)) / 1000))
  const slow = seconds >= 20

  return (
    <section className="loading" aria-label="Loading your trip">
      <div className={`loading-status card ${slow ? 'is-slow' : ''}`} role="status" aria-live="polite">
        <div className="progress" aria-hidden="true">
          <span />
        </div>
        <div className="loading-row">
          <p>{message(stage, seconds)}</p>
          <span className="elapsed" aria-hidden="true">
            {seconds}s
          </span>
        </div>
        {seconds >= 8 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>

      {/* rough shape of what's coming, so the layout doesn't jump when it lands */}
      <div className="skeleton-list" aria-hidden="true">
        {[0, 1].map((d) => (
          <div className="card skeleton-day" key={d}>
            <div className="sk sk-title" />
            {[0, 1, 2].map((s) => (
              <div className="sk-stop" key={s}>
                <div className="sk sk-time" />
                <div className="sk sk-line" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
