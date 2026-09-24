import { useCallback, useLayoutEffect, useRef } from 'react'

// FLIP = First, Last, Invert, Play.
// After every render we measure where each item ended up. If an item moved
// since last time, we jump it back to where it was (transform) and let a CSS
// transition slide it to its new spot. React just re-orders the list; this
// makes the re-order look physical instead of teleporting.
//
// Positions are relative to the list itself, so scrolling the page between
// renders doesn't count as "moving".

export function useFlip(listRef) {
  const prev = useRef(new Map())

  const measure = useCallback(() => {
    const list = listRef.current
    const rects = new Map()
    if (!list) return rects
    const base = list.getBoundingClientRect().top
    for (const el of list.querySelectorAll('[data-flip-id]')) {
      rects.set(el.dataset.flipId, el.getBoundingClientRect().top - base)
    }
    return rects
  }, [listRef])

  // called by the drag code right before it drops, so the animation starts
  // from where the item visually is (under the finger), not where it was
  const snapshot = useCallback(() => {
    prev.current = measure()
  }, [measure])

  useLayoutEffect(() => {
    const list = listRef.current
    // mid-drag the items carry temporary transforms; measuring now would
    // record those as real positions. the drop calls snapshot() anyway.
    if (!list || document.body.classList.contains('is-dragging')) return
    const now = measure()
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!reduce) {
      for (const el of list.querySelectorAll('[data-flip-id]')) {
        const before = prev.current.get(el.dataset.flipId)
        const after = now.get(el.dataset.flipId)
        if (before === undefined || after === undefined) continue
        const dy = before - after
        if (Math.abs(dy) < 1) continue
        el.style.transition = 'none'
        el.style.transform = `translateY(${dy}px)`
        // force the browser to apply the jump, then hand back to the css
        // transition (see .timeline-item in index.css) to slide it home
        el.getBoundingClientRect()
        el.style.transition = ''
        el.style.transform = ''
      }
    }
    prev.current = now
  })

  return { snapshot }
}
