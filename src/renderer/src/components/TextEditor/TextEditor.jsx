import React, { useRef, useEffect, useCallback, useState, useMemo, forwardRef, useImperativeHandle } from 'react'
import { useAppState, useAppDispatch } from '../../context/AppContext'
import { useSearchReplace } from '../../hooks/useSearchReplace'
import SearchBar from './SearchBar'
import styles from './TextEditor.module.css'

const TextEditor = forwardRef(function TextEditor(props, ref) {
  const { currentFile, content, isDirty } = useAppState()
  const dispatch = useAppDispatch()
  const textareaRef = useRef(null)
  const backdropRef = useRef(null)
  const activeMarkRef = useRef(null)
  const [showSearch, setShowSearch] = useState(false)
  const urlOverlayRef = useRef(null)
  const containerRef = useRef(null)
  const [bottomPadding, setBottomPadding] = useState(16)

  const {
    searchTerm, setSearchTerm,
    replaceTerm, setReplaceTerm,
    matchIndex, matchCount,
    matches,
    findNext, replaceOne, replaceAll
  } = useSearchReplace(content, dispatch, textareaRef)

  const fileName = currentFile ? currentFile.split(/[/\\]/).pop() : null

  const syncScroll = useCallback(() => {
    const scrollTop = textareaRef.current?.scrollTop
    const scrollLeft = textareaRef.current?.scrollLeft
    if (backdropRef.current) {
      backdropRef.current.scrollTop = scrollTop
      backdropRef.current.scrollLeft = scrollLeft
    }
    if (urlOverlayRef.current) {
      urlOverlayRef.current.scrollTop = scrollTop
      urlOverlayRef.current.scrollLeft = scrollLeft
    }
  }, [])

  const measureScrollTopForPosition = useCallback((textarea, text, position) => {
    const clampedPosition = Math.max(0, Math.min(position, text.length))
    const cs = window.getComputedStyle(textarea)

    // Calculate the exact content width of the textarea (excluding padding, border, scrollbar)
    const contentWidth = textarea.clientWidth
      - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)

    const mirror = document.createElement('div')
    mirror.style.position = 'absolute'
    mirror.style.visibility = 'hidden'
    mirror.style.left = '-99999px'
    mirror.style.top = '0'
    mirror.style.boxSizing = 'content-box'
    mirror.style.width = contentWidth + 'px'
    mirror.style.padding = '0'
    mirror.style.border = 'none'
    mirror.style.fontFamily = cs.fontFamily
    mirror.style.fontSize = cs.fontSize
    mirror.style.fontWeight = cs.fontWeight
    mirror.style.fontStyle = cs.fontStyle
    mirror.style.letterSpacing = cs.letterSpacing
    mirror.style.wordSpacing = cs.wordSpacing
    mirror.style.lineHeight = cs.lineHeight
    mirror.style.textTransform = cs.textTransform
    mirror.style.textIndent = cs.textIndent
    mirror.style.tabSize = cs.tabSize
    mirror.style.whiteSpace = 'pre-wrap'
    mirror.style.wordBreak = 'break-word'
    mirror.style.overflowWrap = 'break-word'

    const beforeText = text.slice(0, clampedPosition)
    const marker = document.createElement('span')
    marker.textContent = '\u200b'

    mirror.textContent = beforeText
    mirror.appendChild(marker)
    document.body.appendChild(mirror)

    const targetTop = marker.offsetTop
    document.body.removeChild(mirror)
    return targetTop
  }, [])

  useImperativeHandle(ref, () => ({
    scrollToLine(lineIndex) {
      const textarea = textareaRef.current
      if (!textarea) return

      // Move cursor to the beginning of the target line
      const lines = content.split('\n')
      let pos = 0
      for (let i = 0; i < lineIndex && i < lines.length; i++) {
        pos += lines[i].length + 1
      }

      const rawTop = measureScrollTopForPosition(textarea, content, pos)
      const margin = 4 + rawTop * 0.00075
      const targetTop = Math.max(0, rawTop - margin)
      const maxScrollTop = Math.max(0, textarea.scrollHeight - textarea.clientHeight)
      const nextScrollTop = Math.min(targetTop, maxScrollTop)

      try {
        textarea.focus({ preventScroll: true })
      } catch {
        textarea.focus()
      }
      textarea.setSelectionRange(pos, pos)
      textarea.scrollTop = nextScrollTop
      syncScroll()
      requestAnimationFrame(() => {
        if (!textareaRef.current) return
        textareaRef.current.scrollTop = nextScrollTop
        syncScroll()
      })
      setTimeout(() => {
        if (!textareaRef.current) return
        textareaRef.current.scrollTop = nextScrollTop
        syncScroll()
      }, 0)
    }
  }), [content, syncScroll, measureScrollTopForPosition])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(([entry]) => {
      const h = entry.contentRect.height
      setBottomPadding(Math.max(16, Math.floor(h * 0.5)))
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  const paddingStyle = useMemo(() => `0px 16px ${bottomPadding}px 16px`, [bottomPadding])

  const ensureCursorMargin = useCallback(() => {
    requestAnimationFrame(() => {
      const ta = textareaRef.current
      if (!ta) return
      const pos = ta.selectionStart
      const cursorTop = measureScrollTopForPosition(ta, ta.value, pos)
      const cs = window.getComputedStyle(ta)
      const lineHeight = parseFloat(cs.lineHeight)
      const paddingTop = parseFloat(cs.paddingTop)
      const cursorBottom = cursorTop + lineHeight + paddingTop
      const visibleBottom = ta.scrollTop + ta.clientHeight
      const margin = lineHeight * 2

      if (cursorBottom > visibleBottom - margin) {
        ta.scrollTop = cursorBottom - ta.clientHeight + margin
        syncScroll()
      }
    })
  }, [measureScrollTopForPosition, syncScroll])

  // Auto-save with debounce
  useEffect(() => {
    if (!currentFile || !isDirty) return

    const timer = setTimeout(async () => {
      try {
        await window.electronAPI.writeFile(currentFile, content)
        dispatch({ type: 'SAVE_FILE' })
      } catch (err) {
        console.error('Auto-save failed:', err)
      }
    }, 1000) // 1 second debounce

    return () => clearTimeout(timer)
  }, [content, currentFile, isDirty, dispatch])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setShowSearch((v) => !v)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    const handler = (action) => {
      if (action === 'find') setShowSearch(true)
    }
    const unsubscribe = window.electronAPI.onMenuEvent(handler)
    return unsubscribe
  }, [])

  const handleChange = (e) => {
    dispatch({ type: 'UPDATE_CONTENT', content: e.target.value })
  }

  const URL_REGEX = /https?:\/\/[^\s)"\]>]+/g

  const urlMatches = useMemo(() => {
    const result = []
    let m
    const re = new RegExp(URL_REGEX.source, 'g')
    while ((m = re.exec(content)) !== null) {
      result.push({ start: m.index, end: m.index + m[0].length, url: m[0] })
    }
    return result
  }, [content])

  const handleUrlMouseDown = useCallback((e) => {
    if (e.ctrlKey) return
    e.preventDefault()
    const range = document.caretRangeFromPoint(e.clientX, e.clientY)
    if (range) {
      const start = parseInt(e.currentTarget.dataset.start)
      const pos = start + range.startOffset
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(pos, pos)
    }
  }, [])

  const handleUrlClick = useCallback((e) => {
    if (e.ctrlKey) {
      e.preventDefault()
      window.electronAPI.openExternal(e.currentTarget.dataset.url)
    }
  }, [])

  const handleUrlWheel = useCallback((e) => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop += e.deltaY
      syncScroll()
    }
  }, [syncScroll])

  const urlOverlayContent = useMemo(() => {
    if (urlMatches.length === 0) return null
    const parts = []
    let lastEnd = 0
    for (let i = 0; i < urlMatches.length; i++) {
      const { start, end, url } = urlMatches[i]
      if (start > lastEnd) {
        parts.push(content.substring(lastEnd, start))
      }
      parts.push(
        <span
          key={i}
          className={styles.urlLink}
          data-start={start}
          data-url={url}
          onMouseDown={handleUrlMouseDown}
          onClick={handleUrlClick}
          onWheel={handleUrlWheel}
        >
          {url}
        </span>
      )
      lastEnd = end
    }
    if (lastEnd < content.length) {
      parts.push(content.substring(lastEnd))
    }
    parts.push('\n')
    return parts
  }, [content, urlMatches, handleUrlMouseDown, handleUrlClick, handleUrlWheel])

  const scrollToActiveMark = useCallback(() => {
    requestAnimationFrame(() => {
      const mark = activeMarkRef.current
      const backdrop = backdropRef.current
      const textarea = textareaRef.current
      if (mark && backdrop && textarea) {
        const markTop = mark.offsetTop
        const markHeight = mark.offsetHeight
        const visibleHeight = backdrop.clientHeight
        backdrop.scrollTop = markTop - visibleHeight / 2 + markHeight / 2
        textarea.scrollTop = backdrop.scrollTop
      }
    })
  }, [])

  const handleFindNext = useCallback(() => {
    findNext()
    scrollToActiveMark()
  }, [findNext, scrollToActiveMark])

  const highlightedContent = useMemo(() => {
    if (!searchTerm || matches.length === 0) {
      return null
    }

    const parts = []
    let lastEnd = 0
    const termLen = searchTerm.length

    for (let i = 0; i < matches.length; i++) {
      const start = matches[i]
      if (start > lastEnd) {
        parts.push(content.substring(lastEnd, start))
      }
      const isActive = i === matchIndex
      const cls = isActive ? styles.highlightActive : styles.highlight
      parts.push(
        <mark key={i} className={cls} ref={isActive ? activeMarkRef : undefined}>
          {content.substring(start, start + termLen)}
        </mark>
      )
      lastEnd = start + termLen
    }

    if (lastEnd < content.length) {
      parts.push(content.substring(lastEnd))
    }
    // Trailing newline ensures backdrop height matches textarea
    parts.push('\n')

    return parts
  }, [content, searchTerm, matches, matchIndex])

  if (!currentFile) {
    return (
      <div className={styles.editor}>
        <div className={styles.placeholder}>Select a file to edit</div>
      </div>
    )
  }

  const showHighlight = showSearch && searchTerm && matches.length > 0

  return (
    <div className={styles.editor}>
      <div className={styles.header}>
        <span className={styles.fileName}>
          {fileName}
        </span>
      </div>
      {showSearch && (
        <SearchBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          replaceTerm={replaceTerm}
          setReplaceTerm={setReplaceTerm}
          matchIndex={matchIndex}
          matchCount={matchCount}
          onFindNext={handleFindNext}
          onReplace={replaceOne}
          onReplaceAll={replaceAll}
          onClose={() => setShowSearch(false)}
        />
      )}
      <div ref={containerRef} className={styles.highlightContainer}>
        {showHighlight && (
          <div ref={backdropRef} className={styles.backdrop} style={{ padding: paddingStyle }} aria-hidden="true">
            {highlightedContent}
          </div>
        )}
        {urlOverlayContent && (
          <div ref={urlOverlayRef} className={styles.urlOverlay} style={{ padding: paddingStyle }} aria-hidden="true">
            {urlOverlayContent}
          </div>
        )}
        <textarea
          ref={textareaRef}
          className={`${styles.textarea}${showHighlight || urlMatches.length > 0 ? ` ${styles.textareaTransparent}` : ''}`}
          style={{ padding: paddingStyle }}
          value={content}
          onChange={handleChange}
          onInput={ensureCursorMargin}
          onScroll={syncScroll}
          spellCheck={false}
        />
      </div>
    </div>
  )
})

export default TextEditor
