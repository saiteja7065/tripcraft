// Common error type for all providers. `code` is what the client handles;
// `fallback` says whether the next provider is worth trying.
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
  // Usually a request problem (model name, schema); another provider may still succeed.
  return new ProviderError('UPSTREAM', `${provider} refused the request (${status}) ${detail}`.trim(), {
    status: 502,
    fallback: true,
  })
}

// Distinguishes timeouts from connection errors.
export function fromFetchError(provider, err) {
  if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
    return new ProviderError('TIMEOUT', `${provider} took too long`, { status: 504 })
  }
  return new ProviderError('UPSTREAM', `couldn't reach ${provider}`, { status: 502, fallback: true })
}
