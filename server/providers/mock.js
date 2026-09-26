// Sample data used when no API key is configured, and by the failure lab.

const DAY_TEMPLATES = [
  {
    theme: 'Old town and first bites',
    startTime: '09:00',
    stops: [
      ['Breakfast at a local cafe', 'food', 45, 'Old town', 'Go early, the good tables fill up by 9:30.'],
      ['Old quarter walking loop', 'sight', 120, 'Old town', 'Wear comfortable shoes, lots of cobblestones.'],
      ['Central market', 'shopping', 75, 'Market district', 'Carry cash, smaller stalls rarely take cards.'],
      ['Street food lunch', 'food', 60, 'Market district', 'Pick the stall with the longest local queue.'],
      ['City museum', 'sight', 90, 'Museum quarter', 'Closed on Mondays in most cities, check before going.'],
      ['Sunset viewpoint', 'nature', 60, 'Hillside', 'Get there 20 minutes before sunset.'],
    ],
  },
  {
    theme: 'Nature and slow afternoon',
    startTime: '08:30',
    stops: [
      ['Morning hike on the ridge trail', 'nature', 150, 'Outskirts', 'Start before it gets hot, carry water.'],
      ['Lakeside lunch', 'food', 75, 'Lakefront', 'Ask for the catch of the day.'],
      ['Botanical garden', 'nature', 90, 'Garden district', 'The shaded paths are nicer after 3pm.'],
      ['Craft workshop', 'activity', 90, 'Artists lane', 'Book a slot a day ahead.'],
      ['Dinner with live music', 'nightlife', 120, 'Riverside', 'Music usually starts around 8pm.'],
    ],
  },
  {
    theme: 'Hidden corners',
    startTime: '09:30',
    stops: [
      ['Neighbourhood food tour', 'food', 150, 'Old town', 'Skip breakfast, you will eat a lot.'],
      ['Local history walk', 'sight', 90, 'Heritage zone', 'Free walking tours leave from the main square.'],
      ['Rooftop tea break', 'food', 45, 'Heritage zone', 'Good spot to rest your feet.'],
      ['Weekend flea market', 'shopping', 90, 'North side', 'Bargain, but keep it friendly.'],
      ['Night bazaar', 'nightlife', 90, 'Market district', 'Busiest after 9pm.'],
    ],
  },
]

function guessDestination(input) {
  const match = input.match(/\b(?:to|in|around|visit(?:ing)?)\s+([A-Z][\p{L}'-]+(?:\s+[A-Z][\p{L}'-]+)?)/u)
  return match ? match[1] : 'Jaipur'
}

function guessDays(input) {
  const match = input.match(/(\d{1,2})\s*-?\s*(?:day|night)/i)
  const n = match ? Number(match[1]) : 3
  return Math.min(Math.max(n, 1), 10)
}

function toStop([name, category, durationMins, area, note]) {
  return { name, category, durationMins, area, note }
}

export function mockTrip(input) {
  const destination = guessDestination(input)
  const count = guessDays(input)
  const days = Array.from({ length: count }, (_, i) => {
    const t = DAY_TEMPLATES[i % DAY_TEMPLATES.length]
    return { theme: t.theme, startTime: t.startTime, stops: t.stops.map(toStop) }
  })
  return {
    title: `${count} ${count === 1 ? 'day' : 'days'} in ${destination}`,
    destination,
    days,
    tips: [
      'Demo mode: these are sample stops, add an API key for a real plan.',
      'Keep some cash handy for small vendors.',
    ],
  }
}

export function mockDay(day, instruction) {
  const relaxed = /relax|slow|chill|easy|less/i.test(instruction)
  const stops = relaxed ? day.stops.slice(0, Math.max(2, day.stops.length - 2)) : [...day.stops].reverse()
  return {
    theme: relaxed ? `${day.theme} (slower)` : `${day.theme} (reshuffled)`,
    startTime: relaxed ? '10:00' : day.startTime,
    stops: stops.map(({ name, category, durationMins, area, note }) => ({
      name,
      category,
      durationMins: relaxed ? durationMins + 15 : durationMins,
      area,
      note,
    })),
  }
}

export function createMock() {
  return {
    name: 'demo',
    model: 'sample-data',
    async generate({ task, payload, signal }) {
      await wait(900, signal)
      const out = task === 'refine-day' ? mockDay(payload.day, payload.instruction) : mockTrip(payload.input)
      return { text: JSON.stringify(out), finishReason: 'STOP' }
    },
  }
}

export function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(t)
      reject(signal.reason ?? new Error('aborted'))
    })
  })
}
