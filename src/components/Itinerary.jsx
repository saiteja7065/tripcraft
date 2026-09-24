import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildShareUrl } from '../lib/share.js'
import DayTabs from './DayTabs.jsx'
import DayView from './DayView.jsx'
import { IconPlus, IconShare, IconUndo } from './Icons.jsx'
import TripHero from './TripHero.jsx'

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
  const [active, setActive] = useState(0)
  const [shareUrl, setShareUrl] = useState(null)

  useEffect(() => {
    if (focusOnMount) headingRef.current?.focus()
  }, [focusOnMount])

  // any edit makes an old share link out of date
  useEffect(() => setShareUrl(null), [trip])

  // undo can bring back fewer days than the tab we're on
  const day = Math.min(active, trip.days.length - 1)

  // depends on the count only, so an edit doesn't hand every stop a new array
  const dayCount = trip.days.length
  const dayLabels = useMemo(() => Array.from({ length: dayCount }, (_, i) => `Day ${i + 1}`), [dayCount])

  const moveToDay = useCallback(
    (stopId, to) => {
      const stop = trip.days.flatMap((d) => d.stops).find((s) => s.id === stopId)
      actions.moveToDay(stopId, to)
      onToast({
        message: `Moved "${stop?.name ?? 'stop'}" to Day ${to + 1}`,
        action: { label: 'View', run: () => setActive(to) },
      })
    },
    [trip.days, actions, onToast],
  )

  async function share() {
    try {
      const url = await buildShareUrl(trip)
      if (url.length > 16000) onToast({ message: 'Heads up: this link is very long and may not open everywhere.' })
      // native share sheet on phones, clipboard on desktop, and if both are
      // blocked just show the link so it can be copied by hand
      if (navigator.share && matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: trip.title, url }).catch(() => {})
        return
      }
      await navigator.clipboard.writeText(url)
      onToast({ message: 'Link copied. Anyone with it sees this exact plan.' })
    } catch {
      setShareUrl(await buildShareUrl(trip).catch(() => null))
    }
  }

  return (
    <section className="itinerary" aria-labelledby="trip-title">
      {/* two columns on desktop: the ticket + actions stay pinned on the left while
          the days scroll on the right. on mobile both wrappers are display:contents */}
      <div className="trip-side">
        <TripHero trip={trip} meta={meta} headingRef={headingRef} />

        <div className="trip-actions">
          <button type="button" className="btn btn-soft" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
            <IconUndo size={16} /> Undo
          </button>
          <button type="button" className="btn btn-soft" onClick={share}>
            <IconShare size={16} /> Share
          </button>
          <button type="button" className="btn btn-soft" onClick={onNewTrip}>
            <IconPlus size={16} /> New trip
          </button>
        </div>

        {shareUrl && (
          <div className="share-fallback">
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

        {trip.tips.length > 0 && (
          <aside className="tips" aria-label="Good to know">
            <h3>Good to know</h3>
            <ul>
              {trip.tips.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </aside>
        )}
      </div>

      <div className="trip-main">
        <DayTabs days={trip.days} active={day} onChange={setActive} />

        <DayView
          key={trip.days[day].id}
          day={trip.days[day]}
          index={day}
          dayLabels={dayLabels}
          destination={trip.destination}
          lastChange={lastChange}
          online={online}
          actions={actions}
          onRemoveStop={onRemoveStop}
          onMoveToDay={moveToDay}
          onRefine={onRefineDay}
        />
      </div>
    </section>
  )
}
