import { useEffect, useState } from 'react'
import RouteArt from './RouteArt.jsx'

// The message changes with elapsed time, so a slow response can be told apart
// from a stuck one.

function message(stage, seconds) {
  if (stage === 'repairing') return ["The AI's reply came back broken", 'Asking it to fix its answer...']
  if (stage === 'retrying') return ['Connection dropped', 'Trying once more...']
  if (seconds < 8) return ['Planning your trip', 'Picking places, timing your days...']
  if (seconds < 20) return ['Still working', 'This one is taking a bit longer than usual.']
  return ['This is slow', 'The server may be waking up, or the network is slow. Keep waiting or cancel.']
}

export default function LoadingState({ stage, startedAt, onCancel }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const seconds = Math.max(0, Math.floor((now - (startedAt ?? now)) / 1000))
  const [title, sub] = message(stage, seconds)
  const slow = seconds >= 20 || stage === 'repairing' || stage === 'retrying'

  return (
    <section className="loading" aria-label="Loading your trip">
      <div className={`loading-card ${slow ? 'is-slow' : ''}`}>
        <RouteArt className="route-small" />
        <div role="status" aria-live="polite" className="loading-text">
          <p className="loading-title">{title}</p>
          <p className="muted">{sub}</p>
        </div>
        <div className="loading-foot">
          <span className="elapsed" aria-hidden="true">
            {seconds}s
          </span>
          {seconds >= 5 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Skeleton matching the final layout to avoid a layout shift. */}
      <div className="skeleton" aria-hidden="true">
        <div className="sk sk-pass" />
        <div className="sk-tabs">
          <div className="sk sk-tab" />
          <div className="sk sk-tab" />
          <div className="sk sk-tab" />
        </div>
        {[0, 1, 2].map((s) => (
          <div className="sk-stop" key={s}>
            <div className="sk sk-time" />
            <div className="sk sk-dot" />
            <div className="sk sk-line" />
          </div>
        ))}
      </div>
    </section>
  )
}
