import { ProviderError, fromFetchError, fromHttpStatus } from './ProviderError.js'

// Plain REST call, no SDK - it's one POST and this way there's nothing hidden.
// docs: https://ai.google.dev/api/generate-content

export function createGemini({ apiKey, model, thinkingLevel }) {
  return {
    name: 'gemini',
    model,
    async generate({ system, user, schema, signal }) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
      let res
      try {
        res = await fetch(url, {
          method: 'POST',
          signal,
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: user }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 8192,
              responseMimeType: 'application/json',
              ...(schema && { responseSchema: schema }),
              // gemini 3 models think by default; not every model accepts every level
              ...(thinkingLevel && { thinkingConfig: { thinkingLevel } }),
            },
          }),
        })
      } catch (err) {
        throw fromFetchError('gemini', err)
      }

      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        throw fromHttpStatus('gemini', res.status, detail.slice(0, 200))
      }

      const data = await res.json()
      if (data.promptFeedback?.blockReason) {
        throw new ProviderError('BLOCKED', 'the model refused this request', { status: 422 })
      }

      const candidate = data.candidates?.[0]
      if (candidate?.finishReason === 'SAFETY') {
        throw new ProviderError('BLOCKED', 'the model refused this request', { status: 422 })
      }

      // the text can come split across parts, glue them back
      const text = (candidate?.content?.parts ?? []).map((p) => p.text ?? '').join('')
      return { text, finishReason: candidate?.finishReason ?? 'UNKNOWN' }
    },
  }
}
