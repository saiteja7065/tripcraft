import { CATEGORIES, DEFAULT_DURATION, DEFAULT_START, LIMITS, NOT_A_TRIP } from '../types/result.js'
import { makeId } from './id.js'

// Everything the model sends goes through here before React ever sees it.
//
// Two kinds of problems:
//  - fatal: not json, empty, no days, nothing usable -> error state (and one repair attempt)
//  - fixable: a missing note, a weird category, "2 hours" instead of 120 -> we patch it,
//    keep going, and tell the user what we cleaned up
//
// The idea is to reject what we can't trust and repair what's obviously fine,
// instead of throwing away a whole good itinerary because one field is off.

const fail = (code, message, details = []) => ({ ok: false, error: { code, message, details } })

/** Pull a json value out of whatever text the model gave us. */
export function extractJson(raw) {
  if (typeof raw !== 'string' || !raw.trim()) {
    return fail('EMPTY_RESPONSE', 'The AI sent back an empty reply.')
  }

  const text = raw.replace(/^﻿/, '').trim()
  const attempts = [text]

  // ```json ... ``` - models love wrapping json in markdown even when told not to
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) attempts.push(fenced[1].trim())

  // "Sure! Here's your trip: {...} Enjoy!" - take the outermost braces
  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first !== -1 && last > first) attempts.push(text.slice(first, last + 1))

  let lastError
  for (const candidate of attempts) {
    try {
      return { ok: true, value: JSON.parse(candidate) }
    } catch (err) {
      lastError = err
    }
  }

  const cutOff = first !== -1 && last < first ? true : /end of (json )?(input|data)|unterminated/i.test(lastError?.message ?? '')
  return fail(
    'MALFORMED_JSON',
    cutOff ? 'The AI reply got cut off halfway.' : "The AI reply wasn't valid JSON.",
    [cutOff ? 'the JSON is incomplete / cut off, return the full object' : `JSON.parse failed: ${lastError?.message}`],
  )
}

const cleanStr = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')

const CATEGORY_ALIASES = {
  sightseeing: 'sight',
  landmark: 'sight',
  museum: 'sight',
  temple: 'sight',
  monument: 'sight',
  culture: 'sight',
  restaurant: 'food',
  cafe: 'food',
  meal: 'food',
  breakfast: 'food',
  lunch: 'food',
  dinner: 'food',
  drinks: 'nightlife',
  bar: 'nightlife',
  park: 'nature',
  beach: 'nature',
  hike: 'nature',
  market: 'shopping',
  hotel: 'stay',
  accommodation: 'stay',
  travel: 'transport',
  transfer: 'transport',
}

function normCategory(v) {
  const c = typeof v === 'string' ? v.toLowerCase().trim() : ''
  if (CATEGORIES.includes(c)) return { value: c, fixed: false }
  if (CATEGORY_ALIASES[c]) return { value: CATEGORY_ALIASES[c], fixed: false }
  return { value: 'other', fixed: true }
}

// 90, "90", "90 min", "1.5 hours", "2h", "1h 30m" -> minutes
export function parseDuration(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v)
  if (typeof v !== 'string') return null
  const s = v.toLowerCase()
  const h = s.match(/(\d+(?:\.\d+)?)\s*h/)
  const m = s.match(/(\d+)\s*m/)
  if (h || m) return Math.round((h ? parseFloat(h[1]) * 60 : 0) + (m ? parseInt(m[1], 10) : 0))
  const n = parseFloat(s)
  return Number.isFinite(n) ? Math.round(n) : null
}

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))

// "9:00", "09:00", "9:00 AM", "14:30" -> "HH:MM". anything else -> null
export function parseTime(v) {
  if (typeof v !== 'string') return null
  const match = v.trim().match(/^(\d{1,2})[:.](\d{2})\s*(am|pm)?$/i)
  if (!match) return null
  let hh = Number(match[1])
  const mm = Number(match[2])
  const ampm = match[3]?.toLowerCase()
  if (ampm === 'pm' && hh < 12) hh += 12
  if (ampm === 'am' && hh === 12) hh = 0
  if (hh > 23 || mm > 59) return null
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function normStop(raw, where, notes) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    notes.dropped.push(`${where} wasn't an object`)
    return null
  }
  const name = cleanStr(raw.name ?? raw.title ?? raw.place, LIMITS.name)
  if (!name) {
    notes.dropped.push(`${where} had no name`)
    return null
  }

  const cat = normCategory(raw.category ?? raw.type)
  if (cat.fixed) notes.fixed.push(`${where}: unknown category "${raw.category ?? ''}"`)

  let duration = parseDuration(raw.durationMins ?? raw.duration)
  if (duration === null || duration <= 0) {
    notes.fixed.push(`${where}: missing duration, assumed ${DEFAULT_DURATION} min`)
    duration = DEFAULT_DURATION
  } else if (duration < LIMITS.minDuration || duration > LIMITS.maxDuration) {
    notes.fixed.push(`${where}: odd duration (${duration} min) clamped`)
    duration = clamp(duration, LIMITS.minDuration, LIMITS.maxDuration)
  }

  return {
    id: makeId('stop'),
    name,
    category: cat.value,
    durationMins: duration,
    area: cleanStr(raw.area ?? raw.location, LIMITS.area),
    note: cleanStr(raw.note ?? raw.notes ?? raw.description, LIMITS.note),
  }
}

function normDay(raw, index, notes) {
  const label = `Day ${index + 1}`
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    notes.problems.push(`days[${index}] is not an object`)
    return null
  }
  if (!Array.isArray(raw.stops)) {
    notes.problems.push(`days[${index}].stops is missing or not a list`)
    return null
  }

  let startTime = parseTime(raw.startTime)
  if (!startTime) {
    if (raw.startTime !== undefined) notes.fixed.push(`${label}: start time "${raw.startTime}" isn't a time, using ${DEFAULT_START}`)
    startTime = DEFAULT_START
  }

  let rawStops = raw.stops
  if (rawStops.length > LIMITS.maxStopsPerDay) {
    notes.fixed.push(`${label}: kept the first ${LIMITS.maxStopsPerDay} of ${rawStops.length} stops`)
    rawStops = rawStops.slice(0, LIMITS.maxStopsPerDay)
  }
  const stops = rawStops.map((s, i) => normStop(s, `${label}, stop ${i + 1}`, notes)).filter(Boolean)

  return {
    id: makeId('day'),
    theme: cleanStr(raw.theme ?? raw.title, LIMITS.theme) || label,
    startTime,
    stops,
  }
}

// the model saying "this isn't a trip" is a valid, expected answer - not a crash
function refusal(value) {
  if (value && typeof value === 'object' && !Array.isArray(value) && value.error) {
    const message = cleanStr(value.message, 200)
    if (value.error === NOT_A_TRIP || !value.days) {
      return fail('NOT_A_TRIP', message || "That doesn't look like a trip description.")
    }
  }
  return null
}

// be a little forgiving about wrappers: [days...] or { "itinerary": { days } }
function unwrap(value, notes) {
  if (Array.isArray(value)) {
    notes.fixed.push('reply was a bare list of days')
    return { days: value }
  }
  if (value && typeof value === 'object' && !('days' in value)) {
    const keys = Object.keys(value)
    if (keys.length === 1 && value[keys[0]] && typeof value[keys[0]] === 'object' && 'days' in value[keys[0]]) {
      return value[keys[0]]
    }
    if (Array.isArray(value.itinerary)) return { ...value, days: value.itinerary }
  }
  return value
}

function summarise(notes) {
  const warnings = []
  if (notes.dropped.length) {
    warnings.push(`Skipped ${notes.dropped.length} incomplete ${notes.dropped.length === 1 ? 'stop' : 'stops'} (${notes.dropped.join('; ')})`)
  }
  return warnings.concat(notes.fixed)
}

/**
 * Validate an already-parsed object as a Trip. Also used for share links,
 * which are just as untrusted as model output.
 *
 * allowEmpty: a trip the *user* emptied (removed every stop) is still their
 * trip - saved sessions and share links pass this. model output never does,
 * an AI reply with zero stops is a failure.
 */
export function validateTripObject(input, { allowEmpty = false } = {}) {
  const notes = { problems: [], fixed: [], dropped: [] }

  const refused = refusal(input)
  if (refused) return refused

  const value = unwrap(input, notes)
  if (!value || typeof value !== 'object') {
    return fail('WRONG_SHAPE', "The AI reply wasn't a trip.", ['top level must be a JSON object'])
  }
  if (!Array.isArray(value.days)) {
    return fail('WRONG_SHAPE', "The AI reply didn't include a day-by-day plan.", [
      `"days" must be an array of day objects, got ${value.days === undefined ? 'nothing' : typeof value.days}`,
    ])
  }
  if (value.days.length === 0) {
    return fail('WRONG_SHAPE', 'The AI returned a plan with no days.', ['"days" is empty'])
  }

  let rawDays = value.days
  if (rawDays.length > LIMITS.maxDays) {
    notes.fixed.push(`Kept the first ${LIMITS.maxDays} of ${rawDays.length} days`)
    rawDays = rawDays.slice(0, LIMITS.maxDays)
  }

  const days = rawDays.map((d, i) => normDay(d, i, notes)).filter(Boolean)
  const stopCount = days.reduce((n, d) => n + d.stops.length, 0)

  if (!days.length || (!stopCount && !allowEmpty)) {
    return fail('WRONG_SHAPE', "The AI reply didn't contain any usable stops.", [
      ...notes.problems,
      ...notes.dropped,
      'every day needs a "stops" array of objects with at least a "name"',
    ].slice(0, 10))
  }
  // a couple of broken days out of many - keep the good ones but say so
  if (notes.problems.length) notes.fixed.unshift(`Ignored ${notes.problems.length} malformed day(s)`)

  const destination = cleanStr(value.destination, LIMITS.destination)
  const tips = Array.isArray(value.tips)
    ? value.tips.map((t) => cleanStr(t, LIMITS.tip)).filter(Boolean).slice(0, LIMITS.maxTips)
    : []

  return {
    ok: true,
    data: {
      title: cleanStr(value.title, LIMITS.title) || (destination ? `Trip to ${destination}` : 'Your trip'),
      destination,
      days,
      tips,
    },
    warnings: summarise(notes),
  }
}

/** Raw model text -> Trip, or a typed error the UI knows how to show. */
export function validateTrip(raw) {
  const parsed = extractJson(raw)
  if (!parsed.ok) return parsed
  return validateTripObject(parsed.value)
}

/** Same idea for a single day coming back from "refine this day". */
export function validateDay(raw, index = 0) {
  const parsed = extractJson(raw)
  if (!parsed.ok) return parsed

  const refused = refusal(parsed.value)
  if (refused) return refused

  let value = parsed.value
  // some models answer with a full trip or { day: {...} } even when asked for one day
  if (value?.days?.length === 1) value = value.days[0]
  else if (value?.day && typeof value.day === 'object') value = value.day

  const notes = { problems: [], fixed: [], dropped: [] }
  const day = normDay(value, index, notes)
  if (!day || !day.stops.length) {
    return fail('WRONG_SHAPE', "The AI didn't send back a usable day.", [
      ...notes.problems,
      ...notes.dropped,
      'reply must be one Day object with a non-empty "stops" array',
    ])
  }
  return { ok: true, data: day, warnings: summarise(notes) }
}
