import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import { useAppState, useAppDispatch } from '../../context/AppContext'
import { useSearchReplace } from '../../hooks/useSearchReplace'
import SearchBar from './SearchBar'
import styles from './TextEditor.module.css'

function TextEditor() {
  const { currentFile, content, isDirty } = useAppState()
  const dispatch = useAppDispatch()
  const textareaRef = useRef(null)
  const backdropRef = useRef(null)
  const activeMarkRef = useRef(null)
  const [showSearch, setShowSearch] = useState(false)

  const {
    searchTerm, setSearchTerm,
    replaceTerm, setReplaceTerm,
    matchIndex, matchCount,
    matches,
    findNext, replaceOne, replaceAll
  } = useSearchReplace(content, dispatch, textareaRef)

  const fileName = currentFile ? currentFile.split(/[/\\]/).pop() : null

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
    return () => window.removeEventListener('keydown', handleKeyDown)
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

  const syncScroll = useCallback(() => {
    if (textareaRef.current && backdropRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop
      backdropRef.current.scrollLeft = textareaRef.current.scrollLeft
    }
  }, [])

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
      <div className={styles.highlightContainer}>
        {showHighlight && (
          <div ref={backdropRef} className={styles.backdrop} aria-hidden="true">
            {highlightedContent}
          </div>
        )}
        <textarea
          ref={textareaRef}
          className={showHighlight ? `${styles.textarea} ${styles.textareaTransparent}` : styles.textarea}
          value={content}
          onChange={handleChange}
          onScroll={syncScroll}
          spellCheck={false}
        />
      </div>
    </div>
  )
}

export default TextEditor
