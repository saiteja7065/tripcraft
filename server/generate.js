import { LIMITS } from '../src/types/result.js'
import { refineDayPrompt, repairPrompt, SCHEMAS, tripPrompt } from './prompts.js'
import { generateWithFallback } from './providers/index.js'
import { ProviderError } from './providers/ProviderError.js'
import { createRateLimiter } from './rateLimit.js'
import { SCENARIOS, simulate } from './simulate.js'

// POST /api/generate
// Holds the API key, builds the prompt, calls the model and returns its raw text.
// The reply is intentionally not parsed here: validation happens in the browser
// (src/lib/validateResult.js) so every failure mode is visible to the UI.

const LLM_TIMEOUT_MS = 40_000
const limiter = createRateLimiter({ limit: 30, windowMs: 10 * 60_000 })

class BadInput extends Error {}

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

function readBody(body) {
  const task = body?.task
  if (task === 'trip' || task === 'repair') {
    const input = str(body.input, LIMITS.input)
    if (input.length < 3) throw new BadInput('Tell me a bit more about the trip.')
    if (task === 'trip') return { task, input }
    const problems = Array.isArray(body.problems) ? body.problems.slice(0, 10).map((p) => str(p, 200)) : []
    return { task, input, badOutput: str(body.badOutput, 6000), problems }
  }
  if (task === 'refine-day') {
    const instruction = str(body.instruction, 300)
    if (instruction.length < 3) throw new BadInput('Say what you want changed about this day.')
    if (!body.day || !Array.isArray(body.day.stops)) throw new BadInput('Missing the day to change.')
    return {
      task,
      instruction,
      destination: str(body.destination, LIMITS.destination) || 'unknown',
      dayNumber: Number.isInteger(body.dayNumber) ? body.dayNumber : 1,
      day: {
        theme: str(body.day.theme, LIMITS.theme),
        startTime: str(body.day.startTime, 5),
        stops: body.day.stops.slice(0, LIMITS.maxStopsPerDay).map((s) => ({
          name: str(s?.name, LIMITS.name),
          category: str(s?.category, 20),
          durationMins: Number(s?.durationMins) || 60,
          area: str(s?.area, LIMITS.area),
          note: str(s?.note, LIMITS.note),
        })),
      },
      otherStops: Array.isArray(body.otherStops) ? body.otherStops.slice(0, 60).map((s) => str(s, LIMITS.name)) : [],
    }
  }
  throw new BadInput('Unknown task.')
}

function buildPrompt(p) {
  if (p.task === 'trip') return tripPrompt(p.input)
  if (p.task === 'repair') return repairPrompt(p.input, p.badOutput, p.problems)
  return refineDayPrompt(p)
}

export function createGenerateHandler(providers) {
  return async function handleGenerate(req, res) {
    const started = Date.now()
    let payload
    try {
      payload = readBody(req.body)
    } catch (err) {
      if (err instanceof BadInput) {
        return res.status(400).json({ error: { code: 'BAD_INPUT', message: err.message } })
      }
      throw err
    }

    const scenario = SCENARIOS.includes(req.body.simulate) ? req.body.simulate : null

    if (!scenario) {
      const gate = limiter(req.ip)
      if (!gate.ok) {
        res.set('Retry-After', String(gate.retryAfter))
        return res.status(429).json({
          error: { code: 'RATE_LIMITED', message: 'Too many requests, slow down a little.', retryAfter: gate.retryAfter },
        })
      }
    }

    // Abort the upstream call if the client disconnects.
    const clientGone = new AbortController()
    res.on('close', () => {
      if (!res.writableFinished) clientGone.abort()
    })
    const signal = AbortSignal.any([clientGone.signal, AbortSignal.timeout(LLM_TIMEOUT_MS)])

    try {
      let result
      if (scenario) {
        const text = await simulate(scenario, payload.task, payload, signal)
        result = { text, finishReason: 'STOP', provider: 'failure-lab', model: scenario }
      } else {
        const { system, user } = buildPrompt(payload)
        result = await generateWithFallback(providers.list, {
          system,
          user,
          schema: SCHEMAS[payload.task],
          task: payload.task,
          payload,
          signal,
        })
      }

      console.log(`[generate] ${payload.task} via ${result.provider} ${Date.now() - started}ms`)
      res.json({ ...result, demo: providers.demo })
    } catch (err) {
      if (clientGone.signal.aborted) return

      const e =
        err instanceof ProviderError
          ? err
          : err?.name === 'TimeoutError'
            ? new ProviderError('TIMEOUT', 'the model took too long', { status: 504 })
            : new ProviderError('UPSTREAM', 'something went wrong talking to the model')

      console.warn(`[generate] ${payload.task} failed after ${Date.now() - started}ms: ${e.code} ${e.message}`)
      // Return a generic message; provider details stay in the server log.
      res.status(e.status).json({ error: { code: e.code, message: publicMessage(e.code) } })
    }
  }
}

function publicMessage(code) {
  switch (code) {
    case 'RATE_LIMITED':
      return 'The AI provider is rate limiting us right now.'
    case 'TIMEOUT':
      return 'The AI took too long to answer.'
    case 'BLOCKED':
      return 'The AI refused to answer this one.'
    case 'CONFIG':
      return 'The server is misconfigured (API key problem).'
    default:
      return 'The AI provider had a problem.'
  }
}
