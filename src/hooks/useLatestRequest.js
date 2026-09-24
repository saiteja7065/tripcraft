import { useCallback, useEffect, useRef, useState } from 'react'

const IDLE = { status: 'idle', stage: null, error: null, startedAt: null }

/**
 * Runs async work where only the newest call is allowed to win.
 *
 * Every run gets an id. Starting a new run aborts the previous one AND bumps
 * the id, so even if the old request resolves anyway (some fetches ignore
 * abort, or it finished a tick before we aborted) its result is thrown away.
 * Without this a slow first request can land after a fast second one and
 * overwrite the newer result.
 */
export function useLatestRequest() {
  const [state, setState] = useState(IDLE)
  const latestId = useRef(0)
  const controllerRef = useRef(null)

  const run = useCallback(async (work) => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const id = ++latestId.current
    const isCurrent = () => id === latestId.current

    setState({ status: 'loading', stage: null, error: null, startedAt: Date.now() })

    const setStage = (stage) => {
      if (isCurrent()) setState((s) => ({ ...s, stage }))
    }

    try {
      const result = await work(controller.signal, setStage)
      if (!isCurrent()) return { stale: true }
      setState(IDLE)
      return { ok: true, result }
    } catch (error) {
      if (!isCurrent()) return { stale: true }
      if (error?.code === 'CANCELLED') {
        setState(IDLE)
        return { cancelled: true }
      }
      setState({ status: 'error', stage: null, error, startedAt: null })
      return { ok: false, error }
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null
    }
  }, [])

  const cancel = useCallback(() => {
    latestId.current += 1 // anything still in flight is now stale
    controllerRef.current?.abort()
    controllerRef.current = null
    setState(IDLE)
  }, [])

  const reset = useCallback(() => setState(IDLE), [])

  // leaving the page mid-request shouldn't leave a fetch running
  useEffect(() => () => controllerRef.current?.abort(), [])

  return { ...state, run, cancel, reset }
}
