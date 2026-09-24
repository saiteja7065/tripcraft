import { memo, useState } from 'react'
import { formatClock, formatDuration, TRAVEL_BUFFER_MINS } from '../lib/schedule.js'
import { CATEGORY_ICONS, IconArrowRight, IconDots, IconDown, IconGrip, IconPin, IconTrash, IconUp } from './Icons.jsx'
import Menu from './Menu.jsx'

export const CATEGORY_LABEL = {
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

// after a move React may re-create the node (different day) or shuffle it;
// either way focus can get lost. put it back so keyboard users can keep going.
function refocus(stopId, selector) {
  requestAnimationFrame(() => {
    const root = document.querySelector(`[data-stop-id="${stopId}"]`)
    const el = root?.querySelector(selector) ?? root
    el?.focus()
  })
}

function StopCard({
  stop,
  time,
  index,
  count,
  dayIndex,
  dayLabels,
  destination,
  dragging,
  flash,
  onMove,
  onMoveToDay,
  onRemove,
  onHandlePointerDown,
}) {
  const [open, setOpen] = useState(false)
  const Icon = CATEGORY_ICONS[stop.category] ?? CATEGORY_ICONS.other
  const isFirst = index === 0
  const isLast = index === count - 1
  const detailsId = `details-${stop.id}`

  const move = (offset) => {
    if ((offset < 0 && isFirst) || (offset > 0 && isLast)) return
    onMove(stop.id, offset)
    refocus(stop.id, '.drag-handle')
  }

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [stop.name, stop.area, destination].filter(Boolean).join(', '),
  )}`

  const menuItems = [
    { label: 'Move earlier', icon: <IconUp size={16} />, disabled: isFirst, onSelect: () => move(-1), keepFocus: true },
    { label: 'Move later', icon: <IconDown size={16} />, disabled: isLast, onSelect: () => move(1), keepFocus: true },
    ...(dayLabels.length > 1 ? [{ divider: true }] : []),
    ...dayLabels
      .map((label, i) =>
        i === dayIndex
          ? null
          : {
              label: `Move to ${label}`,
              icon: <IconArrowRight size={16} />,
              keepFocus: true,
              onSelect: () => onMoveToDay(stop.id, i),
            },
      )
      .filter(Boolean),
    { divider: true },
    {
      label: 'Open in Maps',
      icon: <IconPin size={16} />,
      onSelect: () => window.open(mapsUrl, '_blank', 'noopener,noreferrer'),
    },
    { label: 'Remove stop', icon: <IconTrash size={16} />, danger: true, keepFocus: true, onSelect: () => onRemove(stop) },
  ]

  return (
    <li
      className={`timeline-item cat-${stop.category} ${dragging ? 'dragging' : ''}`}
      data-flip-id={stop.id}
      data-stop-id={stop.id}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (!e.altKey || e.target.closest('[role="menu"]')) return
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault()
          move(e.key === 'ArrowUp' ? -1 : 1)
        }
      }}
    >
      {index > 0 && (
        <div className="tl-travel" aria-hidden="true">
          {TRAVEL_BUFFER_MINS} min travel
        </div>
      )}

      <div className="tl-row">
        <div className="tl-time">
          <span className="clock">{formatClock(time.start)}</span>
          <span className="dur">{formatDuration(stop.durationMins)}</span>
        </div>

        <div className="tl-node" aria-hidden="true">
          <Icon size={16} />
        </div>

        <div className="tl-card">
          {flash && <span className="flash" key={flash} aria-hidden="true" />}
          <div className="tl-card-main">
            <button
              type="button"
              className="tl-toggle"
              aria-expanded={open}
              aria-controls={detailsId}
              onClick={() => setOpen((o) => !o)}
            >
              {stop.name}
            </button>
            <p className="tl-meta">
              <span className="cat-tag">{CATEGORY_LABEL[stop.category]}</span>
              {stop.area && <span>{stop.area}</span>}
            </p>
            {open && (
              <div className="tl-details" id={detailsId}>
                {stop.note ? <p>{stop.note}</p> : <p className="muted">No notes for this stop.</p>}
                <p className="muted small">
                  {formatClock(time.start)} – {formatClock(time.end)}
                </p>
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="maps-link">
                  <IconPin size={14} /> Open in Maps
                </a>
              </div>
            )}
          </div>

          <div className="tl-tools">
            <Menu label={`Options for ${stop.name}`} icon={<IconDots size={18} />} items={menuItems} />
            <button
              type="button"
              className="icon-btn drag-handle"
              aria-label={`Reorder ${stop.name}. Drag, or use the arrow keys.`}
              title="Drag to reorder (or drop on a day tab)"
              onPointerDown={(e) => onHandlePointerDown(e, stop.id)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                  e.preventDefault()
                  e.stopPropagation() // the <li> also listens for alt+arrows
                  move(e.key === 'ArrowUp' ? -1 : 1)
                }
              }}
            >
              <IconGrip size={18} />
            </button>
          </div>
        </div>
      </div>
    </li>
  )
}

export default memo(StopCard)
