import { memo, useState } from 'react'
import { formatClock, formatDuration } from '../lib/schedule.js'
import { IconDown, IconPin, IconTrash, IconUp } from './Icons.jsx'

const CATEGORY_LABEL = {
  sight: 'Sight',
  food: 'Food',
  activity: 'Activity',
  nature: 'Nature',
  shopping: 'Shopping',
  nightlife: 'Nightlife',
  transport: 'Transport',
  stay: 'Stay',
  other: 'Other',
}

// after a move React may re-create the node (different day) or shuffle it,
// either way focus can get lost. put it back on the same control so keyboard
// users can keep pressing the button.
function refocus(stopId, act) {
  requestAnimationFrame(() => {
    const root = document.querySelector(`[data-stop-id="${stopId}"]`)
    if (!root) return
    const btn = root.querySelector(`[data-act="${act}"]:not(:disabled)`)
    ;(btn ?? root).focus()
  })
}

function StopItem({ stop, time, index, count, dayIndex, dayLabels, destination, flash, onMove, onMoveToDay, onRemove }) {
  const [open, setOpen] = useState(false)
  const isFirst = index === 0
  const isLast = index === count - 1
  const detailsId = `details-${stop.id}`

  const move = (offset, act) => {
    onMove(stop.id, offset)
    refocus(stop.id, act)
  }

  function onKeyDown(e) {
    if (e.target.tagName === 'SELECT') return
    if (e.altKey && e.key === 'ArrowUp' && !isFirst) {
      e.preventDefault()
      move(-1, 'up')
    } else if (e.altKey && e.key === 'ArrowDown' && !isLast) {
      e.preventDefault()
      move(1, 'down')
    }
  }

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [stop.name, stop.area, destination].filter(Boolean).join(', '),
  )}`

  return (
    <li className={`stop cat-${stop.category}`} data-stop-id={stop.id} tabIndex={-1} onKeyDown={onKeyDown}>
      {/* keyed span so the highlight replays every time this stop moves */}
      {flash && <span className="flash" key={flash} aria-hidden="true" />}

      <div className="stop-time">
        <span className="clock">{formatClock(time.start)}</span>
        <span className="dur">{formatDuration(stop.durationMins)}</span>
      </div>

      <div className="stop-main">
        <button
          type="button"
          className="stop-toggle"
          aria-expanded={open}
          aria-controls={detailsId}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="stop-name">{stop.name}</span>
        </button>
        <div className="stop-meta">
          <span className="cat-tag">{CATEGORY_LABEL[stop.category]}</span>
          {stop.area && <span className="area">{stop.area}</span>}
        </div>
        {open && (
          <div className="stop-details" id={detailsId}>
            {stop.note ? <p>{stop.note}</p> : <p className="muted">No notes for this stop.</p>}
            <p className="muted small">
              {formatClock(time.start)} - {formatClock(time.end)}
            </p>
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="maps-link">
              <IconPin size={14} /> Open in Maps
            </a>
          </div>
        )}
      </div>

      <div className="stop-actions">
        <button
          type="button"
          className="icon-btn"
          data-act="up"
          onClick={() => move(-1, 'up')}
          disabled={isFirst}
          aria-label={`Move ${stop.name} earlier`}
          title="Move earlier (Alt+Up)"
        >
          <IconUp size={16} />
        </button>
        <button
          type="button"
          className="icon-btn"
          data-act="down"
          onClick={() => move(1, 'down')}
          disabled={isLast}
          aria-label={`Move ${stop.name} later`}
          title="Move later (Alt+Down)"
        >
          <IconDown size={16} />
        </button>
        {dayLabels.length > 1 && (
          <select
            className="move-select"
            value=""
            aria-label={`Move ${stop.name} to another day`}
            onChange={(e) => {
              const to = Number(e.target.value)
              onMoveToDay(stop.id, to)
              refocus(stop.id, 'up')
            }}
          >
            <option value="" disabled>
              Day...
            </option>
            {dayLabels.map((label, i) =>
              i === dayIndex ? null : (
                <option key={i} value={i}>
                  {label}
                </option>
              ),
            )}
          </select>
        )}
        <button
          type="button"
          className="icon-btn danger"
          onClick={() => onRemove(stop)}
          aria-label={`Remove ${stop.name}`}
          title="Remove"
        >
          <IconTrash size={16} />
        </button>
      </div>
    </li>
  )
}

// a trip can have ~50 stops; memo keeps an edit on one day from re-rendering all of them
export default memo(StopItem)
