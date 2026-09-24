import { describe, expect, it } from 'vitest'
import { extractJson, parseDuration, parseTime, validateDay, validateTrip, validateTripObject } from './validateResult.js'

const goodTrip = {
  title: '2 days in Jaipur',
  destination: 'Jaipur',
  days: [
    {
      theme: 'Forts',
      startTime: '09:00',
      stops: [
        { name: 'Amber Fort', category: 'sight', durationMins: 150, area: 'Amer', note: 'Go early' },
        { name: 'Lunch at LMB', category: 'food', durationMins: 60, area: 'Johari Bazaar', note: '' },
      ],
    },
    {
      theme: 'Markets',
      startTime: '10:00',
      stops: [{ name: 'Bapu Bazaar', category: 'shopping', durationMins: 90, area: '', note: '' }],
    },
  ],
  tips: ['Carry water'],
}

describe('extractJson', () => {
  it('flags empty replies', () => {
    expect(extractJson('').error.code).toBe('EMPTY_RESPONSE')
    expect(extractJson('   \n ').error.code).toBe('EMPTY_RESPONSE')
    expect(extractJson(undefined).error.code).toBe('EMPTY_RESPONSE')
  })

  it('pulls json out of markdown fences and chatty text', () => {
    const fenced = 'Sure!\n```json\n{"a":1}\n```\nEnjoy'
    expect(extractJson(fenced).value).toEqual({ a: 1 })
    expect(extractJson('Here you go: {"a":2} hope that helps').value).toEqual({ a: 2 })
  })

  it('reports cut-off json as malformed', () => {
    const res = extractJson('{"title": "x", "days": [{"theme": "a"')
    expect(res.ok).toBe(false)
    expect(res.error.code).toBe('MALFORMED_JSON')
    expect(res.error.message).toMatch(/cut off/)
  })

  it('reports plain prose as malformed', () => {
    expect(extractJson('Day 1: go to the beach').error.code).toBe('MALFORMED_JSON')
  })
})

describe('validateTrip', () => {
  it('accepts a good trip and adds ids', () => {
    const res = validateTrip(JSON.stringify(goodTrip))
    expect(res.ok).toBe(true)
    expect(res.warnings).toEqual([])
    expect(res.data.days).toHaveLength(2)
    expect(res.data.days[0].id).toBeTruthy()
    expect(res.data.days[0].stops[0].id).toBeTruthy()
  })

  it('rejects valid json with the wrong shape', () => {
    const res = validateTrip('{"itinerary": "Day 1: fort"}')
    expect(res.ok).toBe(false)
    expect(res.error.code).toBe('WRONG_SHAPE')
    expect(res.error.details.length).toBeGreaterThan(0)
  })

  it('rejects an empty days array', () => {
    expect(validateTrip('{"title":"x","days":[]}').error.code).toBe('WRONG_SHAPE')
  })

  it('rejects days that have no usable stops', () => {
    const res = validateTrip(JSON.stringify({ days: [{ theme: 'a', stops: [{ category: 'food' }] }] }))
    expect(res.error.code).toBe('WRONG_SHAPE')
  })

  it('treats the model refusing as NOT_A_TRIP, not a crash', () => {
    const res = validateTrip('{"error":"not_a_trip","message":"That is a recipe."}')
    expect(res.error.code).toBe('NOT_A_TRIP')
    expect(res.error.message).toBe('That is a recipe.')
  })

  it('repairs small problems and reports them as warnings', () => {
    const messy = structuredClone(goodTrip)
    messy.days[0].startTime = 'morning'
    messy.days[0].stops[0].durationMins = '2 hours'
    messy.days[0].stops[1].category = 'banana'
    messy.days[0].stops.push({ category: 'food' }) // no name
    const res = validateTrip(JSON.stringify(messy))
    expect(res.ok).toBe(true)
    const day = res.data.days[0]
    expect(day.startTime).toBe('09:00')
    expect(day.stops[0].durationMins).toBe(120)
    expect(day.stops[1].category).toBe('other')
    expect(day.stops).toHaveLength(2)
    expect(res.warnings.length).toBeGreaterThanOrEqual(3)
  })

  it('caps days and stops at the limits', () => {
    const many = { days: Array.from({ length: 15 }, () => goodTrip.days[0]) }
    const res = validateTrip(JSON.stringify(many))
    expect(res.data.days).toHaveLength(10)
    expect(res.warnings.join(' ')).toMatch(/first 10 of 15 days/)
  })

  it('unwraps a bare array or a single wrapper key', () => {
    expect(validateTrip(JSON.stringify(goodTrip.days)).ok).toBe(true)
    expect(validateTrip(JSON.stringify({ trip: goodTrip })).ok).toBe(true)
  })

  it('never lets non-string junk through as text', () => {
    const weird = { title: { x: 1 }, days: [{ theme: 42, stops: [{ name: 'A', note: ['x'] }] }] }
    const res = validateTripObject(weird)
    expect(res.ok).toBe(true)
    expect(res.data.title).toBe('Your trip')
    expect(res.data.days[0].theme).toBe('Day 1')
    expect(res.data.days[0].stops[0].note).toBe('')
  })
})

describe('validateDay', () => {
  it('accepts a day, or a trip with one day', () => {
    expect(validateDay(JSON.stringify(goodTrip.days[0])).ok).toBe(true)
    expect(validateDay(JSON.stringify({ days: [goodTrip.days[1]] })).ok).toBe(true)
  })
  it('rejects a day with no stops', () => {
    expect(validateDay('{"theme":"x","stops":[]}').error.code).toBe('WRONG_SHAPE')
  })
})

describe('helpers', () => {
  it('parses durations in the formats models actually use', () => {
    expect(parseDuration(90)).toBe(90)
    expect(parseDuration('90')).toBe(90)
    expect(parseDuration('45 min')).toBe(45)
    expect(parseDuration('1.5 hours')).toBe(90)
    expect(parseDuration('1h 30m')).toBe(90)
    expect(parseDuration('a while')).toBe(null)
  })
  it('parses times', () => {
    expect(parseTime('9:00')).toBe('09:00')
    expect(parseTime('2:30 PM')).toBe('14:30')
    expect(parseTime('12:15 am')).toBe('00:15')
    expect(parseTime('25:00')).toBe(null)
    expect(parseTime('morning')).toBe(null)
  })
})
