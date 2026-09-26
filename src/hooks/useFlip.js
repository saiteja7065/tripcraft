import { useCallback, useLayoutEffect, useRef } from 'react'

// FLIP (First, Last, Invert, Play) list animation.
// After each render, items that moved are offset back to their previous position
// with a transform, then a CSS transition animates them into place.
//
// Positions are measured relative to the list, so page scrolling isn't treated
// as movement.

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

  // Called by useDragSort just before a drop so the animation starts from the
  // item's visual (dragged) position.
  const snapshot = useCallback(() => {
    prev.current = measure()
  }, [measure])

  useLayoutEffect(() => {
    const list = listRef.current
    // Skip while dragging: items carry temporary transforms.
    if (!list || document.body.classList.contains('is-dragging')) return
    // A hidden list has no layout; reset so it doesn't animate in when shown.
    if (!list.getClientRects().length) {
      prev.current = new Map()
      return
    }
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
        // Force layout, then let the CSS transition (.timeline-item) animate back.
        el.getBoundingClientRect()
        el.style.transition = ''
        el.style.transform = ''
      }
    }
    prev.current = now
  })

  return { snapshot }
}
