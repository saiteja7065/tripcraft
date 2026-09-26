import { validateDay, validateTrip } from './validateResult.js'

// The only file in the frontend that talks to the network.
// It never calls the model directly - only our own /api, which holds the key.

const REQUEST_TIMEOUT_MS = 45_000

export class AppError extends Error {
  constructor(code, message, extra = {}) {
    super(message)
    this.code = code
    this.details = extra.details ?? []
    this.retryAfter = extra.retryAfter
    this.status = extra.status
  }
}

// failures where just trying again the same way has a real chance of working
const TRANSIENT = new Set(['NETWORK', 'SERVER'])
// bad model output - worth one "please fix this" round trip before giving up
const REPAIRABLE = new Set(['MALFORMED_JSON', 'WRONG_SHAPE', 'EMPTY_RESPONSE'])

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(t)
      reject(new AppError('CANCELLED', 'Cancelled.'))
    })
  })
}

async function postOnce(path, body, { signal, timeoutMs }) {
  if (isOffline()) throw new AppError('OFFLINE', "You're offline.")

  // one controller for both "user cancelled" and "took too long", but we
  // remember which one fired so the ui can say the right thing
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  const onAbort = () => controller.abort()
  if (signal?.aborted) controller.abort()
  signal?.addEventListener('abort', onAbort)

  let res
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch {
    if (timedOut) throw new AppError('TIMEOUT', 'The request took too long.')
    if (signal?.aborted) throw new AppError('CANCELLED', 'Cancelled.')
    if (isOffline()) throw new AppError('OFFLINE', "You're offline.")
    throw new AppError('NETWORK', "Couldn't reach the server.")
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }

  // a sleeping/restarting host can answer with an html error page, so don't
  // assume the body is json just because we asked for it
  let data = null
  try {
    data = await res.json()
  } catch {
    // handled below
  }

  if (!res.ok) {
    const code = data?.error?.code ?? (res.status === 429 ? 'RATE_LIMITED' : res.status >= 500 ? 'SERVER' : 'BAD_INPUT')
    const retryAfter = data?.error?.retryAfter ?? (Number(res.headers.get('Retry-After')) || undefined)
    throw new AppError(code, data?.error?.message ?? `Server error (${res.status}).`, {
      status: res.status,
      retryAfter,
    })
  }
  if (!data || typeof data.text !== 'string') {
    throw new AppError('SERVER', 'The server sent back something unexpected.')
  }
  return data
}

// one quiet retry for flaky networks / a host that's still waking up.
// timeouts and cancels are not retried - the user is already waiting too long.
async function post(path, body, { signal, timeoutMs = REQUEST_TIMEOUT_MS, onRetry } = {}) {
  try {
    return await postOnce(path, body, { signal, timeoutMs })
  } catch (err) {
    if (!TRANSIENT.has(err.code)) throw err
    onRetry?.()
    await sleep(1200, signal)
    return postOnce(path, body, { signal, timeoutMs })
  }
}

/**
 * Generate a trip, validate it, and if the reply is broken ask the model once
 * to fix its own output. `onStage` lets the loading screen say what's going on.
 */
export async function requestTrip(input, { signal, onStage, simulate } = {}) {
  if (simulate === 'network') {
    // failure lab: fake a dropped connection without touching the server
    await sleep(700, signal)
    throw new AppError('NETWORK', "Couldn't reach the server.")
  }

  onStage?.('generating')
  const first = await post('/api/generate', { task: 'trip', input, simulate }, {
    signal,
    onRetry: () => onStage?.('retrying'),
  })
  let result = validateTrip(first.text)
  let repaired = false

  if (!result.ok && REPAIRABLE.has(result.error.code)) {
    onStage?.('repairing')
    const second = await post(
      '/api/generate',
      {
        task: 'repair',
        input,
        badOutput: first.text.slice(0, 6000),
        problems: result.error.details.length ? result.error.details : [result.error.message],
        simulate,
      },
      { signal },
    )
    result = validateTrip(second.text)
    repaired = result.ok
  }

  if (!result.ok) {
    throw new AppError(result.error.code, result.error.message, { details: result.error.details })
  }

  return {
    trip: result.data,
    warnings: result.warnings,
    meta: { provider: first.provider, model: first.model, demo: first.demo, repaired },
  }
}

export async function requestDayRefine({ trip, dayIndex, instruction }, { signal, simulate } = {}) {
  const day = trip.days[dayIndex]
  const otherStops = trip.days.flatMap((d, i) => (i === dayIndex ? [] : d.stops.map((s) => s.name)))
  const res = await post(
    '/api/generate',
    {
      task: 'refine-day',
      instruction,
      destination: trip.destination || trip.title,
      dayNumber: dayIndex + 1,
      day: { theme: day.theme, startTime: day.startTime, stops: day.stops },
      otherStops,
      simulate,
    },
    { signal },
  )
  const result = validateDay(res.text, dayIndex)
  if (!result.ok) throw new AppError(result.error.code, result.error.message, { details: result.error.details })
  return { day: result.data, warnings: result.warnings }
}

/** Fire-and-forget ping so a sleeping server starts waking up early. */
export async function warmUp() {
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout?.(60_000) })
    return res.ok ? await res.json() : null
  } catch {
    return null
  }
}
