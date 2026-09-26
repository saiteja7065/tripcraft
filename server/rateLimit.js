// Per-IP sliding-window limiter, in memory. Protects the shared free-tier quota
// from a single client; it resets on restart, which is acceptable here.

export function createRateLimiter({ limit, windowMs }) {
  const hits = new Map()

  return function check(key) {
    const now = Date.now()
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
    if (recent.length >= limit) {
      hits.set(key, recent)
      const retryAfter = Math.ceil((windowMs - (now - recent[0])) / 1000)
      return { ok: false, retryAfter }
    }
    recent.push(now)
    hits.set(key, recent)

    // Prune idle entries so the map can't grow without bound.
    if (hits.size > 5000) {
      for (const [k, times] of hits) {
        if (times.every((t) => now - t >= windowMs)) hits.delete(k)
      }
    }
    return { ok: true }
  }
}
