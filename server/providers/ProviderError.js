// One error type for every provider so the route doesn't care who failed.
// `code` is what the frontend switches on, `fallback` says whether trying
// the next provider is worth it.
export class ProviderError extends Error {
  constructor(code, message, { status = 502, fallback = false } = {}) {
    super(message)
    this.code = code
    this.status = status
    this.fallback = fallback
  }
}

export function fromHttpStatus(provider, status, detail = '') {
  if (status === 429) {
    return new ProviderError('RATE_LIMITED', `${provider} rate limit hit`, { status: 429, fallback: true })
  }
  if (status === 401 || status === 403) {
    return new ProviderError('CONFIG', `${provider} rejected the api key`, { status: 500, fallback: true })
  }
  if (status >= 500) {
    return new ProviderError('UPSTREAM', `${provider} is having trouble (${status})`, { status: 502, fallback: true })
  }
  // 400s are usually our fault (bad model name, bad schema) - still worth a fallback
  return new ProviderError('UPSTREAM', `${provider} refused the request (${status}) ${detail}`.trim(), {
    status: 502,
    fallback: true,
  })
}

// fetch throws different things for timeouts vs dns/socket errors
export function fromFetchError(provider, err) {
  if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
    return new ProviderError('TIMEOUT', `${provider} took too long`, { status: 504 })
  }
  return new ProviderError('UPSTREAM', `couldn't reach ${provider}`, { status: 502, fallback: true })
}
