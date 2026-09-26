import { useCallback, useEffect, useRef, useState } from 'react'

// Drag-to-reorder built on pointer events, so mouse, touch and pen share one path.
//
// During a drag only element.style.transform is updated; React state changes
// once at the start and once at the drop, never per pointermove.
//
// Dropping onto an element with [data-day-drop="<index>"] (a day tab) moves the
// stop to that day instead.

const EDGE = 70 // px from a viewport edge where auto-scroll starts
const MAX_SCROLL_SPEED = 14

export function useDragSort({ listRef, onReorder, onDropOnDay, currentDay, snapshot }) {
  const [draggingId, setDraggingId] = useState(null)
  const drag = useRef(null)

  const cleanup = useCallback(() => {
    const d = drag.current
    if (!d) return
    cancelAnimationFrame(d.raf)
    window.removeEventListener('pointermove', d.onMove)
    window.removeEventListener('pointerup', d.onUp)
    window.removeEventListener('pointercancel', d.onCancel)
    window.removeEventListener('keydown', d.onKey)
    d.hoverTab?.removeAttribute('data-drop-hover')
    document.body.classList.remove('is-dragging')
    drag.current = null
    setDraggingId(null)
  }, [])

  // animate=true: CSS transitions slide items back (cancelled drag).
  // animate=false: snap instantly; useFlip animates from the snapshot instead.
  const resetTransforms = (d, animate) => {
    const els = [d.el, ...d.items.map((i) => i.el)]
    for (const el of els) {
      if (!animate) el.style.transition = 'none'
      el.style.transform = ''
    }
    if (!animate) {
      d.el.getBoundingClientRect() // force layout before re-enabling transitions
      for (const el of els) el.style.transition = ''
    }
  }

  const update = useCallback(() => {
    const d = drag.current
    if (!d) return
    let dy = d.y - d.startY + (window.scrollY - d.startScroll)
    // Clamp below the last stop; upward movement stays free to reach the day tabs.
    dy = Math.min(dy, d.maxDown)
    d.el.style.transform = `translateY(${dy}px) scale(1.02)`

    const centre = d.rect.top + d.rect.height / 2 + dy
    let target = 0
    for (const item of d.items) if (centre > item.mid) target++
    // items excludes the dragged element, so `target` is the new index.
    d.target = target

    d.items.forEach((item, i) => {
      let shift = 0
      if (i >= target && i < d.index) shift = d.space // moving up: push these down
      if (i < target && i >= d.index) shift = -d.space // moving down: pull these up
      item.el.style.transform = shift ? `translateY(${shift}px)` : ''
    })

    const under = document.elementFromPoint(d.x, d.y)?.closest('[data-day-drop]')
    const tab = under && Number(under.dataset.dayDrop) !== currentDay ? under : null
    if (tab !== d.hoverTab) {
      d.hoverTab?.removeAttribute('data-drop-hover')
      tab?.setAttribute('data-drop-hover', '')
      d.hoverTab = tab
    }
  }, [currentDay])

  const onHandlePointerDown = useCallback(
    (e, stopId) => {
      if (e.button !== 0 || drag.current) return
      const list = listRef.current
      const el = e.currentTarget.closest('[data-flip-id]')
      if (!list || !el) return
      e.preventDefault()
      // Touch pointers are implicitly captured by their start element; release it
      // so events and hit-testing follow the finger.
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)

      const all = [...list.querySelectorAll('[data-flip-id]')]
      const index = all.indexOf(el)
      const rect = el.getBoundingClientRect()
      const others = all.filter((x) => x !== el)
      const next = all[index + 1]
      const gap = next ? next.getBoundingClientRect().top - rect.bottom : 8

      const last = all[all.length - 1].getBoundingClientRect()

      const d = {
        stopId,
        maxDown: last.bottom - rect.bottom,
        el,
        index,
        rect,
        space: rect.height + gap,
        // Measured once at drag start; update() compensates for scrolling.
        items: others.map((x) => {
          const r = x.getBoundingClientRect()
          return { el: x, mid: r.top + r.height / 2 }
        }),
        startY: e.clientY,
        startScroll: window.scrollY,
        x: e.clientX,
        y: e.clientY,
        target: index,
        hoverTab: null,
        raf: 0,
      }
      d.onMove = (ev) => {
        d.x = ev.clientX
        d.y = ev.clientY
        update()
      }
      d.onUp = () => finish(false)
      d.onCancel = () => finish(true)
      d.onKey = (ev) => {
        if (ev.key === 'Escape') finish(true)
      }

      // Auto-scroll near the viewport edges. The top zone starts below the sticky
      // day tabs so reaching for a tab doesn't scroll it away.
      const tabsBar = document.querySelector('.day-tabs-wrap')
      const tick = () => {
        const top = Math.max(0, tabsBar?.getBoundingClientRect().bottom ?? 0)
        let speed = 0
        if (d.y > top && d.y < top + EDGE) speed = -((top + EDGE - d.y) / EDGE) * MAX_SCROLL_SPEED
        else if (d.y > innerHeight - EDGE) speed = ((d.y - (innerHeight - EDGE)) / EDGE) * MAX_SCROLL_SPEED
        const listBottom = list.getBoundingClientRect().bottom
        if (speed > 0 && listBottom < innerHeight - EDGE) speed = 0
        if (speed) {
          window.scrollBy(0, speed)
          update()
        }
        d.raf = requestAnimationFrame(tick)
      }

      function finish(cancelled) {
        const tab = d.hoverTab
        if (cancelled) {
          resetTransforms(d, true)
        } else if (tab) {
          snapshot()
          resetTransforms(d, false)
          onDropOnDay(d.stopId, Number(tab.dataset.dayDrop))
        } else if (d.target !== d.index) {
          snapshot() // FLIP starts from the current dragged positions
          resetTransforms(d, false)
          onReorder(d.stopId, d.target)
        } else {
          resetTransforms(d, true)
        }
        cleanup()
      }

      drag.current = d
      document.body.classList.add('is-dragging')
      window.addEventListener('pointermove', d.onMove)
      window.addEventListener('pointerup', d.onUp)
      window.addEventListener('pointercancel', d.onCancel)
      window.addEventListener('keydown', d.onKey)
      d.raf = requestAnimationFrame(tick)
      setDraggingId(stopId)
    },
    [listRef, update, snapshot, onReorder, onDropOnDay, cleanup],
  )

  // Remove listeners if the component unmounts mid-drag.
  useEffect(() => cleanup, [cleanup])

  return { draggingId, onHandlePointerDown }
}
