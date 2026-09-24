import { mockDay, mockTrip, wait } from './providers/mock.js'
import { ProviderError } from './providers/ProviderError.js'

// Failure lab. Each scenario fakes one of the ways a real model reply goes
// wrong, so the client handling can be tested (and demoed) on demand without
// burning api quota or waiting for the model to misbehave by itself.

export const SCENARIOS = [
  'fenced',
  'partial',
  'flaky',
  'malformed',
  'wrong-shape',
  'empty',
  'not-a-trip',
  'slow',
  'hang',
  'rate-limit',
  'server-error',
]

function good(task, payload) {
  const out = task === 'refine-day' ? mockDay(payload.day, payload.instruction) : mockTrip(payload.input)
  return JSON.stringify(out)
}

export async function simulate(scenario, task, payload, signal) {
  switch (scenario) {
    case 'fenced':
      // the classic: chatty preamble + markdown fence around otherwise fine json
      return `Sure! Here's your itinerary:\n\n\`\`\`json\n${good(task, payload)}\n\`\`\`\n\nHave a great trip!`

    case 'partial': {
      // parses fine but a few fields are junk - should render with warnings
      const trip = JSON.parse(good(task, payload))
      const day = trip.days ? trip.days[0] : trip
      day.startTime = 'morning'
      day.stops[0].durationMins = '2 hours'
      day.stops[1].category = 'sightseeing'
      day.stops.splice(2, 0, { category: 'food', durationMins: 30 }) // no name -> gets dropped
      return JSON.stringify(trip)
    }

    case 'flaky':
      // broken on the first try, fine on the repair call
      if (task === 'repair') return good(task, payload)
      return good(task, payload).slice(0, 180)

    case 'malformed':
      // looks like the reply got cut off mid-way (max tokens)
      return good(task, payload).slice(0, 180)

    case 'wrong-shape':
      return JSON.stringify({ itinerary: 'Day 1: see the fort, eat street food. Day 2: beach.' })

    case 'empty':
      return ''

    case 'not-a-trip':
      return JSON.stringify({ error: 'not_a_trip', message: "That reads like a coding question, not a trip." })

    case 'slow':
      await wait(14000, signal)
      return good(task, payload)

    case 'hang':
      // longer than the client is willing to wait
      await wait(90000, signal)
      return good(task, payload)

    case 'rate-limit':
      throw new ProviderError('RATE_LIMITED', 'simulated rate limit', { status: 429 })

    case 'server-error':
      throw new ProviderError('UPSTREAM', 'simulated provider outage', { status: 502 })

    default:
      return good(task, payload)
  }
}
