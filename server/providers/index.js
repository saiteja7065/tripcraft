import { createGemini } from './gemini.js'
import { createOpenAICompatible } from './openaiCompatible.js'
import { createMock } from './mock.js'
import { ProviderError } from './ProviderError.js'

// Builds the list of providers we can use, preferred one first.
// Only providers with a key make it in. No keys at all -> demo mode.
export function buildProviders(env = process.env) {
  const available = {}
  if (env.GEMINI_API_KEY) {
    available.gemini = createGemini({ apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL || 'gemini-2.5-flash' })
  }
  if (env.GROQ_API_KEY) {
    available.groq = createOpenAICompatible('groq', {
      apiKey: env.GROQ_API_KEY,
      model: env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    })
  }
  if (env.OPENROUTER_API_KEY) {
    available.openrouter = createOpenAICompatible('openrouter', {
      apiKey: env.OPENROUTER_API_KEY,
      model: env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
    })
  }

  const preferred = (env.LLM_PROVIDER || 'gemini').toLowerCase()
  const ordered = Object.keys(available).sort((a, b) => (a === preferred ? -1 : b === preferred ? 1 : 0))
  const list = ordered.map((k) => available[k])

  return list.length ? { list, demo: false } : { list: [createMock()], demo: true }
}

// Try providers in order. Move on only for errors where another provider
// could plausibly do better (rate limit, outage, bad key). A timeout doesn't
// fall through - the client is already close to giving up by then.
export async function generateWithFallback(providers, request) {
  let lastError
  for (const provider of providers) {
    try {
      const out = await provider.generate(request)
      return { ...out, provider: provider.name, model: provider.model }
    } catch (err) {
      lastError = err instanceof ProviderError ? err : new ProviderError('UPSTREAM', err.message)
      console.warn(`[llm] ${provider.name} failed: ${lastError.code} - ${lastError.message}`)
      if (!lastError.fallback) break
    }
  }
  throw lastError
}
