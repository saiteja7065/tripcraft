import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

// A small accessible dropdown: button + role="menu".
// Arrow keys move, Enter/Space picks, Escape or a click outside closes and
// returns focus to the button. Opens upwards when there's no room below.

export default function Menu({ label, icon, items, className = '' }) {
  const [open, setOpen] = useState(false)
  const [up, setUp] = useState(false)
  const btnRef = useRef(null)
  const menuRef = useRef(null)
  const id = useId()

  useLayoutEffect(() => {
    if (!open || !menuRef.current) return
    const btn = btnRef.current.getBoundingClientRect()
    const h = menuRef.current.offsetHeight
    setUp(btn.bottom + h + 12 > innerHeight && btn.top > h)
    menuRef.current.querySelector('[role="menuitem"]:not(:disabled)')?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (!menuRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  function close(focusButton = true) {
    setOpen(false)
    if (focusButton) btnRef.current?.focus()
  }

  function onKeyDown(e) {
    const entries = [...menuRef.current.querySelectorAll('[role="menuitem"]:not(:disabled)')]
    const i = entries.indexOf(document.activeElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      entries[(i + 1) % entries.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      entries[(i - 1 + entries.length) % entries.length]?.focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      entries[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      entries[entries.length - 1]?.focus()
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault()
      close()
    }
  }

  return (
    <div className={`menu-wrap ${className}`}>
      <button
        ref={btnRef}
        type="button"
        className="icon-btn"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        {icon}
      </button>
      {open && (
        <div ref={menuRef} id={id} role="menu" aria-label={label} className={`menu ${up ? 'menu-up' : ''}`} onKeyDown={onKeyDown}>
          {items.map((item, i) =>
            item.divider ? (
              <div key={`d${i}`} className="menu-divider" role="separator" />
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={`menu-item ${item.danger ? 'danger' : ''}`}
                disabled={item.disabled}
                onClick={() => {
                  close(!item.keepFocus)
                  item.onSelect()
                }}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.hint && <kbd className="menu-hint">{item.hint}</kbd>}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}
