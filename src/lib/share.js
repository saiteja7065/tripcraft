import { validateTripObject } from './validateResult.js'

// Share links without server storage: the trip is compressed into the URL hash,
// which is never sent to the server. Decoded links are validated like model
// output, since a URL is untrusted input.

const PARAM = 'trip='

function toBase64Url(bytes) {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

async function pipe(bytes, stream) {
  const out = new Blob([bytes]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(out).arrayBuffer())
}

// Ids are regenerated on load, so they're left out of the link.
function slim(trip) {
  return {
    title: trip.title,
    destination: trip.destination,
    tips: trip.tips,
    days: trip.days.map(({ theme, startTime, stops }) => ({
      theme,
      startTime,
      stops: stops.map(({ name, category, durationMins, area, note }) => ({ name, category, durationMins, area, note })),
    })),
  }
}

export async function encodeTrip(trip) {
  const bytes = new TextEncoder().encode(JSON.stringify(slim(trip)))
  // Uncompressed fallback for browsers without CompressionStream.
  if (typeof CompressionStream === 'undefined') return `j${toBase64Url(bytes)}`
  return `z${toBase64Url(await pipe(bytes, new CompressionStream('deflate-raw')))}`
}

export async function decodeTrip(code) {
  try {
    const kind = code[0]
    let bytes = fromBase64Url(code.slice(1))
    if (kind === 'z') bytes = await pipe(bytes, new DecompressionStream('deflate-raw'))
    else if (kind !== 'j') return null
    const result = validateTripObject(JSON.parse(new TextDecoder().decode(bytes)), { allowEmpty: true })
    return result.ok ? result.data : null
  } catch {
    return null
  }
}

export async function buildShareUrl(trip) {
  const code = await encodeTrip(trip)
  return `${location.origin}${location.pathname}#${PARAM}${code}`
}

/** Returns the encoded trip from the current url, or null. */
export function readShareCode() {
  const hash = location.hash.slice(1)
  return hash.startsWith(PARAM) ? hash.slice(PARAM.length) : null
}

export function clearShareCode() {
  if (location.hash) history.replaceState(null, '', location.pathname + location.search)
}
