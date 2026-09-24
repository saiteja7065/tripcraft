import { CATEGORY_ICONS, IconGrip, IconShare, IconSparkle } from './Icons.jsx'

const FEATURES = [
  {
    icon: <IconSparkle size={18} />,
    title: 'One sentence in',
    text: 'Where, how long, who with, what you love. That is all it needs.',
  },
  {
    icon: <IconGrip size={18} />,
    title: 'Shape it by hand',
    text: 'Drag stops around, drop them on another day, or ask AI to redo a single day.',
  },
  {
    icon: <IconShare size={18} />,
    title: 'Share with a link',
    text: 'The whole plan lives in the link. No sign up, nothing stored on a server.',
  },
]

const SightIcon = CATEGORY_ICONS.sight
const FoodIcon = CATEGORY_ICONS.food
const NatureIcon = CATEGORY_ICONS.nature

export default function EmptyState() {
  return (
    <section className="features" aria-label="How it works">
      {FEATURES.map((f) => (
        <article key={f.title} className="feature">
          <span className="feature-icon">{f.icon}</span>
          <h2>{f.title}</h2>
          <p>{f.text}</p>
        </article>
      ))}

      {/* a tiny fake itinerary so first-time visitors see what they'll get */}
      <div className="preview-card" aria-hidden="true">
        <p className="eyebrow">Preview</p>
        <p className="preview-title">Day 1 · Forts & old city</p>
        {[
          ['9:00', 'Amber Fort', 'cat-sight', SightIcon],
          ['11:50', 'Lunch at LMB', 'cat-food', FoodIcon],
          ['2:10', 'Nahargarh sunset walk', 'cat-nature', NatureIcon],
        ].map(([t, name, cat, Icon]) => (
          <div key={name} className={`preview-row ${cat}`}>
            <span className="preview-time">{t}</span>
            <span className="tl-node small">
              <Icon size={13} />
            </span>
            <span className="preview-name">{name}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
