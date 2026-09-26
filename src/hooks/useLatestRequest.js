import { useCallback, useEffect, useRef, useState } from 'react'

const IDLE = { status: 'idle', stage: null, error: null, startedAt: null }

/**
 * Runs async work where only the most recent call can update state.
 *
 * Each run gets an id. Starting a new run aborts the previous one and bumps the
 * id, so a result that still arrives (e.g. it resolved just before the abort) is
 * discarded. Without this, a slow earlier request could overwrite a newer result.
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
    latestId.current += 1 // invalidate any request still in flight
    controllerRef.current?.abort()
    controllerRef.current = null
    setState(IDLE)
  }, [])

  const reset = useCallback(() => setState(IDLE), [])

  // Abort an in-flight request on unmount.
  useEffect(() => () => controllerRef.current?.abort(), [])

  return { ...state, run, cancel, reset }
}
