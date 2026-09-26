import { useEffect, useState } from 'react'
import { IconMoon, IconSun } from './Icons.jsx'

const THEME_KEY = 'tripcraft:theme'

function readTheme() {
  // Set by an inline script in index.html before first paint.
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

function Logo({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--sun-1)" />
          <stop offset="100%" stopColor="var(--sun-2)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#logo-grad)" />
      <path d="M8 23c4-2 5-9 9-10s5 3 8-4" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="0.1 4.2" />
      <circle cx="8" cy="23" r="2.4" fill="#fff" />
      <path d="M25 5.5a3.2 3.2 0 00-3.2 3.2c0 2.4 3.2 5.3 3.2 5.3s3.2-2.9 3.2-5.3A3.2 3.2 0 0025 5.5z" fill="#fff" />
    </svg>
  )
}

export default function Header({ demo, onHome }) {
  const [theme, setTheme] = useState(readTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]:not([media])')?.setAttribute('content', theme === 'dark' ? '#0c1020' : '#fbf7f1')
  }, [theme])

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      // Storage unavailable; the choice just isn't persisted.
    }
  }

  return (
    <header className="site-header">
      <button type="button" className="brand" onClick={onHome} aria-label="Tripcraft home">
        <Logo />
        <span className="brand-name">Tripcraft</span>
      </button>
      <div className="header-right">
        {demo && (
          <span className="badge" title="No API key on the server, showing sample trips">
            Demo mode
          </span>
        )}
        <button
          type="button"
          className="icon-btn theme-btn"
          onClick={toggle}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>
      </div>
    </header>
  )
}
