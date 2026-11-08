const views = new Map()
const relocatedPrefixes = []
const forgottenPrefixes = []

let activeRoot = null
let generationClock = 0

function separatorOf(filePath) {
  return filePath.includes('\\') ? '\\' : '/'
}

function withTrailingSeparator(filePath) {
  const separator = separatorOf(filePath)
  return filePath.endsWith(separator) ? filePath : filePath + separator
}

function covers(rootPath, candidate) {
  if (!rootPath || !candidate) return false
  if (candidate === rootPath) return true
  return candidate.startsWith(withTrailingSeparator(rootPath))
}

function numberOrZero(value) {
  return Number.isFinite(value) ? value : 0
}

function clamp(value, min, max) {
  return Math.min(Math.max(numberOrZero(value), min), max)
}

function highestGeneration(entries, filePath) {
  let generation = 0
  for (const entry of entries) {
    if (filePath === entry.exact || filePath.startsWith(entry.prefix)) {
      generation = Math.max(generation, entry.generation)
    }
  }
  return generation
}

function findRelocation(filePath) {
  for (let index = relocatedPrefixes.length - 1; index >= 0; index -= 1) {
    const entry = relocatedPrefixes[index]
    if (filePath === entry.exact) return { entry, next: entry.exactTo }
    if (filePath.startsWith(entry.prefix)) {
      return {
        entry,
        next: entry.toPrefix + filePath.slice(entry.prefix.length)
      }
    }
  }
  return null
}

function isUnderActiveRoot(filePath) {
  if (!activeRoot) return true
  return covers(activeRoot, filePath)
}

export function normalizeView(view) {
  if (!view || (view.mode !== 'plain' && view.mode !== 'markdown')) return null
  if (!Number.isFinite(view.scrollTop)) return null

  let selectionStart = Math.max(0, Math.floor(numberOrZero(view.selectionStart)))
  let selectionEnd = Math.max(0, Math.floor(numberOrZero(view.selectionEnd)))
  if (selectionEnd < selectionStart) {
    const swap = selectionStart
    selectionStart = selectionEnd
    selectionEnd = swap
  }

  return {
    mode: view.mode,
    scrollTop: Math.max(0, view.scrollTop),
    scrollLeft: Math.max(0, numberOrZero(view.scrollLeft)),
    selectionStart,
    selectionEnd
  }
}

export function getMountGeneration(filePath) {
  if (!filePath) return 0
  return Math.max(
    highestGeneration(relocatedPrefixes, filePath),
    highestGeneration(forgottenPrefixes, filePath)
  )
}

export function getEditorView(filePath) {
  if (!filePath) return null
  return views.get(filePath) || null
}

export function saveEditorView(filePath, view, mountedGeneration = getMountGeneration(filePath), seen = new Set()) {
  const normalized = normalizeView(view)
  if (!normalized || !filePath || seen.has(filePath)) return false
  seen.add(filePath)
  if (!isUnderActiveRoot(filePath)) return false

  if (mountedGeneration === getMountGeneration(filePath)) {
    views.set(filePath, normalized)
    return true
  }

  const relocation = findRelocation(filePath)
  if (!relocation) return false
  if (findRelocation(relocation.next)) {
    return saveEditorView(relocation.next, normalized, -1, seen)
  }
  if (highestGeneration(forgottenPrefixes, relocation.next) > relocation.entry.generation) return false
  if (!isUnderActiveRoot(relocation.next)) return false
  views.set(relocation.next, normalized)
  return true
}

export function forgetEditorViews(targetPath) {
  if (!targetPath) return
  const prefix = withTrailingSeparator(targetPath)
  forgottenPrefixes.push({
    exact: targetPath,
    prefix,
    generation: ++generationClock
  })
  for (const key of [...views.keys()]) {
    if (covers(targetPath, key)) views.delete(key)
  }
}

export function relocateEditorViews(oldPath, newPath) {
  if (!oldPath || !newPath || oldPath === newPath) return
  const prefix = withTrailingSeparator(oldPath)
  const toPrefix = withTrailingSeparator(newPath)

  for (const key of [...views.keys()]) {
    if (key === oldPath) {
      views.set(newPath, views.get(key))
      views.delete(key)
    } else if (key.startsWith(prefix)) {
      views.set(toPrefix + key.slice(prefix.length), views.get(key))
      views.delete(key)
    }
  }

  relocatedPrefixes.push({
    exact: oldPath,
    exactTo: newPath,
    prefix,
    toPrefix,
    generation: ++generationClock
  })
}

export function setActiveRoot(rootPath) {
  const next = rootPath || null
  if (activeRoot === next) return
  views.clear()
  relocatedPrefixes.length = 0
  forgottenPrefixes.length = 0
  generationClock = 0
  activeRoot = next
}

export function resetEditorViewState() {
  views.clear()
  relocatedPrefixes.length = 0
  forgottenPrefixes.length = 0
  generationClock = 0
  activeRoot = null
}

export function resolveEditorView(saved, metrics) {
  const normalized = normalizeView(saved)
  if (!normalized || !metrics) return null

  const maxScrollTop = Math.max(0, numberOrZero(metrics.maxScrollTop))
  const maxScrollLeft = Math.max(0, numberOrZero(metrics.maxScrollLeft))
  const length = Math.max(0, Math.floor(numberOrZero(metrics.contentLength)))
  const sameMode = normalized.mode === metrics.mode

  return {
    scrollTop: clamp(normalized.scrollTop, 0, maxScrollTop),
    scrollLeft: clamp(normalized.scrollLeft, 0, maxScrollLeft),
    selectionStart: sameMode ? clamp(normalized.selectionStart, 0, length) : 0,
    selectionEnd: sameMode ? clamp(normalized.selectionEnd, 0, length) : 0,
    restoreSelection: sameMode
  }
}

export function isRestoredViewport(metrics, resolved) {
  if (!metrics || !resolved) return false
  const scrollSame = Math.abs(numberOrZero(metrics.scrollTop) - resolved.scrollTop) <= 1
    && Math.abs(numberOrZero(metrics.scrollLeft) - resolved.scrollLeft) <= 1
  if (!scrollSame) return false
  if (!resolved.restoreSelection) {
    return numberOrZero(metrics.selectionStart) === 0
      && numberOrZero(metrics.selectionEnd) === 0
  }
  return metrics.selectionStart === resolved.selectionStart
    && metrics.selectionEnd === resolved.selectionEnd
}

export function classifyViewportChange({ saved, metrics, mode }) {
  if (!metrics) return 'ignore'
  if (!saved) return 'adopt'
  const resolved = resolveEditorView(saved, { ...metrics, mode })
  if (isRestoredViewport(metrics, resolved)) return 'ignore'
  if (
    saved.scrollTop > 0
    && metrics.maxScrollTop === 0
    && metrics.scrollTop === 0
    && metrics.contentLength > 0
  ) {
    return 'ignore'
  }
  return 'adopt'
}

// Scrolling alone (no click, no cursor move) must still update the saved
// viewport. Selection is irrelevant here: only the scroll offsets decide
// whether the change is adopted, so a scroll that leaves the caret untouched
// is not mistaken for "nothing happened".
export function classifyScrollChange({ saved, metrics, mode }) {
  if (!metrics) return 'ignore'
  if (!saved) return 'adopt'
  const resolved = resolveEditorView(saved, { ...metrics, mode })
  if (!resolved) return 'ignore'
  const scrollSame = Math.abs(numberOrZero(metrics.scrollTop) - resolved.scrollTop) <= 1
    && Math.abs(numberOrZero(metrics.scrollLeft) - resolved.scrollLeft) <= 1
  if (scrollSame) return 'ignore'
  if (
    saved.scrollTop > 0
    && metrics.maxScrollTop === 0
    && metrics.scrollTop === 0
    && metrics.contentLength > 0
  ) {
    return 'ignore'
  }
  return 'adopt'
}

// Builds the view to store after a scroll: the scroll offsets come from the
// current metrics, while the selection is kept from the saved view (same
// mode), because scrolling by itself does not move the caret.
export function mergeScrollPosition(saved, metrics, mode) {
  if (!metrics) return normalizeView(saved)
  const normalizedSaved = normalizeView(saved)
  const sameMode = normalizedSaved?.mode === mode
  return normalizeView({
    mode,
    scrollTop: metrics.scrollTop,
    scrollLeft: metrics.scrollLeft,
    selectionStart: sameMode ? normalizedSaved.selectionStart : metrics.selectionStart,
    selectionEnd: sameMode ? normalizedSaved.selectionEnd : metrics.selectionEnd
  })
}
