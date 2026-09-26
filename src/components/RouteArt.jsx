import { useId } from 'react'

// Decorative flight path. The plane follows the path via <animateMotion>,
// so it scales with the SVG.

const ROUTE_PATH = 'M10 90 C 80 10, 170 10, 230 60 S 360 120, 410 30'

const reduceMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

export default function RouteArt({ className = '', flying = true, duration = 4 }) {
  // Unique per instance; useId's punctuation is stripped because it breaks url(#...).
  const gradId = 'route' + useId().replace(/[^a-z0-9]/gi, '')
  return (
    <div className={`route-art ${className}`} aria-hidden="true">
      <svg viewBox="0 0 420 110" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id={gradId} x1="0" x2="1">
            <stop offset="0%" stopColor="var(--sun-1)" />
            <stop offset="100%" stopColor="var(--sun-2)" />
          </linearGradient>
        </defs>
        <path d={ROUTE_PATH} className="route-shadow" />
        <path d={ROUTE_PATH} className="route-dash" stroke={`url(#${gradId})`} />
        <circle cx="10" cy="90" r="5" className="route-dot" />
        <circle cx="410" cy="30" r="12" className="route-pulse" />
        <circle cx="410" cy="30" r="6" className="route-pin" />
        {flying && !reduceMotion && (
          <g className="route-plane">
            {/* Drawn pointing right so rotate="auto" aligns it with the path. */}
            <path d="M14 0 L6 -2 L-1 -2 L-6 -10 L-9 -10 L-5 -2 L-10 -2 L-13 -6 L-15 -6 L-13 0 L-15 6 L-13 6 L-10 2 L-5 2 L-9 10 L-6 10 L-1 2 L6 2 Z" />
            <animateMotion dur={`${duration}s`} repeatCount="indefinite" rotate="auto" path={ROUTE_PATH} />
          </g>
        )}
      </svg>
    </div>
  )
}
