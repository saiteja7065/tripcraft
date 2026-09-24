import { useEffect, useState } from 'react'
import { IconMoon, IconSun } from './Icons.jsx'

const THEME_KEY = 'tripcraft:theme'

function readTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // storage blocked
  }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function Header({ demo }) {
  const [theme, setTheme] = useState(readTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      // fine, it just won't be remembered
    }
  }

  return (
    <header className="site-header">
      <div className="brand">
        <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
          <rect width="32" height="32" rx="8" fill="var(--accent)" />
          <path d="M9 22c3-9 11-9 14-12M20 10h3v3" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="9" cy="22" r="2.2" fill="#fff" />
        </svg>
        <span className="brand-name">Tripcraft</span>
        {demo && (
          <span className="badge" title="No API key configured on the server - showing sample trips">
            Demo mode
          </span>
        )}
      </div>
      <button
        type="button"
        className="icon-btn"
        onClick={toggle}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      >
        {theme === 'dark' ? <IconSun /> : <IconMoon />}
      </button>
    </header>
  )
}
