import { useEffect, useRef } from 'react'

// Day switcher. Each tab is also a drop target: drag a stop onto "Day 3"
// and it moves there (see useDragSort, data-day-drop).
export default function DayTabs({ days, active, onChange }) {
  const listRef = useRef(null)

  // keep the active tab visible when there are more days than fit on a phone
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [active])

  function onKeyDown(e) {
    const last = days.length - 1
    let next = null
    if (e.key === 'ArrowRight') next = active === last ? 0 : active + 1
    if (e.key === 'ArrowLeft') next = active === 0 ? last : active - 1
    if (e.key === 'Home') next = 0
    if (e.key === 'End') next = last
    if (next === null) return
    e.preventDefault()
    onChange(next)
    requestAnimationFrame(() => document.getElementById(`tab-${days[next].id}`)?.focus())
  }

  return (
    <div className="day-tabs-wrap">
      <div className="day-tabs" role="tablist" aria-label="Days" ref={listRef} onKeyDown={onKeyDown}>
        {days.map((day, i) => (
          <button
            key={day.id}
            id={`tab-${day.id}`}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-controls={`panel-${day.id}`}
            tabIndex={i === active ? 0 : -1}
            data-day-drop={i}
            className="day-tab"
            onClick={() => onChange(i)}
          >
            <span className="day-tab-num">Day {i + 1}</span>
            <span className="day-tab-theme">{day.theme}</span>
            <span className="day-tab-count">{day.stops.length} stops</span>
          </button>
        ))}
      </div>
    </div>
  )
}
