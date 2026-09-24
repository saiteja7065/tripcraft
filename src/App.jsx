import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import FailureLab from './components/FailureLab.jsx'
import Header from './components/Header.jsx'
import { IconWifiOff } from './components/Icons.jsx'
import PromptInput from './components/PromptInput.jsx'
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

  const itinerary = useItinerary(saved?.trip ?? null)
  const request = useLatestRequest()
  const online = useOnlineStatus()
  const inputRef = useRef(null)

  const { trip, undo, load, clear, actions } = itinerary
  const { run, cancel, reset } = request

  // start waking the server up (render free tier sleeps) while the user types
  useEffect(() => {
    warmUp().then(setServerInfo)
  }, [])

  // opened from a share link? that wins over whatever was saved locally
  useEffect(() => {
    const code = readShareCode()
    if (!code) return
    decodeTrip(code).then((shared) => {
      clearShareCode()
      if (shared) {
        load(shared)
        setToast({ message: 'Opened a shared trip. Edits stay on your device.' })
      } else {
        setToast({ message: "That share link is broken or incomplete, so we couldn't open it." })
      }
    })
  }, [load])

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
    }
  }, [input, run, scenario, load])

  // refineDay reads the trip through a ref so its identity doesn't change on
  // every edit - otherwise every DayCard re-renders whenever any stop moves
  const tripRef = useRef(trip)
  useLayoutEffect(() => {
    tripRef.current = trip
  }, [trip])

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
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [clear])

  const editRequest = useCallback(() => {
    reset()
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

  return (
    <div className="app">
      <a className="skip-link" href="#trip-input">
        Skip to trip input
      </a>
      <Header demo={serverInfo?.demo} />

      {!online && (
        <div className="offline-banner" role="status">
          <IconWifiOff size={16} /> You're offline. Your trip is saved on this device, planning resumes when you're back.
        </div>
      )}

      <main className="container">
        <div className="intro">
          <h1>Plan a trip in one sentence.</h1>
          <p className="muted">Then reshape it: reorder, move stops between days, remove, or ask AI to tweak a single day.</p>
        </div>

        <PromptInput
          inputRef={inputRef}
          value={input}
          onChange={setInput}
          onSubmit={generate}
          onCancel={cancel}
          loading={loading}
          online={online}
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

      <footer className="site-footer muted small">
        Built for the Flam frontend assignment · AI plans can be wrong, check opening hours before you go.
      </footer>

      <Toast toast={toast} onClose={closeToast} />
    </div>
  )
}
