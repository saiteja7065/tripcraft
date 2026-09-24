import { describe, expect, it } from 'vitest'
import { initialState, itineraryReducer } from './useItinerary.js'
import { decodeTrip, encodeTrip } from '../lib/share.js'
import { scheduleDay } from '../lib/schedule.js'

const stop = (id, durationMins = 60) => ({ id, name: id, category: 'sight', durationMins, area: '', note: '' })

const trip = {
  title: 't',
  destination: 'd',
  tips: [],
  days: [
    { id: 'd1', theme: 'one', startTime: '09:00', stops: [stop('a'), stop('b'), stop('c')] },
    { id: 'd2', theme: 'two', startTime: '10:00', stops: [stop('x')] },
  ],
}

const loaded = itineraryReducer(initialState, { type: 'load', trip })
const names = (s, d) => s.trip.days[d].stops.map((x) => x.id)

describe('itineraryReducer', () => {
  it('removes a stop by id and can undo it', () => {
    const s = itineraryReducer(loaded, { type: 'remove', stopId: 'b' })
    expect(names(s, 0)).toEqual(['a', 'c'])
    const back = itineraryReducer(s, { type: 'undo' })
    expect(names(back, 0)).toEqual(['a', 'b', 'c'])
  })

  it('moves a stop up and down within a day', () => {
    const down = itineraryReducer(loaded, { type: 'move', stopId: 'a', offset: 1 })
    expect(names(down, 0)).toEqual(['b', 'a', 'c'])
    const up = itineraryReducer(down, { type: 'move', stopId: 'c', offset: -1 })
    expect(names(up, 0)).toEqual(['b', 'c', 'a'])
  })

  it('reorders a stop to an exact index (drag and drop)', () => {
    const s = itineraryReducer(loaded, { type: 'reorder', stopId: 'c', toIndex: 0 })
    expect(names(s, 0)).toEqual(['c', 'a', 'b'])
    const same = itineraryReducer(loaded, { type: 'reorder', stopId: 'a', toIndex: 0 })
    expect(same).toBe(loaded)
    const clamped = itineraryReducer(loaded, { type: 'reorder', stopId: 'a', toIndex: 99 })
    expect(names(clamped, 0)).toEqual(['b', 'c', 'a'])
  })

  it('ignores moves past the edges without adding undo history', () => {
    const s = itineraryReducer(loaded, { type: 'move', stopId: 'a', offset: -1 })
    expect(s).toBe(loaded)
  })

  it('moves a stop to the end of another day', () => {
    const s = itineraryReducer(loaded, { type: 'moveToDay', stopId: 'a', dayIndex: 1 })
    expect(names(s, 0)).toEqual(['b', 'c'])
    expect(names(s, 1)).toEqual(['x', 'a'])
  })

  it('replaces a day but keeps its id', () => {
    const s = itineraryReducer(loaded, {
      type: 'replaceDay',
      dayId: 'd2',
      day: { id: 'new', theme: 'new', startTime: '08:00', stops: [stop('y')] },
    })
    expect(s.trip.days[1].id).toBe('d2')
    expect(s.trip.days[1].theme).toBe('new')
  })

  it('ignores a refined day whose trip was replaced meanwhile', () => {
    const s = itineraryReducer(loaded, { type: 'replaceDay', dayId: 'old-trip-day', day: trip.days[0] })
    expect(s).toBe(loaded)
  })

  it('does nothing for unknown stop ids', () => {
    expect(itineraryReducer(loaded, { type: 'remove', stopId: 'nope' })).toBe(loaded)
  })

  it('never mutates the previous trip', () => {
    const before = JSON.stringify(loaded.trip)
    itineraryReducer(loaded, { type: 'moveToDay', stopId: 'b', dayIndex: 1 })
    expect(JSON.stringify(loaded.trip)).toBe(before)
  })
})

describe('scheduleDay', () => {
  it('derives clock times from start time, durations and travel gaps', () => {
    const s = scheduleDay(trip.days[0])
    expect(s.times.a).toEqual({ id: 'a', start: 540, end: 600 })
    expect(s.times.b.start).toBe(620) // 10:00 + 20 min travel
    expect(s.packed).toBe(false)
  })
})

describe('share links', () => {
  it('round-trips a trip through the url code', async () => {
    const code = await encodeTrip(trip)
    const back = await decodeTrip(code)
    expect(back.days[0].stops.map((s) => s.name)).toEqual(['a', 'b', 'c'])
  })

  it('returns null for garbage instead of throwing', async () => {
    expect(await decodeTrip('zzzz-not-real')).toBe(null)
    expect(await decodeTrip('')).toBe(null)
  })
})
