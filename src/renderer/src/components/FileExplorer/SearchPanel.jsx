import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useAppState, useAppDispatch } from '../../context/AppContext'
import styles from './SearchPanel.module.css'

function SearchPanel({ onClose }) {
  const { rootPath } = useAppState()
  const dispatch = useAppDispatch()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const doSearch = useCallback(async (keyword) => {
    if (!keyword.trim() || !rootPath) {
      setResults([])
      return
    }
    setSearching(true)
    try {
      const res = await window.electronAPI.searchInDirectory(rootPath, keyword.trim())
      setResults(res)
    } catch (err) {
      console.error('Search error:', err)
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [rootPath])

  const handleInputChange = (e) => {
    const value = e.target.value
    setQuery(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSearch(value), 300)
  }

  const handleResultClick = async (result) => {
    try {
      const content = await window.electronAPI.readFile(result.filePath)
      dispatch({ type: 'OPEN_FILE', filePath: result.filePath, content })
    } catch (err) {
      window.alert(`Failed to open file: ${err.message}`)
    }
  }

  const getRelativePath = (filePath) => {
    if (!rootPath) return filePath
    const sep = filePath.includes('\\') ? '\\' : '/'
    if (filePath.startsWith(rootPath)) {
      return filePath.slice(rootPath.length + 1)
    }
    return filePath.split(sep).pop()
  }

  const highlightMatch = (text, keyword) => {
    if (!keyword.trim()) return text
    const lowerText = text.toLowerCase()
    const lowerKeyword = keyword.trim().toLowerCase()
    const parts = []
    let lastIndex = 0
    let idx = lowerText.indexOf(lowerKeyword)
    while (idx !== -1) {
      if (idx > lastIndex) parts.push(text.slice(lastIndex, idx))
      parts.push(
        <span key={idx} className={styles.highlight}>
          {text.slice(idx, idx + keyword.trim().length)}
        </span>
      )
      lastIndex = idx + keyword.trim().length
      idx = lowerText.indexOf(lowerKeyword, lastIndex)
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex))
    return parts
  }

  return (
    <div className={styles.panel}>
      <div className={styles.inputContainer}>
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          placeholder="Search in files..."
          value={query}
          onChange={handleInputChange}
        />
        {searching && <div className={styles.spinner} />}
      </div>
      <div className={styles.results}>
        {results.length === 0 && query.trim() && !searching && (
          <div className={styles.noResults}>No results found</div>
        )}
        {results.map((result, index) => (
          <div
            key={`${result.filePath}:${result.lineNumber}:${index}`}
            className={styles.resultItem}
            onClick={() => handleResultClick(result)}
          >
            <div className={styles.resultPath}>
              {getRelativePath(result.filePath)}
              <span className={styles.lineNum}>:{result.lineNumber}</span>
            </div>
            <div className={styles.resultLine}>
              {highlightMatch(result.line.trim(), query)}
            </div>
          </div>
        ))}
        {results.length >= 500 && (
          <div className={styles.noResults}>Results limited to 500 matches</div>
        )}
      </div>
    </div>
  )
}

export default SearchPanel
