import { useMemo } from 'react'
import { destinationPalette } from '../lib/palette.js'
import { IconPlane } from './Icons.jsx'

// The trip header, styled like a boarding pass. Colours come from the
// destination name, so each trip gets its own look.
export default function TripHero({ trip, meta, headingRef }) {
  const palette = useMemo(() => destinationPalette(trip.destination || trip.title), [trip.destination, trip.title])
  const stops = trip.days.reduce((n, d) => n + d.stops.length, 0)
  const hours = Math.round(trip.days.reduce((n, d) => n + d.stops.reduce((m, s) => m + s.durationMins, 0), 0) / 60)
  const place = trip.destination || 'Your trip'
  const code = place.replace(/[^a-z]/gi, '').slice(0, 3).toUpperCase() || 'TRP'

  return (
    <div className="pass" style={{ '--from': palette.from, '--to': palette.to }}>
      <div className="pass-main">
        <div className="pass-route" aria-hidden="true">
          <span>YOU</span>
          <span className="pass-line">
            <IconPlane size={16} />
          </span>
          <span>{code}</span>
        </div>
        <p className="pass-label">Destination</p>
        <h2 className="pass-dest" ref={headingRef} tabIndex={-1} id="trip-title">
          {place}
        </h2>
        <p className="pass-title">{trip.title}</p>
        {(meta?.demo || meta?.repaired) && (
          <p className="pass-flags">
            {meta.demo && <span>Sample data</span>}
            {meta.repaired && <span title="The first AI reply was broken; it was fixed automatically">Auto-repaired</span>}
          </p>
        )}
      </div>
      <div className="pass-stub">
        <dl>
          <div>
            <dt>Days</dt>
            <dd>{trip.days.length}</dd>
          </div>
          <div>
            <dt>Stops</dt>
            <dd>{stops}</dd>
          </div>
          <div>
            <dt>Planned</dt>
            <dd>{hours}h</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
