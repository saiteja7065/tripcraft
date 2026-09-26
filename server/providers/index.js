import { createGemini } from './gemini.js'
import { createOpenAICompatible } from './openaiCompatible.js'
import { createMock } from './mock.js'
import { ProviderError } from './ProviderError.js'

// Providers that have a key, preferred one first. No keys at all means demo mode.
export function buildProviders(env = process.env) {
  const available = {}
  if (env.GEMINI_API_KEY) {
    available.gemini = createGemini({
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
      thinkingLevel: env.GEMINI_THINKING_LEVEL || undefined,
    })
  }
  if (env.GROQ_API_KEY) {
    available.groq = createOpenAICompatible('groq', {
      apiKey: env.GROQ_API_KEY,
      model: env.GROQ_MODEL || 'openai/gpt-oss-120b',
      reasoningEffort: env.GROQ_REASONING_EFFORT || undefined,
    })
  }
  if (env.OPENROUTER_API_KEY) {
    available.openrouter = createOpenAICompatible('openrouter', {
      apiKey: env.OPENROUTER_API_KEY,
      model: env.OPENROUTER_MODEL || 'google/gemma-4-31b-it:free',
    })
  }

  const preferred = (env.LLM_PROVIDER || 'groq').toLowerCase()
  const ordered = Object.keys(available).sort((a, b) => (a === preferred ? -1 : b === preferred ? 1 : 0))
  const list = ordered.map((k) => available[k])

  return list.length ? { list, demo: false } : { list: [createMock()], demo: true }
}

// Tries providers in order, falling through only when another provider could
// plausibly succeed (rate limit, outage, rejected key). Timeouts do not fall
// through: by then the client is close to its own deadline.
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
