// Tiny in-memory limiter, per ip. The point isn't security, it's making sure
// one person hammering the button can't burn the whole free-tier quota for
// everyone else (and the evaluators). Resets on restart, which is fine here.

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

    // keep the map from growing forever on a long-running instance
    if (hits.size > 5000) {
      for (const [k, times] of hits) {
        if (times.every((t) => now - t >= windowMs)) hits.delete(k)
      }
    }
    return { ok: true }
  }
}
