import { CATEGORIES, LIMITS, NOT_A_TRIP } from '../src/types/result.js'

// Prompts are split per task instead of one giant prompt. The first call only
// plans the trip; if the output comes back broken, a second smaller call only
// fixes the json. Cheaper on tokens and easier to debug.

const STOP_SHAPE = `{
  "name": string,            // a real, specific place or activity, max ${LIMITS.name} chars
  "category": one of ${CATEGORIES.map((c) => `"${c}"`).join(' | ')},
  "durationMins": integer,   // realistic time spent there, ${LIMITS.minDuration}-${LIMITS.maxDuration}
  "area": string,            // neighbourhood or locality, "" if unsure
  "note": string             // one short practical tip, max ${LIMITS.note} chars
}`

const DAY_SHAPE = `{
  "theme": string,           // 2-5 words, e.g. "Old city and bazaars"
  "startTime": "HH:MM",      // 24h time the day starts
  "stops": [Stop]            // 3-6 stops, in visiting order, meals included
}`

const TRIP_SHAPE = `{
  "title": string,
  "destination": string,
  "days": [Day],             // one entry per day, max ${LIMITS.maxDays}
  "tips": [string]           // 2-4 short practical tips for the whole trip
}`

const RULES = `Rules:
- Reply with ONE json object and nothing else. No markdown, no code fences, no comments.
- Use exactly the keys shown. No extra keys.
- Keep stops in the order they should be visited, and keep each day realistic (roughly 8-11 hours).
- If the user asks for more than ${LIMITS.maxDays} days, plan the first ${LIMITS.maxDays} and say so in tips.
- If the text is not about planning a trip at all, reply with {"error": "${NOT_A_TRIP}", "message": "<one short sentence why>"} instead.`

export function tripPrompt(input) {
  return {
    system: `You plan travel itineraries and reply in strict JSON.

Trip shape:
${TRIP_SHAPE}

Day shape:
${DAY_SHAPE}

Stop shape:
${STOP_SHAPE}

${RULES}`,
    user: `Plan this trip:\n"""\n${input}\n"""`,
  }
}

// second attempt when the first reply didn't parse or had the wrong shape.
// we send back what went wrong so the model fixes that instead of starting over.
export function repairPrompt(input, badOutput, problems) {
  const list = problems.length ? problems.map((p) => `- ${p}`).join('\n') : '- the reply was not valid JSON'
  return {
    system: `You fix broken JSON for a travel planner. Reply with ONE valid json object only, no markdown.

Trip shape:
${TRIP_SHAPE}

Day shape:
${DAY_SHAPE}

Stop shape:
${STOP_SHAPE}`,
    user: `The original request was:
"""
${input}
"""

The previous reply had these problems:
${list}

Previous reply (may be cut off):
"""
${badOutput}
"""

Return the corrected trip as JSON. If the previous reply is unusable, plan the trip again from the request.`,
  }
}

// refine a single day without touching the rest of the trip
export function refineDayPrompt({ destination, dayNumber, day, instruction, otherStops }) {
  return {
    system: `You edit one day of an existing travel itinerary and reply in strict JSON.
Reply with ONE json object in this Day shape and nothing else:
${DAY_SHAPE}

Stop shape:
${STOP_SHAPE}

- Keep what the user didn't ask to change.
- Don't repeat places that are already on other days.
- If the instruction makes no sense for a trip day, reply with {"error": "${NOT_A_TRIP}", "message": "<why>"}.`,
    user: `Destination: ${destination}
Day ${dayNumber} right now:
${JSON.stringify(day)}

Already on other days: ${otherStops.length ? otherStops.join(', ') : 'nothing'}

Change requested:
"""
${instruction}
"""`,
  }
}

// gemini can enforce a schema on its side. we still validate on the client,
// this just makes a bad reply less likely.
const stopSchema = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING' },
    category: { type: 'STRING', enum: CATEGORIES },
    durationMins: { type: 'INTEGER' },
    area: { type: 'STRING' },
    note: { type: 'STRING' },
  },
  required: ['name', 'category', 'durationMins'],
  propertyOrdering: ['name', 'category', 'durationMins', 'area', 'note'],
}

const daySchema = {
  type: 'OBJECT',
  properties: {
    theme: { type: 'STRING' },
    startTime: { type: 'STRING' },
    stops: { type: 'ARRAY', items: stopSchema },
    error: { type: 'STRING' },
    message: { type: 'STRING' },
  },
  propertyOrdering: ['theme', 'startTime', 'stops', 'error', 'message'],
}

const tripSchema = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    destination: { type: 'STRING' },
    days: { type: 'ARRAY', items: { ...daySchema, required: ['theme', 'startTime', 'stops'] } },
    tips: { type: 'ARRAY', items: { type: 'STRING' } },
    error: { type: 'STRING' },
    message: { type: 'STRING' },
  },
  propertyOrdering: ['title', 'destination', 'days', 'tips', 'error', 'message'],
}

export const SCHEMAS = { trip: tripSchema, repair: tripSchema, 'refine-day': daySchema }
