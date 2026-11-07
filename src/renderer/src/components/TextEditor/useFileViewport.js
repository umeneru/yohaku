import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import {
  classifyViewportChange,
  getEditorView,
  getMountGeneration,
  isRestoredViewport,
  resolveEditorView,
  saveEditorView
} from './editorViewState.mjs'

function toView(mode, metrics) {
  return {
    mode,
    scrollTop: metrics.scrollTop,
    scrollLeft: metrics.scrollLeft,
    selectionStart: metrics.selectionStart,
    selectionEnd: metrics.selectionEnd
  }
}

// File switches remount the editor, so the viewport for each path lives outside
// the component. Replaying the snapshot covers late layout (padding, markdown
// parsing, images). Scroll and selection events are stored only after a user
// gesture or an explicit pin, so a layout pass cannot overwrite the snapshot.
export function useFileViewport({
  filePath,
  mode,
  enabled = true,
  layoutToken,
  elementRef,
  contentSelector = null,
  readMetrics,
  applyView
}) {
  const readRef = useRef(readMetrics)
  const applyRef = useRef(applyView)
  readRef.current = readMetrics
  applyRef.current = applyView

  const generationRef = useRef(null)
  const savedRef = useRef(undefined)
  const userMovedRef = useRef(false)
  const gestureRef = useRef(false)
  const applyingRef = useRef(false)
  const latestMetricsRef = useRef(null)

  if (generationRef.current === null) {
    generationRef.current = getMountGeneration(filePath)
  }
  if (savedRef.current === undefined) {
    savedRef.current = filePath ? getEditorView(filePath) : null
  }

  const remember = useCallback((metrics) => {
    if (!filePath || !metrics) return
    const view = toView(mode, metrics)
    latestMetricsRef.current = metrics
    savedRef.current = view
    userMovedRef.current = true
    gestureRef.current = false
    saveEditorView(filePath, view, generationRef.current)
  }, [filePath, mode])

  const persist = useCallback(() => {
    if (!enabled || !filePath || !gestureRef.current || applyingRef.current) return
    const metrics = readRef.current()
    if (!metrics) return
    latestMetricsRef.current = metrics
    const action = classifyViewportChange({
      saved: savedRef.current,
      metrics,
      mode
    })
    if (action === 'adopt') {
      remember(metrics)
      return
    }
    const resolved = resolveEditorView(savedRef.current, { ...metrics, mode })
    if (isRestoredViewport(metrics, resolved)) gestureRef.current = false
  }, [enabled, filePath, mode, remember])

  const pin = useCallback(() => {
    if (!enabled || !filePath) return
    gestureRef.current = true
    applyingRef.current = false
    remember(readRef.current())
  }, [enabled, filePath, remember])

  const markGesture = useCallback(() => {
    gestureRef.current = true
  }, [])

  const restore = useCallback(() => {
    if (!enabled || !filePath || userMovedRef.current || gestureRef.current) return
    const saved = savedRef.current
    if (!saved) return
    const metrics = readRef.current()
    if (!metrics) return
    const resolved = resolveEditorView(saved, { ...metrics, mode })
    if (!resolved) return
    try {
      applyRef.current(resolved)
    } catch {
      // The surface is not mounted yet; a later frame retries.
    }
  }, [enabled, filePath, mode])

  const finishApplying = useCallback(() => {
    applyingRef.current = false
    if (gestureRef.current) {
      const metrics = readRef.current()
      const action = metrics
        ? classifyViewportChange({ saved: savedRef.current, metrics, mode })
        : 'ignore'
      if (action === 'adopt') remember(metrics)
      return
    }
    restore()
  }, [mode, remember, restore])

  useLayoutEffect(() => {
    if (!enabled || userMovedRef.current) return undefined
    if (gestureRef.current) {
      const metrics = readRef.current()
      const action = metrics
        ? classifyViewportChange({ saved: savedRef.current, metrics, mode })
        : 'ignore'
      if (action === 'adopt') {
        remember(metrics)
        return undefined
      }
      gestureRef.current = false
    }
    applyingRef.current = true
    restore()
    return () => {
      applyingRef.current = false
    }
  }, [enabled, layoutToken, mode, remember, restore])

  useEffect(() => {
    if (!enabled || userMovedRef.current) return undefined
    applyingRef.current = true
    restore()
    const frame = requestAnimationFrame(() => {
      if (!gestureRef.current) restore()
    })
    const timer = setTimeout(finishApplying, 0)
    const later = setTimeout(() => {
      if (!gestureRef.current && !userMovedRef.current) restore()
    }, 50)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
      clearTimeout(later)
      applyingRef.current = false
    }
  }, [enabled, finishApplying, layoutToken, restore])

  useEffect(() => {
    if (!enabled) return undefined
    const element = elementRef?.current
    if (!element) return undefined

    const onGesture = () => {
      gestureRef.current = true
    }
    element.addEventListener('keydown', onGesture, true)
    element.addEventListener('pointerdown', onGesture, true)
    element.addEventListener('wheel', onGesture, { capture: true, passive: true })

    let observer
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        if (!userMovedRef.current) restore()
      })
      observer.observe(element)
      const content = (contentSelector && element.querySelector(contentSelector))
        || element.firstElementChild
      if (content && content !== element) observer.observe(content)
    }

    return () => {
      element.removeEventListener('keydown', onGesture, true)
      element.removeEventListener('pointerdown', onGesture, true)
      element.removeEventListener('wheel', onGesture, { capture: true })
      observer?.disconnect()
    }
  }, [contentSelector, elementRef, enabled, layoutToken, restore])

  useEffect(() => {
    if (!enabled || !filePath) return undefined
    const generation = generationRef.current
    return () => {
      const metrics = readRef.current() || latestMetricsRef.current
      if (!metrics || !userMovedRef.current) return
      saveEditorView(filePath, toView(mode, metrics), generation)
    }
  }, [enabled, filePath, mode])

  return { persist, pin, markGesture }
}
