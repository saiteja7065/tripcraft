import { LIMITS } from '../types/result.js'
import { IconSparkle, IconX } from './Icons.jsx'

const MIN_CHARS = 10

const EXAMPLES = [
  '3 days in Jaipur, love forts, history and street food',
  'A relaxed 4-day Kerala trip with my parents, no long walks',
  'Weekend in Bangalore for a foodie on a budget',
  '5 days in Tokyo, first time, into anime and ramen',
]

export default function PromptInput({ value, onChange, onSubmit, onCancel, loading, online, inputRef }) {
  const trimmed = value.trim()
  const tooShort = trimmed.length < MIN_CHARS
  const nearLimit = value.length > LIMITS.input * 0.9

  function submit(e) {
    e.preventDefault()
    if (loading) return onCancel()
    if (!tooShort && online) onSubmit()
  }

  function onKeyDown(e) {
    // ctrl/cmd + enter to go, plain enter still makes a new line
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(e)
  }

  let hint = 'Where, how long, who with, what you enjoy.'
  if (!online) hint = "You're offline - you can keep typing, planning needs a connection."
  else if (trimmed.length > 0 && tooShort) hint = 'A little more detail please (at least a few words).'

  return (
    <form className="prompt card" onSubmit={submit} aria-busy={loading}>
      <label htmlFor="trip-input" className="prompt-label">
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
          placeholder="e.g. 4 days in Goa with friends in December, beaches by day, good seafood, one lazy day"
          aria-describedby="trip-hint"
        />
        {value && !loading && (
          <button type="button" className="icon-btn prompt-clear" onClick={() => onChange('')} aria-label="Clear text">
            <IconX size={16} />
          </button>
        )}
      </div>

      {!value && (
        <div className="examples" aria-label="Example trips">
          {EXAMPLES.map((ex) => (
            <button type="button" key={ex} className="chip" onClick={() => onChange(ex)}>
              {ex}
            </button>
          ))}
        </div>
      )}

      <div className="prompt-footer">
        <p id="trip-hint" className={`hint ${!online ? 'hint-warn' : ''}`}>
          {hint}
        </p>
        <span className={`counter ${nearLimit ? 'counter-warn' : ''}`} aria-hidden="true">
          {value.length}/{LIMITS.input}
        </span>
        {loading ? (
          <button type="submit" className="btn btn-ghost">
            Cancel
          </button>
        ) : (
          <button type="submit" className="btn btn-primary" disabled={tooShort || !online}>
            <IconSparkle size={16} />
            Plan my trip
          </button>
        )}
      </div>
      <p className="kbd-hint" aria-hidden="true">
        <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to plan
      </p>
    </form>
  )
}
