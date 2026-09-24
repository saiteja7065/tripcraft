import { fromFetchError, fromHttpStatus } from './ProviderError.js'

// Groq and OpenRouter both speak the OpenAI chat format, so one adapter
// covers both - only the base url, key and model change.

const BASE_URLS = {
  groq: 'https://api.groq.com/openai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
}

export function createOpenAICompatible(name, { apiKey, model }) {
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
            // json mode - no schema enforcement here, just "valid json".
            // wrong shapes can still come through, the client validator catches those.
            response_format: { type: 'json_object' },
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
