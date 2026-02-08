import React from 'react'
import styles from './SearchBar.module.css'

function SearchBar({
  searchTerm, setSearchTerm,
  replaceTerm, setReplaceTerm,
  matchIndex, matchCount,
  onFindNext, onReplace, onReplaceAll,
  onClose
}) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onFindNext()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className={styles.bar}>
      <div className={styles.row}>
        <input
          className={styles.input}
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <span className={styles.count}>
          {searchTerm ? `${matchIndex >= 0 ? matchIndex + 1 : 0}/${matchCount}` : ''}
        </span>
        <button className={styles.button} onClick={onFindNext} title="Find Next">
          Next
        </button>
        <button className={styles.closeButton} onClick={onClose} title="Close">
          ×
        </button>
      </div>
      <div className={styles.row}>
        <input
          className={styles.input}
          type="text"
          placeholder="Replace..."
          value={replaceTerm}
          onChange={(e) => setReplaceTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && onClose()}
        />
        <button className={styles.button} onClick={onReplace} title="Replace">
          Replace
        </button>
        <button className={styles.button} onClick={onReplaceAll} title="Replace All">
          All
        </button>
      </div>
    </div>
  )
}

export default SearchBar
