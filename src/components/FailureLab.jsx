// Shown only with ?lab in the URL. Asks the server to simulate a specific bad
// reply so each failure path can be checked on demand.

const SCENARIOS = [
  ['', 'Off - real request'],
  ['fenced', 'JSON wrapped in ```fences``` + chatter  → should still work'],
  ['partial', 'Some junk fields  → renders with warnings'],
  ['flaky', 'Broken first, fine on repair  → auto-repaired'],
  ['malformed', 'Cut-off JSON, twice  → error + retry'],
  ['wrong-shape', 'Valid JSON, wrong shape  → error'],
  ['empty', 'Empty reply  → error'],
  ['not-a-trip', 'Model says "not a trip"  → friendly error'],
  ['slow', '14s delay  → slow-loading messages'],
  ['hang', 'Never answers  → timeout at 45s'],
  ['rate-limit', '429 from provider'],
  ['server-error', 'Provider outage (502)'],
  ['network', 'Connection drops (client side)'],
]

export default function FailureLab({ value, onChange }) {
  return (
    <div className={`lab card ${value ? 'lab-on' : ''}`}>
      <label htmlFor="lab-select">
        <strong>Failure lab</strong> <span className="muted small">- next request will simulate:</span>
      </label>
      <select id="lab-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {SCENARIOS.map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </div>
  )
}
