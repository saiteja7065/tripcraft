// crypto.randomUUID is only available in secure contexts (HTTPS/localhost),
// so fall back when the app is opened over plain HTTP (e.g. a LAN address).
let counter = 0

export function makeId(prefix = 'id') {
  if (globalThis.crypto?.randomUUID) {
    try {
      return `${prefix}_${globalThis.crypto.randomUUID().slice(0, 8)}`
    } catch {
      // not a secure context
    }
  }
  counter += 1
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}
