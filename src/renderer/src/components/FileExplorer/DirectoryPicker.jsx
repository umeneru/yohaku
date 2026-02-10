import React, { useEffect, useRef } from 'react'
import styles from './DirectoryPicker.module.css'

function DirectoryPicker({ history, onSelect, onSelectNew, onClose, onRemove }) {
  const pickerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const getDirectoryName = (fullPath) => {
    const sep = fullPath.includes('\\') ? '\\' : '/'
    const parts = fullPath.split(sep).filter(Boolean)
    return parts[parts.length - 1] || fullPath
  }

  return (
    <div ref={pickerRef} className={styles.picker}>
      <div className={styles.list}>
        {history.length === 0 ? (
          <div className={styles.empty}>No directories registered</div>
        ) : (
          history.map((dir, index) => (
            <div
              key={index}
              className={styles.item}
              title={dir}
            >
              <span className={styles.path} onClick={() => onSelect(dir)}>{getDirectoryName(dir)}</span>
              <span
                className={styles.removeBtn}
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(dir)
                }}
                title="Remove from list"
              >
                ×
              </span>
            </div>
          ))
        )}
      </div>
      <div className={styles.separator} />
      <div className={styles.item} onClick={onSelectNew}>
        <span className={styles.icon}>+</span>
        <span className={styles.path}>Open New Directory...</span>
      </div>
    </div>
  )
}

export default DirectoryPicker
