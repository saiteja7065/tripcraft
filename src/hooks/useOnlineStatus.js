import { useSyncExternalStore } from 'react'

function subscribe(cb) {
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => {
    window.removeEventListener('online', cb)
    window.removeEventListener('offline', cb)
  }
}

// navigator.onLine can say "online" on a network with no real internet,
// so this is only used for the obvious case. real failures still come
// through the fetch error handling.
export function useOnlineStatus() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  )
}
