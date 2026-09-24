// Times are derived, not stored. The model gives a start time for the day and
// a duration per stop; clock times are worked out from the current order.
// That way reordering or removing a stop re-times the whole day for free,
// instead of leaving "14:00" sitting above "09:30".

export const TRAVEL_BUFFER_MINS = 20
const LATE_NIGHT = 22 * 60

export function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function formatClock(mins) {
  const total = ((mins % 1440) + 1440) % 1440
  const h = Math.floor(total / 60)
  const m = total % 60
  const suffix = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}

export function formatDuration(mins) {
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

export function scheduleDay(day) {
  let cursor = toMinutes(day.startTime)
  const times = day.stops.map((stop, i) => {
    if (i > 0) cursor += TRAVEL_BUFFER_MINS
    const start = cursor
    cursor += stop.durationMins
    return { id: stop.id, start, end: cursor }
  })
  const start = toMinutes(day.startTime)
  const end = times.length ? times[times.length - 1].end : start
  return {
    times: Object.fromEntries(times.map((t) => [t.id, t])),
    start,
    end,
    busyMins: day.stops.reduce((n, s) => n + s.durationMins, 0),
    // runs past 10pm, or past midnight - worth a nudge in the ui
    packed: end > LATE_NIGHT,
  }
}
