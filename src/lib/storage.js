import { validateTripObject } from './validateResult.js'

// localStorage can throw (private mode, storage full, blocked cookies) -
// saving is a nice-to-have, so it must never break the app.

const KEY = 'tripwise:v1'

export function loadSession() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const saved = JSON.parse(raw)
    // treat our own old data as untrusted too - the shape may have changed since
    const trip = saved.trip ? validateTripObject(saved.trip) : null
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
    // ignore - see above
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
