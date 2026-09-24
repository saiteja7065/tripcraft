import { memo, useCallback, useMemo, useState } from 'react'
import { formatClock, formatDuration, scheduleDay } from '../lib/schedule.js'
import { IconChevron } from './Icons.jsx'
import RefineDay from './RefineDay.jsx'
import StopItem from './StopItem.jsx'

function DayCard({ day, index, dayLabels, destination, lastChange, online, actions, onRemoveStop, onRefine }) {
  const [expanded, setExpanded] = useState(true)
  const schedule = useMemo(() => scheduleDay(day), [day])
  const bodyId = `day-body-${day.id}`
  const dayNumber = index + 1

  // removing the focused stop would drop focus to <body>; hand it to the
  // next stop (or the previous one, or the day header) instead
  const handleRemove = useCallback(
    (stop) => {
      const i = day.stops.findIndex((s) => s.id === stop.id)
      const neighbour = day.stops[i + 1] ?? day.stops[i - 1]
      onRemoveStop(stop)
      requestAnimationFrame(() => {
        const target = neighbour
          ? document.querySelector(`[data-stop-id="${neighbour.id}"]`)
          : document.getElementById(`day-toggle-${day.id}`)
        target?.focus()
      })
    },
    [day, onRemoveStop],
  )

  const handleRefine = useCallback((instruction, signal) => onRefine(day.id, index, instruction, signal), [day.id, index, onRefine])

  const summary = day.stops.length
    ? `${formatClock(schedule.start)} - ${formatClock(schedule.end)} · ${day.stops.length} ${day.stops.length === 1 ? 'stop' : 'stops'}`
    : 'No stops'

  return (
    <article className="card day" aria-labelledby={`day-toggle-${day.id}`}>
      <h3 className="day-heading">
        <button
          type="button"
          id={`day-toggle-${day.id}`}
          className="day-toggle"
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={() => setExpanded((e) => !e)}
        >
          <span className="day-num">Day {dayNumber}</span>
          <span className="day-theme">{day.theme}</span>
          <span className="day-summary">{summary}</span>
          <IconChevron size={18} className="chevron" />
        </button>
      </h3>

      {expanded && (
        <div id={bodyId} className="day-body">
          <div className="day-toolbar">
            <label className="start-time">
              <span>Start at</span>
              <input
                type="time"
                value={day.startTime}
                onChange={(e) => {
                  // time inputs can briefly be "" while the user is typing
                  if (/^\d{2}:\d{2}$/.test(e.target.value)) actions.setStartTime(index, e.target.value)
                }}
              />
            </label>
            {day.stops.length > 0 && <span className="muted small">{formatDuration(schedule.busyMins)} of activities</span>}
          </div>

          {schedule.packed && (
            <p className="packed-warning small" role="note">
              This day runs until {formatClock(schedule.end)}. Consider moving a stop to another day.
            </p>
          )}

          {day.stops.length ? (
            <ol className="stops">
              {day.stops.map((stop, i) => (
                <StopItem
                  key={stop.id}
                  stop={stop}
                  time={schedule.times[stop.id]}
                  index={i}
                  count={day.stops.length}
                  dayIndex={index}
                  dayLabels={dayLabels}
                  destination={destination}
                  flash={lastChange?.stopId === stop.id ? lastChange.at : null}
                  onMove={actions.move}
                  onMoveToDay={actions.moveToDay}
                  onRemove={handleRemove}
                />
              ))}
            </ol>
          ) : (
            <p className="empty-day muted">Nothing planned. Move a stop here, or ask AI to fill this day.</p>
          )}

          <RefineDay dayNumber={dayNumber} onRefine={handleRefine} online={online} />
        </div>
      )}
    </article>
  )
}

export default memo(DayCard)
