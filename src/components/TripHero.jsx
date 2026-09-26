import { useMemo } from 'react'
import { destinationPalette, hash } from '../lib/palette.js'
import { IconPlane } from './Icons.jsx'

// Decorative barcode, deterministic for a given seed.
function Barcode({ seed }) {
  const bars = useMemo(() => {
    let x = seed || 1
    const out = []
    let pos = 0
    for (let i = 0; i < 38; i++) {
      x = (x * 1103515245 + 12345) >>> 0 // linear congruential generator
      const w = 1 + (x % 3)
      out.push({ x: pos, w })
      pos += w + 1 + ((x >> 8) % 2)
    }
    return { out, width: pos }
  }, [seed])

  return (
    <svg className="barcode" viewBox={`0 0 ${bars.width} 24`} preserveAspectRatio="none" aria-hidden="true">
      {bars.out.map((b, i) => (
        <rect key={i} x={b.x} y="0" width={b.w} height="24" />
      ))}
    </svg>
  )
}

// Trip summary styled as a boarding pass; accent colours derive from the destination.
export default function TripHero({ trip, meta, headingRef }) {
  const place = trip.destination || 'Your trip'
  const seed = useMemo(() => hash(`${place}|${trip.title}`), [place, trip.title])
  const palette = useMemo(() => destinationPalette(place), [place])
  const stops = trip.days.reduce((n, d) => n + d.stops.length, 0)
  const hours = Math.round(trip.days.reduce((n, d) => n + d.stops.reduce((m, s) => m + s.durationMins, 0), 0) / 60)
  const code = place.replace(/[^a-z]/gi, '').slice(0, 3).toUpperCase() || 'TRP'
  const ticketNo = `TC-${(seed % 900000) + 100000}`

  return (
    <div className="pass" style={{ '--from': palette.from, '--to': palette.to }}>
      <div className="pass-main">
        <div className="pass-top" aria-hidden="true">
          <span>Tripcraft · Boarding pass</span>
          <span>{ticketNo}</span>
        </div>

        <div className="pass-route" aria-hidden="true">
          <span className="pass-end">
            <small>From</small>
            YOU
          </span>
          <span className="pass-line">
            <IconPlane size={16} />
          </span>
          <span className="pass-end">
            <small>To</small>
            {code}
          </span>
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

        <span className="pass-stamp" aria-hidden="true">
          <b>{code}</b>
          planned
        </span>
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
        <div className="pass-code" aria-hidden="true">
          <Barcode seed={seed} />
          <span>{ticketNo}</span>
        </div>
      </div>
    </div>
  )
}
