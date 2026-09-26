import { LIMITS } from '../types/result.js'
import { IconEdit, IconSparkle, IconX } from './Icons.jsx'

const MIN_CHARS = 10

const EXAMPLES = [
  '3 days in Jaipur, love forts, history and street food',
  'A relaxed 4-day Kerala trip with my parents',
  'Weekend in Bangalore for a foodie on a budget',
  '5 days in Tokyo, first time, anime and ramen',
]

export default function PromptInput({ value, onChange, onSubmit, onCancel, loading, online, inputRef, collapsed, onExpand }) {
  const trimmed = value.trim()
  const tooShort = trimmed.length < MIN_CHARS
  const nearLimit = value.length > LIMITS.input * 0.9

  if (collapsed) {
    return (
      <button type="button" className="prompt-collapsed" onClick={onExpand} aria-label={`Edit your request: ${value}`}>
        <IconSparkle size={16} />
        <span className="prompt-collapsed-text">{value || 'Plan another trip'}</span>
        <span className="prompt-collapsed-cta">
          <IconEdit size={14} /> Edit
        </span>
      </button>
    )
  }

  function submit(e) {
    e.preventDefault()
    if (loading) return onCancel()
    if (!tooShort && online) onSubmit()
  }

  function onKeyDown(e) {
    // Ctrl/Cmd+Enter submits; Enter alone inserts a newline.
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(e)
  }

  let hint = 'Where, how long, who with, what you enjoy.'
  if (!online) hint = "You're offline. Keep typing, planning needs a connection."
  else if (trimmed.length > 0 && tooShort) hint = 'A little more detail please.'

  return (
    <form className="prompt" onSubmit={submit} aria-busy={loading}>
      <label htmlFor="trip-input" className="sr-only">
        Describe your trip
      </label>
      <div className="prompt-field">
        <textarea
          id="trip-input"
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          maxLength={LIMITS.input}
          rows={3}
          placeholder="4 days in Goa with friends in December. Beaches by day, great seafood, one lazy day..."
          aria-describedby="trip-hint"
          disabled={loading}
        />
        {value && !loading && (
          <button type="button" className="icon-btn prompt-clear" onClick={() => onChange('')} aria-label="Clear text">
            <IconX size={16} />
          </button>
        )}
      </div>

      <div className="prompt-footer">
        <p id="trip-hint" className={`hint ${!online ? 'hint-warn' : ''}`}>
          {hint}
          <span className={`counter ${nearLimit ? 'counter-warn' : ''}`} aria-hidden="true">
            {value.length}/{LIMITS.input}
          </span>
        </p>
        {loading ? (
          <button type="submit" className="btn btn-ghost">
            Cancel
          </button>
        ) : (
          <button type="submit" className="btn btn-primary btn-lg" disabled={tooShort || !online}>
            <IconSparkle size={17} />
            Plan my trip
            <kbd className="btn-kbd" aria-hidden="true">
              Ctrl ↵
            </kbd>
          </button>
        )}
      </div>

      {!value && !loading && (
        <div className="examples" aria-label="Try an example">
          <span className="examples-label">Try</span>
          {EXAMPLES.map((ex) => (
            <button type="button" key={ex} className="chip" onClick={() => onChange(ex)}>
              {ex}
            </button>
          ))}
        </div>
      )}
    </form>
  )
}
