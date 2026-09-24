export default function EmptyState() {
  return (
    <section className="empty-state" aria-label="How it works">
      <ol className="steps">
        <li>
          <span className="step-num">1</span>
          <div>
            <strong>Describe it like you'd tell a friend</strong>
            <p className="muted">Where, how many days, who's coming, what you're into.</p>
          </div>
        </li>
        <li>
          <span className="step-num">2</span>
          <div>
            <strong>Get a day-by-day plan</strong>
            <p className="muted">Times are worked out from how long each stop takes.</p>
          </div>
        </li>
        <li>
          <span className="step-num">3</span>
          <div>
            <strong>Make it yours</strong>
            <p className="muted">Reorder, move stops between days, remove, ask AI to tweak a day, share the link.</p>
          </div>
        </li>
      </ol>
    </section>
  )
}
