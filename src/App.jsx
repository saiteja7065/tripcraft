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

  // callbacks read the trip through a ref so their identity doesn't change on
  // every edit - otherwise every day view re-renders whenever any stop moves
  const tripRef = useRef(trip)
  useLayoutEffect(() => {
    tripRef.current = trip
  }, [trip])

  // start waking the server up (render free tier sleeps) while the user types
  useEffect(() => {
    warmUp().then(setServerInfo)
  }, [])

  // opened from a share link? that wins over whatever was saved locally
  useEffect(() => {
    const code = readShareCode()
    if (!code) return
    // decoding is async; if the effect is torn down first (strict mode runs
    // effects twice in dev) the stale result must not load the trip again
    let cancelled = false
    decodeTrip(code).then((shared) => {
      if (cancelled) return
      clearShareCode()
      if (shared) {
        const hadTrip = Boolean(tripRef.current)
        load(shared, { keepHistory: true })
        // the collapsed bar shows the request text; the old one would be misleading
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

  // keep the latest input + trip so a refresh (or a dropped tab on mobile) loses nothing
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

  // failed because the connection dropped? try again by itself the moment
  // the browser says we're back online, instead of waiting for a click
  // only the online flag triggers this; the rest is read through a ref so a
  // failing retry can't re-trigger itself in a loop
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

  // ctrl/cmd+z anywhere except while typing - typing fields have their own undo
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
  // the input folds into a one-line bar once there's a trip to look at
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
