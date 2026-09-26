import { memo, useCallback, useMemo, useRef } from 'react'
import { useDragSort } from '../hooks/useDragSort.js'
import { useFlip } from '../hooks/useFlip.js'
import { formatClock, formatDuration, scheduleDay } from '../lib/schedule.js'
import CategoryBar from './CategoryBar.jsx'
import { IconClock } from './Icons.jsx'
import RefineDay from './RefineDay.jsx'
import StopCard from './StopCard.jsx'

function DayView({ hidden, day, index, dayLabels, destination, lastChange, online, actions, onRemoveStop, onMoveToDay, onRefine }) {
  const listRef = useRef(null)
  const schedule = useMemo(() => scheduleDay(day), [day])
  const { snapshot } = useFlip(listRef)
  const { draggingId, onHandlePointerDown } = useDragSort({
    listRef,
    currentDay: index,
    snapshot,
    onReorder: actions.reorder,
    onDropOnDay: onMoveToDay,
  })

  // Move focus to a neighbouring stop so it isn't lost when the focused one is removed.
  const handleRemove = useCallback(
    (stop) => {
      const i = day.stops.findIndex((s) => s.id === stop.id)
      const neighbour = day.stops[i + 1] ?? day.stops[i - 1]
      onRemoveStop(stop)
      requestAnimationFrame(() => {
        const target = neighbour
          ? document.querySelector(`[data-stop-id="${neighbour.id}"] .drag-handle`)
          : document.getElementById(`tab-${day.id}`)
        target?.focus()
      })
    },
    [day, onRemoveStop],
  )

  const handleRefine = useCallback((instruction, signal) => onRefine(day.id, index, instruction, signal), [day.id, index, onRefine])

  const count = day.stops.length

  return (
    <section className="day-view" role="tabpanel" id={`panel-${day.id}`} aria-labelledby={`tab-${day.id}`} hidden={hidden}>
      <header className="day-head">
        <div>
          <p className="eyebrow">Day {index + 1}</p>
          <h3 className="day-title">{day.theme}</h3>
          <p className="day-meta">
            {count ? (
              <>
                {formatClock(schedule.start)} → {formatClock(schedule.end)} · {count} {count === 1 ? 'stop' : 'stops'} · {formatDuration(schedule.busyMins)} of plans
              </>
            ) : (
              'Nothing planned yet'
            )}
          </p>
        </div>
        <label className="start-time">
          <IconClock size={15} />
          <span className="sr-only">Day starts at</span>
          <input
            type="time"
            value={day.startTime}
            onChange={(e) => {
              // The value is briefly empty while the user is typing.
              if (/^\d{2}:\d{2}$/.test(e.target.value)) actions.setStartTime(index, e.target.value)
            }}
          />
        </label>
      </header>

      <CategoryBar stops={day.stops} />

      {schedule.packed && (
        <p className="packed-warning" role="note">
          This day runs until {formatClock(schedule.end)}. Drag a stop onto another day's tab to lighten it.
        </p>
      )}

      {count ? (
        <ol className={`timeline ${draggingId ? 'is-sorting' : ''}`} ref={listRef}>
          {day.stops.map((stop, i) => (
            <StopCard
              key={stop.id}
              stop={stop}
              time={schedule.times[stop.id]}
              index={i}
              count={count}
              dayIndex={index}
              dayLabels={dayLabels}
              destination={destination}
              dragging={draggingId === stop.id}
              flash={lastChange?.stopId === stop.id ? lastChange.at : null}
              onMove={actions.move}
              onMoveToDay={onMoveToDay}
              onRemove={handleRemove}
              onHandlePointerDown={onHandlePointerDown}
            />
          ))}
        </ol>
      ) : (
        <div className="empty-day">
          <p>This day is empty.</p>
          <p className="muted small">Drag a stop onto this day's tab, or ask AI to plan it.</p>
        </div>
      )}

      <RefineDay key={day.id} dayNumber={index + 1} onRefine={handleRefine} online={online} />
    </section>
  )
}

export default memo(DayView)
