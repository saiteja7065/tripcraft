import { fromFetchError, fromHttpStatus } from './ProviderError.js'

// Groq and OpenRouter share the OpenAI chat format; only the base URL differs.

const BASE_URLS = {
  groq: 'https://api.groq.com/openai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
}

export function createOpenAICompatible(name, { apiKey, model, reasoningEffort }) {
  return {
    name,
    model,
    async generate({ system, user, signal }) {
      let res
      try {
        res = await fetch(`${BASE_URLS[name]}/chat/completions`, {
          method: 'POST',
          signal,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model,
            temperature: 0.7,
            max_tokens: 8192,
            // JSON mode guarantees syntax, not shape; the client validator checks the shape.
            response_format: { type: 'json_object' },
            // For reasoning models. "low" measured ~3x faster and ~3x fewer tokens
            // with no visible quality loss, which matters under a tokens/min limit.
            ...(reasoningEffort && { reasoning_effort: reasoningEffort }),
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
          }),
        })
      } catch (err) {
        throw fromFetchError(name, err)
      }

      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        throw fromHttpStatus(name, res.status, detail.slice(0, 200))
      }

      const data = await res.json()
      const choice = data.choices?.[0]
      return { text: choice?.message?.content ?? '', finishReason: choice?.finish_reason ?? 'unknown' }
    },
  }
}
