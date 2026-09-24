import { CATEGORY_LABEL } from './StopCard.jsx'
import { formatDuration } from '../lib/schedule.js'

// How the day's time splits by category - a quick "is this day all museums?"
// read without scanning every stop.
export default function CategoryBar({ stops }) {
  const total = stops.reduce((n, s) => n + s.durationMins, 0)
  if (!total) return null

  const byCat = new Map()
  for (const s of stops) byCat.set(s.category, (byCat.get(s.category) ?? 0) + s.durationMins)
  const parts = [...byCat.entries()].sort((a, b) => b[1] - a[1])

  const summary = parts.map(([cat, mins]) => `${CATEGORY_LABEL[cat]} ${formatDuration(mins)}`).join(', ')

  return (
    <figure className="cat-bar" aria-label={`Time split: ${summary}`}>
      <div className="cat-bar-track" aria-hidden="true">
        {parts.map(([cat, mins]) => (
          <span key={cat} className={`cat-seg cat-${cat}`} style={{ flexGrow: mins }} title={`${CATEGORY_LABEL[cat]} · ${formatDuration(mins)}`} />
        ))}
      </div>
      <figcaption className="cat-legend" aria-hidden="true">
        {parts.slice(0, 4).map(([cat, mins]) => (
          <span key={cat} className={`cat-key cat-${cat}`}>
            {CATEGORY_LABEL[cat]} <b>{Math.round((mins / total) * 100)}%</b>
          </span>
        ))}
      </figcaption>
    </figure>
  )
}
