import React, { useState, useRef, useEffect } from 'react'
import styles from './InputDialog.module.css'

function InputDialog({ title, defaultValue, onSubmit, onCancel, submitLabel = 'OK' }) {
  const [value, setValue] = useState(defaultValue || '')
  const inputRef = useRef(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (value.trim()) {
        onSubmit(value.trim())
      }
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value.trim())
    }
  }

  return (
    <div className={styles.overlay} onMouseDown={onCancel}>
      <div className={styles.dialog} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.title}>{title}</div>
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className={styles.buttons}>
          <button className={styles.button} onClick={handleSubmit}>
            {submitLabel}
          </button>
          <button className={styles.button} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default InputDialog
