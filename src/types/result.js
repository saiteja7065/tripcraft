// The shape we ask the model for, and the shape the UI renders.
// Server (prompt + gemini schema) and client (validator) both import from here
// so the two can't quietly drift apart.

/**
 * @typedef {'sight'|'food'|'activity'|'nature'|'shopping'|'nightlife'|'transport'|'stay'|'other'} Category
 *
 * @typedef {Object} Stop
 * @property {string} id            added by us after validation, never by the model
 * @property {string} name
 * @property {Category} category
 * @property {number} durationMins
 * @property {string} area          neighbourhood / locality, can be ''
 * @property {string} note          one line of useful context, can be ''
 *
 * @typedef {Object} Day
 * @property {string} id
 * @property {string} theme
 * @property {string} startTime     'HH:MM', 24h
 * @property {Stop[]} stops
 *
 * @typedef {Object} Trip
 * @property {string} title
 * @property {string} destination
 * @property {Day[]} days
 * @property {string[]} tips
 */

export const CATEGORIES = [
  'sight',
  'food',
  'activity',
  'nature',
  'shopping',
  'nightlife',
  'transport',
  'stay',
  'other',
]

// hard limits - the validator trims anything past these instead of trusting the model
export const LIMITS = {
  maxDays: 10,
  maxStopsPerDay: 10,
  maxTips: 6,
  title: 80,
  destination: 80,
  theme: 80,
  name: 80,
  area: 60,
  note: 240,
  tip: 200,
  minDuration: 10,
  maxDuration: 600,
  input: 1200,
}

export const DEFAULT_START = '09:00'
export const DEFAULT_DURATION = 60

// what the model is allowed to send back when the request isn't a trip at all
export const NOT_A_TRIP = 'not_a_trip'
