import { useEffect, useMemo, useRef, useState } from 'react'
import { buildShareUrl } from '../lib/share.js'
import DayCard from './DayCard.jsx'
import { IconPlus, IconShare, IconUndo } from './Icons.jsx'

export default function Itinerary({
  trip,
  warnings,
  meta,
  canUndo,
  lastChange,
  online,
  actions,
  onUndo,
  onNewTrip,
  onRemoveStop,
  onRefineDay,
  onToast,
  focusOnMount,
}) {
  const headingRef = useRef(null)
  const [shareUrl, setShareUrl] = useState(null)

  useEffect(() => {
    if (focusOnMount) headingRef.current?.focus()
  }, [focusOnMount])

  // any edit makes an old share link out of date
  useEffect(() => setShareUrl(null), [trip])

  // depends on the count only, so editing one day doesn't hand every DayCard a new array
  const dayCount = trip.days.length
  const dayLabels = useMemo(() => Array.from({ length: dayCount }, (_, i) => `Day ${i + 1}`), [dayCount])
  const stopCount = trip.days.reduce((n, d) => n + d.stops.length, 0)

  async function share() {
    try {
      const url = await buildShareUrl(trip)
      if (url.length > 16000) onToast({ message: 'Heads up: this link is very long and may not open everywhere.' })
      // navigator.share on phones, clipboard on desktop, and if both are
      // blocked just show the link so it can be copied by hand
      if (navigator.share && matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: trip.title, url }).catch(() => {})
        return
      }
      await navigator.clipboard.writeText(url)
      onToast({ message: 'Link copied - anyone with it sees this exact plan.' })
    } catch {
      setShareUrl(await buildShareUrl(trip).catch(() => null))
    }
  }

  return (
    <section className="itinerary" aria-labelledby="trip-title">
      <header className="trip-header">
        <div>
          <h2 id="trip-title" ref={headingRef} tabIndex={-1}>
            {trip.title}
          </h2>
          <p className="muted">
            {trip.days.length} {trip.days.length === 1 ? 'day' : 'days'} · {stopCount} {stopCount === 1 ? 'stop' : 'stops'}
            {meta?.demo && ' · sample data'}
            {meta?.repaired && ' · fixed a broken AI reply automatically'}
          </p>
        </div>
        <div className="trip-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
            <IconUndo size={16} /> Undo
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={share}>
            <IconShare size={16} /> Share
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onNewTrip}>
            <IconPlus size={16} /> New trip
          </button>
        </div>
      </header>

      {shareUrl && (
        <div className="share-fallback card">
          <label htmlFor="share-url">Copy this link:</label>
          <input id="share-url" readOnly value={shareUrl} onFocus={(e) => e.target.select()} autoFocus />
        </div>
      )}

      {warnings?.length > 0 && (
        <details className="warnings">
          <summary>
            We tidied up {warnings.length} small {warnings.length === 1 ? 'issue' : 'issues'} in the AI's reply
          </summary>
          <ul>
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="days">
        {trip.days.map((day, i) => (
          <DayCard
            key={day.id}
            day={day}
            index={i}
            dayLabels={dayLabels}
            destination={trip.destination}
            lastChange={lastChange && day.stops.some((s) => s.id === lastChange.stopId) ? lastChange : null}
            online={online}
            actions={actions}
            onRemoveStop={onRemoveStop}
            onRefine={onRefineDay}
          />
        ))}
      </div>

      {trip.tips.length > 0 && (
        <aside className="card tips" aria-label="Tips">
          <h3>Good to know</h3>
          <ul>
            {trip.tips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </aside>
      )}
    </section>
  )
}
