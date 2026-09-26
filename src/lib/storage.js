import { validateTripObject } from './validateResult.js'

// localStorage can throw (private mode, quota, blocked storage). Persistence is
// best-effort and must never break the app.

const KEY = 'tripcraft:v1'

export function loadSession() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const saved = JSON.parse(raw)
    // Validate saved data too; the stored shape may be from an older version.
    const trip = saved.trip ? validateTripObject(saved.trip, { allowEmpty: true }) : null
    return {
      input: typeof saved.input === 'string' ? saved.input : '',
      trip: trip?.ok ? trip.data : null,
    }
  } catch {
    return null
  }
}

export function saveSession(session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(session))
  } catch {
    // best-effort
  }
}
