import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import FailureLab from './components/FailureLab.jsx'
import Header from './components/Header.jsx'
import { IconWifiOff } from './components/Icons.jsx'
import PromptInput from './components/PromptInput.jsx'
import RouteArt from './components/RouteArt.jsx'
import ResultView from './components/ResultView.jsx'
import Toast from './components/Toast.jsx'
import { useItinerary } from './hooks/useItinerary.js'
import { useLatestRequest } from './hooks/useLatestRequest.js'
import { useOnlineStatus } from './hooks/useOnlineStatus.js'
import { requestDayRefine, requestTrip, warmUp } from './lib/api.js'
import { clearShareCode, decodeTrip, readShareCode } from './lib/share.js'
import { loadSession, saveSession } from './lib/storage.js'

const labEnabled = new URLSearchParams(location.search).has('lab')

export default function App() {
  const [saved] = useState(loadSession)
  const [input, setInput] = useState(saved?.input ?? '')
  const [warnings, setWarnings] = useState([])
  const [meta, setMeta] = useState(null)
  const [serverInfo, setServerInfo] = useState(null)
  const [scenario, setScenario] = useState('')
  const [toast, setToast] = useState(null)
  const [justGenerated, setJustGenerated] = useState(false)
  const [editing, setEditing] = useState(false)

  const itinerary = useItinerary(saved?.trip ?? null)
  const request = useLatestRequest()
  const online = useOnlineStatus()
  const inputRef = useRef(null)

  const { trip, undo, load, clear, actions } = itinerary
  const { run, cancel, reset } = request

  // Callbacks read the trip through a ref so they stay referentially stable
  // across edits and don't re-render every memoised day view.
  const tripRef = useRef(trip)
  useLayoutEffect(() => {
    tripRef.current = trip
  }, [trip])

  // Wake the server early (free hosting sleeps when idle).
  useEffect(() => {
    warmUp().then(setServerInfo)
  }, [])

  // A share link takes priority over the locally saved trip.
  useEffect(() => {
    const code = readShareCode()
    if (!code) return
    // Decoding is async; ignore the result if the effect was cleaned up first
    // (Strict Mode runs effects twice in development).
    let cancelled = false
    decodeTrip(code).then((shared) => {
      if (cancelled) return
      clearShareCode()
      if (shared) {
        const hadTrip = Boolean(tripRef.current)
        load(shared, { keepHistory: true })
        setInput(shared.title)
        setToast({
          message: hadTrip ? 'Opened a shared trip. Your own trip is one undo away.' : 'Opened a shared trip. Edits stay on your device.',
          action: hadTrip ? { label: 'Undo', run: undo } : undefined,
        })
      } else {
        setToast({ message: "That share link is broken or incomplete, so we couldn't open it." })
      }
    })
    return () => {
      cancelled = true
    }
  }, [load, undo])

  // Persist input and trip so a reload loses nothing.
  useEffect(() => {
    const t = setTimeout(() => saveSession({ input, trip }), 300)
    return () => clearTimeout(t)
  }, [input, trip])

  const closeToast = useCallback(() => setToast(null), [])

  const generate = useCallback(async () => {
    const text = input.trim()
    if (!text) return
    setJustGenerated(false)
    const out = await run((signal, setStage) =>
      requestTrip(text, { signal, onStage: setStage, simulate: scenario || undefined }),
    )
    if (out.ok) {
      load(out.result.trip)
      setWarnings(out.result.warnings)
      setMeta(out.result.meta)
      setJustGenerated(true)
      setEditing(false)
    }
  }, [input, run, scenario, load])

  // Retry automatically when the connection returns after an offline/network
  // failure. Only `online` triggers the effect, so a failed retry can't loop.
  const lastError = request.status === 'error' ? request.error?.code : null
  const reconnectRetry = useRef(null)
  useEffect(() => {
    reconnectRetry.current = lastError === 'OFFLINE' || lastError === 'NETWORK' ? generate : null
  })
  useEffect(() => {
    if (online) reconnectRetry.current?.()
  }, [online])

  const refineDay = useCallback(
    async (dayId, dayIndex, instruction, signal) => {
      const current = tripRef.current
      if (!current) return
      const { day, warnings: w } = await requestDayRefine(
        { trip: current, dayIndex, instruction },
        { signal, simulate: scenario || undefined },
      )
      actions.replaceDay(dayId, day)
      setToast({
        message: w.length ? `Day ${dayIndex + 1} updated (tidied ${w.length} small issue${w.length > 1 ? 's' : ''}).` : `Day ${dayIndex + 1} updated.`,
        action: { label: 'Undo', run: undo },
      })
    },
    [actions, scenario, undo],
  )

  const removeStop = useCallback(
    (stop) => {
      actions.remove(stop.id)
      setToast({ message: `Removed "${stop.name}"`, action: { label: 'Undo', run: undo } })
    },
    [actions, undo],
  )

  const newTrip = useCallback(() => {
    clear()
    setWarnings([])
    setMeta(null)
    setInput('')
    setEditing(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [clear])

  const expandPrompt = useCallback(() => {
    setEditing(true)
    requestAnimationFrame(() => {
      const el = inputRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    })
  }, [])

  const editRequest = useCallback(() => {
    reset()
    setEditing(true)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
  }, [reset])

  // Ctrl/Cmd+Z undoes itinerary edits, except inside text fields.
  useEffect(() => {
    function onKey(e) {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z' || e.shiftKey) return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      e.preventDefault()
      undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo])

  const loading = request.status === 'loading'
  const landing = !trip && request.status === 'idle'
  const collapsed = Boolean(trip) && !editing && !loading

  return (
    <div className={`app ${landing ? 'is-landing' : ''} ${trip ? 'has-trip' : 'is-intro'}`}>
      <a className="skip-link" href="#trip-input">
        Skip to trip input
      </a>
      <div className="backdrop" aria-hidden="true" />
      <Header demo={serverInfo?.demo} onHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />

      {!online && (
        <div className="offline-banner" role="status">
          <IconWifiOff size={16} /> You're offline. Your trip is saved on this device, planning resumes when you're back.
        </div>
      )}

      <main className="container">
        {!trip && (
          <div className="hero">
            <p className="eyebrow">AI trip planner</p>
            <h1>
              Say where. <em>We'll craft the days.</em>
            </h1>
            <p className="hero-sub">
              Describe a trip in one sentence and get a day-by-day plan you can drag, reshape and share.
            </p>
            {landing && <RouteArt className="route-hero" duration={5} />}
          </div>
        )}

        <PromptInput
          inputRef={inputRef}
          value={input}
          onChange={setInput}
          onSubmit={generate}
          onCancel={cancel}
          loading={loading}
          online={online}
          collapsed={collapsed}
          onExpand={expandPrompt}
        />

        {labEnabled && <FailureLab value={scenario} onChange={setScenario} />}

        <ResultView
          request={request}
          trip={trip}
          online={online}
          onRetry={generate}
          onEditRequest={editRequest}
          warnings={warnings}
          meta={meta}
          canUndo={itinerary.canUndo}
          lastChange={itinerary.lastChange}
          actions={actions}
          onUndo={undo}
          onNewTrip={newTrip}
          onRemoveStop={removeStop}
          onRefineDay={refineDay}
          onToast={setToast}
          focusOnMount={justGenerated}
        />
      </main>

      <footer className="site-footer">
        Tripcraft · AI plans can be wrong, check opening hours before you go.
      </footer>

      <Toast toast={toast} onClose={closeToast} />
    </div>
  )
}
