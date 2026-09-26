import { useState } from 'react'
import { useLatestRequest } from '../hooks/useLatestRequest.js'
import { describeError } from '../lib/errors.js'
import { IconSparkle } from './Icons.jsx'

const SUGGESTIONS = ['Make it more relaxed', 'More local food', 'Add something for the evening']

// Follow-up prompt that rewrites a single day instead of regenerating the trip.
// Has its own request state, so other days stay editable while it runs.
export default function RefineDay({ dayNumber, onRefine, online }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const req = useLatestRequest()
  const loading = req.status === 'loading'

  async function submit(instruction) {
    const value = (instruction ?? text).trim()
    if (value.length < 3 || !online) return
    const out = await req.run((signal) => onRefine(value, signal))
    if (out.ok) {
      setText('')
      setOpen(false)
    }
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost btn-sm refine-open" onClick={() => setOpen(true)}>
        <IconSparkle size={14} /> Ask AI to tweak day {dayNumber}
      </button>
    )
  }

  const err = req.status === 'error' ? describeError(req.error) : null

  return (
    <form
      className="refine"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      aria-busy={loading}
    >
      <label className="sr-only" htmlFor={`refine-${dayNumber}`}>
        How should day {dayNumber} change?
      </label>
      <div className="refine-row">
        <input
          id={`refine-${dayNumber}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`How should day ${dayNumber} change?`}
          maxLength={300}
          disabled={loading}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Escape') loading ? req.cancel() : setOpen(false)
          }}
        />
        {loading ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={req.cancel}>
            Cancel
          </button>
        ) : (
          <button type="submit" className="btn btn-primary btn-sm" disabled={text.trim().length < 3 || !online}>
            Update
          </button>
        )}
      </div>

      {!loading && !text && (
        <div className="examples small-chips">
          {SUGGESTIONS.map((s) => (
            <button type="button" className="chip" key={s} onClick={() => submit(s)} disabled={!online}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div aria-live="polite">
        {loading && <p className="muted small refine-status">Rewriting day {dayNumber}... the rest of your trip stays as is.</p>}
        {err && (
          <p className="inline-error small" role="alert">
            {err.title}. {err.retry ? 'Your day is unchanged - try again.' : err.hint}
          </p>
        )}
      </div>

      {!loading && (
        <button type="button" className="link-btn small" onClick={() => setOpen(false)}>
          Close
        </button>
      )}
    </form>
  )
}
