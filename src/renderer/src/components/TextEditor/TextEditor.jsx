import React, { useRef, useEffect, useCallback, useState } from 'react'
import { useAppState, useAppDispatch } from '../../context/AppContext'
import { useSearchReplace } from '../../hooks/useSearchReplace'
import SearchBar from './SearchBar'
import styles from './TextEditor.module.css'

function TextEditor() {
  const { currentFile, content, isDirty } = useAppState()
  const dispatch = useAppDispatch()
  const textareaRef = useRef(null)
  const [showSearch, setShowSearch] = useState(false)

  const {
    searchTerm, setSearchTerm,
    replaceTerm, setReplaceTerm,
    matchIndex, matchCount,
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

  if (!currentFile) {
    return (
      <div className={styles.editor}>
        <div className={styles.placeholder}>Select a file to edit</div>
      </div>
    )
  }

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
          onFindNext={findNext}
          onReplace={replaceOne}
          onReplaceAll={replaceAll}
          onClose={() => setShowSearch(false)}
        />
      )}
      <textarea
        ref={textareaRef}
        className={styles.textarea}
        value={content}
        onChange={handleChange}
        spellCheck={false}
      />
    </div>
  )
}

export default TextEditor
