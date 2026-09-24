import { useCallback, useMemo, useReducer } from 'react'

// All edits to the trip go through this reducer, so every change is a plain
// function of (state, action) - easy to test, and undo is just "keep the old
// trip around". Stops are addressed by id, never by index, so an action
// dispatched from a slightly stale render can't hit the wrong stop.

const HISTORY_LIMIT = 30

export const initialState = { trip: null, past: [], lastChange: null }

function findStop(trip, stopId) {
  for (let d = 0; d < trip.days.length; d++) {
    const s = trip.days[d].stops.findIndex((stop) => stop.id === stopId)
    if (s !== -1) return { d, s }
  }
  return null
}

function withDays(trip, days) {
  return { ...trip, days }
}

function editTrip(trip, action) {
  switch (action.type) {
    case 'remove': {
      const at = findStop(trip, action.stopId)
      if (!at) return trip
      return withDays(
        trip,
        trip.days.map((day, i) => (i === at.d ? { ...day, stops: day.stops.filter((s) => s.id !== action.stopId) } : day)),
      )
    }

    case 'move': {
      // one step up or down inside the same day
      const at = findStop(trip, action.stopId)
      if (!at) return trip
      const to = at.s + action.offset
      const stops = trip.days[at.d].stops
      if (to < 0 || to >= stops.length) return trip
      const next = [...stops]
      ;[next[at.s], next[to]] = [next[to], next[at.s]]
      return withDays(
        trip,
        trip.days.map((day, i) => (i === at.d ? { ...day, stops: next } : day)),
      )
    }

    case 'moveToDay': {
      // append to the end of another day - the user can nudge it from there
      const at = findStop(trip, action.stopId)
      if (!at || at.d === action.dayIndex || !trip.days[action.dayIndex]) return trip
      const stop = trip.days[at.d].stops[at.s]
      return withDays(
        trip,
        trip.days.map((day, i) => {
          if (i === at.d) return { ...day, stops: day.stops.filter((s) => s.id !== stop.id) }
          if (i === action.dayIndex) return { ...day, stops: [...day.stops, stop] }
          return day
        }),
      )
    }

    case 'replaceDay': {
      if (!trip.days[action.dayIndex]) return trip
      return withDays(
        trip,
        trip.days.map((day, i) => (i === action.dayIndex ? { ...action.day, id: day.id } : day)),
      )
    }

    case 'setStartTime': {
      return withDays(
        trip,
        trip.days.map((day, i) => (i === action.dayIndex ? { ...day, startTime: action.startTime } : day)),
      )
    }

    default:
      return trip
  }
}

export function itineraryReducer(state, action) {
  switch (action.type) {
    case 'load':
      return { trip: action.trip, past: [], lastChange: null }

    case 'clear':
      return initialState

    case 'undo': {
      if (!state.past.length) return state
      return { trip: state.past[state.past.length - 1], past: state.past.slice(0, -1), lastChange: null }
    }

    default: {
      if (!state.trip) return state
      const trip = editTrip(state.trip, action)
      if (trip === state.trip) return state // nothing changed, don't pollute undo history
      return {
        trip,
        past: [...state.past, state.trip].slice(-HISTORY_LIMIT),
        lastChange: { type: action.type, stopId: action.stopId, dayIndex: action.dayIndex, at: Date.now() },
      }
    }
  }
}

export function useItinerary(initialTrip = null) {
  const [state, dispatch] = useReducer(itineraryReducer, initialTrip, (trip) => ({ ...initialState, trip }))

  const load = useCallback((trip) => dispatch({ type: 'load', trip }), [])
  const clear = useCallback(() => dispatch({ type: 'clear' }), [])
  const undo = useCallback(() => dispatch({ type: 'undo' }), [])

  const actions = useMemo(
    () => ({
      remove: (stopId) => dispatch({ type: 'remove', stopId }),
      move: (stopId, offset) => dispatch({ type: 'move', stopId, offset }),
      moveToDay: (stopId, dayIndex) => dispatch({ type: 'moveToDay', stopId, dayIndex }),
      replaceDay: (dayIndex, day) => dispatch({ type: 'replaceDay', dayIndex, day }),
      setStartTime: (dayIndex, startTime) => dispatch({ type: 'setStartTime', dayIndex, startTime }),
    }),
    [],
  )

  return {
    trip: state.trip,
    canUndo: state.past.length > 0,
    lastChange: state.lastChange,
    load,
    clear,
    undo,
    actions,
  }
}
